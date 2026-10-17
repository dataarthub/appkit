/**
 * @fileoverview Proposal Core Types
 *
 * Immutable data type definitions including change proposals on business records (Proposal),
 * field differences (FieldChange), review decisions (ReviewDecisions), and consistency check results.
 *
 * @module proposal/types
 */

/**
 * Primitive value types supported in the initial version.
 * Field deletions, nested objects, and arrays are excluded from the initial version,
 * restricted strictly to explicit primitive values or null.
 */
export type SupportedPrimitive = string | number | boolean | null;

/**
 * Key type for target records (restricted to string keys).
 */
export type FieldKey<TRecord> = Extract<keyof TRecord, string>;

/**
 * Field change definition (Mapped Union)
 *
 * For each field P, before / after is strictly bound to TRecord[P] & SupportedPrimitive.
 * Consequently, assigning a string to a numeric field or specifying an unknown field
 * will be detected as a compile-time type error.
 *
 * @template TRecord Record type
 * @template K Subset of target field names (defaults to all string keys)
 */
export type FieldChange<
  TRecord extends Record<string, any> = Record<string, any>,
  K extends FieldKey<TRecord> = FieldKey<TRecord>,
> = {
  [P in K]: {
    readonly field: P;
    readonly label?: string;
    readonly before: TRecord[P] & SupportedPrimitive;
    readonly after: TRecord[P] & SupportedPrimitive;
    readonly reason?: string;
  };
}[K];

/**
 * Proposal metadata type definition. Restricted to a primitive value map in the initial version
 * to guarantee safe immutability and eliminate shared reference mutations.
 */
export type ProposalMetadata = Readonly<Record<string, SupportedPrimitive>>;

/**
 * Record change proposal (Immutable)
 *
 * Data structure generated from AI suggestions, CSV imports, batch modifications, etc.,
 * which remains unchanged until review completion.
 *
 * @template TRecord Record type
 */
export type RecordProposal<TRecord extends Record<string, any> = Record<string, any>> = {
  readonly id: string;
  readonly targetId: string;
  readonly targetName?: string;
  readonly baseVersion: string | number;
  readonly changes: readonly FieldChange<TRecord>[];
  readonly createdAt: string;
  readonly metadata?: ProposalMetadata;
};

/**
 * Review decision for each individual field.
 */
export type FieldDecision = 'accepted' | 'rejected' | 'pending';

/**
 * Decision map per field (keyed by field name).
 */
export type ReviewDecisions<TRecord extends Record<string, any> = Record<string, any>> =
  Readonly<Partial<Record<FieldKey<TRecord>, FieldDecision>>>;

/**
 * Overall review status (derived state).
 */
export type ProposalReviewStatus =
  | 'all_pending'
  | 'partially_decided'
  | 'all_accepted'
  | 'all_rejected'
  | 'mixed';

/**
 * Consistency check result against the current state.
 */
export type ConsistencyCheckResult<TRecord extends Record<string, any> = Record<string, any>> =
  | {
      readonly ok: true;
    }
  | {
      readonly ok: false;
      readonly reason: 'version_mismatch';
      readonly expectedVersion: string | number;
      readonly currentVersion: string | number;
      readonly message: string;
    }
  | {
      readonly ok: false;
      readonly reason: 'before_value_mismatch';
      readonly conflictedFields: readonly {
        readonly field: FieldKey<TRecord>;
        readonly expectedBefore: SupportedPrimitive;
        readonly actualCurrent: unknown;
      }[];
      readonly message: string;
    };

/**
 * Custom validation result for the entire candidate record.
 */
export type CandidateValidationResult = {
  readonly valid: boolean;
  readonly errors?: Readonly<Record<string, string>>;
};

/**
 * Payload for applying a proposal.
 */
export type ApplyProposalPayload<TRecord extends Record<string, any> = Record<string, any>> = {
  readonly proposalId: string;
  readonly targetId: string;
  readonly baseVersion: string | number;
  readonly acceptedFields: readonly FieldKey<TRecord>[];
  readonly acceptedChanges: readonly FieldChange<TRecord>[];
  readonly candidateRecord: Readonly<TRecord>;
};

