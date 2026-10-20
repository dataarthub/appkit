import type { ExecutionContext } from './execution';
import type { AnySchemaObject } from 'ajv';

/**
 * Application-owned synchronous JSON Schema; finite JSON and supported drafts are checked at runtime.
 *
 * @see {@link defineActionTool} for canonical public-import usage and setup.
 */
export type ActionToolInputSchema = Readonly<AnySchemaObject> & {
  /** Discriminant selecting the object variant. */
  readonly type: 'object';
  /** Disallowed asynchronous-schema marker; the boundary supports synchronous validation only. */
  readonly $async?: never };

/**
 * JSON values accepted at the tool boundary; functions, undefined and non-finite numbers are rejected.
 *
 * @see {@link defineActionTool} for canonical public-import usage and setup.
 */
export type ActionToolValue = null | boolean | number | string | readonly ActionToolValue[] | ActionToolObject;
/**
 * A JSON object at the tool boundary.
 *
 * @see {@link defineActionTool} for canonical public-import usage and setup.
 */
export interface ActionToolObject { readonly [key: string]: ActionToolValue }

/**
 * Provider-neutral tool description. Contains only explicitly selected public information.
 *
 * @see {@link defineActionTool} for canonical public-import usage and setup.
 */
export interface ActionToolDescriptor {

  /** Tool name containing 1–64 ASCII letters, digits, underscores or hyphens. */
  readonly name: string;

  /** Human- and model-readable description supplied explicitly by the application. */
  readonly description: string;

  /** Synchronous draft-07 (default) or 2020-12 schema, with an object root. */
  readonly inputSchema: ActionToolInputSchema;
}

/**
 * Explicitly exposes one registered action or context under a public tool name.
 *
 * @see {@link defineActionTool} for canonical public-import usage and setup.
 */
export type ActionToolBinding = ActionToolDescriptor & {

  /**
   * Required disclosure boundary. Select only values that may leave the application.
   *
   * @param value - Unknown action/context result to inspect and project synchronously.
   * @returns Explicit disclosure projection; invalid JSON or thrown projection errors become INVALID_OUTPUT.
   *
   * @example
   * ```typescript
   * import type { ActionToolBinding } from '@alneas/appkit-core/ai/action';
   *
   * export function project(binding: ActionToolBinding, value: unknown) {
   *   return binding.mapOutput(value);
   * }
   * ```
   */
  readonly mapOutput: (value: unknown) => unknown;
} & (
  | {

  /** Discriminant selecting the action variant. */
  readonly kind: 'action';

  /** Registry action identifier exposed by this action binding. */
  readonly actionId: string;

  /**
   * Maps validated JSON arguments to the registered action input (e.g. {} to undefined).
   *
   * @param args - Schema-validated frozen JSON arguments.
   * @returns Registered action input; omission uses args unchanged, while exceptions become INVALID_INPUT.
   *
   * @example
   * ```typescript
   * import type { ActionToolBinding } from '@alneas/appkit-core/ai/action';
   *
   * export function map(binding: Extract<ActionToolBinding, { kind: 'action' }>) {
   *   return binding.mapInput ? binding.mapInput({}) : {};
   * }
   * ```
   */
  readonly mapInput?: (args: ActionToolObject) => unknown;
    }
  | {

  /** Discriminant selecting the context variant. */
  readonly kind: 'context';

  /** Registry context key exposed by this context binding. */
  readonly contextKey: string;
    }
);

/**
 * A fully assembled call. The application parses provider JSON strings before invoking the bridge.
 *
 * @see {@link defineActionTool} for canonical public-import usage and setup.
 */
export interface ActionToolCall {

  /** Application/provider call identifier; duplicates are rejected for the bridge lifetime. */
  readonly callId: string;

  /** Public tool/component name selected by the application; not inferred from executable code. */
  readonly name: string;

  /** Already-parsed untrusted input; schema validation still occurs before execution. */
  readonly arguments: unknown;
}

