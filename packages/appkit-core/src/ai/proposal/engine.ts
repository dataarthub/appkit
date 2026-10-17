/**
 * @fileoverview Proposal Core Engine
 *
 * Provides pure function logic with no side effects, including candidate record composition,
 * consistency verification against current values and base versions, and review status computation.
 *
 * @module proposal/engine
 */

import type {
  ApplyProposalPayload,
  CandidateValidationResult,
  ConsistencyCheckResult,
  FieldChange,
  FieldDecision,
  FieldKey,
  ProposalReviewStatus,
  RecordProposal,
  ReviewDecisions,
  SupportedPrimitive,
} from './types';

/**
 * Strictly compares whether two values are identical (identity check via Object.is).
 *
 * @param a First value to compare
 * @param b Second value to compare
 * @returns true if identical
 */
function isStrictEqual(a: unknown, b: unknown): boolean {
  return Object.is(a, b);
}

/**
 * Composes a candidate record as a pure function by applying accepted changes onto the source data.
 * The source record and proposal object are never mutated.
 *
 * @template TRecord Record type
 * @param currentRecord The latest source record
 * @param proposal Change proposal
 * @param decisions Per-field decision map
 * @returns Newly constructed candidate record
 */
export function buildCandidateRecord<
  TRecord extends Record<string, any> = Record<string, any>,
>(
  currentRecord: TRecord,
  proposal: RecordProposal<TRecord>,
  decisions: ReviewDecisions<TRecord>
): TRecord {
  const result: Record<string, unknown> = { ...currentRecord };

  for (const change of proposal.changes) {
    if (decisions[change.field] === 'accepted') {
      result[change.field] = change.after;
    }
  }

  return result as TRecord;
}

/**
 * Verifies consistency between the current source data/version and the proposal content.
 *
 * 1. Version match: Verifies strict equality between proposal.baseVersion and currentVersion.
 * 2. Before-value match: For accepted fields, verifies whether the current value strictly matches the proposal's before value
 *    (detecting value discrepancies caused by unsaved manual edits in forms, etc.).
 *
 * @template TRecord Record type
 * @param currentRecord Current record data
 * @param currentVersion Current version
 * @param proposal Change proposal
 * @param decisions Per-field decision map
 * @returns Consistency check result
 */
export function verifyCurrentState<
  TRecord extends Record<string, any> = Record<string, any>,
>(
  currentRecord: TRecord,
  currentVersion: string | number,
  proposal: RecordProposal<TRecord>,
  decisions: ReviewDecisions<TRecord>
): ConsistencyCheckResult<TRecord> {
  // 1. Version verification
  if (proposal.baseVersion !== currentVersion) {
    return {
      ok: false,
      reason: 'version_mismatch',
      expectedVersion: proposal.baseVersion,
      currentVersion,
      message: `Version mismatch (proposed: ${proposal.baseVersion}, current: ${currentVersion}). The underlying record has been updated and requires review.`,
    };
  }

  // 2. Before-value consistency check for accepted fields
  const conflictedFields: {
    field: FieldKey<TRecord>;
    expectedBefore: SupportedPrimitive;
    actualCurrent: unknown;
  }[] = [];

  for (const change of proposal.changes) {
    if (decisions[change.field] === 'accepted') {
      const actualValue = currentRecord[change.field];
      if (!isStrictEqual(actualValue, change.before)) {
        conflictedFields.push({
          field: change.field,
          expectedBefore: change.before,
          actualCurrent: actualValue,
        });
      }
    }
  }

  if (conflictedFields.length > 0) {
    const fieldNames = conflictedFields.map((c) => c.field).join(', ');
    return {
      ok: false,
      reason: 'before_value_mismatch',
      conflictedFields,
      message: `Current value for accepted field(s) (${fieldNames}) does not match the baseline value at proposal creation (before value). Please verify unsaved edits.`,
    };
  }

  return { ok: true };
}

/**
 * Computes the overall review status from each field's decision state.
 *
 * @template TRecord Record type
 * @param proposal Proposal
 * @param decisions Review decision map
 * @returns Review status
 */
export function computeReviewStatus<
  TRecord extends Record<string, any> = Record<string, any>,
>(
  proposal: RecordProposal<TRecord>,
  decisions: ReviewDecisions<TRecord>
): ProposalReviewStatus {
  let pendingCount = 0;
  let acceptedCount = 0;
  let rejectedCount = 0;

  for (const change of proposal.changes) {
    const decision: FieldDecision = decisions[change.field] ?? 'pending';
    if (decision === 'pending') pendingCount++;
    else if (decision === 'accepted') acceptedCount++;
    else if (decision === 'rejected') rejectedCount++;
  }

  const total = proposal.changes.length;

  if (pendingCount === total) return 'all_pending';
  if (pendingCount > 0) return 'partially_decided';
  if (acceptedCount === total) return 'all_accepted';
  if (rejectedCount === total) return 'all_rejected';
  return 'mixed';
}

/**
 * Comprehensively evaluates whether a change proposal can be applied.
 *
 * Evaluation conditions:
 * 1. No pending decisions remain.
 * 2. At least one change is accepted (cannot apply if all are rejected).
 * 3. Base version and current value consistency checks PASS.
 * 4. Custom candidate record validation (candidateValidation) PASSES.
 *
 * @template TRecord Record type
 * @param params Evaluation parameters
 * @returns true if applicable
 */
export function canApplyProposal<
  TRecord extends Record<string, any> = Record<string, any>,
>(params: {
  readonly proposal: RecordProposal<TRecord>;
  readonly decisions: ReviewDecisions<TRecord>;
  readonly consistency: ConsistencyCheckResult<TRecord>;
  readonly candidateValidation?: CandidateValidationResult;
}): boolean {
  const { proposal, decisions, consistency, candidateValidation } = params;

  // Cannot apply if there is a consistency error
  if (!consistency.ok) return false;

  // Cannot apply if there is a custom validation error
  if (candidateValidation && !candidateValidation.valid) return false;

  let acceptedCount = 0;
  for (const change of proposal.changes) {
    const decision = decisions[change.field] ?? 'pending';
    // Cannot apply if any field remains pending
    if (decision === 'pending') return false;
    if (decision === 'accepted') acceptedCount++;
  }

  // Cannot apply if 0 items are accepted (e.g., all rejected)
  return acceptedCount > 0;
}

/**
 * Builds the complete payload for an apply request.
 *
 * @template TRecord Record type
 * @param params Build parameters
 * @returns Apply payload
 */
export function buildApplyPayload<
  TRecord extends Record<string, any> = Record<string, any>,
>(params: {
  readonly proposal: RecordProposal<TRecord>;
  readonly candidateRecord: TRecord;
  readonly decisions: ReviewDecisions<TRecord>;
}): ApplyProposalPayload<TRecord> {
  const { proposal, candidateRecord, decisions } = params;

  const acceptedFields: FieldKey<TRecord>[] = [];
  const acceptedChanges: FieldChange<TRecord>[] = [];

  for (const change of proposal.changes) {
    if (decisions[change.field] === 'accepted') {
      acceptedFields.push(change.field);
      acceptedChanges.push(change);
    }
  }

  return {
    proposalId: proposal.id,
    targetId: proposal.targetId,
    baseVersion: proposal.baseVersion,
    acceptedFields: Object.freeze(acceptedFields),
    acceptedChanges: Object.freeze(acceptedChanges),
    candidateRecord: Object.freeze({ ...candidateRecord }),
  };
}
