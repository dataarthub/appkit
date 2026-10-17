import { expect, test, vi } from 'vitest';
import { readUIMessageStream, type UIMessage, type UIMessageChunk } from 'ai';
import type { AIChatAdapter, AIChatEvent, AIChatRequest } from "@alneas/appkit-core/ai";
import { createAIChatTransport, toAIChatMessages } from './transport';

const history: UIMessage[] = [{ id: 'u', role: 'user', parts: [{ type: 'text', text: 'hello' }] }];
const send = (messages = history, abortSignal?: AbortSignal) => ({ messages, abortSignal, chatId: 'chat', trigger: 'submit-message' as const, messageId: undefined });
function adapter(events: AIChatEvent[], capture?: (request: AIChatRequest) => void): AIChatAdapter {
  return { id: 'test', capabilities: { tools: true, files: true, structuredData: true }, async *stream(request) { capture?.(request); yield* events; } };
}
async function chunks(stream: ReadableStream<UIMessageChunk>) {
  const reader = stream.getReader(); const output: UIMessageChunk[] = [];
  try { while (true) { const next = await reader.read(); if (next.done) return output; output.push(next.value); } }
  finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

test('SDK history retains completed parts and errors but excludes UI-only and incomplete tool input', () => {
  const metadata = { source: 'history' };
  const messages: UIMessage[] = [{ id: 'a', role: 'assistant', metadata, parts: [
    { type: 'text', text: 'reply' }, { type: 'reasoning', text: 'UI only' }, { type: 'step-start' },
    { type: 'file', url: 'https://example.test/f', mediaType: 'text/plain', filename: '日本語.txt' },
    { type: 'data-ui', id: 'ui', data: { text: 'block' } },
    { type: 'dynamic-tool', toolName: 'pending', toolCallId: 'p', state: 'input-streaming' },
    { type: 'dynamic-tool', toolName: 'lookup', toolCallId: 'c', state: 'output-available', input: { n: 1 }, output: { value: 2 } },
    { type: 'tool-save', toolCallId: 'e', state: 'output-error', input: {}, errorText: 'failed' },
  ] }];
  const result = toAIChatMessages(messages);
  expect(result[0].parts.map(part => part.type)).toEqual(['text', 'file', 'data', 'tool-call', 'tool-result', 'tool-call', 'tool-result']);
  expect(result[0].parts[6]).toEqual({ type: 'tool-result', name: 'save', callId: 'e', output: { error: 'failed' }, isError: true });
  metadata.source = 'mutated'; expect(result[0].metadata).toEqual({ source: 'history' });
  expect(messages[0].parts).toHaveLength(8);
});
test('malformed SDK history fails in the SDK/common boundary before a request is started', async () => {
  expect(() => toAIChatMessages([{ id: 'a', role: 'assistant', parts: [{ type: 'dynamic-tool', state: 'output-available', input: {}, output: {} }] }] as unknown as UIMessage[])).toThrow('SDK tool identity');
  expect(() => toAIChatMessages([{ id: 'a', role: 'assistant', parts: [{ type: 'data-ui', data: Infinity }] }])).toThrow('Invalid JSON');
});
test('transport preserves body precedence and maps normalized text/tools/data/metadata to SDK chunks', async () => {
  let request: AIChatRequest | undefined;
  const transport = createAIChatTransport(adapter([
    { type: 'text-delta', text: 'reply' }, { type: 'tool-call', name: 'lookup', callId: 'c', input: {} },
    { type: 'tool-result', name: 'lookup', callId: 'c', output: { value: 1 } },
    { type: 'data', name: 'ui', id: 'block', data: { text: 'block' } }, { type: 'metadata', metadata: { source: 'model' } },
    { type: 'finish', reason: 'stop' },
  ], value => { request = value; }), { parameters: { temperature: 0.2, keep: true } });
  const output = await chunks(await transport.sendMessages({ ...send(), body: { temperature: 0.7 } }));
  expect(request?.parameters).toEqual({ temperature: 0.7, keep: true }); expect(request?.conversationId).toBe('chat');
  expect(output.map(value => value.type)).toEqual(['start', 'text-start', 'text-delta', 'tool-input-available', 'tool-output-available', 'data-ui', 'message-metadata', 'text-end', 'finish']);
  expect(output.at(-1)).toEqual({ type: 'finish', finishReason: 'stop' });
  expect(await transport.reconnectToStream({ chatId: 'chat' })).toBeNull();
});
test('the real SDK reader consumes the generated stream, including structured data and complete tool state', async () => {
  const transport = createAIChatTransport(adapter([
    { type: 'text-delta', text: 'real SDK' }, { type: 'tool-call', name: 'lookup', callId: 'c', input: {} },
    { type: 'tool-result', name: 'lookup', callId: 'c', output: { value: 1 } },
    { type: 'data', name: 'ui', data: { text: 'block' } }, { type: 'finish', reason: 'stop' },
  ]));
  const states: UIMessage[] = [];
  for await (const state of readUIMessageStream({ stream: await transport.sendMessages(send()) })) states.push(state);
  const final = states.at(-1)!;
  expect(final.parts).toContainEqual(expect.objectContaining({ type: 'text', text: 'real SDK' }));
  expect(final.parts).toContainEqual(expect.objectContaining({ type: 'data-ui', data: { text: 'block' } }));
  expect(final.parts).toContainEqual(expect.objectContaining({ type: 'dynamic-tool', toolCallId: 'c', state: 'output-available', output: { value: 1 } }));
});
test('truncated and post-finish injected streams fail through the same transport', async () => {
  await expect(chunks(await createAIChatTransport(adapter([{ type: 'text-delta', text: 'partial' }])).sendMessages(send()))).rejects.toThrow('before finish');
  await expect(chunks(await createAIChatTransport(adapter([{ type: 'finish', reason: 'stop' }, { type: 'text-delta', text: 'late' }])).sendMessages(send()))).rejects.toThrow('after finish');
});
test('SDK cancellation reaches the adapter and settles a pending read without awaiting uncooperative I/O', async () => {
  let signal: AbortSignal | undefined;
  let release!: () => void;
  const wait = new Promise<void>(resolve => { release = resolve; });
  const source: AIChatAdapter = { id: 'pending', capabilities: { tools: false, files: false, structuredData: false }, async *stream(request) {
    signal = request.signal; yield { type: 'text-delta', text: 'partial' }; await wait; yield { type: 'finish', reason: 'stop' };
  }};
  const reader = (await createAIChatTransport(source).sendMessages(send())).getReader();
  for (let i = 0; i < 3; i++) await reader.read(); // start, text-start, text-delta
  const pending = reader.read(); await reader.cancel();
  expect((await pending).done).toBe(true); expect(signal?.aborted).toBe(true); release(); reader.releaseLock();
});
test('pre-aborted send never starts the adapter and cancellation before first read detaches listeners', async () => {
  const controller = new AbortController(); controller.abort(); let started = false;
  await expect(chunks(await createAIChatTransport(adapter([{ type: 'finish', reason: 'stop' }], () => { started = true; })).sendMessages(send(history, controller.signal)))).rejects.toMatchObject({ name: 'AbortError' });
  expect(started).toBe(false);
  const parent = new AbortController(); const remove = vi.spyOn(parent.signal, 'removeEventListener');
  const stream = await createAIChatTransport(adapter([])).sendMessages(send(history, parent.signal));
  await stream.cancel(); expect(remove).toHaveBeenCalledWith('abort', expect.any(Function)); remove.mockRestore();
});
