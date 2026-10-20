import { AIChatError } from '../errors/index';
import type { AIChatAdapter, AIChatEvent, AIChatHTTPOptions, AIChatRequest, AIChatMessage, AIChatPart } from './types';
import { finishReason, httpConfiguration, jsonObject, jsonValue, object, readAIEvents, snapshotRequest } from './stream';

/**
 * Maps common history to AI SDK UIMessage wire data, preserving tool results.
 *
 * @internal
 *
 * @param messages - Provider-neutral history with matching assistant tool calls for every tool result.
 * @returns New AI SDK UIMessage-style wire objects; standalone tool results are folded into their original assistant calls.
 * @throws Throws invalid tool-role parts, unmatched tool results or duplicate results for one call.
 *
 * @example
 * ```typescript
 * import { toSDKMessages } from '@alneas/appkit-core/ai/ai-chat/ai-sdk';
 *
 * console.log(toSDKMessages([{ id: 'message-1', role: 'user', parts: [{ type: 'text', text: 'hello' }] }]));
 * ```
 */
export function toSDKMessages(messages: readonly AIChatMessage[]) {
  // Accept the same standalone tool-result history as Chat Completions. Fold it
  // into its original assistant call without mutating application-owned history.
  const normalized: AIChatMessage[] = [];
  for (const message of messages) {
    if (message.role !== 'tool') { normalized.push({ ...message, parts: [...message.parts] }); continue; }
    for (const part of message.parts) {
      if (part.type !== 'tool-result') throw new AIChatError('AI_INVALID_STREAM', 'Tool messages may only contain tool results');
      let owner = -1;
      for (let index = normalized.length - 1; index >= 0; index--) {
        const value = normalized[index];
        if (value.role === 'assistant' && value.parts.some(call => call.type === 'tool-call' && call.callId === part.callId && call.name === part.name)) { owner = index; break; }
      }
      if (owner < 0 || normalized[owner].parts.some(value => value.type === 'tool-result' && value.callId === part.callId)) throw new AIChatError('AI_INVALID_TOOL_CALL', 'Tool result requires a unique original call');
      normalized[owner] = { ...normalized[owner], parts: [...normalized[owner].parts, part] };
    }
  }
  return normalized.map(message => {
    const parts: unknown[] = [];
    for (const part of message.parts) {
      if (part.type === 'text' || part.type === 'file') parts.push(part);
      else if (part.type === 'data') parts.push({ type: `data-${part.name}`, data: part.data, ...(part.id ? { id: part.id } : {}) });
      else if (part.type === 'tool-call') {
        const result = message.parts.find((value): value is Extract<AIChatPart, { type: 'tool-result' }> => value.type === 'tool-result' && value.callId === part.callId);
        parts.push({ type: 'dynamic-tool', toolCallId: part.callId, toolName: part.name, input: part.input, state: result ? result.isError ? 'output-error' : 'output-available' : 'input-available', ...(result ? result.isError ? { errorText: 'Tool execution failed' } : { output: result.output } : {}) });
      } else if (!message.parts.some(value => value.type === 'tool-call' && value.callId === part.callId)) throw new AIChatError('AI_INVALID_TOOL_CALL', 'Tool result requires its original call');
    }
    return {
      /** Nonempty identifier used to correlate this object with its owning application/session. */
      id: message.id,
      /** Conversation role; tool-role messages may contain only tool-result parts. */
      role: message.role,
      /** Ordered AI SDK wire parts for this message. */
      parts, ...(message.metadata !== undefined ? {
        /** Optional application-owned metadata; disclosure decisions belong to the host. */
        metadata: message.metadata } : {}) };
  });
}
/**
 * Parses the AI SDK UI Message Stream protocol without importing an SDK.
 *
 * @internal
 *
 * @param response - Successful host Response with an available unread SSE body.
 * @param max - Maximum decoded UTF-16 character count across the response; caller supplies a positive bound.
 * @param signal - Optional signal checked around each read; abort cancels the body reader.
 * @returns An async generator of normalized chat events, ending with an explicit finish event.
 * @throws Iteration rejects malformed events, configured size excess, reader/abort failures or EOF without an explicit finish.
 * @remarks The reader is cancelled and released on completion/early return. These parsers do not execute tools or provide transport retries.
 *
 * @example
 * ```typescript
 * import { parseAISDKEvents } from '@alneas/appkit-core/ai/ai-chat/ai-sdk';
 *
 * export async function consume(response: Response, signal?: AbortSignal) {
 *   for await (const event of parseAISDKEvents(response, 1000000, signal)) {
 *     console.log(event);
 *   }
 * }
 * ```
 */
