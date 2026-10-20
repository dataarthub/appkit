/**
 * Kanban Board Component
 *
 * カンバンボードメインコンポーネント。@dnd-kit を使用したドラッグ&ドロップ対応。
 *
 * ## Features
 * - ドラッグ&ドロップによるタスク移動
 * - カラムごとのWIP制限
 * - ソート機能（優先度、期限、タイトル）
 * - 楽観的UIアップデート
 * - カスタムカードレンダラー
 *
 * ## AI/Automation Attributes
 * - `data-testid`: Container element
 * - `data-task-count`: Number of tasks
 *
 * @example
 * ```tsx
 * import { KanbanBoard, DEFAULT_KANBAN_COLUMNS } from '@alneas/appkit-react/tools/kanban';
 *
 * const tasks = [
 *   { id: '1', title: 'Task 1', status: 'todo', priority: 'high' },
 *   { id: '2', title: 'Task 2', status: 'in_progress', priority: 'medium' },
 * ];
 *
 * <KanbanBoard
 *   tasks={tasks}
 *   columns={DEFAULT_KANBAN_COLUMNS}
 *   onTaskClick={(task) => openDetail(task.id)}
 *   onStatusChange={(taskId, newStatus) => updateTaskStatus(taskId, newStatus)}
 * />
 * ```
 *
 * @param props - {@link KanbanBoardProps}
 * @returns カンバンボードコンポーネント
 */

import * as React from 'react';
import { ArrowUpDown } from 'lucide-react';

import { cn } from '../../lib/utils';
import { SelectInput } from '../ui/select';
import { KanbanColumn } from './KanbanColumn';
import { KanbanDragSurface } from './kanban-primitives';
import { useKanbanDrag } from './use-kanban-drag';
import type { KanbanBoardProps, KanbanTask, KanbanSortOption } from './types';
import * as m from '../../paraglide/messages.js';

/**
 * ソートオプション定義（レンダー時に評価してロケールを反映）
 */
function getSortOptions(): { value: KanbanSortOption; label: string }[] {
  return [
    { value: 'default', label: m.kanban_sort_default({ defaultValue: 'Default' }) },
    {
      value: 'priority-desc',
      label: m.kanban_sort_priorityDesc({ defaultValue: 'Priority (High → Low)' }),
    },
    {
      value: 'priority-asc',
      label: m.kanban_sort_priorityAsc({ defaultValue: 'Priority (Low → High)' }),
    },
    { value: 'due-asc', label: m.kanban_sort_dueAsc({ defaultValue: 'Due Date (Nearest)' }) },
    { value: 'due-desc', label: m.kanban_sort_dueDesc({ defaultValue: 'Due Date (Farthest)' }) },
    { value: 'title-asc', label: m.kanban_sort_titleAsc({ defaultValue: 'Title (A → Z)' }) },
    { value: 'title-desc', label: m.kanban_sort_titleDesc({ defaultValue: 'Title (Z → A)' }) },
  ];
}

const PRIORITY_MAP: Record<string, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * カンバンボード。Compound版とD&D処理を共有し、ソートと楽観的更新を追加します。
 */
