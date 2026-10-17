import type { ReactNode } from 'react';
import type { FieldDecision, SupportedPrimitive } from "@alneas/appkit-core/ai";

/** Localized labels for a review decision. */
export type ProposalDecisionLabels = Record<FieldDecision, string>;
const LABELS: ProposalDecisionLabels = { pending: '未判断', accepted: '採用', rejected: '却下' };

/** Props for DiffBadge. */
export interface DiffBadgeProps {
  decision: FieldDecision;
  labels?: Partial<ProposalDecisionLabels>;
  className?: string;
}

/** Displays review selection without implying that a change has been applied or saved. */
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

/** Controlled accept/reject/reset controls shared by card and field layouts. */
export interface ProposalDecisionButtonsProps {
  field: string;
  decision: FieldDecision;
  onDecisionChange: (decision: FieldDecision) => void;
  disabled?: boolean;
  labels?: Partial<ProposalDecisionLabels>;
  /** Enables returning a single field to pending. */
  allowReset?: boolean;
  testId?: string;
  buttonClassName?: (selected: boolean) => string;
}

/** Emits decisions only; does not mutate form values or apply a proposal. */
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

/** Controlled inline proposal review, suitable beside an existing form field or table cell. */
export interface ProposalFieldReviewProps {
  change: {
    readonly field: string;
    readonly label?: string;
    readonly before: SupportedPrimitive;
    readonly after: SupportedPrimitive;
    readonly reason?: string;
  };
  decision: FieldDecision;
  onDecisionChange: (decision: FieldDecision) => void;
  disabled?: boolean;
  labels?: Partial<ProposalDecisionLabels>;
  beforeLabel?: string;
  afterLabel?: string;
  formatValue?: (value: SupportedPrimitive) => ReactNode;
  error?: string;
  className?: string;
}

/**
 * Renders a field's proposed values, reason, decision and optional validation message.
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
