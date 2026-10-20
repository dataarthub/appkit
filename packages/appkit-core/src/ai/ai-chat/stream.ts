import { AIChatError } from '../errors/index';
import { normalizeAIChatMessages } from './conversation';
import { jsonSnapshot } from '../internal/json-snapshot';
import type { ActionToolObject, ActionToolValue } from '../action/tool-types';
import type { AIChatEvent, AIChatHTTPOptions, AIChatRequest } from './types';

/**
 * Tests for a non-null non-array object without validating its prototype or contents.
 *
 * @internal
 *
 * @param value - Arbitrary value to inspect.
 * @returns Whether typeof value is object and the value is neither null nor an array.
 *
 * @example
 * ```typescript
 * import { object } from '@alneas/appkit-core/ai/ai-chat/stream';
 *
 * console.log(object({ text: 'hello' }));
 * ```
 */
export function object(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value); }
/**
 * Detaches and freezes a bounded finite JSON object.
 *
 * @internal
 *
 * @param value - Untrusted already-parsed object value.
 * @returns A recursively frozen plain JSON object snapshot.
 * @throws Throws non-object/non-JSON values, cycles or JSON size/depth/node limit violations.
 *
 * @example
 * ```typescript
 * import { jsonObject } from '@alneas/appkit-core/ai/ai-chat/stream';
 *
 * console.log(jsonObject({ text: 'hello' }));
 * ```
 */
export function jsonObject(value: unknown): ActionToolObject {
  const data = jsonSnapshot(value); if (!object(data)) throw new AIChatError('AI_INVALID_STREAM', 'Expected a JSON object'); return data as ActionToolObject;
}
/**
 * Detaches and freezes any supported bounded finite JSON value.
 *
 * @internal
 *
 * @param value - Already-parsed JSON-like value to snapshot.
 * @returns Detached frozen JSON data; primitive values are retained.
 * @throws Throws unsupported/nonfinite/accessor/cyclic values or size/depth/node limit violations.
 *
 * @example
 * ```typescript
 * import { jsonValue } from '@alneas/appkit-core/ai/ai-chat/stream';
 *
 * console.log(jsonValue({ count: 1 }));
 * ```
 */
export function jsonValue(value: unknown): ActionToolValue { return jsonSnapshot(value); }
/**
 * Maps provider finish labels to the common chat finish categories.
 *
 * @internal
 *
 * @param value - Untrusted provider finish reason.
 * @returns stop/length unchanged, tool_calls/content_filter normalized, otherwise other.
 *
 * @example
 * ```typescript
 * import { finishReason } from '@alneas/appkit-core/ai/ai-chat/stream';
 *
 * console.log(finishReason('tool_calls'));
 * ```
 */
export function finishReason(value: unknown): Extract<AIChatEvent, { type: 'finish' }>['reason'] {
  if (value === 'stop' || value === 'length') return value;
  if (value === 'tool_calls' || value === 'tool-calls') return 'tool-calls';
  if (value === 'content_filter' || value === 'content-filter') return 'content-filter';
  return 'other';
}
/**
 * Snapshots endpoint/headers and validates the HTTP response-character budget.
 *
 * @internal
 *
 * @param options - Required nonblank endpoint and optional headers/fetch/response limit.
 * @returns The max character budget and a POST helper; construction sends no request.
 * @throws Throws missing endpoint or a limit outside integers 1–10000000.
 *
 * @example
 * ```typescript
 * import { httpConfiguration } from '@alneas/appkit-core/ai/ai-chat/stream';
 * import type { AIChatHTTPOptions } from '@alneas/appkit-core/ai/ai-chat';
 *
 * export function configure(options: AIChatHTTPOptions) {
 *   return httpConfiguration(options);
 * }
 * ```
 */
