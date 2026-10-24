import {resolveKanbanMove} from './kanban-drag';
import type {KanbanTask, KanbanColumn} from './types';

/** Only the native drop information required by Appkit's status-only contract. */
interface KanbanDrop {
  canceled: boolean;
  operation: {
    source: {id: string | number} | null | undefined;
    target: {id: string | number; data: Record<string, unknown>} | null | undefined;
  };
}
export function resolveKanbanDrop(event: KanbanDrop, tasks: KanbanTask[], statusField: string, columns?: KanbanColumn[]) {
  const {source, target} = event.operation;
  if (event.canceled || !source || !target) return null;
  return resolveKanbanMove({active: {id: source.id}, over: {id: target.id, data: {current: target.data}}}, tasks, statusField, columns);
}
