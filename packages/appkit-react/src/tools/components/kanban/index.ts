/**
 * Kanban Board Components
 *
 * カンバンボードコンポーネント群
 *
 * @example
 * ```tsx
 * import { KanbanBoard, DEFAULT_KANBAN_COLUMNS } from '@alneas/appkit-react/tools/kanban';
 *
 * <KanbanBoard
 *   tasks={tasks}
 *   columns={DEFAULT_KANBAN_COLUMNS}
 *   onTaskClick={(task) => openDetail(task.id)}
 *   onStatusChange={(taskId, newStatus) => updateTask(taskId, { status: newStatus })}
 *   testId="project-kanban"
 * />
 * ```
 */

export { KanbanBoard } from './KanbanBoard';
export { KanbanColumn } from './KanbanColumn';
export { KanbanCard } from './KanbanCard';
export { Kanban, useKanbanCompoundContext } from './kanban-compound';
export type {
  KanbanCompoundContextValue,
  KanbanRootProps,
  KanbanColumnProps as KanbanColumnSlotProps,
  KanbanColumnHeaderProps,
  KanbanColumnBodyProps,
  KanbanCardSlotProps,
} from './kanban-compound';

export {
  DEFAULT_KANBAN_COLUMNS,
  type KanbanTask,
  type KanbanColumn as KanbanColumnType,
  type KanbanBoardProps,
  type KanbanColumnProps,
  type KanbanCardProps,
  type KanbanSortOption,
} from './types';
export * from './KanbanCardView';
export * from './kanban-drag';
export * from './kanban-primitives';
export * from './use-kanban-drag';
export * from './use-kanban-sensors';
