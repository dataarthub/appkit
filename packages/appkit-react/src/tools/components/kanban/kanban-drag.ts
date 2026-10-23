import type { KanbanColumn, KanbanTask } from './types';

/**
 * Resolve a status-only move from the retained structural active/over event shape.
 * @param event - Active id and nullable over target with optional data.current metadata.
 * @param tasks - Current task listing; it is not mutated.
 * @param statusField - Task property containing the column id.
 * @param columns - Optional live preset columns; omitted for compound registrations.
 * @returns The taskId/status pair, or null for unknown, unchanged or invalid targets.
 * @remarks This helper retains its legacy-shaped structural input without a
 * dependency on legacy dnd-kit types. It never persists within-column order.
 * @example
 * ```tsx
 * import {resolveKanbanMove} from '@alneas/appkit-react/tools/kanban';
 * const tasks = [{id: 'one', title: 'Review', status: 'todo'}];
 * export const move = resolveKanbanMove({active: {id: 'one'},
 *   over: {id: 'done', data: {current: {type: 'Column'}}}}, tasks, 'status');
 * ```
 */
export function resolveKanbanMove(
  {
    active,
    over,
  }: {
    active: {id: string | number};
    over: {id: string | number; data: {current?: Record<string, unknown>}} | null;
  },
  tasks: KanbanTask[],
  statusField: string,
  columns?: KanbanColumn[],
): { taskId: string; status: string } | null {
  if (!over) return null;
  const task = tasks.find((candidate) => candidate.id === active.id);
  if (!task) return null;

  // Column metadata also identifies empty Compound columns, which are supplied as children.
  const isColumn =
    over.data.current?.type === 'Column' || columns?.some((column) => column.id === over.id);
  const status = isColumn
    ? over.id
    : tasks.find((candidate) => candidate.id === over.id)?.[statusField];

  if (typeof status !== 'string' || task[statusField] === status) return null;
  // Presets must not move tasks into a column that was removed during the drag.
  if (columns && !columns.some((column) => column.id === status)) return null;
  return { taskId: task.id, status };
}
