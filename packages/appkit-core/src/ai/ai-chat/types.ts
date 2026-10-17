import type { ActionToolDescriptor, ActionToolObject, ActionToolValue } from '../action/tool-types';

/** Provider-neutral conversation parts. Tools are data; adapters never execute them. */
export type AIChatPart =
  | { readonly type: 'text'; readonly text: string }
  | { readonly type: 'file'; readonly url: string; readonly mediaType: string; readonly filename?: string }
  | { readonly type: 'tool-call'; readonly callId: string; readonly name: string; readonly input: ActionToolObject }
  | { readonly type: 'tool-result'; readonly callId: string; readonly name: string; readonly output: ActionToolValue; readonly isError?: boolean }
  | { readonly type: 'data'; readonly name: string; readonly data: ActionToolValue; readonly id?: string };
/** Immutable conversation history supplied by the application. */
export interface AIChatMessage {
  readonly id: string;
  readonly role: 'system' | 'user' | 'assistant' | 'tool';
  readonly parts: readonly AIChatPart[];
  readonly metadata?: ActionToolValue;
}
/** Common request. Provider options are application-owned, never taken from a model response. */
export interface AIChatRequest {
  readonly messages: readonly AIChatMessage[];
  readonly tools?: readonly ActionToolDescriptor[];
  readonly parameters?: ActionToolObject;
  readonly conversationId?: string;
  readonly trigger?: 'submit-message' | 'regenerate-message';
  readonly messageId?: string;
  readonly signal?: AbortSignal;
}
/** Streamed provider-neutral events. finish is explicit; EOF is not successful completion. */
export type AIChatEvent =
  | { readonly type: 'text-delta'; readonly text: string }
  | Extract<AIChatPart, { type: 'tool-call' | 'tool-result' | 'data' }>
  | { readonly type: 'metadata'; readonly metadata: ActionToolValue }
  | { readonly type: 'finish'; readonly reason: 'stop' | 'tool-calls' | 'length' | 'content-filter' | 'other' };
/** Capabilities describe adapter transport support, not every upstream model's support. */
export interface AIChatCapabilities {
  readonly tools: boolean;
  readonly structuredData: boolean;
  readonly files: boolean;
}
/** Replace a transport without changing Action, Proposal or Generative UI application code. */
export interface AIChatAdapter {
  readonly id: string;
  readonly capabilities: AIChatCapabilities;
  /** Must release network resources on abort or early iterator return. No automatic tool execution/retry. */
  stream(request: AIChatRequest): AsyncIterable<AIChatEvent>;
}
/** HTTP transport configuration. Supply a proxy URL in browsers; credentials remain host-owned. */
export interface AIChatHTTPOptions {
  readonly api: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  /** Bounded stream size in decoded characters. Default 1,000,000; maximum 10,000,000. */
  readonly maxResponseChars?: number;
}
