import type { ReactNode } from 'react';
import type { FieldDecision, SupportedPrimitive } from "@alneas/appkit-core/ai";

/**
 * Display labels for pending, accepted and rejected decisions.
 *
 * @see ProposalFieldReview for controlled usage.
 */
export type ProposalDecisionLabels = Record<FieldDecision, string>;
const LABELS: ProposalDecisionLabels = { pending: '未判断', accepted: '採用', rejected: '却下' };

/**
 * Decision display settings for DiffBadge; see its usage example.
 *
 * @see DiffBadge for the canonical usage example.
 */
export interface DiffBadgeProps {
  /**
   * Current review choice; no save/apply status is implied.
   */
  decision: FieldDecision;
  /**
   * Optional per-choice localized text; omitted values use Japanese defaults.
   */
  labels?: Partial<ProposalDecisionLabels>;
  /**
   * Optional replacement classes; omission uses compact bordered badge classes.
   */
  className?: string;
}

/**
 * Displays the current review choice without implying persistence.
 *
 * @param props - Controlled state, optional labels/style settings and callbacks.
 *
 * @returns Span carrying data-decision and a localized label.
 *
 * @remarks Import Appkit styles for utility-class styling; no context provider is required.
 * Callbacks and formatters are synchronous and their errors propagate. Host code owns
 * review state and persistence; these controls do not apply changes automatically.
 *
 * @example
 * ```tsx
 * import { useState } from 'react';
 * import '@alneas/appkit-react/styles';
 * import { DiffBadge, type FieldDecision } from '@alneas/appkit-react/ai/proposal';
 * export function FieldReview() {
 *   const [decision, setDecision] = useState<FieldDecision>('pending');
 *   return <DiffBadge decision="pending" />;
 * }
 * ```
 */
