import type { ActionToolDescriptor, ActionToolObject, ActionToolValue } from '../action/tool-types';

/**
 * Provider-neutral conversation parts. Tools are data; adapters never execute them.
 *
 * @see {@link streamAIChat} for canonical public-import usage and setup.
 */
export type AIChatPart =
  | {
  /** Discriminant selecting the text variant. */
  readonly type: 'text';
  /** Text payload preserved without interpreting it as executable code. */
  readonly text: string }
  | {
  /** Discriminant selecting the file variant. */
  readonly type: 'file';
  /** File/data location supplied by the host; handling and disclosure remain application-owned. */
  readonly url: string;
  /** File MIME type supplied by the host; non-image OpenAI-compatible files require uploadFile. */
  readonly mediaType: string;
  /** Optional original filename used for file presentation or multipart upload. */
  readonly filename?: string }
  | {
  /** Discriminant selecting the tool-call variant. */
  readonly type: 'tool-call';
  /** Application/provider call identifier; duplicates are rejected for the bridge lifetime. */
  readonly callId: string;
  /** Public tool/component name selected by the application; not inferred from executable code. */
  readonly name: string;
  /** Assembled JSON object arguments for a tool call; this event does not execute the tool. */
  readonly input: ActionToolObject }
  | {
  /** Discriminant selecting the tool-result variant. */
  readonly type: 'tool-result';
  /** Application/provider call identifier; duplicates are rejected for the bridge lifetime. */
  readonly callId: string;
  /** Public tool/component name selected by the application; not inferred from executable code. */
  readonly name: string;
  /** JSON-compatible tool result supplied by the host/provider; no tool is executed by chat adapters. */
  readonly output: ActionToolValue;
  /** Optional marker indicating that the tool result represents a failure. */
  readonly isError?: boolean }
  | {
  /** Discriminant selecting the data variant. */
  readonly type: 'data';
  /** Public tool/component name selected by the application; not inferred from executable code. */
  readonly name: string;
  /** Validated or projected result data carried by the successful variant. */
  readonly data: ActionToolValue;
  /** Optional application data-part identifier preserved by supported transports. */
  readonly id?: string };
/**
 * Immutable conversation history supplied by the application.
 *
 * @see {@link streamAIChat} for canonical public-import usage and setup.
 */
export interface AIChatMessage {

  /** Nonempty identifier used to correlate this object with its owning application/session. */
  readonly id: string;

  /** Conversation role; tool-role messages may contain only tool-result parts. */
  readonly role: 'system' | 'user' | 'assistant' | 'tool';

  /** Ordered immutable text/file/tool/data parts for this message. */
  readonly parts: readonly AIChatPart[];

  /** Optional application-owned metadata; disclosure decisions belong to the host. */
  readonly metadata?: ActionToolValue;
}
/**
 * Common request. Provider options are application-owned, never taken from a model response.
 *
 * @see {@link streamAIChat} for canonical public-import usage and setup.
 */
export interface AIChatRequest {

  /** Application conversation history; snapshots preserve order without trimming. */
  readonly messages: readonly AIChatMessage[];

  /** Optional explicitly disclosed public tool descriptors sent to the endpoint; handlers are not serialized. */
  readonly tools?: readonly ActionToolDescriptor[];

  /** Optional host-owned provider parameters; never trust model output as configuration. */
  readonly parameters?: ActionToolObject;

  /** Optional application conversation identifier forwarded when supported by the transport. */
  readonly conversationId?: string;

  /** AI SDK endpoint trigger, default submit-message when omitted by the request. */
  readonly trigger?: 'submit-message' | 'regenerate-message';

  /** Optional message identifier; the AI SDK adapter defaults to the last message ID. */
  readonly messageId?: string;

  /** Abort signal for cooperative cancellation; cancellation does not roll back completed side effects. */
  readonly signal?: AbortSignal;
}
/**
 * Streamed provider-neutral events. finish is explicit; EOF is not successful completion.
 *
 * @see {@link streamAIChat} for canonical public-import usage and setup.
 */
