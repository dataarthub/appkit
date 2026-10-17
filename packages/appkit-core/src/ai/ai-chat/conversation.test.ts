import { expect, test } from 'bun:test';
import { normalizeAIChatMessages, normalizeAIChatEvent } from './conversation';
import { createAIChatStream, streamAIChat } from './session';
import type { AIChatAdapter, AIChatEvent, AIChatMessage, AIChatRequest } from './types';

const history: AIChatMessage[] = [{ id: 'u', role: 'user', parts: [{ type: 'text', text: 'hello' }] }];
function adapter(events: AIChatEvent[], capture?: (request: AIChatRequest) => void): AIChatAdapter {
  return { id: 'test', capabilities: { tools: true, structuredData: true, files: true }, async *stream(request) { capture?.(request); yield* events; } };
}
const finish: AIChatEvent = { type: 'finish', reason: 'stop' };
const collect = (source: AsyncIterable<AIChatEvent>) => Array.fromAsync(source);

test('history normalization retains JSON parts/roles/metadata and detaches recursively frozen values', () => {
  const data = { count: 1 };
  const input: AIChatMessage[] = [ ...history, { id: 'a', role: 'assistant', metadata: { source: 'test' }, parts: [
    { type: 'file', url: 'https://example.test/a', mediaType: 'text/plain', filename: '日本語.txt' },
    { type: 'data', name: 'ui', data }, { type: 'tool-call', name: 'lookup', callId: 'c', input: {} },
    { type: 'tool-result', name: 'lookup', callId: 'c', output: { error: 'failed' }, isError: true },
  ] } ];
  const output = normalizeAIChatMessages(input);
  expect(output).toEqual(input); expect(output).not.toBe(input);
  data.count = 99;
  expect(output[1].parts[1]).toEqual({ type: 'data', name: 'ui', data: { count: 1 } });
  expect(Object.isFrozen(output[1])).toBe(true); expect(Object.isFrozen(output[1].parts)).toBe(true);
});
test('malformed roles/parts and non-JSON/accessor/cyclic/oversized histories fail at the common boundary', () => {
  const invalid: unknown[] = [
    [{ id: 'x', role: 'invalid', parts: [] }], [{ id: 'x', role: ['user'], parts: [] }], [{ id: '', role: 'user', parts: [] }],
    [{ id: 'x', role: 'user', parts: [{ type: 'unknown' }] }],
    [{ id: 'x', role: 'tool', parts: [{ type: 'text', text: 'not a result' }] }],
    [{ id: 'x', role: 'assistant', parts: [{ type: 'tool-call', name: 'call', callId: 'id', input: [] }] }],
    [{ id: 'x', role: 'user', parts: [], metadata: Infinity }],
    [{ id: 'x', role: 'user', parts: [{ type: 'text', text: 'x'.repeat(1_000_001) }] }],
    [{ id: 'x', role: 'user', parts: Array.from({ length: 4000 }, () => ({ type: 'text', text: '' })) }],
  ];
  let invoked = false; const accessor = Object.defineProperty({}, 'id', { enumerable: true, get() { invoked = true; return 'x'; } });
  invalid.push([accessor]); const cyclic: any = {}; cyclic.self = cyclic; invalid.push(cyclic);
  for (const input of invalid) expect(() => normalizeAIChatMessages(input as AIChatMessage[])).toThrow();
  expect(invoked).toBe(false);
  expect(() => normalizeAIChatEvent({ type: 'finish', reason: 'invalid' } as any)).toThrow('Invalid AI stream event');
});
test('send snapshots before demand, keeps provider options, and does not start an adapter eagerly', async () => {
  let request: AIChatRequest | undefined;
  const messages: AIChatMessage[] = [...history]; const parameters = { temperature: 0.2 };
  const stream = createAIChatStream(adapter([finish], value => { request = value; }), { messages, parameters, conversationId: 'chat', trigger: 'regenerate-message', messageId: 'u' });
  await Promise.resolve(); expect(request).toBeUndefined();
  messages.push({ id: 'late', role: 'user', parts: [] }); parameters.temperature = 99;
  const reader = stream.getReader(); expect((await reader.read()).value).toEqual(finish); expect((await reader.read()).done).toBe(true);
  expect(request?.messages).toEqual(history); expect(request?.parameters).toEqual({ temperature: 0.2 });
  expect(request?.conversationId).toBe('chat'); expect(request?.trigger).toBe('regenerate-message'); expect(request?.messageId).toBe('u');
  expect(Object.isFrozen(request?.parameters)).toBe(true); reader.releaseLock();
});
test('explicit finish, EOF and post-finish checks are shared across injected transports', async () => {
  expect(await collect(streamAIChat(adapter([{ type: 'text-delta', text: 'ok' }, finish]), { messages: history }))).toEqual([{ type: 'text-delta', text: 'ok' }, finish]);
  await expect(collect(streamAIChat(adapter([{ type: 'text-delta', text: 'partial' }]), { messages: history }))).rejects.toThrow('before finish');
  await expect(collect(streamAIChat(adapter([finish, { type: 'text-delta', text: 'late' }]), { messages: history }))).rejects.toThrow('after finish');
  await expect(collect(streamAIChat(adapter([{ type: 'data', name: 'x', data: Infinity }]), { messages: history }))).rejects.toThrow('Invalid JSON');
});
test('response budgets apply to normalized events and reject invalid configured limits', async () => {
  await expect(collect(streamAIChat(adapter([{ type: 'text-delta', text: 'a'.repeat(100) }, finish]), { messages: history }, { maxResponseChars: 50 }))).rejects.toThrow('configured limit');
  for (const max of [0, -1, Infinity, 1.5, 10_000_001]) expect(() => createAIChatStream(adapter([]), { messages: history }, { maxResponseChars: max })).toThrow('Invalid AI stream limit');
});
test('pre-aborted streams never start an adapter', async () => {
  const controller = new AbortController(); controller.abort(); let started = false;
  const reader = createAIChatStream(adapter([finish], () => { started = true; }), { messages: history, signal: controller.signal }).getReader();
  await expect(reader.read()).rejects.toMatchObject({ name: 'AbortError' }); expect(started).toBe(false); reader.releaseLock();
});
test('abort/cancel settle pending reads and request iterator cleanup even for an uncooperative next', async () => {
  for (const cancellation of ['abort', 'cancel'] as const) {
    const parent = new AbortController(); let suppliedSignal: AbortSignal | undefined; let returned = 0;
    let release!: (value: IteratorResult<AIChatEvent>) => void;
    const pending = new Promise<IteratorResult<AIChatEvent>>(resolve => { release = resolve; });
    const source: AIChatAdapter = { id: 'pending', capabilities: { tools: false, files: false, structuredData: false }, stream(request) {
      suppliedSignal = request.signal;
      return { [Symbol.asyncIterator]: () => ({ next: () => pending, async return() { returned++; return { done: true, value: undefined }; } }) };
    }};
    const reader = createAIChatStream(source, { messages: history, signal: parent.signal }).getReader();
    const read = reader.read(); await Promise.resolve();
    if (cancellation === 'abort') { parent.abort(); await expect(read).rejects.toMatchObject({ name: 'AbortError' }); }
    else { await reader.cancel(); expect((await read).done).toBe(true); }
    expect(suppliedSignal?.aborted).toBe(true); expect(returned).toBe(1);
    release({ done: true, value: undefined }); reader.releaseLock();
  }
});
test('early async iteration return aborts the adapter and preserves its finally cleanup', async () => {
  let signal: AbortSignal | undefined, cleaned = false;
  const source: AIChatAdapter = { id: 'early', capabilities: { tools: false, files: false, structuredData: false }, async *stream(request) {
    signal = request.signal;
    try { yield { type: 'text-delta', text: 'first' }; yield finish; } finally { cleaned = true; }
  }};
  for await (const _event of streamAIChat(source, { messages: history })) break;
  expect(signal?.aborted).toBe(true); expect(cleaned).toBe(true);
});
test('abort during adapter construction does not call next after cancellation', async () => {
  const parent = new AbortController(); let next = 0, returned = 0;
  const source: AIChatAdapter = { id: 'race', capabilities: { tools: false, files: false, structuredData: false }, stream() {
    parent.abort(); return { [Symbol.asyncIterator]: () => ({ async next() { next++; return { done: true, value: undefined }; }, async return() { returned++; return { done: true, value: undefined }; } }) };
  }};
  const reader = createAIChatStream(source, { messages: history, signal: parent.signal }).getReader();
  await expect(reader.read()).rejects.toMatchObject({ name: 'AbortError' }); expect(next).toBe(0); expect(returned).toBe(1); reader.releaseLock();
});

test('request mutation cannot redirect abort handling or leak the original signal listener', async () => {
  const original = new AbortController(), replacement = new AbortController();
  const request = { messages: history, signal: original.signal };
  const reader = createAIChatStream(adapter([finish]), request).getReader();
  request.signal = replacement.signal;
  original.abort();
  await expect(reader.read()).rejects.toMatchObject({ name: 'AbortError' });
  reader.releaseLock();
});
