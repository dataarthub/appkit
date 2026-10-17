import { buildApplyPayload, buildCandidateRecord, canApplyProposal, verifyCurrentState } from './engine';
import type { ApplyProposalPayload, CandidateValidationResult, RecordProposal, ReviewDecisions } from './types';

/** One validated proposal and its application-owned latest record/version. */
export interface ProposalBatchItem<TRecord extends Record<string, any> = Record<string, any>> {
  readonly proposal: RecordProposal<TRecord>;
  readonly currentRecord: TRecord;
  readonly currentVersion: string | number;
}
/** Selection is separate from field decisions. Excluded records do not block the batch. */
export interface ProposalBatchEntry<TRecord extends Record<string, any> = Record<string, any>> extends ProposalBatchItem<TRecord> {
  readonly selected: boolean;
  readonly decisions: ReviewDecisions<TRecord>;
}
/** A safe, record-scoped preflight failure. Validator exceptions are not disclosed. */
export interface ProposalBatchIssue {
  readonly proposalId: string;
  readonly code: 'duplicate_proposal' | 'duplicate_target' | 'pending' | 'no_changes' | 'conflict' | 'invalid_candidate';
}
/** A failed preflight never exposes a partially executable payload list. */
export interface PreparedProposalBatch<TRecord extends Record<string, any> = Record<string, any>> {
  readonly canApply: boolean;
  readonly selectedCount: number;
  readonly issues: readonly ProposalBatchIssue[];
  readonly payloads: readonly ApplyProposalPayload<TRecord>[];
}
/** Pure synchronous whole-record validation, reused by preflight and immediately before each row. */
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
 * @example
 * ```ts
 * import { prepareProposalBatch } from "./";
 * const prepared = prepareProposalBatch(entries, validateCandidate);
 * if (prepared.canApply) await applicationSave(prepared.payloads);
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