export type AIChatEvent =
  | {
  /** Discriminant selecting the text-delta variant. */
  readonly type: 'text-delta';
  /** Text payload preserved without interpreting it as executable code. */
  readonly text: string }
  | Extract<AIChatPart, { type: 'tool-call' | 'tool-result' | 'data' }>
  | {
  /** Discriminant selecting the metadata variant. */
  readonly type: 'metadata';
  /** Optional application-owned metadata; disclosure decisions belong to the host. */
  readonly metadata: ActionToolValue }
  | {
  /** Discriminant selecting the finish variant. */
  readonly type: 'finish';
  /** Normalized finish category supplied by the adapter. */
  readonly reason: 'stop' | 'tool-calls' | 'length' | 'content-filter' | 'other' };
/**
 * Capabilities describe adapter transport support, not every upstream model's support.
 *
 * @see {@link streamAIChat} for canonical public-import usage and setup.
 */
export interface AIChatCapabilities {

  /** Whether the transport carries tool descriptions/calls/results; it does not authorize or execute tools. */
  readonly tools: boolean;

  /** Whether the transport can carry structured data events; not a guarantee about every model. */
  readonly structuredData: boolean;

  /** Whether the transport can represent files; provider/upload requirements still apply. */
  readonly files: boolean;
}
/**
 * Replace a transport without changing Action, Proposal or Generative UI application code.
 *
 * @see {@link streamAIChat} for canonical public-import usage and setup.
 */
export interface AIChatAdapter {

  /** Stable adapter implementation identifier, such as ai-sdk-ui-stream. */
  readonly id: string;

  /** Transport-level feature flags; upstream model support remains host-selected. */
  readonly capabilities: AIChatCapabilities;

  /**
   * Must release network resources on abort or early iterator return. No automatic tool execution/retry.
   *
   * @param request - Host-owned messages/tools/parameters and optional signal; adapters must release I/O on abort/early return.
   * @returns An async iterable of normalized events including explicit finish; the transport does not execute tools or retry.
   * @throws Iteration propagates transport, parsing, validation or cancellation failures.
   *
   * @example
   * ```typescript
   * import type { AIChatAdapter } from '@alneas/appkit-core/ai/ai-chat';
   *
   * export async function example(adapter: AIChatAdapter) {
   *   return adapter.stream({ messages: [{ id: 'message-1', role: 'user', parts: [{ type: 'text', text: 'hello' }] }] });
   * }
   * ```
   */
  stream(request: AIChatRequest): AsyncIterable<AIChatEvent>;
}
/**
 * HTTP transport configuration. Supply a proxy URL in browsers; credentials remain host-owned.
 *
 * @see {@link streamAIChat} for canonical public-import usage and setup.
 */
export interface AIChatHTTPOptions {

  /** HTTP endpoint/proxy URL selected by the application; credentials and access policy remain host-owned. */
  readonly api: string;

  /** Optional request headers snapshotted at adapter construction. */
  readonly headers?: Readonly<Record<string, string>>;

  /**
   * Optional host HTTP implementation; omitted uses globalThis.fetch.
   *
   * @param input - HTTP endpoint passed to the configured fetch implementation.
   * @param init - Request method, headers/body and optional cancellation signal.
   * @returns A standard Response promise; rejection propagates through the calling adapter.
   * @remarks Omission uses globalThis.fetch. The host implementation owns I/O and should honor AbortSignal.
   *
   * @example
   * ```typescript
   * import type { AIChatHTTPOptions } from '@alneas/appkit-core/ai/ai-chat';
   *
   * export function endpoint(api: string, fetch: NonNullable<AIChatHTTPOptions['fetch']>) {
   *   return { api, fetch } satisfies AIChatHTTPOptions;
   * }
   * ```
   */
  readonly fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

  /** Bounded stream size in decoded characters. Default 1,000,000; maximum 10,000,000. */
  readonly maxResponseChars?: number;
}
