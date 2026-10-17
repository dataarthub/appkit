/** Finite progress values; message is explicitly supplied public UI text, never raw input. */
export interface ExecutionProgress {
  readonly completed: number;
  readonly total?: number;
  readonly message?: string;
}
/** Cooperative execution context. Cancellation does not roll back completed effects. */
export interface ExecutionContext {
  readonly signal: AbortSignal;
  readonly reportProgress: (progress: ExecutionProgress) => void;
}
/** Summary-only, in-memory history. Payloads, outputs and raw exceptions are not retained. */
export interface ExecutionRecord {
  readonly id: number;
  readonly label: string;
  readonly status: 'running' | 'cancelling' | 'succeeded' | 'failed' | 'cancelled';
  readonly startedAt: number;
  readonly finishedAt?: number;
  readonly cancelRequested: boolean;
  readonly progress?: ExecutionProgress;
}
/** Raw values/errors are returned only to the initiating application, never stored in history. */
export type ExecutionOutcome<T> = { readonly status: 'succeeded'; readonly value: T }
  | { readonly status: 'failed'; readonly error: unknown }
  | { readonly status: 'cancelled' };
/** Single-flight execution with bounded immutable snapshots for external-store subscriptions. */
export interface ExecutionSession {
  getSnapshot(): readonly ExecutionRecord[];
  subscribe(listener: () => void): () => void;
  /** Throws if another operation is still running, or the session is closed. */
  run<T>(label: string, work: (context: ExecutionContext) => T | Promise<T>): Promise<ExecutionOutcome<T>>;
  /** Requests abortion without releasing the lock until work actually settles. */
  cancel(): void;
  /** Clears completed history while retaining an active record. IDs are never reused. */
  clearHistory(): void;
  /** Prevents new work and requests cancellation of existing work. */
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
 * @example
 * ```ts
 * import { createExecutionSession } from "./";
 * const session = createExecutionSession();
 * const result = await session.run('Import', async ({ signal, reportProgress }) => {
 *   reportProgress({ completed: 0, total: 1 });
 *   const response = await fetch('/import', { method: 'POST', signal });
 *   if (!response.ok) throw new Error('Import failed');
 *   reportProgress({ completed: 1, total: 1 });
 * });
 * ```
 */
export function createExecutionSession(options: { readonly historyLimit?: number } = {}): ExecutionSession {
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
