import type { DragEndEvent } from '@dnd-kit/core';
import type { KanbanColumn, KanbanTask } from './types';

/** Internal shared drop resolution. A move changes status, never the order within a column. */
export function resolveKanbanMove(
  {
    active,
    over,
  }: {
    active: Pick<DragEndEvent['active'], 'id'>;
    over: Pick<NonNullable<DragEndEvent['over']>, 'id' | 'data'> | null;
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
