import * as React from 'react';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { resolveKanbanMove } from './kanban-drag';
import { useKanbanSensors, kanbanAccessibility } from './use-kanban-sensors';
import type { KanbanBoardProps } from './types';

type KanbanDragOptions = Pick<
  KanbanBoardProps,
  'tasks' | 'statusField' | 'readOnly' | 'onStatusChange'
> &
  Partial<Pick<KanbanBoardProps, 'columns'>>;

/** Shared interaction lifecycle. State ownership (optimistic or controlled) stays with the caller. */
export function useKanbanDrag({
  tasks,
  columns,
  statusField = 'status',
  readOnly = false,
  onStatusChange,
}: KanbanDragOptions) {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const sensors = useKanbanSensors(statusField);
  const activeTask = readOnly ? null : (tasks.find((task) => task.id === activeId) ?? null);

  const onDragStart = React.useCallback(
    ({ active }: DragStartEvent) => {
      const task = tasks.find((candidate) => candidate.id === active.id);
      setActiveId(!readOnly && task ? task.id : null);
    },
    [tasks, readOnly],
  );
  const onDragCancel = React.useCallback(() => setActiveId(null), []);
  const onDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      if (readOnly) return;
      const move = resolveKanbanMove(event, tasks, statusField, columns);
      if (move) onStatusChange?.(move.taskId, move.status);
    },
    [tasks, columns, statusField, readOnly, onStatusChange],
  );

  return {
    activeTask,
    contextProps: {
      sensors,
      accessibility: kanbanAccessibility,
      onDragStart,
      onDragEnd,
      onDragCancel,
    },
  };
}
