/**
 * Kanban Column Component
 *
 * カンバンボードの1列（ドロップゾーン）
 */

import * as React from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

import { Badge } from '../ui/badge';
import { KanbanCard } from './KanbanCard';
import { KanbanColumnFrame } from './kanban-primitives';
import type { KanbanColumnProps } from './types';

/**
 * カンバンカラム
 */
export const KanbanColumn = React.forwardRef<HTMLDivElement, KanbanColumnProps>(
  ({ column, tasks, onTaskClick, testId, renderCard, readOnly }, ref) => {
    const isOverLimit = column.limit ? tasks.length >= column.limit : false;

    return (
      <KanbanColumnFrame ref={ref} column={column} isOverLimit={isOverLimit} data-testid={testId}>
        {/* ヘッダー */}
        <div
          data-slot='kanban-column-header'
          className='flex items-center justify-between mb-3 px-1'
        >
          <div className='flex items-center gap-2'>
            {column.color && (
              <div className='w-2 h-2 rounded-full' style={{ backgroundColor: column.color }} />
            )}
            <h3 className='font-semibold text-sm text-foreground'>{column.title}</h3>
          </div>
          <Badge
            variant={isOverLimit ? 'destructive' : 'secondary'}
            className='text-xs px-2 py-0.5'
          >
            {tasks.length}
            {column.limit && ` / ${column.limit}`}
          </Badge>
        </div>

        {/* タスクリスト */}
        <div
          data-slot='kanban-column-content'
          className='flex flex-1 flex-col gap-2 overflow-y-auto'
        >
          <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => (
              <React.Fragment key={task.id}>
                {renderCard ? (
                  renderCard({
                    task,
                    testId: testId ? `${testId}-task-${task.id}` : undefined,
                    onClick: () => onTaskClick?.(task),
                    disableDrag: readOnly,
                  })
                ) : (
                  <KanbanCard
                    task={task}
                    testId={testId ? `${testId}-task-${task.id}` : undefined}
                    onClick={() => onTaskClick?.(task)}
                    disableDrag={readOnly}
                  />
                )}
              </React.Fragment>
            ))}
          </SortableContext>

          {/* 空状態 */}
          {tasks.length === 0 && (
            <div
              data-slot='kanban-column-empty'
              className='flex-1 flex items-center justify-center text-muted-foreground text-xs py-8'
            >
              No tasks
            </div>
          )}
        </div>
      </KanbanColumnFrame>
    );
  },
);

KanbanColumn.displayName = 'KanbanColumn';