export function DiffBadge({ decision, labels, className }: DiffBadgeProps) {
  return (
    <span
      className={className ?? 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border'}
      data-decision={decision}
    >
      {labels?.[decision] ?? LABELS[decision]}
    </span>
  );
}

/**
 * Controlled choice inputs; see ProposalDecisionButtons for usage.
 *
 * @see ProposalDecisionButtons for the canonical usage example.
 */
export interface ProposalDecisionButtonsProps {
  /**
   * Field key used as group aria-label and optional test-ID suffix.
   */
  field: string;
  /**
   * Current externally controlled choice.
   */
  decision: FieldDecision;
  /**
   * Synchronous callback receiving the clicked choice; the host must update decision.
   *
   * @param decision - Clicked pending/accepted/rejected choice.
   *
   * @returns No value; the host schedules its controlled state update.
   */
  onDecisionChange: (decision: FieldDecision) => void;
  /**
   * Disable every choice button; defaults to false/undefined.
   */
  disabled?: boolean;
  /**
   * Optional per-choice text; unspecified values use Japanese defaults.
   */
  labels?: Partial<ProposalDecisionLabels>;
    /**
     * Include a pending/reset choice; defaults to false.
     */
  allowReset?: boolean;
  /**
   * Optional prefix for {prefix}-accept/reject/reset-{field} test IDs.
   */
  testId?: string;
  /**
   * Optional synchronous class factory receiving whether this button is selected; replaces default button styling.
   */
  buttonClassName?: (selected: boolean) => string;
}

/**
 * Emits controlled accept/reject and optional reset choices.
 *
 * @param props - Controlled state, optional labels/style settings and callbacks.
 *
 * @returns Button group; no form values or proposals are mutated.
 *
 * @remarks Import Appkit styles for utility-class styling; no context provider is required.
 * Callbacks and formatters are synchronous and their errors propagate. Host code owns
 * review state and persistence; these controls do not apply changes automatically.
 *
 * @example
 * ```tsx
 * import { useState } from 'react';
 * import '@alneas/appkit-react/styles';
 * import { ProposalDecisionButtons, type FieldDecision } from '@alneas/appkit-react/ai/proposal';
 * export function FieldReview() {
 *   const [decision, setDecision] = useState<FieldDecision>('pending');
 *   return <ProposalDecisionButtons field="title" decision={decision} onDecisionChange={setDecision} />;
 * }
 * ```
 */
export function ProposalDecisionButtons({
  field,
  decision,
  onDecisionChange,
  disabled,
  labels,
  allowReset = false,
  testId,
  buttonClassName,
}: ProposalDecisionButtonsProps) {
  const values: FieldDecision[] = allowReset ? ['accepted', 'rejected', 'pending'] : ['accepted', 'rejected'];
  return (
    <div role="group" aria-label={field} className="inline-flex flex-wrap gap-1">
      {values.map(value => {
        const isSelected = decision === value;
        const defaultClass = isSelected
          ? 'px-2 py-1 text-xs rounded bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
          : 'px-2 py-1 text-xs rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800';
        return (
          <button
            key={value}
            type="button"
            disabled={disabled}
            aria-pressed={isSelected}
            className={buttonClassName ? buttonClassName(isSelected) : defaultClass}
            data-testid={
              testId
                ? `${testId}-${value === 'accepted' ? 'accept' : value === 'rejected' ? 'reject' : 'reset'}-${field}`
                : undefined
            }
            onClick={() => onDecisionChange(value)}
          >
            {labels?.[value] ?? LABELS[value]}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Controlled field-diff presentation; see ProposalFieldReview for usage.
 *
 * @see ProposalFieldReview for the canonical usage example.
 */
export interface ProposalFieldReviewProps {
  /**
   * Field identity, before/after primitive values and optional display reason.
   */
  change: {
    /**
     * Stable field identifier used in the section data attribute.
     */
    readonly field: string;
    /**
     * Optional display label; omission uses the field identifier.
     */
    readonly label?: string;
    /**
     * Original supported primitive value.
     */
    readonly before: SupportedPrimitive;
    /**
     * Proposed supported primitive value.
     */
    readonly after: SupportedPrimitive;
    /**
     * Optional explanatory text displayed below the diff.
     */
    readonly reason?: string;
  };
  /**
   * Externally controlled field choice.
   */
  decision: FieldDecision;
  /**
   * Synchronous choice callback; update host state to reflect the selection.
   *
   * @param decision - Clicked pending/accepted/rejected choice.
   *
   * @returns No value; the host schedules its controlled state update.
   */
  onDecisionChange: (decision: FieldDecision) => void;
  /**
   * Disable review choice buttons; defaults to false/undefined.
   */
  disabled?: boolean;
  /**
   * Optional decision-text overrides; unspecified values use Japanese defaults.
   */
  labels?: Partial<ProposalDecisionLabels>;
  /**
   * Before-value caption, default Japanese label for previous value.
   */
  beforeLabel?: string;
  /**
   * After-value caption, default Japanese label for proposed value.
   */
  afterLabel?: string;
  /**
   * Synchronous value renderer; defaults to null text for null and String(value) otherwise.
   */
  formatValue?: (value: SupportedPrimitive) => ReactNode;
  /**
   * Optional validation message shown with role alert.
   */
  error?: string;
  /**
   * Optional classes on the outer section.
   */
  className?: string;
}

/**
 * Renders before/after values, reason, controlled choices and optional validation feedback.
 *
 * @param props - Controlled state, optional labels/style settings and callbacks.
 *
 * @returns Section with data-proposal-field and review controls.
 *
 * @remarks Import Appkit styles for utility-class styling; no context provider is required.
 * Callbacks and formatters are synchronous and their errors propagate. Host code owns
 * review state and persistence; these controls do not apply changes automatically.
 *
 * @example
 * ```tsx
 * import { useState } from 'react';
 * import '@alneas/appkit-react/styles';
 * import { ProposalFieldReview, type FieldDecision } from '@alneas/appkit-react/ai/proposal';
 * export function FieldReview() {
 *   const [decision, setDecision] = useState<FieldDecision>('pending');
 *   return <ProposalFieldReview change={{ field: 'title', before: 'Old', after: 'New' }} decision={decision} onDecisionChange={setDecision} />;
 * }
 * ```
 */
export function ProposalFieldReview({
  change,
  decision,
  onDecisionChange,
  disabled,
  labels,
  beforeLabel = '変更前',
  afterLabel = '提案値',
  formatValue = value => (value === null ? 'null' : String(value)),
  error,
  className,
}: ProposalFieldReviewProps) {
  return (
    <section aria-label={change.label ?? change.field} className={className} data-proposal-field={change.field}>
      <div className="flex items-center gap-2">
        <span className="font-medium">{change.label ?? change.field}</span>
        <DiffBadge decision={decision} labels={labels} />
      </div>
      <dl className="grid grid-cols-2 gap-2 text-sm my-2">
        <div>
          <dt className="text-neutral-500 text-xs">{beforeLabel}</dt>
          <dd>{formatValue(change.before)}</dd>
        </div>
        <div>
          <dt className="text-neutral-500 text-xs">{afterLabel}</dt>
          <dd>{formatValue(change.after)}</dd>
        </div>
      </dl>
      {change.reason && <p className="text-xs text-neutral-500 my-1">{change.reason}</p>}
      <ProposalDecisionButtons
        field={change.field}
        decision={decision}
        onDecisionChange={onDecisionChange}
        disabled={disabled}
        labels={labels}
        allowReset
      />
      {error && (
        <p role="alert" className="text-sm text-red-600 mt-1">
          {error}
        </p>
      )}
    </section>
  );
}
