import {getAIErrorInfo} from '../errors/index';
function actionRecovery(code:string){const {docsUrl,recovery}=getAIErrorInfo('action',code)!;return {docsUrl,recovery};}
import type { ExecutionContext } from './execution';
/**
 * @file ActionRegistry implementation for @alneas/appkit-core/ai
 */

import type {
  ActionDefinition,
  ActionDescriptor,
  ActionResult,
  ContextDefinition,
  ContextDescriptor,
  ContextValueResult,
} from './types';

interface ActionEntry {
  definition: ActionDefinition<any, any>;
  token: symbol;
}

interface ContextEntry {
  definition: ContextDefinition<any>;
  token: symbol;
}

/**
 * Registry for managing explicit screen actions and on-demand context getters.
 * Framework-independent, zero-dependency.
 */
export class ActionRegistry {
  private actions = new Map<string, ActionEntry>();
  private contexts = new Map<string, ContextEntry>();
  private listeners = new Set<() => void>();

  // Cached stable snapshots for useSyncExternalStore
  private actionListSnapshot: readonly ActionDescriptor[] = [];
  private contextListSnapshot: readonly ContextDescriptor[] = [];

  /** Creates an empty, screen-independent registry. */
  constructor() {
    this.updateActionListSnapshot();
    this.updateContextListSnapshot();
  }

  // ---------------------------------------------------------------------------
  // Action Registration & Execution
  // ---------------------------------------------------------------------------

  /**
   * Registers an action. Returns an unregister function scoped to this specific registration.
   * Throws an Error if an action with the same ID is already registered.
   */
  registerAction<TInput, TOutput>(
    action: ActionDefinition<TInput, TOutput>
  ): () => void {
    if (!action || typeof action.id !== 'string' || !action.id.trim()) {
      throw new Error('Action id must be a non-empty string');
    }
    if (this.actions.has(action.id)) {
      throw new Error(`Action with id "${action.id}" is already registered`);
    }
    if (typeof action.validate !== 'function') {
      throw new Error(`Action validator for "${action.id}" must be a function`);
    }
    if (typeof action.handler !== 'function') {
      throw new Error(`Action handler for "${action.id}" must be a function`);
    }

    const id = action.id;
    const token = Symbol(`action:${id}`);
    this.actions.set(id, {
      definition: Object.freeze({ ...action }),
      token,
    });

    this.updateActionListSnapshot();
    this.notify();

    let unregistered = false;
    return () => {
      if (unregistered) return;
      unregistered = true;

      const current = this.actions.get(id);
      if (current && current.token === token) {
        this.actions.delete(id);
        this.updateActionListSnapshot();
        this.notify();
      }
    };
  }

  /**
   * Checks if an action is currently registered.
   */
  hasAction(id: string): boolean {
    return this.actions.has(id);
  }

  /**
   * Returns the action definition if registered.
   */
  getAction(id: string): ActionDefinition<any, any> | undefined {
    return this.actions.get(id)?.definition;
  }

  /**
   * Returns a stable snapshot of public action descriptors.
   * The returned array reference is unchanged as long as registrations do not change.
   */
  listActions(): readonly ActionDescriptor[] {
    return this.actionListSnapshot;
  }