/**
 * Sanitized bridge failures. Original exceptions, metadata and validator messages are never returned.
 *
 * @see {@link defineActionTool} for canonical public-import usage and setup.
 */
export type ActionToolErrorCode =
  | 'INVALID_CALL' | 'NOT_EXPOSED' | 'NOT_AVAILABLE' | 'INVALID_INPUT'
  | 'CANCELLED' | 'EXECUTION_FAILED' | 'INVALID_OUTPUT' | 'DUPLICATE_CALL' | 'CALL_LIMIT' | 'CLOSED';

/**
 * JSON-serializable result correlated to the original call.
 *
 * @see {@link defineActionTool} for canonical public-import usage and setup.
 */
export type ActionToolResult = {
  /** Application/provider call identifier; duplicates are rejected for the bridge lifetime. */
  readonly callId: string;
  /** Public tool/component name selected by the application; not inferred from executable code. */
  readonly name: string } & (
  | {
  /** Discriminant indicating whether this operation succeeded. */
  readonly ok: true;
  /** Validated or projected result data carried by the successful variant. */
  readonly data: ActionToolValue }
  | {
  /** Discriminant indicating whether this operation succeeded. */
  readonly ok: false;
  /** Failure category for programmatic handling without inspecting display text. */
  readonly code: ActionToolErrorCode;
  /** Fixed sanitized bridge failure text; original exceptions and validator messages are not disclosed. */
  readonly error: string;
  /** Optional public documentation link explaining this failure category. */
  readonly docsUrl?: string;
  /** Optional fixed recovery guidance; no automatic retry is performed. */
  readonly recovery?: string }
);

/**
 * One bounded tool session. Start a new bridge for a new conversation/session.
 *
 * @see {@link defineActionTool} for canonical public-import usage and setup.
 */
export interface ActionToolBridgeOptions {

  /** Explicit tool bindings available to this bridge; only registered targets are listed. */
  readonly tools: readonly ActionToolBinding[];

  /** Maximum unique valid call envelopes retained for duplicate rejection. Default 1000; no eviction. */
  readonly maxCalls?: number;
}

/**
 * SDK-independent tool session. Neither a transport nor a server authorization boundary.
 *
 * @see {@link defineActionTool} for canonical public-import usage and setup.
 */
export interface ActionToolBridge {

  /**
   * Lists explicitly exposed tools whose action/context is currently registered.
   *
   * @returns Frozen descriptors of exposed targets currently registered; empty after close.
   *
   * @example
   * ```typescript
   * import type { ActionToolBridge } from '@alneas/appkit-core/ai/action';
   *
   * export async function example(bridge: ActionToolBridge) {
   *   return bridge.listTools();
   * }
   * ```
   */
  listTools(): readonly ActionToolDescriptor[];

  /**
   * Executes once per callId in this session, after schema and registered action validation.
   *
   * @param call - Assembled call envelope with a unique callId and already-parsed arguments.
   * @param context - Optional cooperative cancellation/progress context for action execution.
   * @returns A frozen JSON result or fixed sanitized failure; no automatic retry or durable deduplication.
   *
   * @example
   * ```typescript
   * import type { ActionToolBridge } from '@alneas/appkit-core/ai/action';
   *
   * export async function example(bridge: ActionToolBridge) {
   *   return bridge.execute({ callId: 'call-1', name: 'echo_text', arguments: { text: 'hello' } });
   * }
   * ```
   */
  execute(call: ActionToolCall, context?: ExecutionContext): Promise<ActionToolResult>;

  /**
   * Rejects future calls and suppresses in-flight results; does not undo started side effects.
   *
   * @returns No value; rejects future calls and suppresses in-flight results without undoing side effects.
   *
   * @example
   * ```typescript
   * import type { ActionToolBridge } from '@alneas/appkit-core/ai/action';
   *
   * export async function example(bridge: ActionToolBridge) {
   *   return bridge.close();
   * }
   * ```
   */
  close(): void;
}
