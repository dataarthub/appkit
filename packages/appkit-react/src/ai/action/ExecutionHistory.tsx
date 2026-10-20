import type { ExecutionRecord } from "@alneas/appkit-core/ai";

/**
 * Display label for every Core execution status; partial overrides are accepted by ExecutionHistory.
 *
 * @see ExecutionHistory for usage.
 */
export type ExecutionStatusLabels = Record<ExecutionRecord['status'], string>;
const STATUS: ExecutionStatusLabels = {
  running: '実行中',
  cancelling: '停止要求中',
  succeeded: '成功',
  failed: '失敗',
  cancelled: '中断',
};

/**
 * Renders summary-only execution statuses and optional progress without inputs or raw errors.
 *
 * @param props - Records, partial status labels and an optional localized section title.
 *
 * @returns Section with ordered records and progress indicators when total is positive.
 *
 * @remarks Import Appkit styles for the utility-class presentation; no provider required.
 * Default labels/title are Japanese. A succeeded record after cancellation is labelled
 * as completed after a stop request; cancellation is not a rollback assertion.
 *
 * @example
 * ```tsx
 * import '@alneas/appkit-react/styles';
 * import { ExecutionHistory } from '@alneas/appkit-react/ai/action';
 * export function History() { return <ExecutionHistory records={[]} title="Execution history" />; }
 * ```
 */
export function ExecutionHistory({
  records,
  labels,
  title = '実行履歴',
}: {
  /**
   * Execution snapshots in the order to display; an empty array renders an empty list.
   */
  records: readonly ExecutionRecord[];
  /**
   * Optional per-status display overrides; unspecified labels retain Japanese defaults.
   */
  labels?: Partial<ExecutionStatusLabels>;
  /**
   * Section aria-label and heading; defaults to the Japanese execution-history title.
   */
  title?: string;
}) {
  return (
    <section aria-label={title} className="space-y-2">
      <h4 className="font-medium">{title}</h4>
      <ol className="space-y-2 text-sm">
        {records.map(record => (
          <li key={record.id} data-execution-status={record.status}>
            <span>{record.label}: {labels?.[record.status] ?? STATUS[record.status]}</span>
            {record.cancelRequested && record.status === 'succeeded' && <span>（停止要求後に完了）</span>}
            {record.progress && (
              <div>
                <span>
                  {record.progress.completed}
                  {record.progress.total === undefined ? '' : ` / ${record.progress.total}`} {record.progress.message}
                </span>
                {record.progress.total !== undefined && record.progress.total > 0 && (
                  <progress aria-label={record.label} value={record.progress.completed} max={record.progress.total} />
                )}
              </div>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
