/**
 * Finite progress values; message is explicitly supplied public UI text, never raw input.
 *
 * @see {@link createExecutionSession} for canonical public-import usage and setup.
 */
export interface ExecutionProgress {

  /** Finite nonnegative completed-work units; invalid progress reports are ignored. */
  readonly completed: number;

  /** Optional finite total work units, at least completed; omission leaves total unknown. */
  readonly total?: number;

  /** Optional public progress text, at most 500 characters; do not include raw secrets or inputs. */
  readonly message?: string;
}
/**
 * Cooperative execution context. Cancellation does not roll back completed effects.
 *
 * @see {@link createExecutionSession} for canonical public-import usage and setup.
 */
export interface ExecutionContext {

  /** Abort signal for cooperative cancellation; cancellation does not roll back completed side effects. */
  readonly signal: AbortSignal;

  /**
   * Publishes a validated progress snapshot while this operation remains active.
   *
   * @param progress - Finite completed/optional total units and bounded public text; invalid reports are ignored.
   * @returns No value; publishes valid progress only while this execution is active.
   *
   * @example
   * ```typescript
   * import type { ExecutionContext } from '@alneas/appkit-core/ai/action';
   *
   * export function report(context: ExecutionContext) {
   *   context.reportProgress({ completed: 1, total: 2 });
   * }
   * ```
   */
  readonly reportProgress: (progress: ExecutionProgress) => void;
}
/**
 * Summary-only, in-memory history. Payloads, outputs and raw exceptions are not retained.
 *
 * @see {@link createExecutionSession} for canonical public-import usage and setup.
 */
export interface ExecutionRecord {

  /** Monotonically increasing in-memory execution ID, never reused within this session. */
  readonly id: number;

  /** Nonblank execution label, at most 200 characters, stored in transient history. */
  readonly label: string;

  /** Execution lifecycle state; cancellation can remain pending until the handler settles. */
  readonly status: 'running' | 'cancelling' | 'succeeded' | 'failed' | 'cancelled';

  /** Execution start timestamp in milliseconds since the Unix epoch. */
  readonly startedAt: number;

  /** Optional completion timestamp in milliseconds since the Unix epoch. */
  readonly finishedAt?: number;

  /** Whether cancellation was requested, even if the handler ultimately succeeded. */
  readonly cancelRequested: boolean;

  /** Most recently accepted progress snapshot; absent before the first valid report. */
  readonly progress?: ExecutionProgress;
}
/**
 * Raw values/errors are returned only to the initiating application, never stored in history.
 *
 * @typeParam T - Operation result or context value type; unknown where a default is provided.
 * @see {@link createExecutionSession} for canonical public-import usage and setup.
 */
export type ExecutionOutcome<T> = {
  /** Execution lifecycle state; cancellation can remain pending until the handler settles. */
  readonly status: 'succeeded';
  /** Operation/context value returned to the initiating application. */
  readonly value: T }
  | {
  /** Execution lifecycle state; cancellation can remain pending until the handler settles. */
  readonly status: 'failed';
  /** Original thrown or rejected value, returned unchanged to the initiating host; inspect and sanitize before display. */
  readonly error: unknown }
  | {
  /** Execution lifecycle state; cancellation can remain pending until the handler settles. */
  readonly status: 'cancelled' };
/**
 * Single-flight execution with bounded immutable snapshots for external-store subscriptions.
 *
 * @see {@link createExecutionSession} for canonical public-import usage and setup.
 */
export interface ExecutionSession {

  /**
   * Reads the current stable immutable execution-history snapshot.
   *
   * @returns The same frozen array until the session state changes; initially empty.
   *
   * @example
   * ```typescript
   * import type { ExecutionSession } from '@alneas/appkit-core/ai/action';
   *
   * export async function example(session: ExecutionSession) {
   *   return session.getSnapshot();
   * }
   * ```
   */
  getSnapshot(): readonly ExecutionRecord[];

  /**
   * Subscribes to execution-history changes.
   *
   * @param listener - Zero-argument synchronous notification callback; return value is ignored and observer errors are caught.
   * @returns An unsubscribe callback; call it when the observer is disposed.
   *
   * @example
   * ```typescript
   * import type { ExecutionSession } from '@alneas/appkit-core/ai/action';
   *
   * export async function example(session: ExecutionSession) {
   *   return session.subscribe(() => console.log(session.getSnapshot()));
   * }
   * ```
   */
  subscribe(listener: () => void): () => void;

  /**
   * Runs one operation while retaining the single-flight lock until it settles.
   *
   * @typeParam T - Value returned or resolved by the supplied work callback.
   * @param label - Nonblank public label of at most 200 characters.
   * @param work - Called once with signal/progress context; returns T or a promise of T. Throw/rejection becomes a failed/cancelled outcome.
   * @returns The operation outcome; cancellation followed by successful work still produces succeeded.
   * @throws Rejects a closed/busy session, invalid label or missing work callback.
   *
   * @example
   * ```typescript
   * import type { ExecutionSession } from '@alneas/appkit-core/ai/action';
   *
   * export async function example(session: ExecutionSession) {
   *   return session.run('Sum values', () => 1 + 2);
   * }
   * ```
   */
  run<T>(label: string, work: (context: ExecutionContext) => T | Promise<T>): Promise<ExecutionOutcome<T>>;

