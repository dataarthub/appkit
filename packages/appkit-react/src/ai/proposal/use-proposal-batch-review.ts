import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createExecutionSession, type ExecutionContext, type ExecutionRecord, type ExecutionSession } from "@alneas/appkit-core/ai";
import {
  prepareProposalBatch,
  type ApplyProposalPayload,
  type FieldDecision,
  type FieldKey,
  type PreparedProposalBatch,
  type ProposalBatchEntry,
  type ProposalBatchItem,
  type ProposalBatchValidator,
  type ReviewDecisions,
} from "@alneas/appkit-core/ai";

/**
 * Host inputs for reviewing unique immutable proposals across multiple records.
 *
 * @typeParam TRecord - Record shape; defaults to a string-keyed record.
 *
 * @see useProposalBatchReview for usage.
 */
export interface UseProposalBatchReviewOptions<TRecord extends Record<string, any> = Record<string, any>> {
  /** Change for a new review session, including an intentional replay of the same proposals. */
  batchId: string;
  /**
   * Validated proposals and latest records/versions; proposal IDs must be unique.
   */
  items: readonly ProposalBatchItem<TRecord>[];
  /**
   * Optional synchronous validator passed to Core batch preparation; thrown errors become invalid_candidate issues.
   */
  validateCandidate?: ProposalBatchValidator<TRecord>;
    /**
     * Sequential host callback receiving one prepared payload and cooperative abort/progress context.
     *
     * @param payload - Validated candidate and decisions for one proposal.
     *
     * @param context - Abort signal and fractional-progress reporting for this row.
     *
     * @returns No value after the host confirms application; reject to stop later rows.
     */
  onApply?: (payload: ApplyProposalPayload<TRecord>, context: ExecutionContext) => void | Promise<void>;
}

/**
 * Batch selection/decision state and explicit execution controls.
 *
 * @typeParam TRecord - Shared record shape; defaults to a string-keyed record.
 *
 * @see useProposalBatchReview for usage.
 */
export interface UseProposalBatchReviewReturn<TRecord extends Record<string, any> = Record<string, any>> {
  /**
   * Current selected proposal IDs; applied IDs are excluded from preparation.
   */
  selectedIds: ReadonlySet<string>;
  /**
   * Host-confirmed successes in this review session.
   */
  appliedIds: ReadonlySet<string>;
  /**
   * Per-proposal field decisions; absent choices remain pending.
   */
  decisions: ReadonlyMap<string, ReviewDecisions<TRecord>>;
  /**
   * Core batch preflight result for current selection and latest input props.
   */
  preparation: PreparedProposalBatch<TRecord>;
  /**
   * Whether a handler exists, preparation passes and state is not submitting.
   */
  canApply: boolean;
  /**
   * Whether the displayed batch is currently running.
   */
  isSubmitting: boolean;
  /**
   * Current row being applied, or null outside active row work.
   */
  activeProposalId: string | null;
  /**
   * Generic current-session batch failure message, or null; raw host exceptions are not exposed.
   */
  error: string | null;
  /**
   * Read-only execution history for this batch session.
   */
  history: readonly ExecutionRecord[];
  /**
   * Select or deselect an editable known proposal.
   *
   * @param id - Proposal identifier.
   *
   * @param selected - Desired selection state.
   *
   * @returns No value; unknown/applied/busy proposals are ignored.
   */
  setSelected(id: string, selected: boolean): void;
  /**
   * Change selection for the current items when idle.
   *
   * @param selected - True selects all current IDs; false retains only applied IDs in the selection set.
   *
   * @returns No value; calls while execution is busy are ignored.
   */
  selectAll(selected: boolean): void;
  /**
   * Change one existing proposed field while editable.
   *
   * @param id - Proposal identifier.
   *
   * @param field - Field present in that proposal.
   *
   * @param decision - Pending, accepted or rejected choice.
   *
   * @returns No value; invalid IDs/fields and busy/applied proposals are ignored.
   */
  setDecision(id: string, field: FieldKey<TRecord>, decision: FieldDecision): void;
  /**
   * Change every proposed field choice for one editable proposal.
   *
   * @param id - Proposal identifier.
   *
   * @param decision - Choice applied to all its changes.
   *
   * @returns No value; unknown/applied/busy proposals are ignored.
   */
  decideAll(id: string, decision: FieldDecision): void;
  /**
   * Preflight the selection, then apply rows sequentially with latest-record rechecks.
   *
   * @returns True only for current-session complete success; false when blocked, failed, cancelled or superseded.
   *
   * @remarks Confirmed successes are retained and skipped on retry; unconfirmed backend effects may still exist.
   */
  apply(): Promise<boolean>;
  /**
   * Request cooperative cancellation of current execution.
   *
   * @returns No value; does not roll back previously applied rows or force host work to stop.
   */
  cancel(): void;
  /**
   * Clear settled execution history using the session policy.
   *
   * @returns No value; does not clear review choices or confirmed applied IDs.
   */
  clearHistory(): void;
}