export async function* parseAISDKEvents(response: Response, max: number, signal?: AbortSignal): AsyncGenerator<AIChatEvent> {
  let finished: Extract<AIChatEvent, { type: 'finish' }> | undefined;
  const tools = new Map<string, string>();
  for await (const event of readAIEvents(response, max, signal)) {
    if (!object(event) || typeof event.type !== 'string') throw new AIChatError('AI_INVALID_STREAM', 'Invalid AI SDK stream');
    if (finished) throw new AIChatError('AI_INVALID_STREAM', 'AI SDK emitted data after finish');
    if (event.type === 'error') throw new AIChatError('AI_INVALID_STREAM', 'AI SDK stream failed');
    if (event.type === 'abort') throw new DOMException('AI stream aborted', 'AbortError');
    if (event.type === 'text-delta') {
      if (typeof event.delta !== 'string') throw new AIChatError('AI_INVALID_STREAM', 'Invalid text delta');
      yield { type: 'text-delta', text: event.delta };
    } else if (event.type === 'tool-input-available') {
      if (typeof event.toolCallId !== 'string' || typeof event.toolName !== 'string' || tools.has(event.toolCallId)) throw new AIChatError('AI_INVALID_TOOL_CALL', 'Invalid tool call');
      tools.set(event.toolCallId, event.toolName);
      yield { type: 'tool-call', callId: event.toolCallId, name: event.toolName, input: jsonObject(event.input) };
    } else if (event.type === 'tool-output-available' || event.type === 'tool-output-error') {
      const name = typeof event.toolCallId === 'string' ? tools.get(event.toolCallId) : undefined;
      if (!name) throw new AIChatError('AI_INVALID_TOOL_CALL', 'Tool output has no matching call');
      yield { type: 'tool-result', callId: event.toolCallId as string, name, output: jsonValue(event.type === 'tool-output-error' ? { error: 'Tool execution failed' } : event.output), ...(event.type === 'tool-output-error' ? { isError: true } : {}) };
    } else if (event.type.startsWith('data-')) {
      if (!event.transient) yield { type: 'data', name: event.type.slice(5), data: jsonValue(event.data), ...(typeof event.id === 'string' ? { id: event.id } : {}) };
    } else if (event.type === 'finish') finished = { type: 'finish', reason: finishReason(event.finishReason) };
    if (event.messageMetadata !== undefined) yield { type: 'metadata', metadata: jsonValue(event.messageMetadata) };
  }
  if (!finished) throw new AIChatError('AI_INCOMPLETE_STREAM', 'AI SDK stream ended before finish');
  yield finished;
}

/**
 * Creates an HTTP transport for a host endpoint serving AI SDK UI Message Streams.
 *
 * @internal
 *
 * @param options - Real host endpoint, headers, optional fetch implementation and decoded-character limit.
 * @returns A frozen adapter; network I/O starts only when its stream is iterated.
 * @throws Throws missing endpoint or invalid response-character limits during construction.
 *
 * @example
 * ```typescript
 * import { createAISDKChatAdapter, type AIChatHTTPOptions } from '@alneas/appkit-core/ai/ai-chat';
 *
 * // Use a host-controlled proxy/configuration; do not embed privileged server credentials in browsers.
 * export function createAdapter(options: AIChatHTTPOptions) {
 *   return createAISDKChatAdapter(options);
 * }
 * ```
 */
export function createAISDKChatAdapter(options: AIChatHTTPOptions): AIChatAdapter {
  const http = httpConfiguration(options);
  return Object.freeze({ id: 'ai-sdk-ui-stream', capabilities: Object.freeze({ tools: true, structuredData: true, files: true }),
    async *stream(input: AIChatRequest): AsyncGenerator<AIChatEvent> {
      const request = snapshotRequest(input);
      const response = await http.send({ ...request.parameters, ...(request.conversationId ? { id: request.conversationId } : {}), messages: toSDKMessages(request.messages), trigger: request.trigger ?? 'submit-message', messageId: request.messageId ?? request.messages.at(-1)?.id, ...(request.tools ? { tools: request.tools } : {}) }, request.signal);
      yield* parseAISDKEvents(response, http.max, request.signal);
    },
  });
}
