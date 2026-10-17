import { normalizeAIChatMessages } from './conversation';
import { jsonSnapshot } from '../internal/json-snapshot';
import type { ActionToolObject, ActionToolValue } from '../action/tool-types';
import type { AIChatEvent, AIChatHTTPOptions, AIChatRequest } from './types';

/** @internal */
export function object(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value); }
/** @internal */
export function jsonObject(value: unknown): ActionToolObject {
  const data = jsonSnapshot(value); if (!object(data)) throw new Error('Expected a JSON object'); return data as ActionToolObject;
}
/** @internal */
export function jsonValue(value: unknown): ActionToolValue { return jsonSnapshot(value); }
/** @internal */
export function finishReason(value: unknown): Extract<AIChatEvent, { type: 'finish' }>['reason'] {
  if (value === 'stop' || value === 'length') return value;
  if (value === 'tool_calls' || value === 'tool-calls') return 'tool-calls';
  if (value === 'content_filter' || value === 'content-filter') return 'content-filter';
  return 'other';
}
/** @internal */
export function httpConfiguration(options: AIChatHTTPOptions) {
  if (!options.api?.trim()) throw new Error('An AI endpoint is required');
  const max = options.maxResponseChars ?? 1000000;
  if (!Number.isInteger(max) || max < 1 || max > 10000000) throw new Error('Invalid AI stream limit');
  const api = options.api; const headers = { ...options.headers }; const fetcher = options.fetch;
  return { max, async send(body: unknown, signal?: AbortSignal) {
    signal?.throwIfAborted();
    const response = await (fetcher ?? globalThis.fetch)(api, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body), signal });
    if (!response.ok || !response.body) { await response.body?.cancel(); throw new Error(`AI request failed (HTTP ${response.status})`); }
    return response;
  } };
}
/** @internal */
export function snapshotRequest(request: AIChatRequest): AIChatRequest {
  return { ...request, messages: normalizeAIChatMessages(request.messages), tools: request.tools ? jsonValue(request.tools) as unknown as AIChatRequest['tools'] : undefined, parameters: request.parameters ? jsonObject(request.parameters) : undefined };
}

/** Handles fragmented UTF-8, CR/LF variants, comments and multiline SSE data. @internal */
export async function* readAIEvents(response: Response, max: number, signal?: AbortSignal): AsyncGenerator<unknown> {
  const reader = response.body!.getReader(); const decoder = new TextDecoder();
  let pending = ''; let data: string[] = []; let total = 0;
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal?.addEventListener('abort', abort, { once: true });
  try {
    while (true) {
      signal?.throwIfAborted();
      const { done, value } = await reader.read(); signal?.throwIfAborted();
      const text = decoder.decode(value, { stream: !done }); total += text.length;
      if (total > max) throw new Error('AI response exceeds the configured limit');
      pending += text;
      if (done && pending && !/[\r\n]$/.test(pending)) pending += '\n';
      while (true) {
        const match = /\r\n|\r|\n/.exec(pending); if (!match || (!done && match[0] === '\r' && match.index === pending.length - 1)) break;
        const line = pending.slice(0, match.index); pending = pending.slice(match.index + match[0].length);
        if (line === '') {
          if (data.length) {
            const raw = data.join('\n'); data = [];
            if (raw === '[DONE]') return;
            if (raw === '[START]') continue;
            try { yield JSON.parse(raw); } catch { throw new Error('Invalid AI stream event'); }
          }
        } else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
      }
      if (done) {
        if (data.length) { const raw = data.join('\n'); if (raw !== '[DONE]' && raw !== '[START]') { try { yield JSON.parse(raw); } catch { throw new Error('Invalid AI stream event'); } } }
        return;
      }
    }
  } finally { signal?.removeEventListener('abort', abort); await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
