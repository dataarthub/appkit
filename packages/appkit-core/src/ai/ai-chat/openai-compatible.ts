import { AIChatError } from '../errors/index';
import type { AIChatAdapter, AIChatEvent, AIChatHTTPOptions, AIChatRequest, AIChatPart } from './types';
import { parseAISDKEvents } from './ai-sdk';
import { finishReason, httpConfiguration, jsonObject, object, readAIEvents, snapshotRequest } from './stream';

/**
 * OpenAI-compatible Chat Completions settings; select the endpoint/model explicitly.
 *
 * @see {@link streamAIChat} for canonical public-import usage and setup.
 */
export interface OpenAICompatibleChatOptions extends AIChatHTTPOptions {

  /** Nonblank model identifier selected by the host for the configured endpoint. */
  readonly model: string;

  /**
   * Explicit application file upload integration. Images are sent directly as image_url.
   *
   * @param file - Non-image file part selected for explicit upload before the chat request.
   * @param signal - Optional request cancellation signal that the host upload integration must honor.
   * @returns Remote file identifier/type, resolved before the file reference is sent; errors abort the chat request.
   *
   * @example
   * ```typescript
   * import type { OpenAICompatibleChatOptions } from '@alneas/appkit-core/ai/ai-chat';
   *
   * export function withUpload(uploadFile: NonNullable<OpenAICompatibleChatOptions['uploadFile']>) {
   *   return uploadFile; // Supply the host actual file integration, including cleanup policy.
   * }
   * ```
   */
  readonly uploadFile?: (file: Extract<AIChatPart, {
    /** Discriminant selecting the file variant. */
    type: 'file' }>, signal?: AbortSignal) => Promise<{
    /** Nonempty remote file identifier returned by the upload integration. */
    id: string;
    /** Discriminant selecting the named component/record variant. */
    type: string }>;

  /** Preserve legacy endpoints that answer with AI SDK UI Message Streams. Default false. */
  readonly acceptAISDKStream?: boolean;
}

/**
 * OpenAI-compatible Chat Completions HTTP/SSE adapter. Uses one choice, assembles tool
 * argument fragments before emitting a call and preserves tool result history. Incomplete
 * streams and invalid tool JSON fail instead of pretending completion. No tool is run.
 * Arbitrary native data parts are not sent to this text/tool protocol. Provider-specific
 * model/schema support remains explicit through parameters; capabilities are transport-level.
 *
 * @see https://developers.openai.com/api/docs/guides/function-calling
 *
 * @param options - Real host endpoint/model, optional headers/fetch/file-upload integration and stream limit.
 * @returns A frozen Chat Completions transport; creating it sends no request.
 * @throws Throws missing endpoint/model or invalid response limits; stream iteration propagates HTTP/stream/tool/upload errors.
 *
 * @example
 * ```typescript
 * import { createOpenAICompatibleChatAdapter, type OpenAICompatibleChatOptions } from '@alneas/appkit-core/ai/ai-chat';
 *
 * // Use a host-controlled proxy/configuration; do not embed privileged server credentials in browsers.
 * export function createAdapter(options: OpenAICompatibleChatOptions) {
 *   return createOpenAICompatibleChatAdapter(options);
 * }
 * ```
 */
