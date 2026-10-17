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

/** Multi-record review. Each item must have a unique validated immutable proposal. */
export interface UseProposalBatchReviewOptions<TRecord extends Record<string, any> = Record<string, any>> {
  /** Change for a new review session, including an intentional replay of the same proposals. */
  batchId: string;
  items: readonly ProposalBatchItem<TRecord>[];
  validateCandidate?: ProposalBatchValidator<TRecord>;
  /** Called sequentially. Resolve only when this row is applied; reject to stop the batch. */
  onApply?: (payload: ApplyProposalPayload<TRecord>, context: ExecutionContext) => void | Promise<void>;
}

/** Headless controller shared by batch lists and custom application layouts. */
export interface UseProposalBatchReviewReturn<TRecord extends Record<string, any> = Record<string, any>> {
  selectedIds: ReadonlySet<string>;
  appliedIds: ReadonlySet<string>;
  decisions: ReadonlyMap<string, ReviewDecisions<TRecord>>;
  preparation: PreparedProposalBatch<TRecord>;
  canApply: boolean;
  isSubmitting: boolean;
  activeProposalId: string | null;
  error: string | null;
  history: readonly ExecutionRecord[];
  setSelected(id: string, selected: boolean): void;
  selectAll(selected: boolean): void;
  setDecision(id: string, field: FieldKey<TRecord>, decision: FieldDecision): void;
  decideAll(id: string, decision: FieldDecision): void;
  apply(): Promise<boolean>;
  cancel(): void;
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
 * Reviews multiple records without implicit field acceptance. Preflights the entire
 * selection, then rechecks each latest committed record immediately before applying it.
 * Stops on first failure or cancellation; confirmed successes are never retried within
 * this session.
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
