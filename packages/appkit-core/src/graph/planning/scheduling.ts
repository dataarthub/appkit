import { addDays, differenceInCalendarDays } from './dates';
import type {
  GanttScheduledTask,
  GanttDependency,
  GanttPlanningTask,
  GanttSchedulingOptions,
} from './types';
import { graph } from './graph';
import { planGanttTasks } from './planning';

/** Validate before drawing or enabling cascading edits; never mutate the graph. */
export function dependencyError(
  tasks: GanttPlanningTask[],
  dependencies: GanttDependency[],
): string | null {
  try {
    graph(tasks, dependencies);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : 'Invalid dependencies.';
  }
}

/** Resolve the existing task date convention. Missing due dates get a one-day duration. */
export function taskDates(task: GanttPlanningTask) {
  const start = new Date(task.start_date ?? task.created_at);
  const end = task.due_date == null ? addDays(start, 1) : new Date(task.due_date);
  if (!Number.isFinite(+start) || !Number.isFinite(+end) || +end < +start)
    throw new Error(`Invalid task dates: ${task.id}`);
  return { start, end };
}

/**
 * Apply FS/SS/FF/SF constraints in topological order, moving successors forward only.
 * Preserves each task's calendar-day duration and time-of-day using local date arithmetic.
 * Input tasks/links are not mutated. Cycles, missing IDs and summary dependencies throw.
 * A third options argument opts into the local-midnight day planner with working calendars
 * and optional capacity leveling. Omit it to preserve legacy time-of-day behavior.
 *
 * @example
 * ```ts
 * import { scheduleGanttTasks } from "./";
 * const nextTasks = scheduleGanttTasks(tasks, dependencies);
 * ```
 */
export function scheduleGanttTasks<T extends GanttPlanningTask>(
  tasks: T[],
  dependencies: GanttDependency[],
  options?: GanttSchedulingOptions,
): GanttScheduledTask<T>[] {
  if (options) return planGanttTasks(tasks, dependencies, options).tasks;
  const { order, incoming } = graph(tasks, dependencies);
  const result = new Map(tasks.map((task) => [task.id, task]));
  for (const id of order) {
    const links = incoming.get(id);
    if (!links?.length) continue;
    const task = result.get(id)!;
    const dates = taskDates(task);
    let shift = 0;
    for (const link of links) {
      const source = taskDates(result.get(link.sourceId)!);
      const bound = addDays(link.type[0] === 'F' ? source.end : source.start, link.lagDays ?? 0);
      if (!Number.isFinite(+bound))
        throw new Error(`Dependency lag exceeds the supported date range: ${link.id}`);
      const anchor = link.type[1] === 'F' ? dates.end : dates.start;
      let delta = differenceInCalendarDays(bound, anchor);
      if (+addDays(anchor, delta) < +bound) delta++;
      shift = Math.max(shift, delta);
    }
    if (shift > 0) {
      const start_date = addDays(dates.start, shift);
      const due_date = addDays(dates.end, shift);
      if (!Number.isFinite(+start_date) || !Number.isFinite(+due_date))
        throw new Error(`Schedule exceeds the supported date range: ${id}`);
      result.set(id, { ...task, start_date, due_date });
    }
  }
  return tasks.map((task) => result.get(task.id)!) as GanttScheduledTask<T>[];
}
