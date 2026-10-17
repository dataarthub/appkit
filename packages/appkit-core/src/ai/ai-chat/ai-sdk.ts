import type { AIChatAdapter, AIChatEvent, AIChatHTTPOptions, AIChatRequest, AIChatMessage, AIChatPart } from './types';
import { finishReason, httpConfiguration, jsonObject, jsonValue, object, readAIEvents, snapshotRequest } from './stream';

/** Maps common history to AI SDK UIMessage wire data, preserving tool results. @internal */
export function toSDKMessages(messages: readonly AIChatMessage[]) {
  // Accept the same standalone tool-result history as Chat Completions. Fold it
  // into its original assistant call without mutating application-owned history.
  const normalized: AIChatMessage[] = [];
  for (const message of messages) {
    if (message.role !== 'tool') { normalized.push({ ...message, parts: [...message.parts] }); continue; }
    for (const part of message.parts) {
      if (part.type !== 'tool-result') throw new Error('Tool messages may only contain tool results');
      let owner = -1;
      for (let index = normalized.length - 1; index >= 0; index--) {
        const value = normalized[index];
        if (value.role === 'assistant' && value.parts.some(call => call.type === 'tool-call' && call.callId === part.callId && call.name === part.name)) { owner = index; break; }
      }
      if (owner < 0 || normalized[owner].parts.some(value => value.type === 'tool-result' && value.callId === part.callId)) throw new Error('Tool result requires a unique original call');
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
      } else if (!message.parts.some(value => value.type === 'tool-call' && value.callId === part.callId)) throw new Error('Tool result requires its original call');
    }
    return { id: message.id, role: message.role, parts, ...(message.metadata !== undefined ? { metadata: message.metadata } : {}) };
  });
}
/** Parses the AI SDK UI Message Stream protocol without importing an SDK. @internal */
export async function* parseAISDKEvents(response: Response, max: number, signal?: AbortSignal): AsyncGenerator<AIChatEvent> {
  let finished: Extract<AIChatEvent, { type: 'finish' }> | undefined;
  const tools = new Map<string, string>();
  for await (const event of readAIEvents(response, max, signal)) {
    if (!object(event) || typeof event.type !== 'string') throw new Error('Invalid AI SDK stream');
    if (finished) throw new Error('AI SDK emitted data after finish');
    if (event.type === 'error') throw new Error('AI SDK stream failed');
    if (event.type === 'abort') throw new DOMException('AI stream aborted', 'AbortError');
    if (event.type === 'text-delta') {
      if (typeof event.delta !== 'string') throw new Error('Invalid text delta');
      yield { type: 'text-delta', text: event.delta };
    } else if (event.type === 'tool-input-available') {
      if (typeof event.toolCallId !== 'string' || typeof event.toolName !== 'string' || tools.has(event.toolCallId)) throw new Error('Invalid tool call');
      tools.set(event.toolCallId, event.toolName);
      yield { type: 'tool-call', callId: event.toolCallId, name: event.toolName, input: jsonObject(event.input) };
    } else if (event.type === 'tool-output-available' || event.type === 'tool-output-error') {
      const name = typeof event.toolCallId === 'string' ? tools.get(event.toolCallId) : undefined;
      if (!name) throw new Error('Tool output has no matching call');
      yield { type: 'tool-result', callId: event.toolCallId as string, name, output: jsonValue(event.type === 'tool-output-error' ? { error: 'Tool execution failed' } : event.output), ...(event.type === 'tool-output-error' ? { isError: true } : {}) };
    } else if (event.type.startsWith('data-')) {
      if (!event.transient) yield { type: 'data', name: event.type.slice(5), data: jsonValue(event.data), ...(typeof event.id === 'string' ? { id: event.id } : {}) };
    } else if (event.type === 'finish') finished = { type: 'finish', reason: finishReason(event.finishReason) };
    if (event.messageMetadata !== undefined) yield { type: 'metadata', metadata: jsonValue(event.messageMetadata) };
  }
  if (!finished) throw new Error('AI SDK stream ended before finish');
  yield finished;
}

/**
 * HTTP adapter for an application endpoint serving AI SDK UI Message Streams.
 * Posts UIMessage history, submit-message trigger and optional explicit tools/parameters.
 * The endpoint owns its SDK model/provider and consumes those extra fields if supported.
 * No provider SDK dependency, tool execution or automatic retry is introduced. Text,
 * structured data parts, tool calls/results, metadata and explicit finish are normalized.
 * This is the UI stream protocol adapter, not a streamText/model SDK instance adapter.
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
