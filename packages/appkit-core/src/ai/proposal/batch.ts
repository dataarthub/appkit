import { buildApplyPayload, buildCandidateRecord, canApplyProposal, verifyCurrentState } from './engine';
import type { ApplyProposalPayload, CandidateValidationResult, RecordProposal, ReviewDecisions } from './types';

/**
 * One validated proposal and its application-owned latest record/version.
 *
 * @typeParam TRecord - Consumer record shape whose string keys and primitive field values are reviewed; defaults to a general record where permitted.
 * @see {@link prepareProposalBatch} for canonical public-import usage and setup.
 */
export interface ProposalBatchItem<TRecord extends Record<string, any> = Record<string, any>> {

  /** Previously validated immutable field-change proposal to review. */
  readonly proposal: RecordProposal<TRecord>;

  /** Latest application-owned source record used for candidate composition and before-value checks. */
  readonly currentRecord: TRecord;

  /** Current host record version, compared strictly against the proposal base version. */
  readonly currentVersion: string | number;
}
/**
 * Selection is separate from field decisions. Excluded records do not block the batch.
 *
 * @typeParam TRecord - Consumer record shape whose string keys and primitive field values are reviewed; defaults to a general record where permitted.
 * @see {@link prepareProposalBatch} for canonical public-import usage and setup.
 */
export interface ProposalBatchEntry<TRecord extends Record<string, any> = Record<string, any>> extends ProposalBatchItem<TRecord> {

  /** Whether this entry participates in batch preflight; excluded entries do not block it except duplicate proposal IDs. */
  readonly selected: boolean;

  /** Per-field accepted/rejected/pending choices; missing decisions are pending. */
  readonly decisions: ReviewDecisions<TRecord>;
}
/**
 * A safe, record-scoped preflight failure. Validator exceptions are not disclosed.
 *
 * @see {@link prepareProposalBatch} for canonical public-import usage and setup.
 */
export interface ProposalBatchIssue {

  /** Proposal identifier used to correlate a payload or preflight issue. */
  readonly proposalId: string;

  /** Failure category for programmatic handling without inspecting display text. */
  readonly code: 'duplicate_proposal' | 'duplicate_target' | 'pending' | 'no_changes' | 'conflict' | 'invalid_candidate';
}
/**
 * A failed preflight never exposes a partially executable payload list.
 *
 * @typeParam TRecord - Consumer record shape whose string keys and primitive field values are reviewed; defaults to a general record where permitted.
 * @see {@link prepareProposalBatch} for canonical public-import usage and setup.
 */
export interface PreparedProposalBatch<TRecord extends Record<string, any> = Record<string, any>> {

  /** True when at least one entry is selected and every required preflight check passed. */
  readonly canApply: boolean;

  /** Number of selected entries, including those with preflight issues. */
  readonly selectedCount: number;

  /** Record-scoped preflight failures; empty when no failure was found. */
  readonly issues: readonly ProposalBatchIssue[];

  /** Shallow immutable apply payloads; empty whenever any preflight issue exists. */
  readonly payloads: readonly ApplyProposalPayload<TRecord>[];
}
/**
 * Pure synchronous whole-record validation, reused by preflight and immediately before each row.
 *
 * @typeParam TRecord - Consumer record shape whose string keys and primitive field values are reviewed; defaults to a general record where permitted.
 * @see {@link prepareProposalBatch} for canonical public-import usage and setup.
 * @param candidate - Shallow candidate record with accepted field changes applied.
 * @param item - Associated validated proposal and latest host record/version.
 * @returns Synchronous whole-record result; valid=false or throwing blocks batch preflight for the item.
 *
 * @example
 * ```typescript
 * import type { ProposalBatchValidator } from '@alneas/appkit-core/ai/proposal';
 *
 * const validate: ProposalBatchValidator<{ name: string }> = candidate => ({ valid: candidate.name.trim().length > 0 });
 * console.log(typeof validate);
 * ```
 */
export type ProposalBatchValidator<TRecord extends Record<string, any> = Record<string, any>> =
  (candidate: TRecord, item: ProposalBatchItem<TRecord>) => CandidateValidationResult;