interface ReviewState<TRecord extends Record<string, any>> {
  key: string;
  session: ExecutionSession;
  selected: ReadonlySet<string>;
  applied: ReadonlySet<string>;
  decisions: ReadonlyMap<string, ReviewDecisions<TRecord>>;
  running: boolean;
  active: string | null;
  error: string | null;
}

function initial<TRecord extends Record<string, any>>(key: string): ReviewState<TRecord> {
  return {
    key,
    session: createExecutionSession(),
    selected: new Set(),
    applied: new Set(),
    decisions: new Map(),
    running: false,
    active: null,
    error: null,
  };
}

/**
 * Reviews a batch with explicit field decisions and sequential host application.
 *
 * @typeParam TRecord - Record shape; defaults to a string-keyed record.
 *
 * @param options - Batch identity, unique immutable proposals/latest records, validation and optional host apply callback.
 *
 * @returns Selection/decision controls, preflight state, bounded execution history and cooperative cancellation.
 *
 * @remarks Requires React; no context/styles. Changing batchId or serialized proposal
 * content starts a new session; unmount/session changes request cancellation. Each row
 * is rechecked against latest committed host inputs before apply. Stops at the first
 * failure/cancellation; successes remain excluded from retries. Cancellation cannot
 * undo host effects, so persist idempotently and enforce concurrency/authorization in
 * the backend. A row that changed the backend before rejecting has an uncertain outcome.
 *
 * @example
 * ```tsx
 * import { useProposalBatchReview, type UseProposalBatchReviewOptions } from '@alneas/appkit-react/ai/proposal';
 * type RecordData = { title: string };
 * export function Batch({ options }: { options: UseProposalBatchReviewOptions<RecordData> }) {
 *   const review = useProposalBatchReview(options);
 *   return <button disabled={!review.canApply} onClick={() => { void review.apply(); }}>Apply selected records</button>;
 * }
 * ```
 */
