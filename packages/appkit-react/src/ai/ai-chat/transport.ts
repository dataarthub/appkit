// biome-ignore syntax/correctness/noTypeOnlyImportAttributes: TypeScript resolution-mode selects ESM peer declarations under NodeNext.
import type { ChatTransport, UIMessage, UIMessageChunk } from 'ai' with { 'resolution-mode': 'import' };
import { createAIChatStream, normalizeAIChatMessages, type AIChatAdapter, type AIChatMessage,
  type AIChatPart, type AIChatRequest } from "@alneas/appkit-core/ai";
import type { ActionToolObject, ActionToolValue } from "@alneas/appkit-core/ai";

/**
 * SDK 7 UIMessage -> provider-neutral history. Incomplete tool inputs and UI-only
 * reasoning/source/step parts are omitted. Completed tool calls/results, errors,
 * files, persistent data parts and metadata are preserved without executing tools.
 * The common JSON/history boundary is owned by ai-core, not this SDK binding.
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
 * SDK 7 ChatTransport binding. Install the optional ai peer for its declarations.
 * Network/lifecycle validation lives in ai-core. Cancellation reaches pending reads;
 * resumption is unsupported and tool execution stays explicit application work.
 * Nothing in this entry imports a provider SDK or browser persistence at runtime.
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