  /**
   * Requests cooperative cancellation of the active operation.
   *
   * @returns No value; marks an active operation cancelling and aborts its signal. It does not release the lock or roll back effects.
   *
   * @example
   * ```typescript
   * import type { ExecutionSession } from '@alneas/appkit-core/ai/action';
   *
   * export async function example(session: ExecutionSession) {
   *   return session.cancel();
   * }
   * ```
   */
  cancel(): void;

  /**
   * Clears completed history while retaining an active execution record.
   *
   * @returns No value; publishes the filtered history snapshot without reusing IDs.
   *
   * @example
   * ```typescript
   * import type { ExecutionSession } from '@alneas/appkit-core/ai/action';
   *
   * export async function example(session: ExecutionSession) {
   *   return session.clearHistory();
   * }
   * ```
   */
  clearHistory(): void;

  /**
   * Prevents new work and requests cancellation of active work.
   *
   * @returns No value; future run calls reject, while active work retains the lock until settlement.
   *
   * @example
   * ```typescript
   * import type { ExecutionSession } from '@alneas/appkit-core/ai/action';
   *
   * export async function example(session: ExecutionSession) {
   *   return session.close();
   * }
   * ```
   */
  close(): void;
}

/**
 * Creates a framework-independent execution session (default history limit 50, max 1000).
 * One operation runs at a time. cancel changes status to cancelling and aborts its signal;
 * it does not race the promise or unlock a handler that ignores cancellation. A handler
 * resolving after cancellation is recorded as succeeded with cancelRequested=true.
 * Only an AbortError after a cancellation request is recorded as cancelled. Other errors
 * remain failures. Late progress updates are ignored. Observers cannot break execution.
 *
 * History contains bounded labels/progress only, not inputs, results or exception details.
 * It is transient UI state, not an audit log or durable deduplication. Applications must
 * handle server authorization, idempotency and uncertain commit outcomes themselves.
 *
 * @param options - Optional historyLimit configuration; defaults to {} and historyLimit 50.
 * @returns A single-flight in-memory session; the host must close it when no longer needed.
 * @throws Throws when historyLimit is not an integer from 1 to 1000.
 *
 * @example
 * ```typescript
 * import { createExecutionSession } from '@alneas/appkit-core/ai/action';
 *
 * const session = createExecutionSession();
 * try {
 *   const outcome = await session.run('Sum values', ({ signal, reportProgress }) => {
 *     signal.throwIfAborted();
 *     reportProgress({ completed: 1, total: 1, message: 'Calculated locally' });
 *     return [1, 2, 3].reduce((sum, value) => sum + value, 0);
 *   });
 *   console.log(outcome, session.getSnapshot());
 * } finally {
 *   session.close();
 * }
 * ```
 */
export function createExecutionSession(options: {
  /** Maximum in-memory history records retained, integer 1–1000; defaults to 50. */
  readonly historyLimit?: number } = {}): ExecutionSession {
  const limit = options.historyLimit ?? 50;
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error('historyLimit must be between 1 and 1000');
  let records: readonly ExecutionRecord[] = Object.freeze([]);
  const listeners = new Set<() => void>();
  let active: { id: number; controller: AbortController } | undefined;
  let nextId = 0;
  let closed = false;
  const notify = () => { for (const listener of listeners) { try { listener(); } catch { /* Observers cannot change execution results. */ } } };
  const patch = (id: number, value: Partial<ExecutionRecord>) => {
    records = Object.freeze(records.map(record => record.id === id ? Object.freeze({ ...record, ...value }) : record));
    notify();
  };
  const cancel = () => {
    if (!active || active.controller.signal.aborted) return;
    const current = active;
    current.controller.abort();
    patch(current.id, { status: 'cancelling', cancelRequested: true });
  };
  return {
    getSnapshot: () => records,
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    async run<T>(label: string, work: (context: ExecutionContext) => T | Promise<T>): Promise<ExecutionOutcome<T>> {
      if (closed || active) throw new Error(closed ? 'Execution session is closed' : 'Execution is already running');
      if (typeof label !== 'string' || !label.trim() || label.length > 200 || typeof work !== 'function') throw new Error('Execution requires a short label and handler');
      const current = { id: ++nextId, controller: new AbortController() };
      active = current;
      records = Object.freeze([...records, Object.freeze({ id: current.id, label, status: 'running' as const, startedAt: Date.now(), cancelRequested: false })].slice(-limit));
      notify();
      let outcome: ExecutionOutcome<T>;
      try {
        current.controller.signal.throwIfAborted();
        const value = await work({ signal: current.controller.signal, reportProgress(progress) {
          if (active !== current) return;
          if (!Number.isFinite(progress.completed) || progress.completed < 0 || (progress.total !== undefined && (!Number.isFinite(progress.total) || progress.total < progress.completed)) || (progress.message !== undefined && (typeof progress.message !== 'string' || progress.message.length > 500))) return;
          patch(current.id, { progress: Object.freeze({ completed: progress.completed, ...(progress.total !== undefined ? { total: progress.total } : {}), ...(progress.message !== undefined ? { message: progress.message } : {}) }) });
        } });
        outcome = { status: 'succeeded', value };
      } catch (error) {
        outcome = current.controller.signal.aborted && error instanceof Error && error.name === 'AbortError' ? { status: 'cancelled' } : { status: 'failed', error };
      }
      // Release only after the real handler settles, before notifying completion observers.
      active = undefined;
      patch(current.id, { status: outcome.status, finishedAt: Date.now() });
      return outcome;
    },
    cancel,
    clearHistory() { records = Object.freeze(records.filter(record => record.id === active?.id)); notify(); },
    close() { closed = true; cancel(); },
  };
}