  /**
   * Executes an action by its ID with validation.
   * Returns an ActionResult containing either data or a typed failure code.
   */
  async executeAction(
    id: string,
    input: unknown,
    context?: ExecutionContext,
  ): Promise<ActionResult<unknown>> {
    const cancelled = (): ActionResult<unknown> => ({ ok: false, code: 'CANCELLED', ...actionRecovery('CANCELLED'), error: 'Execution was cancelled' });
    if (context?.signal.aborted) return cancelled();
    const entry = this.actions.get(id);
    if (!entry) {
      return {
        ok: false,
        code: 'NOT_FOUND', ...actionRecovery('NOT_FOUND'),
        error: `Action "${id}" is not registered`,
      };
    }

    const { definition, token } = entry;

    let validatedData: unknown;
    try {
      const validation = definition.validate(input);
      if (!validation || typeof validation !== 'object' || typeof validation.ok !== 'boolean') {
        return {
          ok: false,
          code: 'INVALID_INPUT', ...actionRecovery('INVALID_INPUT'),
          error: `Validator for action "${id}" returned an invalid result`,
        };
      }
      if (!validation.ok) {
        return {
          ok: false,
          code: 'INVALID_INPUT', ...actionRecovery('INVALID_INPUT'),
          error: validation.error || `Invalid input for action "${id}"`,
        };
      }
      validatedData = validation.data;
    } catch (err: any) {
      return {
        ok: false,
        code: 'INVALID_INPUT', ...actionRecovery('INVALID_INPUT'),
        error: err?.message || `Validator for action "${id}" threw an error`,
        cause: err,
      };
    }

    // Verify registration was not removed during validation
    const current = this.actions.get(id);
    if (!current || current.token !== token) {
      return {
        ok: false,
        code: 'NOT_FOUND', ...actionRecovery('NOT_FOUND'),
        error: `Action "${id}" was unregistered before execution`,
      };
    }

    try {
      if (context?.signal.aborted) return cancelled();
      const output = await (context ? definition.handler(validatedData, context) : definition.handler(validatedData));
      return {
        ok: true,
        data: output,
      };
    } catch (err: any) {
      if (context?.signal.aborted && err instanceof Error && err.name === 'AbortError') return cancelled();
      return {
        ok: false,
        code: 'EXECUTION_FAILED', ...actionRecovery('EXECUTION_FAILED'),
        error: err?.message || `Execution of action "${id}" failed`,
        cause: err,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Context Registration & Retrieval
  // ---------------------------------------------------------------------------

  /**
   * Registers a screen context provider. Returns an unregister function scoped to this registration.
   * Throws an Error if a context with the same key is already registered.
   */
  registerContext<T>(definition: ContextDefinition<T>): () => void {
    if (!definition || typeof definition.key !== 'string' || !definition.key.trim()) {
      throw new Error('Context key must be a non-empty string');
    }
    if (this.contexts.has(definition.key)) {
      throw new Error(`Context with key "${definition.key}" is already registered`);
    }
    if (typeof definition.getter !== 'function') {
      throw new Error(`Context getter for "${definition.key}" must be a function`);
    }

    const key = definition.key;
    const token = Symbol(`context:${key}`);
    this.contexts.set(key, {
      definition: Object.freeze({ ...definition }),
      token,
    });

    this.updateContextListSnapshot();
    this.notify();

    let unregistered = false;
    return () => {
      if (unregistered) return;
      unregistered = true;

      const current = this.contexts.get(key);
      if (current && current.token === token) {
        this.contexts.delete(key);
        this.updateContextListSnapshot();
        this.notify();
      }
    };
  }

  /**
   * Checks if a context provider is currently registered.
   */
  hasContext(key: string): boolean {
    return this.contexts.has(key);
  }

  /**
   * Returns a stable snapshot of public context descriptors.
   * The returned array reference is unchanged as long as registrations do not change.
   */
  listContexts(): readonly ContextDescriptor[] {
    return this.contextListSnapshot;
  }

  /**
   * Retrieves the current value of a context on demand.
   * Safely catches errors and verifies that the registration was not removed or replaced
   * while the getter was executing.
   */
  async getContext(key: string): Promise<ContextValueResult<unknown>> {
    const entry = this.contexts.get(key);
    if (!entry) {
      return {
        ok: false,
        code: 'NOT_FOUND',
        error: `Context "${key}" is not registered`,
      };
    }

    const { definition, token } = entry;

    try {
      const value = await definition.getter();

      // Check if registration was modified during async getter execution
      const current = this.contexts.get(key);
      if (!current || current.token !== token) {
        return {
          ok: false,
          code: 'UNREGISTERED',
          error: `Context "${key}" was unregistered or replaced during value retrieval`,
        };
      }

      return {
        ok: true,
        value,
      };
    } catch (err: any) {
      return {
        ok: false,
        code: 'GETTER_FAILED',
        error: err?.message || `Getter for context "${key}" failed`,
        cause: err,
      };
    }
  }

  /**
   * Retrieves all registered contexts on demand as a key-value record of results.
   */
  async getAllContext(): Promise<Record<string, ContextValueResult<unknown>>> {
    const keys = Array.from(this.contexts.keys());
    const results: Record<string, ContextValueResult<unknown>> = Object.create(null);
    for (const key of keys) {
      results[key] = await this.getContext(key);
    }
    return results;
  }

  // ---------------------------------------------------------------------------
  // Subscription (useSyncExternalStore support)
  // ---------------------------------------------------------------------------

  /**
   * Subscribes a listener to registration changes.
   * Returns an unsubscribe function.
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        // Observers should not break registry operation
      }
    }
  }

  private updateActionListSnapshot(): void {
    this.actionListSnapshot = Object.freeze(
      Array.from(this.actions.values()).map(entry => Object.freeze({
        id: entry.definition.id,
        description: entry.definition.description,
        ...(entry.definition.metadata ? { metadata: entry.definition.metadata } : {}),
      }))
    );
  }

  private updateContextListSnapshot(): void {
    this.contextListSnapshot = Object.freeze(
      Array.from(this.contexts.values()).map(entry => Object.freeze({
        key: entry.definition.key,
        ...(entry.definition.description
          ? { description: entry.definition.description }
          : {}),
      }))
    );
  }
}