export function httpConfiguration(options: AIChatHTTPOptions) {
  if (!options.api?.trim()) throw new AIChatError('AI_INVALID_CONFIGURATION', 'An AI endpoint is required');
  const max = options.maxResponseChars ?? 1000000;
  if (!Number.isInteger(max) || max < 1 || max > 10000000) throw new AIChatError('AI_INVALID_CONFIGURATION', 'Invalid AI stream limit');
  const api = options.api; const headers = { ...options.headers }; const fetcher = options.fetch;
  return {
    /** Maximum decoded response characters allowed by this configured HTTP transport. */
    max,
    /**
     * POSTs one JSON request through the configured host fetch implementation.
     *
     * @param body - JSON-serializable request payload; serialized immediately for this request.
     * @param signal - Optional signal checked before sending and passed through to fetch.
     * @returns A successful Response with a readable body; the caller owns body consumption.
     * @throws Rejects aborts, serialization/fetch failures, non-success HTTP responses or missing bodies.
     *
     * @example
     * ```typescript
     * import { httpConfiguration } from '@alneas/appkit-core/ai/ai-chat/stream';
     * import type { AIChatHTTPOptions } from '@alneas/appkit-core/ai/ai-chat';
     *
     * export async function send(options: AIChatHTTPOptions, body: unknown, signal?: AbortSignal) {
     *   return httpConfiguration(options).send(body, signal);
     * }
     * ```
     */
    async send(body: unknown, signal?: AbortSignal) {
    signal?.throwIfAborted();
    const response = await (fetcher ?? globalThis.fetch)(api, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body), signal });
    if (!response.ok || !response.body) { await response.body?.cancel(); throw new AIChatError('AI_HTTP_FAILURE', `AI request failed (HTTP ${response.status})`); }
    return response;
  } };
}
/**
 * Snapshots JSON request data while preserving host-only control fields.
 *
 * @internal
 *
 * @param request - Request whose messages/tools/parameters must contain bounded supported JSON.
 * @returns A new request object with detached history/tools/parameters; signal and other control fields are preserved.
 * @throws Throws malformed conversation data or unsupported/out-of-limit JSON.
 *
 * @example
 * ```typescript
 * import { snapshotRequest } from '@alneas/appkit-core/ai/ai-chat/stream';
 *
 * console.log(snapshotRequest({ messages: [{ id: 'message-1', role: 'user', parts: [{ type: 'text', text: 'hello' }] }] }));
 * ```
 */
export function snapshotRequest(request: AIChatRequest): AIChatRequest {
  return { ...request, messages: normalizeAIChatMessages(request.messages), tools: request.tools ? jsonValue(request.tools) as unknown as AIChatRequest['tools'] : undefined, parameters: request.parameters ? jsonObject(request.parameters) : undefined };
}

/**
 * Handles fragmented UTF-8, CR/LF variants, comments and multiline SSE data.
 *
 * @internal
 *
 * @param response - Successful host Response with an available unread SSE body.
 * @param max - Maximum decoded UTF-16 character count across the response; caller supplies a positive bound.
 * @param signal - Optional signal checked around each read; abort cancels the body reader.
 * @returns An async generator of parsed unknown JSON SSE values; [DONE] ends iteration and [START] is skipped.
 * @throws Iteration rejects malformed events, configured size excess, reader/abort failures.
 * @remarks The reader is cancelled and released on completion/early return. These parsers do not execute tools or provide transport retries.
 *
 * @example
 * ```typescript
 * import { readAIEvents } from '@alneas/appkit-core/ai/ai-chat/stream';
 *
 * export async function consume(response: Response, signal?: AbortSignal) {
 *   for await (const event of readAIEvents(response, 1000000, signal)) {
 *     console.log(event);
 *   }
 * }
 * ```
 */
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
      if (total > max) throw new AIChatError('AI_RESPONSE_LIMIT', 'AI response exceeds the configured limit');
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
            try { yield JSON.parse(raw); } catch { throw new AIChatError('AI_INVALID_STREAM', 'Invalid AI stream event'); }
          }
        } else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
      }
      if (done) {
        if (data.length) { const raw = data.join('\n'); if (raw !== '[DONE]' && raw !== '[START]') { try { yield JSON.parse(raw); } catch { throw new AIChatError('AI_INVALID_STREAM', 'Invalid AI stream event'); } } }
        return;
      }
    }
  } finally { signal?.removeEventListener('abort', abort); await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
