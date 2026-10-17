import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createOpenAICompatibleChatAdapter } from './openai-compatible';
import { createAISDKChatAdapter } from './ai-sdk';
import type { AIChatAdapter, AIChatEvent, AIChatMessage } from './types';
const history: AIChatMessage[] = [{ id: 'user', role: 'user', parts: [{ type: 'text', text: 'hello' }] }];
const event = (value: unknown) => `data: ${JSON.stringify(value)}\r\n\r\n`;
const done = event({ choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] }) + 'data: [DONE]\r\n\r\n';
function fragmented(text: string, cancel = () => {}) {
  const bytes = new TextEncoder().encode(text); let offset = 0;
  return new Response(new ReadableStream<Uint8Array>({ pull(c) { if (offset < bytes.length) c.enqueue(bytes.slice(offset, ++offset)); else c.close(); }, cancel }));
}
async function collect(adapter: AIChatAdapter, messages = history): Promise<AIChatEvent[]> { return Array.fromAsync(adapter.stream({ messages })); }
describe('Interchangeable AI communication adapters', () => {
  it('normalizes fragmented UTF-8 and preserves explicit model, headers and request options', async () => {
    let sent!: RequestInit;
    const adapter = createOpenAICompatibleChatAdapter({ api: '/chat', model: 'test-model', headers: { Authorization: 'Bearer local-test' }, fetch: async (_url, init) => { sent = init!; return fragmented(': keepalive\r\ndata: [START]\r\n\r\n' + event({ choices: [{ index: 0, delta: { content: '日本語' } }] }) + done); } });
    assert.deepEqual(await collect(adapter), [{ type: 'text-delta', text: '日本語' }, { type: 'finish', reason: 'stop' }]);
    const body = JSON.parse(sent.body as string); assert.equal(body.model, 'test-model'); assert.equal(body.stream, true); assert.deepEqual(body.messages, [{ role: 'user', content: 'hello' }]);
    assert.equal(new Headers(sent.headers).get('authorization'), 'Bearer local-test');
  });
  it('assembles interleaved tool fragments and roundtrips tool results without executing them', async () => {
    let body: Record<string, unknown> = {};
    const adapter = createOpenAICompatibleChatAdapter({ api: '/chat', model: 'test', fetch: async (_url, init) => { body = JSON.parse(init!.body as string); return fragmented(event({ choices: [{ delta: { tool_calls: [{ index: 1, id: 'second', function: { name: 'b', arguments: '{"n":' } }, { index: 0, id: 'first', function: { name: 'a', arguments: '{}' } }] } }] }) + event({ choices: [{ delta: { tool_calls: [{ index: 1, function: { arguments: '2}' } }] }, finish_reason: 'tool_calls' }] }) + 'data: [DONE]\n\n'); } });
    const result = await collect(adapter, [...history, { id: 'assistant', role: 'assistant', parts: [{ type: 'tool-call', callId: 'old', name: 'lookup', input: {} }, { type: 'tool-result', callId: 'old', name: 'lookup', output: { count: 1 } }] }]);
    assert.deepEqual(result, [{ type: 'tool-call', callId: 'first', name: 'a', input: {} }, { type: 'tool-call', callId: 'second', name: 'b', input: { n: 2 } }, { type: 'finish', reason: 'tool-calls' }]);
    assert.deepEqual((body.messages as unknown[])[2], { role: 'tool', tool_call_id: 'old', content: '{"count":1}' });
  });
  it('rejects truncated streams, invalid tool arguments and provider errors without leaking body details', async () => {
    for (const text of [event({ choices: [{ delta: { content: 'partial' } }] }), event({ error: { message: 'PRIVATE' } }), event({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'call', function: { name: 'tool', arguments: '{' } }] }, finish_reason: 'tool_calls' }] })]) {
      const adapter = createOpenAICompatibleChatAdapter({ api: '/chat', model: 'test', fetch: async () => fragmented(text) });
      await assert.rejects(collect(adapter), error => error instanceof Error && !error.message.includes('PRIVATE'));
    }
  });
  it('releases readers on abort, early consumer exit, DONE and size failures', async () => {
    let cancelled = 0; const source = () => new Response(new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new TextEncoder().encode(event({ choices: [{ delta: { content: 'partial' } }] }))); }, cancel() { cancelled++; } }));
    const adapter = createOpenAICompatibleChatAdapter({ api: '/chat', model: 'test', fetch: async () => source() });
    const controller = new AbortController(); const iterator = adapter.stream({ messages: history, signal: controller.signal })[Symbol.asyncIterator]();
    await iterator.next(); const pending = iterator.next(); controller.abort(); await assert.rejects(pending, error => error instanceof Error && error.name === 'AbortError'); assert.equal(cancelled, 1);
    for await (const _event of adapter.stream({ messages: history })) break; assert.equal(cancelled, 2);
    const small = createOpenAICompatibleChatAdapter({ api: '/chat', model: 'test', maxResponseChars: 5, fetch: async () => fragmented(done) }); await assert.rejects(collect(small), /limit/);
  });
  it('normalizes AI SDK text, structured data, tool calls/results and metadata using the same contract', async () => {
    let sent!: Record<string, unknown>;
    const adapter = createAISDKChatAdapter({ api: '/sdk', fetch: async (_url, init) => { sent = JSON.parse(init!.body as string); return fragmented(event({ type: 'start', messageMetadata: { source: 'test' } }) + event({ type: 'text-delta', id: 't', delta: 'reply' }) + event({ type: 'tool-input-available', toolCallId: 'call', toolName: 'get', input: {} }) + event({ type: 'tool-output-available', toolCallId: 'call', output: { value: 1 } }) + event({ type: 'data-ui', id: 'ui', data: { version: 1, id: 'a', blocks: [] } }) + event({ type: 'finish', finishReason: 'stop' }) + 'data: [DONE]\n\n'); } });
    const output = await collect(adapter); assert.deepEqual(output.map(part => part.type), ['metadata', 'text-delta', 'tool-call', 'tool-result', 'data', 'finish']);
    assert.equal(sent.trigger, 'submit-message'); assert.deepEqual(sent.messages, history);
    assert.equal(adapter.capabilities.structuredData, true);
  });
  it('rejects incomplete SDK streams and unexpected tool outputs', async () => {
    for (const text of [event({ type: 'text-delta', delta: 'partial' }), event({ type: 'tool-output-available', toolCallId: 'missing', output: {} })]) {
      await assert.rejects(collect(createAISDKChatAdapter({ api: '/sdk', fetch: async () => fragmented(text) })));
    }
  });
  it('keeps explicit legacy UI stream support inside the default OpenAI adapter', async () => {
    const adapter = createOpenAICompatibleChatAdapter({ api: '/chat', model: 'test', acceptAISDKStream: true, fetch: async () => new Response(event({ type: 'data-ui', data: { text: 'answer' } }) + event({ type: 'finish' }), { headers: { 'x-vercel-ai-ui-message-stream': 'v1' } }) });
    assert.equal((await collect(adapter))[0].type, 'data');
  });
});

it('uses the same standalone tool-result history with both adapters and retains error state', async () => {
  const messages: AIChatMessage[] = [...history,
    { id: 'assistant', role: 'assistant', parts: [{ type: 'tool-call', callId: 'call', name: 'lookup', input: {} }] },
    { id: 'result', role: 'tool', parts: [{ type: 'tool-result', callId: 'call', name: 'lookup', output: { error: 'PRIVATE' }, isError: true }] }];
  let sent!: { messages: { parts: { state: string; errorText?: string }[] }[] };
  const adapter = createAISDKChatAdapter({ api: '/sdk', fetch: async (_url, init) => { sent = JSON.parse(init!.body as string); return fragmented(event({ type: 'finish', finishReason: 'stop' })); } });
  await collect(adapter, messages);
  assert.equal(sent.messages.length, 2);
  assert.equal(sent.messages[1].parts[0].state, 'output-error');
  assert.equal(sent.messages[1].parts[0].errorText, 'Tool execution failed');
  assert.equal(messages[1].parts.length, 1);
  await assert.rejects(collect(adapter, [messages[2]]), /original call/);
});
