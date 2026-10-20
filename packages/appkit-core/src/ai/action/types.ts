import type { ExecutionContext } from './execution';

/**
 * Local action dispatch outcome with successful output or application-facing failure details.
 *
 * @typeParam TOutput - Action handler result shape; unknown where a default is provided.
 * @see {@link defineActionTool} for canonical public-import usage and setup.
 */
export type ActionResult<TOutput = unknown> =
  | {

  /** Discriminant indicating whether this operation succeeded. */
  ok: true;

  /** Validated or projected result data carried by the successful variant. */
  data: TOutput;
    }
  | {

  /** Discriminant indicating whether this operation succeeded. */
  ok: false;

  /** Failure category for programmatic handling without inspecting display text. */
  code: 'NOT_FOUND' | 'INVALID_INPUT' | 'EXECUTION_FAILED' | 'CANCELLED';

  /** Human-readable failure description; see the owning boundary for sanitization rules. */
  error: string;

  /** Optional public documentation link explaining this failure category. */
  readonly docsUrl?: string;

  /** Optional fixed recovery guidance; no automatic retry is performed. */
  readonly recovery?: string;

  /** Original caught exception retained for the initiating application; avoid disclosing it to external tools. */
  cause?: unknown;
    };

/**
 * Result of input validation for an action.
 *
 * @typeParam TInput - Validated action input shape; unknown where a default is provided.
 * @see {@link defineActionTool} for canonical public-import usage and setup.
 */
export type ActionValidationResult<TInput> =
  | {

  /** Discriminant indicating whether this operation succeeded. */
  ok: true;

  /** Validated or projected result data carried by the successful variant. */
  data: TInput;
    }
  | {

  /** Discriminant indicating whether this operation succeeded. */
  ok: false;

  /** Human-readable failure description; see the owning boundary for sanitization rules. */
  error: string;
    };

/**
 * Validator function for action input.
 * Mandatory for all actions to ensure safe runtime execution.
 *
 * @typeParam TInput - Validated action input shape; unknown where a default is provided.
 * @see {@link defineActionTool} for canonical public-import usage and setup.
 * @param input - Untrusted caller input to check synchronously.
 * @returns A success containing TInput or a validation failure; the registry converts thrown validation errors into INVALID_INPUT.
 *
 * @example
 * ```typescript
 * import type { ActionValidator } from '@alneas/appkit-core/ai/action';
 *
 * const validate: ActionValidator<string> = input => typeof input === 'string' ? { ok: true, data: input } : { ok: false, error: 'String required' };
 * console.log(validate('hello'));
 * ```
 */
export type ActionValidator<TInput = unknown> = (
  input: unknown
) => ActionValidationResult<TInput>;

/**
 * Definition of an executable action.
 *
 * @typeParam TInput - Validated action input shape; unknown where a default is provided.
 * @typeParam TOutput - Action handler result shape; unknown where a default is provided.
 * @see {@link defineActionTool} for canonical public-import usage and setup.
 */
export interface ActionDefinition<TInput = unknown, TOutput = unknown> {

  /** Unique action identifier (e.g. 'table.filter', 'record.update') */
  id: string;

  /** Human- and agent-readable description of what this action does */
  description: string;

  /**
   * Runtime validator for the input argument.
   * Actions without input arguments should validate that input is undefined or null.
   *
   * @param input - Untrusted input passed to the synchronous validator immediately before handler dispatch.
   * @returns Validation success with typed input or failure; throwing is converted to INVALID_INPUT.
   *
   * @example
   * ```typescript
   * import type { ActionDefinition } from '@alneas/appkit-core/ai/action';
   *
   * export function check(action: ActionDefinition<string, string>, input: unknown) {
   *   return action.validate(input);
   * }
   * ```
   */
  validate: ActionValidator<TInput>;

  /**
   * Action handler function.
   * Receives validated data and optional cooperative cancellation/progress context.
   * Returning success after an abort request still means the handler completed; no rollback is implied.
   *
   * @param input - Input produced by successful validation.
   * @param context - Optional signal/progress context supplied by the initiating application.
   * @returns The output directly or by promise; registry execution converts errors to failure results.
   *
   * @example
   * ```typescript
   * import type { ActionDefinition } from '@alneas/appkit-core/ai/action';
   *
   * export async function run(action: ActionDefinition<string, string>) {
   *   return action.handler('hello');
   * }
   * ```
   */
  handler: (input: TInput, context?: ExecutionContext) => Promise<TOutput> | TOutput;

  /** Optional metadata associated with the action */
  metadata?: Record<string, unknown>;
}

/**
 * Public action descriptor without its executable handler; the host approves any metadata disclosure.
 *
 * @see {@link defineActionTool} for canonical public-import usage and setup.
 */
export interface ActionDescriptor {

  /** Nonempty identifier used to correlate this object with its owning application/session. */
  id: string;

  /** Human- and model-readable description supplied explicitly by the application. */
  description: string;

  /** Optional metadata copied by reference into descriptors; the host must approve its disclosure. */
  metadata?: Record<string, unknown>;
}

/**
 * Result of retrieving a context value.
 *
 * @typeParam T - Operation result or context value type; unknown where a default is provided.
 * @see {@link defineActionTool} for canonical public-import usage and setup.
 */
export type ContextValueResult<T = unknown> =
  | {

  /** Discriminant indicating whether this operation succeeded. */
  ok: true;

  /** Operation/context value returned to the initiating application. */
  value: T;
    }
  | {

  /** Discriminant indicating whether this operation succeeded. */
  ok: false;

  /** Failure category for programmatic handling without inspecting display text. */
  code: 'NOT_FOUND' | 'UNREGISTERED' | 'GETTER_FAILED';

  /** Human-readable failure description; see the owning boundary for sanitization rules. */
  error: string;

  /** Original caught exception retained for the initiating application; avoid disclosing it to external tools. */
  cause?: unknown;
    };

/**
 * Function that retrieves the current value of a context on demand.
 *
 * @typeParam T - Operation result or context value type; unknown where a default is provided.
 * @see {@link defineActionTool} for canonical public-import usage and setup.
 * @returns The latest application context value, directly or by promise; registry retrieval catches getter failures.
 *
 * @example
 * ```typescript
 * import type { ContextGetter } from '@alneas/appkit-core/ai/action';
 *
 * export async function read(getter: ContextGetter<string>) {
 *   return getter();
 * }
 * ```
 */
export type ContextGetter<T = unknown> = () => Promise<T> | T;

/**
 * Definition of an on-demand screen context provider.
 *
 * @typeParam T - Operation result or context value type; unknown where a default is provided.
 * @see {@link defineActionTool} for canonical public-import usage and setup.
 */
export interface ContextDefinition<T = unknown> {

  /** Unique context key (e.g. 'selectedRecord', 'tableState') */
  key: string;

  /** Human- and agent-readable description of what this context represents */
  description?: string;

  /**
   * Getter function returning the latest context value
   *
   * @returns Latest application-owned context data; invoked on demand for each getContext call and may resolve asynchronously.
   *
   * @example
   * ```typescript
   * import type { ContextDefinition } from '@alneas/appkit-core/ai/action';
   *
   * export async function read(context: ContextDefinition<string>) {
   *   return context.getter();
   * }
   * ```
   */
  getter: ContextGetter<T>;
}

/**
 * Public descriptor of a context (excluding the getter).
 *
 * @see {@link defineActionTool} for canonical public-import usage and setup.
 */
export interface ContextDescriptor {

  /** Application context registration key used for lookup. */
  key: string;

  /** Human- and model-readable description supplied explicitly by the application. */
  description?: string;
}
