import { addDays } from 'date-fns';
import type { ComputedTask, GanttHierarchyConfig, GanttTask } from '../types';

/** Normalize untrusted progress values for display and editing. */
export const boundedProgress = (value: number | undefined) =>
  Number.isFinite(value) ? Math.min(100, Math.max(0, value!)) : 0;

/** Build a forest without recursion, including orphans/cycles once. Aggregate before visibility. */
export function computeGanttTasks(
  tasks: GanttTask[],
  expanded: Set<string>,
  config?: GanttHierarchyConfig,
): ComputedTask[] {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const children = new Map<string, GanttTask[]>();
  for (const task of byId.values()) {
    if (
      config?.enabled !== false &&
      task.parent_id &&
      byId.has(task.parent_id) &&
      task.parent_id !== task.id
    ) {
      const list = children.get(task.parent_id) ?? [];
      list.push(task);
      children.set(task.parent_id, list);
    }
  }
  const result: ComputedTask[] = [];
  const visited = new Set<string>();
  const adopted = new Map<string, ComputedTask[]>();
  const depthLimit = Number.isFinite(config?.maxDepth) ? Math.max(0, config!.maxDepth!) : Infinity;
  const traverse = (root: GanttTask) => {
    const stack: { task: GanttTask; level: number; visible: boolean; parent?: ComputedTask }[] = [
      { task: root, level: 0, visible: true },
    ];
    while (stack.length) {
      const { task, level, visible, parent } = stack.pop()!;
      if (visited.has(task.id)) continue;
      visited.add(task.id);
      const rawStart = new Date(task.start_date || task.created_at);
      const created = new Date(task.created_at);
      const start = Number.isFinite(+rawStart)
        ? rawStart
        : Number.isFinite(+created)
          ? created
          : new Date(0);
      const rawEnd = new Date(task.due_date ?? NaN);
      const end = Number.isFinite(+rawEnd) && +rawEnd >= +start ? rawEnd : addDays(start, 1);
      const computed: ComputedTask = {
        ...task,
        computedStart: start,
        computedEnd: end,
        computedProgress: boundedProgress(task.progress),
        computedLevel: Math.min(level, depthLimit),
        hasChildren: false,
        isVisible: visible,
      };
      if (parent) {
        parent.hasChildren = true;
        const siblings = adopted.get(parent.id) ?? [];
        siblings.push(computed);
        adopted.set(parent.id, siblings);
      }
      result.push(computed);
      const childTasks = children.get(task.id) ?? [];
      for (let i = childTasks.length - 1; i >= 0; i--)
        stack.push({
          task: childTasks[i],
          level: level + 1,
          visible: visible && expanded.has(task.id),
          parent: computed,
        });
    }
  };
  for (const task of byId.values()) {
    if (
      config?.enabled === false ||
      !task.parent_id ||
      !byId.has(task.parent_id) ||
      task.parent_id === task.id
    )
      traverse(task);
  }
  for (const task of byId.values()) if (!visited.has(task.id)) traverse(task);
  for (let i = result.length - 1; i >= 0; i--) {
    const task = result[i];
    const childTasks = adopted.get(task.id);
    if (!childTasks?.length) continue;
    if (config?.autoRollupProgress)
      task.computedProgress =
        childTasks.reduce((sum, child) => sum + child.computedProgress, 0) / childTasks.length;
    // Preserve manually assigned parent bounds; recursively expand to contain descendants.
    if (config?.autoRollupDates) {
      for (const child of childTasks) {
        if (+child.computedStart < +task.computedStart)
          task.computedStart = new Date(child.computedStart);
        if (+child.computedEnd > +task.computedEnd) task.computedEnd = new Date(child.computedEnd);
      }
    }
  }
  return result;
}
