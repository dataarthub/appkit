import type {
  ApplyProposalPayload,
  CandidateValidationResult,
  FieldDecision,
  FieldKey,
  ProposalReviewStatus,
  RecordProposal,
  ReviewDecisions,
} from "@alneas/appkit-core/ai";

/**
 * Single-record review presentation and host apply inputs.
 *
 * @typeParam TRecord - Current record shape; defaults to a string-keyed record.
 *
 * @remarks These shared inputs are consumed by useProposalReview; persistence is host-owned.
 *
 * @see useProposalReview for a complete input example.
 */
export interface ProposalReviewCardProps<
  TRecord extends Record<string, any> = Record<string, any>,
> {
    /**
     * Immutable validated change proposal; changing id resets the review decisions.
     */
  proposal: RecordProposal<TRecord>;

    /**
     * Latest host record used to compose accepted changes and detect conflicts.
     */
  currentRecord: TRecord;

    /**
     * Current host version compared with the proposal base version.
     */
  currentVersion: string | number;

    /**
     * Optional synchronous validation of the complete composed candidate; thrown errors propagate from render.
     */
  validateCandidate?: (candidate: TRecord) => CandidateValidationResult;

    /**
     * Optional host apply callback receiving a payload; await persistence before resolving. Rejection becomes saveError.
     */
  onApply?: (payload: ApplyProposalPayload<TRecord>) => void | Promise<void>;

    /**
     * Optional host dismissal callback; the headless hook does not call this member.
     */
  onDismiss?: () => void;

    /**
     * Optional presentation label; not used by the headless hook.
     */
  applyLabel?: string;

    /**
     * Optional presentation title; not used by the headless hook.
     */
  title?: string;

    /**
     * Optional presentation classes; not used by the headless hook.
     */
  className?: string;

    /**
     * Optional presentation test marker; not used by the headless hook.
     */
  testId?: string;
}

/**
 * Derived review state and explicit field-decision/apply controls.
 *
 * @typeParam TRecord - Record shape retained by candidate composition; defaults to a string-keyed record.
 *
 * @see useProposalReview for usage.
 */
export interface UseProposalReviewReturn<
  TRecord extends Record<string, any> = Record<string, any>,
> {
    /**
     * Per-field pending/accepted/rejected choices; missing entries behave as pending.
     */
  decisions: ReviewDecisions<TRecord>;

    /**
     * Set one field choice and clear the save error.
     *
     * @param field - Record key to decide.
     *
     * @param decision - Pending, accepted or rejected choice.
     *
     * @returns No value after scheduling state.
     */
  setDecision: (field: FieldKey<TRecord>, decision: FieldDecision) => void;

    /**
     * Mark every proposed change accepted.
     *
     * @returns No value after scheduling choices and clearing the save error.
     */
  acceptAll: () => void;

    /**
     * Mark every proposed change rejected.
     *
     * @returns No value after scheduling choices and clearing the save error.
     */
  rejectAll: () => void;

    /**
     * Remove explicit choices so every change returns to pending.
     *
     * @returns No value after scheduling choices and clearing the save error.
     */
  resetDecisions: () => void;

    /**
     * Current record with accepted proposal changes composed into a new candidate.
     */
  candidateRecord: TRecord;

    /**
     * Derived aggregate decision status.
     */
  reviewStatus: ProposalReviewStatus;

    /**
     * Current-value/version compatibility check for the selected changes.
     */
  consistency: ReturnType<typeof import('@alneas/appkit-core/ai/proposal').verifyCurrentState<TRecord>>;

    /**
     * Optional complete-candidate validation result; undefined when no validator is supplied.
     */
  candidateValidation?: CandidateValidationResult;

    /**
     * Whether decisions/consistency/validation permit application and onApply exists.
     */
  canApply: boolean;

    /**
     * Whether this displayed review is awaiting host apply completion.
     */
  isSubmitting: boolean;

    /**
     * Last current-generation apply failure message, or null.
     */
  saveError: string | null;

    /**
     * Apply a prepared payload through the host callback at most once concurrently per displayed generation.
     *
     * @returns True after current-generation success; false when blocked, failed or completed for an older generation.
     *
     * @remarks Errors from payload/application are caught as saveError; the host owns durable side effects and rollback.
     */
  handleApply: () => Promise<boolean>;
}
