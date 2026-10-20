// biome-ignore syntax/correctness/noTypeOnlyImportAttributes: TypeScript resolution-mode selects ESM peer declarations under NodeNext.
import type { ChatTransport, UIMessage, UIMessageChunk } from 'ai' with { 'resolution-mode': 'import' };
import { createAIChatStream, normalizeAIChatMessages, type AIChatAdapter, type AIChatMessage,
  type AIChatPart, type AIChatRequest } from "@alneas/appkit-core/ai";
import type { ActionToolObject, ActionToolValue } from "@alneas/appkit-core/ai";

/**
 * Converts AI SDK 7 UI messages into normalized provider-neutral chat history.
 *
 * @param messages - SDK UI messages; incomplete tool inputs and UI-only reasoning/source/step parts are omitted.
 *
 * @returns New normalized history preserving supported text, files, tool calls/results, data and metadata.
 *
 * @throws Error for invalid tool identities or data rejected by Core history normalization.
 *
 * @remarks Requires the optional ai peer for types. Does not execute tools, call a model,
 * or create persistence. No React provider or CSS is required.
 *
 * @example
 * ```ts
 * import { toAIChatMessages } from '@alneas/appkit-react/ai/ai-chat';
 * const history = toAIChatMessages([{ id: 'user-1', role: 'user', parts: [{ type: 'text', text: 'Hello' }] }]);
 * ```
 */
export function toAIChatMessages(messages: readonly UIMessage[]): AIChatMessage[] {
  const converted = messages.map(message => {
    const parts: AIChatPart[] = [];
    for (const part of message.parts) {
      if (part.type === 'text') parts.push({ type: 'text', text: part.text });
      else if (part.type === 'file') parts.push({ type: 'file', url: part.url, mediaType: part.mediaType, ...(part.filename ? { filename: part.filename } : {}) });
      else if (part.type.startsWith('data-') && 'data' in part) parts.push({ type: 'data', name: part.type.slice(5), data: part.data as ActionToolValue, ...('id' in part && typeof part.id === 'string' ? { id: part.id } : {}) });
      else if (part.type === 'dynamic-tool' || part.type.startsWith('tool-')) {
        const value = part as unknown as Record<string, unknown>;
        if (value.state === 'input-streaming' || value.input === undefined) continue;
        const name = part.type === 'dynamic-tool' ? value.toolName : part.type.slice(5);
        if (typeof name !== 'string' || !name || typeof value.toolCallId !== 'string' || !value.toolCallId) throw new Error('Invalid SDK tool identity');
        parts.push({ type: 'tool-call', name, callId: value.toolCallId, input: value.input as ActionToolObject });
        if (value.state === 'output-available') parts.push({ type: 'tool-result', name, callId: value.toolCallId, output: value.output as ActionToolValue });
        if (value.state === 'output-error') parts.push({ type: 'tool-result', name, callId: value.toolCallId, output: { error: typeof value.errorText === 'string' ? value.errorText : 'Tool failed' }, isError: true });
      }
    }
    return { id: message.id, role: message.role, parts, ...(message.metadata !== undefined ? { metadata: message.metadata as ActionToolValue } : {}) };
  });
  return normalizeAIChatMessages(converted);
}

/**
 * Binds a provider-neutral adapter to the AI SDK 7 ChatTransport interface.
 *
 * @param adapter - Host-configured chat adapter that owns provider calls and credentials.
 *
 * @param options - Optional tools and parameters forwarded to Core; request body fields override parameters.
 *
 * @returns Transport emitting SDK chunks; reconnectToStream resolves null because resumption is unsupported.
 *
 * @remarks Install optional ai peer for declarations. Sending messages creates a Core
 * stream; pending-read cancellation reaches it and readers are released on completion,
 * error or cancel. Tools are represented as data and never executed by this binding.
 * Request/conversion/adapter failures surface through sendMessages rejection or stream
 * errors. No provider SDK, React context, CSS or persistence is created here.
 *
 * @example
 * ```ts
 * import { createAIChatTransport, type AIChatAdapter } from '@alneas/appkit-react/ai/ai-chat';
 * export function transportFor(adapter: AIChatAdapter) { return createAIChatTransport(adapter); }
 * ```
 */
export function createAIChatTransport(adapter: AIChatAdapter, options: Pick<AIChatRequest, 'tools' | 'parameters'> = {}): ChatTransport<UIMessage> {
  return {
    async sendMessages({ messages, abortSignal, chatId, body, trigger, messageId }) {
      const reader = createAIChatStream(adapter, { messages: toAIChatMessages(messages), tools: options.tools,
        parameters: { ...options.parameters, ...body } as ActionToolObject, conversationId: chatId, trigger, messageId, signal: abortSignal }).getReader();
      async function* chunks(): AsyncGenerator<UIMessageChunk> {
        let textStarted = false;
        try {
          yield { type: 'start' };
          while (true) {
            const next = await reader.read();
            if (next.done) return;
            const event = next.value;
            if (event.type === 'text-delta') {
              if (!textStarted) { textStarted = true; yield { type: 'text-start', id: 'answer-text' }; }
              yield { type: 'text-delta', id: 'answer-text', delta: event.text };
            } else if (event.type === 'tool-call') yield { type: 'tool-input-available', toolCallId: event.callId, toolName: event.name, input: event.input, dynamic: true };
            else if (event.type === 'tool-result') yield event.isError ? { type: 'tool-output-error', toolCallId: event.callId, errorText: 'Tool execution failed', dynamic: true } : { type: 'tool-output-available', toolCallId: event.callId, output: event.output, dynamic: true };
            else if (event.type === 'data') yield { type: `data-${event.name}`, data: event.data, ...(event.id ? { id: event.id } : {}) };
            else if (event.type === 'metadata') yield { type: 'message-metadata', messageMetadata: event.metadata };
            else if (event.type === 'finish') {
              if (textStarted) yield { type: 'text-end', id: 'answer-text' };
              yield { type: 'finish', finishReason: event.reason };
            }
          }
        } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
      }
      const iterator = chunks();
      let closed = false;
      return new ReadableStream<UIMessageChunk>({
        async pull(output) {
          try {
            const next = await iterator.next();
            if (closed) return;
            if (next.done) { closed = true; output.close(); } else output.enqueue(next.value);
          } catch (error) { if (!closed) { closed = true; output.error(error); } }
        },
        async cancel(reason) {
          closed = true;
          await reader.cancel(reason).catch(() => {});
          await iterator.return(undefined);
          // Returning before the generator starts never runs its finally block.
          try { reader.releaseLock(); } catch { /* A generator finally may already have released it. */ }
        },
      });
    },
    async reconnectToStream() { return null; },
  };
}
