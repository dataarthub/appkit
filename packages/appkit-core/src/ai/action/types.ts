import type { ExecutionContext } from './execution';

/**
 * @file Action and Screen Context types for @alneas/appkit-core/ai
 */

/**
 * Result of an action execution.
 */
export type ActionResult<TOutput = unknown> =
  | {
      ok: true;
      data: TOutput;
    }
  | {
      ok: false;
      code: 'NOT_FOUND' | 'INVALID_INPUT' | 'EXECUTION_FAILED' | 'CANCELLED';
      error: string;
      cause?: unknown;
    };

/**
 * Result of input validation for an action.
 */
export type ActionValidationResult<TInput> =
  | {
      ok: true;
      data: TInput;
    }
  | {
      ok: false;
      error: string;
    };

/**
 * Validator function for action input.
 * Mandatory for all actions to ensure safe runtime execution.
 */
export type ActionValidator<TInput = unknown> = (
  input: unknown
) => ActionValidationResult<TInput>;

/**
 * Definition of an executable action.
 */
export interface ActionDefinition<TInput = unknown, TOutput = unknown> {
  /** Unique action identifier (e.g. 'table.filter', 'record.update') */
  id: string;
  /** Human- and agent-readable description of what this action does */
  description: string;
  /**
   * Runtime validator for the input argument.
   * Actions without input arguments should validate that input is undefined or null.
   */
  validate: ActionValidator<TInput>;
  /**
   * Action handler function.
   * Receives validated data and optional cooperative cancellation/progress context.
   * Returning success after an abort request still means the handler completed; no rollback is implied.
   */
  handler: (input: TInput, context?: ExecutionContext) => Promise<TOutput> | TOutput;
  /** Optional metadata associated with the action */
  metadata?: Record<string, unknown>;
}

/**
 * Public descriptor of an action (excluding the executable handler).
 * Safe to expose to UI lists, AI inspection, and external consumers.
 */
export interface ActionDescriptor {
  id: string;
  description: string;
  metadata?: Record<string, unknown>;
}

/**
 * Result of retrieving a context value.
 */
export type ContextValueResult<T = unknown> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      code: 'NOT_FOUND' | 'UNREGISTERED' | 'GETTER_FAILED';
      error: string;
      cause?: unknown;
    };

/**
 * Function that retrieves the current value of a context on demand.
 */
export type ContextGetter<T = unknown> = () => Promise<T> | T;

/**
 * Definition of an on-demand screen context provider.
 */
export interface ContextDefinition<T = unknown> {
  /** Unique context key (e.g. 'selectedRecord', 'tableState') */
  key: string;
  /** Human- and agent-readable description of what this context represents */
  description?: string;
  /** Getter function returning the latest context value */
  getter: ContextGetter<T>;
}

/**
 * Public descriptor of a context (excluding the getter).
 */
export interface ContextDescriptor {
  key: string;
  description?: string;
}