/**
 * Prepares every selected record before a multi-record apply starts.
 * Reuses single-proposal decisions, before/version checks and candidate validation.
 * Duplicate proposal IDs anywhere and duplicate selected target IDs fail closed.
 * Every selected proposal needs all fields decided and at least one accepted change.
 * Exclude all-rejected proposals explicitly. Empty selection is not executable.
 *
 * Pass proposals already validated with validateProposalInput. This is not an external
 * input parser, cross-record business validator, database transaction or authorization
 * boundary. Payload candidates are shallow immutable snapshots, like buildApplyPayload.
 *
 * @typeParam TRecord - Application record shape whose primitive changes were validated before batch preparation.
 * @param entries - Validated proposals with current record/version, selection and per-field decisions; duplicate proposal IDs anywhere are rejected.
 * @param validateCandidate - Optional synchronous whole-record callback called for selected eligible candidates; return valid=true to allow the row. Exceptions become invalid_candidate issues.
 * @returns Frozen preflight diagnostics and shallow immutable payload candidates; any issue empties the payload list, and empty selection cannot apply.
 *
 * @example
 * ```typescript
 * import { prepareProposalBatch, type RecordProposal } from '@alneas/appkit-core/ai/proposal';
 *
 * type Row = { name: string };
 * const proposal: RecordProposal<Row> = {
 *   id: 'proposal-1', targetId: 'row-1', baseVersion: 1,
 *   changes: [{ field: 'name', before: 'Old', after: 'New' }],
 *   createdAt: '2026-10-20T00:00:00Z',
 * };
 * const current = { name: 'Old' };
 * const decisions = { name: 'accepted' } as const;
 * console.log(prepareProposalBatch([{ proposal, currentRecord: current, currentVersion: 1, selected: true, decisions }]));
 * ```
 */
export function prepareProposalBatch<TRecord extends Record<string, any> = Record<string, any>>(
  entries: readonly ProposalBatchEntry<TRecord>[],
  validateCandidate?: ProposalBatchValidator<TRecord>,
): PreparedProposalBatch<TRecord> {
  const issues: ProposalBatchIssue[] = [];
  const payloads: ApplyProposalPayload<TRecord>[] = [];
  const ids = new Set<string>();
  const targets = new Set<string>();
  let selectedCount = 0;
  for (const item of entries) {
    const { proposal, decisions, currentRecord, currentVersion } = item;
    const issue = (code: ProposalBatchIssue['code']) => issues.push(Object.freeze({ proposalId: proposal.id, code }));
    if (ids.has(proposal.id)) issue('duplicate_proposal');
    ids.add(proposal.id);
    if (!item.selected) continue;
    selectedCount++;
    if (targets.has(proposal.targetId)) issue('duplicate_target');
    targets.add(proposal.targetId);
    if (proposal.changes.some(change => !['accepted', 'rejected'].includes(decisions[change.field] ?? 'pending'))) { issue('pending'); continue; }
    if (!proposal.changes.some(change => decisions[change.field] === 'accepted')) { issue('no_changes'); continue; }
    const consistency = verifyCurrentState(currentRecord, currentVersion, proposal, decisions);
    if (!consistency.ok) { issue('conflict'); continue; }
    const candidateRecord = buildCandidateRecord(currentRecord, proposal, decisions);
    let candidateValidation: CandidateValidationResult | undefined;
    if (validateCandidate) {
      try { candidateValidation = validateCandidate(candidateRecord, item); }
      catch { issue('invalid_candidate'); continue; }
      if (candidateValidation?.valid !== true) { issue('invalid_candidate'); continue; }
    }
    if (canApplyProposal({ proposal, decisions, consistency, candidateValidation })) {
      payloads.push(Object.freeze(buildApplyPayload({ proposal, candidateRecord, decisions })));
    }
  }
  return Object.freeze({
    canApply: selectedCount > 0 && issues.length === 0,
    selectedCount,
    issues: Object.freeze(issues),
    payloads: Object.freeze(issues.length === 0 ? payloads : []),
  });
}
