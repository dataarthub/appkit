import * as React from 'react';
import {DragDropProvider} from '@dnd-kit/react';
import {Accessibility} from '@dnd-kit/dom';
import {resolveKanbanDrop} from './kanban-events';
import {useKanbanSensors, kanbanAccessibility} from './use-kanban-sensors';
import type {KanbanBoardProps, KanbanTask} from './types';

type KanbanDragOptions = Pick<KanbanBoardProps, 'tasks' | 'statusField' | 'readOnly' | 'onStatusChange'> & Partial<Pick<KanbanBoardProps, 'columns'>>;
type NativeContextProps = Omit<React.ComponentProps<typeof DragDropProvider>, 'children'>;
/** Native drag state and provider props used by KanbanDragSurface. */
export interface KanbanDragController {
  /** Current task, or null when idle, removed or read-only. */
  activeTask: KanbanTask | null;
  /** Native provider props; legacy DndContext controllers are incompatible. */
  contextProps: NativeContextProps;
}
const plugins: NativeContextProps['plugins'] = defaults => [...defaults, Accessibility.configure(kanbanAccessibility)];

/**
 * Control a status-only Kanban drag using native provider events and sensors.
 * @param options - Current tasks, optional columns, statusField (default status),
 * readOnly (default false) and the status-change callback. Hosts own durable state.
 * @returns The active task or null and native props for KanbanDragSurface.
 * @remarks No within-column ordering is persisted. Canceled, removed or read-only
 * operations do not notify a status change. Use the migrated surface/provider;
 * contextProps is not a legacy DndContext prop object.
 * @example
 * ```tsx
 * import {KanbanDragSurface, KanbanColumn, useKanbanDrag} from '@alneas/appkit-react/tools/kanban';
 * import '@alneas/appkit-react/styles';
 * export function CustomBoard() {
 *   const tasks = [{id: 'one', title: 'Review', status: 'todo'}];
 *   const controller = useKanbanDrag({tasks});
 *   return <KanbanDragSurface controller={controller}>
 *     <KanbanColumn column={{id: 'todo', title: 'Todo'}} tasks={tasks} />
 *     <KanbanColumn column={{id: 'done', title: 'Done'}} tasks={[]} />
 *   </KanbanDragSurface>;
 * }
 * ```
 */
export function useKanbanDrag({tasks, columns, statusField = 'status', readOnly = false, onStatusChange}: KanbanDragOptions): KanbanDragController {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const sensors = useKanbanSensors(statusField);
  const activeTask = readOnly ? null : (tasks.find(task => task.id === activeId) ?? null);
  const onBeforeDragStart: NativeContextProps['onBeforeDragStart'] = event => {
    if (readOnly || !tasks.some(task => task.id === event.operation.source?.id)) event.preventDefault();
  };
  const onDragStart: NativeContextProps['onDragStart'] = event => {
    const task = tasks.find(task => task.id === event.operation.source?.id);
    setActiveId(!readOnly && task ? task.id : null);
  };
  const onDragEnd: NativeContextProps['onDragEnd'] = (event, manager) => {
    setActiveId(null);
    if (readOnly || !event.operation.target || !manager.registry.droppables.get(event.operation.target.id)) return;
    const move = resolveKanbanDrop(event, tasks, statusField, columns);
    if (move) onStatusChange?.(move.taskId, move.status);
  };
  return {activeTask, contextProps: {sensors, plugins, onBeforeDragStart, onDragStart, onDragEnd}};
}
