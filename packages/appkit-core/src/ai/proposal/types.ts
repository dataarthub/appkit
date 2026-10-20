/**
 * Primitive value types supported in the initial version.
 * Field deletions, nested objects, and arrays are excluded from the initial version,
 * restricted strictly to explicit primitive values or null.
 *
 * @see {@link validateProposalInput} for canonical public-import usage and setup.
 */
export type SupportedPrimitive = string | number | boolean | null;

/**
 * Key type for target records (restricted to string keys).
 *
 * @typeParam TRecord - Consumer record shape whose string keys and primitive field values are reviewed; defaults to a general record where permitted.
 * @see {@link validateProposalInput} for canonical public-import usage and setup.
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
 *
 * @see {@link validateProposalInput} for canonical public-import usage and setup.
 */
export type FieldChange<
  TRecord extends Record<string, any> = Record<string, any>,
  K extends FieldKey<TRecord> = FieldKey<TRecord>,
> = {
  [P in K]: {

  /** Target record string key whose before/after values are reviewed. */
  readonly field: P;

  /** Optional human-readable field label shown during review. */
  readonly label?: string;

  /** Expected primitive value at proposal creation, compared using Object.is for accepted changes. */
  readonly before: TRecord[P] & SupportedPrimitive;

  /** Proposed primitive value applied only when the field is accepted. */
  readonly after: TRecord[P] & SupportedPrimitive;

  /** Optional explanation for the proposed field change. */
  readonly reason?: string;
  };
}[K];

/**
 * Proposal metadata type definition. Restricted to a primitive value map in the initial version
 * to guarantee safe immutability and eliminate shared reference mutations.
 *
 * @see {@link validateProposalInput} for canonical public-import usage and setup.
 */
export type ProposalMetadata = Readonly<Record<string, SupportedPrimitive>>;

/**
 * Record change proposal (Immutable)
 *
 * Data structure generated from AI suggestions, CSV imports, batch modifications, etc.,
 * which remains unchanged until review completion.
 *
 * @template TRecord Record type
 *
 * @see {@link validateProposalInput} for canonical public-import usage and setup.
 */
export type RecordProposal<TRecord extends Record<string, any> = Record<string, any>> = {

  /** Nonempty identifier used to correlate this object with its owning application/session. */
  readonly id: string;

  /** Application identifier of the record to update; no database lookup occurs. */
  readonly targetId: string;

  /** Optional record display name retained by proposal validation. */
  readonly targetName?: string;

  /** Baseline string or finite-number version for strict equality checks; no coercion is performed. */
  readonly baseVersion: string | number;

  /** Nonempty unique-field primitive changes in proposal order after validation. */
  readonly changes: readonly FieldChange<TRecord>[];

  /** Creation timestamp text; validation supplies the current ISO timestamp when absent/non-string. */
  readonly createdAt: string;

  /** Optional application-owned metadata; disclosure decisions belong to the host. */
  readonly metadata?: ProposalMetadata;
};

/**
 * Review decision for each individual field.
 *
 * @see {@link validateProposalInput} for canonical public-import usage and setup.
 */
export type FieldDecision = 'accepted' | 'rejected' | 'pending';

/**
 * Decision map per field (keyed by field name).
 *
 * @typeParam TRecord - Consumer record shape whose string keys and primitive field values are reviewed; defaults to a general record where permitted.
 * @see {@link validateProposalInput} for canonical public-import usage and setup.
 */
export type ReviewDecisions<TRecord extends Record<string, any> = Record<string, any>> =
  Readonly<Partial<Record<FieldKey<TRecord>, FieldDecision>>>;

/**
 * Overall review status (derived state).
 *
 * @see {@link validateProposalInput} for canonical public-import usage and setup.
 */
export type ProposalReviewStatus =
  | 'all_pending'
  | 'partially_decided'
  | 'all_accepted'
  | 'all_rejected'
  | 'mixed';

/**
 * Consistency check result against the current state.
 *
 * @typeParam TRecord - Consumer record shape whose string keys and primitive field values are reviewed; defaults to a general record where permitted.
 * @see {@link validateProposalInput} for canonical public-import usage and setup.
 */
export type ConsistencyCheckResult<TRecord extends Record<string, any> = Record<string, any>> =
  | {

  /** Discriminant indicating whether this operation succeeded. */
  readonly ok: true;
    }
  | {

  /** Discriminant indicating whether this operation succeeded. */
  readonly ok: false;

  /** Normalized finish category supplied by the adapter. */
  readonly reason: 'version_mismatch';

  /** Version recorded in the proposal that failed strict comparison. */
  readonly expectedVersion: string | number;

  /** Current host record version, compared strictly against the proposal base version. */
  readonly currentVersion: string | number;

  /** Human-readable description of the version or before-value conflict. */
  readonly message: string;
    }
  | {

  /** Discriminant indicating whether this operation succeeded. */
  readonly ok: false;

  /** Normalized finish category supplied by the adapter. */
  readonly reason: 'before_value_mismatch';

  /** Accepted fields whose current values differ from the proposal before values. */
  readonly conflictedFields: readonly {

    /** Target record string key whose before/after values are reviewed. */
    readonly field: FieldKey<TRecord>;

    /** Baseline primitive value expected for this accepted field. */
    readonly expectedBefore: SupportedPrimitive;

    /** Current source value observed during the consistency check. */
    readonly actualCurrent: unknown;
      }[];

  /** Human-readable description of the version or before-value conflict. */
  readonly message: string;
    };

/**
 * Custom validation result for the entire candidate record.
 *
 * @see {@link validateProposalInput} for canonical public-import usage and setup.
 */
export type CandidateValidationResult = {

  /** Whether validation passed; see errors for diagnostic details when false. */
  readonly valid: boolean;

  /** Optional field-keyed error messages supplied by the whole-record validator. */
  readonly errors?: Readonly<Record<string, string>>;
};

/**
 * Payload for applying a proposal.
 *
 * @typeParam TRecord - Consumer record shape whose string keys and primitive field values are reviewed; defaults to a general record where permitted.
 * @see {@link validateProposalInput} for canonical public-import usage and setup.
 */
export type ApplyProposalPayload<TRecord extends Record<string, any> = Record<string, any>> = {

  /** Proposal identifier used to correlate a payload or preflight issue. */
  readonly proposalId: string;

  /** Application identifier of the record to update; no database lookup occurs. */
  readonly targetId: string;

  /** Baseline string or finite-number version for strict equality checks; no coercion is performed. */
  readonly baseVersion: string | number;

  /** Accepted field names in proposal order; the array is frozen. */
  readonly acceptedFields: readonly FieldKey<TRecord>[];

  /** Accepted field-change objects in proposal order; the array is frozen. */
  readonly acceptedChanges: readonly FieldChange<TRecord>[];

  /** Shallow copy of the source with accepted field changes applied; host owns persistence. */
  readonly candidateRecord: Readonly<TRecord>;
};