export function useProposalBatchReview<TRecord extends Record<string, any> = Record<string, any>>(
  options: UseProposalBatchReviewOptions<TRecord>
): UseProposalBatchReviewReturn<TRecord> {
  const key = JSON.stringify([options.batchId, options.items.map(item => JSON.stringify(item.proposal)).sort()]);
  const [stored, setStored] = useState(() => initial<TRecord>(key));
  let state = stored;
  if (state.key !== key) {
    state = initial<TRecord>(key);
    setStored(state);
  }
  const session = state.session;
  const live = useRef<{ session: ExecutionSession; applied: Set<string> } | null>(null);
  const latest = useRef(options);
  useLayoutEffect(() => {
    latest.current = options;
  });
  useLayoutEffect(() => {
    const current = { session, applied: new Set<string>() };
    live.current = current;
    return () => {
      session.cancel();
      if (live.current === current) live.current = null;
    };
  }, [session]);

  const history = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const busy = () => session.getSnapshot().some(record => record.status === 'running' || record.status === 'cancelling');
  const update = (change: (current: ReviewState<TRecord>) => ReviewState<TRecord>) => {
    setStored(current => (current.session === session ? change(current) : current));
  };

  const entries = (
    items: readonly ProposalBatchItem<TRecord>[],
    applied: ReadonlySet<string>
  ): ProposalBatchEntry<TRecord>[] =>
    items.map(item => ({
      ...item,
      decisions: state.decisions.get(item.proposal.id) ?? ({} as ReviewDecisions<TRecord>),
      selected: state.selected.has(item.proposal.id) && !applied.has(item.proposal.id),
    }));

  const preparation = prepareProposalBatch(entries(options.items, state.applied), options.validateCandidate);
  const editable = (id: string) =>
    live.current?.session === session && !busy() && !live.current.applied.has(id) && options.items.some(item => item.proposal.id === id);

  const apply = async (): Promise<boolean> => {
    const current = live.current;
    if (!current || current.session !== session || busy() || !latest.current.onApply) return false;
    const planned = prepareProposalBatch(entries(latest.current.items, current.applied), latest.current.validateCandidate);
    if (!planned.canApply) return false;
    update(value => ({ ...value, running: true, error: null }));
    const outcome = await session.run(`一括適用 ${planned.payloads.length} 件`, async context => {
      context.reportProgress({ completed: 0, total: planned.payloads.length });
      let completed = 0;
      for (const payload of planned.payloads) {
        context.signal.throwIfAborted();
        if (live.current !== current) throw new DOMException('Review session changed', 'AbortError');
        const item = latest.current.items.find(value => value.proposal.id === payload.proposalId);
        if (!item) throw new Error('対象の提案が見つかりません。再確認してください。');
        const checked = prepareProposalBatch(
          [{ ...item, selected: true, decisions: state.decisions.get(payload.proposalId) ?? ({} as ReviewDecisions<TRecord>) }],
          latest.current.validateCandidate
        );
        if (!checked.canApply || !latest.current.onApply) {
          throw new Error('適用前にデータが変更されたため停止しました。再確認してください。');
        }
        update(value => ({ ...value, active: payload.proposalId }));
        await latest.current.onApply(checked.payloads[0], {
          signal: context.signal,
          reportProgress(progress) {
            const fraction =
              progress.total && Number.isFinite(progress.total) && Number.isFinite(progress.completed)
                ? Math.max(0, Math.min(1, progress.completed / progress.total))
                : 0;
            context.reportProgress({
              completed: completed + fraction,
              total: planned.payloads.length,
              message: progress.message,
            });
          },
        });
        if (live.current !== current) throw new DOMException('Review session changed', 'AbortError');
        current.applied.add(payload.proposalId);
        update(value => ({ ...value, applied: new Set(current.applied) }));
        context.reportProgress({ completed: ++completed, total: planned.payloads.length });
      }
    });
    if (live.current !== current) return false;
    update(value => ({
      ...value,
      running: false,
      active: null,
      error: outcome.status === 'failed' ? '適用に失敗しました。成功済みの提案を除いて再試行できます。' : null,
    }));
    return outcome.status === 'succeeded';
  };

  return {
    selectedIds: state.selected,
    appliedIds: state.applied,
    decisions: state.decisions,
    preparation,
    canApply: !!options.onApply && preparation.canApply && !state.running,
    isSubmitting: state.running,
    activeProposalId: state.active,
    error: state.error,
    history,
    setSelected(id, selected) {
      if (!editable(id)) return;
      update(value => {
        const next = new Set(value.selected);
        if (selected) next.add(id);
        else next.delete(id);
        return { ...value, selected: next, error: null };
      });
    },
    selectAll(selected) {
      if (busy()) return;
      update(value => ({
        ...value,
        selected: new Set(selected ? options.items.map(item => item.proposal.id) : value.applied),
        error: null,
      }));
    },
    setDecision(id, field, decision) {
      if (!editable(id) || !options.items.find(item => item.proposal.id === id)?.proposal.changes.some(change => change.field === field)) return;
      update(value => ({
        ...value,
        decisions: new Map(value.decisions).set(id, {
          ...value.decisions.get(id),
          [field]: decision,
        } as ReviewDecisions<TRecord>),
        error: null,
      }));
    },
    decideAll(id, decision) {
      if (!editable(id)) return;
      const item = options.items.find(value => value.proposal.id === id)!;
      update(value => ({
        ...value,
        decisions: new Map(value.decisions).set(
          id,
          Object.fromEntries(item.proposal.changes.map(change => [change.field, decision])) as ReviewDecisions<TRecord>
        ),
        error: null,
      }));
    },
    apply,
    cancel: session.cancel,
    clearHistory: session.clearHistory,
  };
}