export const KanbanBoard = React.forwardRef<HTMLDivElement, KanbanBoardProps>(
  (
    {
      tasks: initialTasks,
      columns,
      statusField = 'status',
      onTaskClick,
      onStatusChange,
      className,
      testId,
      showSort = true,
      initialSort = 'default',
      readOnly = false,
      disableOptimisticUpdates = false,
      renderCard,
    },
    ref,
  ) => {
    const [sortBy, setSortBy] = React.useState<KanbanSortOption>(initialSort);
    const [optimisticTasks, setOptimisticTasks] = React.useState<KanbanTask[] | null>(null);

    // Reset optimistic state during render when original tasks prop changes
    const [prevInitialTasks, setPrevInitialTasks] = React.useState<KanbanTask[]>(initialTasks);
    if (initialTasks !== prevInitialTasks) {
      setPrevInitialTasks(initialTasks);
      setOptimisticTasks(null);
    }

    const currentTasks =
      disableOptimisticUpdates || !optimisticTasks ? initialTasks : optimisticTasks;

    // ソート処理
    const tasks = React.useMemo(() => {
      const sorted = [...currentTasks];
      switch (sortBy) {
        case 'priority-desc':
          sorted.sort(
            (a, b) =>
              (PRIORITY_MAP[b.priority || 'medium'] || 2) -
              (PRIORITY_MAP[a.priority || 'medium'] || 2),
          );
          break;
        case 'priority-asc':
          sorted.sort(
            (a, b) =>
              (PRIORITY_MAP[a.priority || 'medium'] || 2) -
              (PRIORITY_MAP[b.priority || 'medium'] || 2),
          );
          break;
        case 'due-asc':
          sorted.sort(
            (a, b) =>
              new Date(a.due_date || '9999').getTime() - new Date(b.due_date || '9999').getTime(),
          );
          break;
        case 'due-desc':
          sorted.sort(
            (a, b) =>
              new Date(b.due_date || '1970').getTime() - new Date(a.due_date || '1970').getTime(),
          );
          break;
        case 'title-asc':
          sorted.sort((a, b) => a.title.localeCompare(b.title));
          break;
        case 'title-desc':
          sorted.sort((a, b) => b.title.localeCompare(a.title));
          break;
      }
      return sorted;
    }, [currentTasks, sortBy]);

    const handleStatusChange = React.useCallback(
      (taskId: string, targetStatus: string) => {
        if (!disableOptimisticUpdates) {
          setOptimisticTasks(
            currentTasks.map((task) =>
              task.id === taskId ? { ...task, [statusField]: targetStatus } : task,
            ),
          );
        }
        onStatusChange?.(taskId, targetStatus);
      },
      [currentTasks, disableOptimisticUpdates, statusField, onStatusChange],
    );
    const drag = useKanbanDrag({
      tasks: currentTasks,
      columns,
      statusField,
      readOnly,
      onStatusChange: handleStatusChange,
    });

    // カラムごとにタスクをグループ化
    const tasksByColumn = React.useMemo(() => {
      const result: Record<string, KanbanTask[]> = {};
      columns.forEach((col) => {
        result[col.id] = [];
      });
      tasks.forEach((task) => {
        const status = (task as Record<string, unknown>)[statusField] as string;
        if (result[status]) {
          result[status].push(task);
        }
      });
      return result;
    }, [tasks, columns, statusField]);

    return (
      <KanbanDragSurface controller={drag}>
        <div
          ref={ref}
          data-slot='kanban-board'
          data-testid={testId}
          className={cn('flex flex-col h-full', className)}
        >
          {/* ツールバー */}
          {showSort && (
            <div
              data-slot='kanban-toolbar'
              className='px-4 py-2 flex justify-end border-b border-border'
            >
              <SelectInput
                aria-label="Sort tasks"
                value={sortBy}
                onValueChange={(v) => v && setSortBy(v as KanbanSortOption)}
                options={getSortOptions()}
                className='w-[180px] h-8 text-xs'
                testId={testId ? `${testId}-sort` : undefined}
                icon={<ArrowUpDown className='w-3 h-3 mr-2' />}
              />
            </div>
          )}

          {/* カラム */}
          <div
            data-slot='kanban-columns'
            role='region'
            aria-label='Kanban columns'
            tabIndex={0}
            className='flex h-full gap-4 p-4 overflow-x-auto items-start'
          >
            {columns.map((col) => (
              <KanbanColumn
                key={col.id}
                column={col}
                tasks={tasksByColumn[col.id] || []}
                testId={testId ? `${testId}-column-${col.id}` : undefined}
                onTaskClick={onTaskClick}
                renderCard={renderCard}
                readOnly={readOnly}
              />
            ))}
          </div>
        </div>
      </KanbanDragSurface>
    );
  },
);

KanbanBoard.displayName = 'KanbanBoard';
