/**
 * @fileoverview Kanban Compound Components (Kanban)
 *
 * 合成可能なカンバンボードUIコンポーネント群。
 * プリセットの `<KanbanBoard>` では対応しきれないカラムヘッダーへのカスタムボタン配置や
 * カード内の独自スロット挿入を可能にします。
 *
 * @module kanban/kanban-compound
 */

/* eslint-disable react-refresh/only-export-components */

import * as React from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from "../../lib/utils";
import { Badge } from '../ui/badge';
import { KanbanCardView } from './KanbanCardView';
import { KanbanColumnFrame, KanbanDraggableCard, KanbanDragSurface } from './kanban-primitives';
import { useKanbanDrag } from './use-kanban-drag';
import type { KanbanTask, KanbanColumn as KanbanColumnType } from './types';

// =============================================================================
// Context
// =============================================================================

export interface KanbanCompoundContextValue {
  /** 読み取り専用 */
  readOnly?: boolean;
  activeTask: KanbanTask | null;
  onTaskClick?: (task: KanbanTask) => void;
  statusField: string;
}

const KanbanCompoundContext = React.createContext<KanbanCompoundContextValue | null>(null);

/**
 * KanbanCompound のコンテキストを取得するフック
 */
export function useKanbanCompoundContext() {
  const context = React.useContext(KanbanCompoundContext);
  if (!context) {
    throw new Error('Kanban compound components must be used within <Kanban.Root>');
  }
  return context;
}

// =============================================================================
// Kanban Root
// =============================================================================

export interface KanbanRootProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 読み取り専用。ドラッグを開始しません。 */
  readOnly?: boolean;
  tasks: KanbanTask[];
  onStatusChange?: (taskId: string, newStatus: string) => void;
  onTaskClick?: (task: KanbanTask) => void;
  statusField?: string;
  children: React.ReactNode;
}

/**
 * プリセット版とD&D処理を共有するルート。tasksと列への振り分けは親が更新します（楽観的更新なし）。
 */
export function KanbanRoot({
  tasks,
  onStatusChange,
  onTaskClick,
  statusField = 'status',
  readOnly = false,
  children,
  className,
  ...props
}: KanbanRootProps) {
  const drag = useKanbanDrag({ tasks, onStatusChange, statusField, readOnly });
  const { activeTask } = drag;

  const contextValue = React.useMemo<KanbanCompoundContextValue>(
    () => ({ activeTask, onTaskClick, statusField, readOnly }),
    [activeTask, onTaskClick, statusField, readOnly],
  );

  return (
    <KanbanDragSurface
      controller={drag}
      overlayClassName='rotate-2 scale-105 opacity-90 shadow-2xl'
    >
      <KanbanCompoundContext.Provider value={contextValue}>
        <div role='region' aria-label='Kanban columns' tabIndex={0} className={cn('flex h-full w-full gap-4 overflow-x-auto pb-4', className)} {...props}>
          {children}
        </div>
      </KanbanCompoundContext.Provider>
    </KanbanDragSurface>
  );
}

// =============================================================================
// Kanban Column
// =============================================================================

export interface KanbanColumnProps extends React.HTMLAttributes<HTMLDivElement> {
  column: KanbanColumnType;
  children: React.ReactNode;
}

/**
 * カンバンボードのカラムコンテナ
 */
export function KanbanColumnSlot({ column, children, className, ...props }: KanbanColumnProps) {
  return (
    <KanbanColumnFrame column={column} className={className} {...props}>
      {children}
    </KanbanColumnFrame>
  );
}

// =============================================================================
// Kanban Column Header
// =============================================================================

export interface KanbanColumnHeaderProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'title'
> {
  title?: React.ReactNode;
  count?: number;
  limit?: number;
  color?: string;
  action?: React.ReactNode;
}

/**
 * カンバンカラムのヘッダー
 */
export function KanbanColumnHeaderSlot({
  title,
  count,
  limit,
  color,
  action,
  className,
  children,
  ...props
}: KanbanColumnHeaderProps) {
  const isOverLimit = limit && count !== undefined ? count >= limit : false;

  return (
    <div className={cn('flex items-center justify-between mb-3 px-1', className)} {...props}>
      <div className='flex items-center gap-2'>
        {color && <div className='w-2.5 h-2.5 rounded-full' style={{ backgroundColor: color }} />}
        {title && <h2 className='font-semibold text-sm text-foreground'>{title}</h2>}
        {children}
      </div>
      <div className='flex items-center gap-2'>
        {count !== undefined && (
          <Badge
            variant={isOverLimit ? 'destructive' : 'secondary'}
            className='text-xs px-2 py-0.5'
          >
            {count}
            {limit && ` / ${limit}`}
          </Badge>
        )}
        {action}
      </div>
    </div>
  );
}

// =============================================================================
// Kanban Column Body
// =============================================================================

export interface KanbanColumnBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  tasks: KanbanTask[];
  emptyMessage?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * カンバンカラムのタスク一覧領域
 */
export function KanbanColumnBodySlot({
  tasks,
  emptyMessage = 'No tasks',
  className,
  children,
  ...props
}: KanbanColumnBodyProps) {
  return (
    <div
      data-slot='kanban-column-content'
      className={cn('flex flex-1 flex-col gap-2 overflow-y-auto', className)}
      {...props}
    >
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        {children ? (
          children
        ) : tasks.length > 0 ? (
          tasks.map((task) => <KanbanCardSlot key={task.id} task={task} />)
        ) : (
          <div className='flex-1 flex items-center justify-center text-muted-foreground text-xs py-8'>
            {emptyMessage}
          </div>
        )}
      </SortableContext>
    </div>
  );
}

// =============================================================================
// Kanban Card Slot
// =============================================================================

export interface KanbanCardSlotProps extends React.HTMLAttributes<HTMLDivElement> {
  task: KanbanTask;
  children?: React.ReactNode;
}

/**
 * ドラッグ&ドロップ対応のカンバンカード
 */
export function KanbanCardSlot({ task, children, className, ...props }: KanbanCardSlotProps) {
  const { onTaskClick, readOnly } = useKanbanCompoundContext();
  return (
    <KanbanDraggableCard
      task={task}
      disabled={readOnly}
      onClick={() => onTaskClick?.(task)}
      {...props}
      className={cn(
        children &&
          'rounded-lg border border-border bg-card p-3 shadow-sm hover:shadow transition-shadow',
        className,
      )}
    >
      {children || <KanbanCardView task={task} />}
    </KanbanDraggableCard>
  );
}

// =============================================================================
// Export Object
// =============================================================================

export const Kanban = {
  Root: KanbanRoot,
  Column: KanbanColumnSlot,
  ColumnHeader: KanbanColumnHeaderSlot,
  ColumnBody: KanbanColumnBodySlot,
  Card: KanbanCardSlot,
};
