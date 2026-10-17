import type { ExecutionRecord } from "@alneas/appkit-core/ai";

/** Labels for transient execution status, not an assertion about database rollback. */
export type ExecutionStatusLabels = Record<ExecutionRecord['status'], string>;
const STATUS: ExecutionStatusLabels = {
  running: '実行中',
  cancelling: '停止要求中',
  succeeded: '成功',
  failed: '失敗',
  cancelled: '中断',
};

/** Summary-only execution history. Inputs, output records and raw exceptions are not displayed. */
export function ExecutionHistory({
  records,
  labels,
  title = '実行履歴',
}: {
  records: readonly ExecutionRecord[];
  labels?: Partial<ExecutionStatusLabels>;
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
