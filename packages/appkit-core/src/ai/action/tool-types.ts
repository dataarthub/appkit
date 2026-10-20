import type { ExecutionContext } from './execution';
import type { AnySchemaObject } from 'ajv';

/** Application-owned synchronous JSON Schema; finite JSON and supported drafts are checked at runtime. */
export type ActionToolInputSchema = Readonly<AnySchemaObject> & { readonly type: 'object'; readonly $async?: never };

/** JSON values accepted at the tool boundary; functions, undefined and non-finite numbers are rejected. */
export type ActionToolValue = null | boolean | number | string | readonly ActionToolValue[] | ActionToolObject;
/** A JSON object at the tool boundary. */
export interface ActionToolObject { readonly [key: string]: ActionToolValue }

/** Provider-neutral tool description. Contains only explicitly selected public information. */
export interface ActionToolDescriptor {
  readonly name: string;
  readonly description: string;
  /** Synchronous draft-07 (default) or 2020-12 schema, with an object root. */
  readonly inputSchema: ActionToolInputSchema;
}

/** Explicitly exposes one registered action or context under a public tool name. */
export type ActionToolBinding = ActionToolDescriptor & {
  /** Required disclosure boundary. Select only values that may leave the application. */
  readonly mapOutput: (value: unknown) => unknown;
} & (
  | {
      readonly kind: 'action';
      readonly actionId: string;
      /** Maps validated JSON arguments to the registered action input (e.g. {} to undefined). */
      readonly mapInput?: (args: ActionToolObject) => unknown;
    }
  | {
      readonly kind: 'context';
      readonly contextKey: string;
    }
);

/** A fully assembled call. The application parses provider JSON strings before invoking the bridge. */
export interface ActionToolCall {
  readonly callId: string;
  readonly name: string;
  readonly arguments: unknown;
}

/** Sanitized bridge failures. Original exceptions, metadata and validator messages are never returned. */
export type ActionToolErrorCode =
  | 'INVALID_CALL' | 'NOT_EXPOSED' | 'NOT_AVAILABLE' | 'INVALID_INPUT'
  | 'CANCELLED' | 'EXECUTION_FAILED' | 'INVALID_OUTPUT' | 'DUPLICATE_CALL' | 'CALL_LIMIT' | 'CLOSED';

/** JSON-serializable result correlated to the original call. */
export type ActionToolResult = { readonly callId: string; readonly name: string } & (
  | { readonly ok: true; readonly data: ActionToolValue }
  | { readonly ok: false; readonly code: ActionToolErrorCode; readonly error: string; readonly docsUrl?: string; readonly recovery?: string }
);

/** One bounded tool session. Start a new bridge for a new conversation/session. */
export interface ActionToolBridgeOptions {
  readonly tools: readonly ActionToolBinding[];
  /** Maximum unique valid call envelopes retained for duplicate rejection. Default 1000; no eviction. */
  readonly maxCalls?: number;
}

/** SDK-independent tool session. Neither a transport nor a server authorization boundary. */
export interface ActionToolBridge {
  /** Lists explicitly exposed tools whose action/context is currently registered. */
  listTools(): readonly ActionToolDescriptor[];
  /** Executes once per callId in this session, after schema and registered action validation. */
  execute(call: ActionToolCall, context?: ExecutionContext): Promise<ActionToolResult>;
  /** Rejects future calls and suppresses in-flight results; does not undo started side effects. */
  close(): void;
}