export function createOpenAICompatibleChatAdapter(options: OpenAICompatibleChatOptions): AIChatAdapter {
  const http = httpConfiguration(options); const { model, uploadFile, acceptAISDKStream = false } = options;
  if (!model?.trim()) throw new AIChatError('AI_INVALID_CONFIGURATION', 'An AI model is required');
  return Object.freeze({ id: 'openai-chat-completions', capabilities: Object.freeze({ tools: true, structuredData: acceptAISDKStream, files: true }),
    async *stream(input: AIChatRequest): AsyncGenerator<AIChatEvent> {
      const request = snapshotRequest(input); const messages: unknown[] = []; const files: { id: string; type: string }[] = [];
      for (const message of request.messages) {
        const content: unknown[] = []; const calls: unknown[] = []; const results: unknown[] = [];
        for (const part of message.parts) {
          if (part.type === 'text') content.push({ type: 'text', text: part.text });
          else if (part.type === 'file') {
            if (part.mediaType.startsWith('image/')) content.push({ type: 'image_url', image_url: { url: part.url } });
            else { if (!uploadFile) throw new AIChatError('AI_INVALID_CONFIGURATION', 'This adapter requires an uploadFile handler for non-image files'); files.push(await uploadFile(part, request.signal)); }
          } else if (part.type === 'tool-call') calls.push({ id: part.callId, type: 'function', function: { name: part.name, arguments: JSON.stringify(part.input) } });
          else if (part.type === 'tool-result') results.push({ role: 'tool', tool_call_id: part.callId, content: JSON.stringify(part.output) });
          // Application UI data is display-only; it is never implicitly disclosed to the model.
        }
        if (message.role !== 'tool') messages.push({ role: message.role, content: content.length === 1 && object(content[0]) && content[0].type === 'text' ? content[0].text : content.length ? content : '', ...(calls.length ? { tool_calls: calls } : {}) });
        messages.push(...results);
      }
      const response = await http.send({ model, ...request.parameters, n: 1, messages, stream: true,
        ...(request.tools ? { tools: request.tools.map(tool => ({ type: 'function', function: { name: tool.name, description: tool.description, parameters: tool.inputSchema } })) } : {}),
        ...(files.length ? { files } : {}),
      }, request.signal);
      if (acceptAISDKStream && response.headers.get('x-vercel-ai-ui-message-stream') === 'v1') { yield* parseAISDKEvents(response, http.max, request.signal); return; }
      const calls = new Map<number, { id: string; name: string; args: string }>();
      let reason: unknown; let finished = false;
      for await (const event of readAIEvents(response, http.max, request.signal)) {
        if (!object(event) || event.error) throw new AIChatError('AI_INVALID_STREAM', 'AI stream failed');
        if (!Array.isArray(event.choices)) throw new AIChatError('AI_INVALID_STREAM', 'Invalid AI response');
        const choice = event.choices.find(value => object(value) && (value.index === 0 || value.index === undefined));
        if (!choice) continue;
        if (finished) throw new AIChatError('AI_INVALID_STREAM', 'AI emitted content after finish');
        if (!object(choice) || !object(choice.delta)) throw new AIChatError('AI_INVALID_STREAM', 'Invalid AI choice');
        if (typeof choice.delta.content === 'string') yield { type: 'text-delta', text: choice.delta.content };
        if (typeof choice.delta.refusal === 'string' && choice.delta.refusal) yield { type: 'text-delta', text: choice.delta.refusal };
        if (Array.isArray(choice.delta.tool_calls)) for (const chunk of choice.delta.tool_calls) {
          if (!object(chunk) || !Number.isInteger(chunk.index) || (chunk.index as number) < 0) throw new AIChatError('AI_INVALID_TOOL_CALL', 'Invalid tool fragment');
          const call = calls.get(chunk.index as number) ?? { id: '', name: '', args: '' };
          if (typeof chunk.id === 'string') call.id += chunk.id;
          if (object(chunk.function)) { if (typeof chunk.function.name === 'string') call.name += chunk.function.name; if (typeof chunk.function.arguments === 'string') call.args += chunk.function.arguments; }
          calls.set(chunk.index as number, call);
        }
        if (choice.finish_reason != null) { reason = choice.finish_reason; finished = true; }
      }
      if (!finished) throw new AIChatError('AI_INCOMPLETE_STREAM', 'AI stream ended before finish');
      const seen = new Set<string>();
      for (const [, call] of [...calls].sort(([a], [b]) => a - b)) {
        if (!call.id || !call.name || seen.has(call.id) || reason !== 'tool_calls') throw new AIChatError('AI_INVALID_TOOL_CALL', 'Incomplete tool call');
        seen.add(call.id);
        let args: unknown; try { args = JSON.parse(call.args); } catch { throw new AIChatError('AI_INVALID_TOOL_CALL', 'Invalid tool arguments'); }
        yield { type: 'tool-call', callId: call.id, name: call.name, input: jsonObject(args) };
      }
      yield { type: 'finish', reason: finishReason(reason) };
    },
  });
}

/**
 * Explicit multipart upload adapter for the legacy chat file endpoint. Accepts base64 data URLs only.
 *
 * @param options - Host file-upload endpoint, headers and optional fetch implementation; maxResponseChars is not used by uploads.
 * @returns A callback accepting a base64 data-URL file part and optional signal; POSTs multipart form data and resolves the server file ID/type.
 * @remarks The callback rejects invalid/non-base64 input, aborts, HTTP failures or responses missing an ID. It does not upload remote URLs, delete remote files or enforce an upload-size limit.
 *
 * @example
 * ```typescript
 * import { createAIFileUpload, type AIChatHTTPOptions } from '@alneas/appkit-core/ai/ai-chat';
 *
 * export function createUploader(options: AIChatHTTPOptions) {
 *   return createAIFileUpload(options); // The host invokes this with an actual selected file.
 * }
 * ```
 */
export function createAIFileUpload(options: AIChatHTTPOptions): NonNullable<OpenAICompatibleChatOptions['uploadFile']> {
  const { api, fetch: fetcher } = options; const headers = { ...options.headers };
  return async (file, signal) => {
    signal?.throwIfAborted();
    const match = /^data:([^;,]*);base64,([\s\S]*)$/.exec(file.url);
    if (!match) throw new AIChatError('AI_FILE_UPLOAD_FAILURE', 'File upload requires a base64 data URL');
    const bytes = Uint8Array.from(atob(match[2]), char => char.charCodeAt(0));
    const body = new FormData(); body.append('file', new Blob([bytes], { type: file.mediaType || match[1] }), file.filename ?? 'document');
    const response = await (fetcher ?? globalThis.fetch)(api, { method: 'POST', headers, body, signal });
    if (!response.ok) throw new AIChatError('AI_FILE_UPLOAD_FAILURE', `AI file upload failed (HTTP ${response.status})`);
    const result: unknown = await response.json();
    if (!object(result) || typeof result.id !== 'string' || !result.id) throw new AIChatError('AI_FILE_UPLOAD_FAILURE', 'AI file upload returned no ID');
    return { type: 'file', id: result.id };
  };
}
