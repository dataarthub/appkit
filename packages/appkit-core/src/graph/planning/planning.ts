import { addDays } from './dates';
import type {
  GanttScheduledTask,
  GanttDependency,
  GanttPlanningTask,
  GanttSchedulingOptions,
  GanttScheduleResult,
  GanttCriticalPath,
} from './types';
import { graph } from './graph';
import { planningDate, workingDayPredicate } from './working-calendar';
import { exceedsCapacity, GanttCapacityIndex } from './capacity-index';

/**
 * Plan whole working days with a shared calendar and optional resource capacities.
 * Dates must be local midnight (date-only strings are parsed locally). Finishes are
 * exclusive next-working-day boundaries. A positive span with no working days gets
 * one day; durationDays overrides inferred duration, including zero-day milestones.
 *
 * Stable topological/input order decides resource precedence. Tasks are never split,
 * pulled before their input starts, or optimized for shortest makespan. All statuses
 * participate; actual/frozen work and individual resource calendars are not modeled.
 * Summary rows are preserved but excluded from planning. Invalid inputs, cycles,
 * over-capacity demand and exhausted search bounds throw without mutating inputs.
 * CPM is dependency-only BEFORE leveling; capacity delays are reported separately.
 *
 * @example
 * ```ts
 * import { planGanttTasks } from "./";
 * const result = planGanttTasks(tasks, dependencies, {
 *   calendar: { workingWeekdays: [1, 2, 3, 4, 5], holidays: ['2026-09-21'] },
 *   resourceLeveling: { enabled: true },
 * });
 * ```
 */
export function planGanttTasks<T extends GanttPlanningTask>(
  tasks: T[],
  dependencies: GanttDependency[],
  options: GanttSchedulingOptions = {},
): GanttScheduleResult<T> {
  const { order, incoming } = graph(tasks, dependencies);
  const isWorking = workingDayPredicate(options.calendar);
  const horizon = options.maxCalendarDays ?? 3660;
  if (!Number.isInteger(horizon) || horizon < 1 || horizon > 36600)
    throw new Error('maxCalendarDays must be between 1 and 36600.');
  const summaries = new Set(tasks.map((task) => task.parent_id).filter(Boolean));
  const leaves = tasks.filter((task) => !summaries.has(task.id));
  const empty: GanttCriticalPath = {
    tasks: [],
    taskIds: [],
    dependencyIds: [],
    projectFinish: null,
  };
  if (!leaves.length)
    return {
      tasks: [...tasks] as GanttScheduledTask<T>[],
      criticalPath: empty,
      resourceDelays: [],
      projectFinish: null,
    };
  const dates = new Map(
    leaves.map((task) => {
      const start = planningDate(task.start_date ?? task.created_at);
      const end = task.due_date == null ? addDays(start, 1) : planningDate(task.due_date);
      if (+end < +start) throw new Error(`Invalid task dates: ${task.id}`);
      return [task.id, { start, end }] as const;
    }),
  );
  let origin = dates.get(leaves[0].id)!.start;
  for (const { start } of dates.values()) if (+start < +origin) origin = start;
  const axis: Date[] = [];
  for (let i = 0; i <= horizon; i++) {
    const day = addDays(origin, i);
    if (!Number.isFinite(+day)) throw new Error('Schedule exceeds the supported date range.');
    if (isWorking(day)) axis.push(day);
  }
  const at = (index: number): Date => {
    if (!Number.isSafeInteger(index) || index < 0 || index >= axis.length)
      throw new Error(
        'Schedule exceeds maxCalendarDays or the calendar has no available working days.',
      );
    return new Date(axis[index]);
  };
  const indexOf = (date: Date) => {
    let lo = 0,
      hi = axis.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (+axis[mid] < +date) lo = mid + 1;
      else hi = mid;
    }
    at(lo);
    return lo;
  };
  const durations = new Map<string, number>();
  const releases = new Map<string, number>();
  for (const task of leaves) {
    const { start, end } = dates.get(task.id)!;
    const release = indexOf(start);
    const duration =
      task.durationDays ?? (+start === +end ? 0 : Math.max(1, indexOf(end) - release));
    if (!Number.isSafeInteger(duration) || duration < 0)
      throw new Error(`Duration must be a non-negative integer: ${task.id}`);
    at(release + duration);
    releases.set(task.id, release);
    durations.set(task.id, duration);
  }
  // Convert all four relation types into start-to-start lower bounds.
  const weight = (link: GanttDependency) =>
    (link.type[0] === 'F' ? durations.get(link.sourceId)! : 0) +
    (link.lagDays ?? 0) -
    (link.type[1] === 'F' ? durations.get(link.targetId)! : 0);
  const leafOrder = order.filter((id) => durations.has(id));
  const earliest = new Map<string, number>();
  let dependencyFinish = 0;
  for (const id of leafOrder) {
    let start = releases.get(id)!;
    for (const link of incoming.get(id) ?? [])
      start = Math.max(start, earliest.get(link.sourceId)! + weight(link));
    at(start + durations.get(id)!);
    earliest.set(id, start);
    dependencyFinish = Math.max(dependencyFinish, start + durations.get(id)!);
  }
  const latest = new Map(
    leaves.map((task) => [task.id, dependencyFinish - durations.get(task.id)!]),
  );
  for (let i = leafOrder.length - 1; i >= 0; i--) {
    const id = leafOrder[i];
    for (const link of incoming.get(id) ?? [])
      latest.set(
        link.sourceId,
        Math.min(latest.get(link.sourceId)!, latest.get(id)! - weight(link)),
      );
  }
  const timings = leaves.map((task) => {
    const early = earliest.get(task.id)!,
      late = latest.get(task.id)!,
      duration = durations.get(task.id)!;
    return {
      taskId: task.id,
      earlyStart: at(early),
      earlyFinish: at(early + duration),
      lateStart: at(late),
      lateFinish: at(late + duration),
      totalFloatDays: late - early,
      critical: late === early,
    };
  });
  const critical = new Set(timings.filter((task) => task.critical).map((task) => task.taskId));
  const criticalPath: GanttCriticalPath = {
    tasks: timings,
    taskIds: timings.filter((task) => task.critical).map((task) => task.taskId),
    dependencyIds: dependencies
      .filter(
        (link) =>
          critical.has(link.sourceId) &&
          critical.has(link.targetId) &&
          earliest.get(link.targetId) === earliest.get(link.sourceId)! + weight(link),
      )
      .map((link) => link.id),
    projectFinish: at(dependencyFinish),
  };
  const leveling = options.resourceLeveling;
  const capacities = new Map<string, number>();
  const assignments = new Map<string, Map<string, number>>();
  if (leveling?.enabled) {
    for (const resource of leveling.resources ?? []) {
      const capacity = resource.capacity ?? 1;
      if (
        !resource.id ||
        capacities.has(resource.id) ||
        !Number.isFinite(capacity) ||
        capacity <= 0
      )
        throw new Error('Resource IDs must be unique and capacities positive and finite.');
      capacities.set(resource.id, capacity);
    }
    for (const task of leaves) {
      const demand = new Map<string, number>();
      for (const assignment of task.resourceAssignments ??
        (task.assignee_id ? [{ resourceId: task.assignee_id }] : [])) {
        const units = assignment.units ?? 1;
        if (!assignment.resourceId || !Number.isFinite(units) || units <= 0)
          throw new Error(`Invalid resource assignment: ${task.id}`);
        if (!capacities.has(assignment.resourceId)) {
          if (leveling.resources) throw new Error(`Unknown resource: ${assignment.resourceId}`);
          capacities.set(assignment.resourceId, 1);
        }
        demand.set(assignment.resourceId, (demand.get(assignment.resourceId) ?? 0) + units);
      }
      for (const [resource, units] of demand)
        if (!Number.isFinite(units) || exceedsCapacity(units, capacities.get(resource)!))
          throw new Error(`Task ${task.id} exceeds resource capacity: ${resource}`);
      assignments.set(task.id, demand);
    }
  }
  const occupied = new Map<string, GanttCapacityIndex>();
  const scheduled = new Map<string, number>();
  const resourceDelays: GanttScheduleResult['resourceDelays'] = [];
  let projectFinish = 0;
  let checks = 0;
  const checkBudget = () => {
    if (++checks > 5_000_000)
      throw new Error(
        'Resource leveling search limit exceeded; reduce the schedule size or horizon.',
      );
  };
  for (const id of leafOrder) {
    const duration = durations.get(id)!;
    let start = earliest.get(id)!;
    for (const link of incoming.get(id) ?? [])
      start = Math.max(start, scheduled.get(link.sourceId)! + weight(link));
    const constrained = start;
    const demand = assignments.get(id) ?? new Map<string, number>();
    // Skip the entire conflicting run. Every earlier candidate would overlap a blocked day.
    search: while (true) {
      at(start + duration);
      for (const [resource, units] of demand) {
        const usage = occupied.get(resource);
        const capacity = capacities.get(resource)!;
        const conflict = usage?.first(start, start + duration, units, capacity) ?? -1;
        if (conflict !== -1) {
          const available = usage!.first(conflict + 1, axis.length, units, capacity, false);
          start = available === -1 ? axis.length : available;
          continue search;
        }
      }
      break;
    }
    for (const [resource, units] of demand) {
      if (!duration) continue;
      const usage = occupied.get(resource) ?? new GanttCapacityIndex(axis.length, checkBudget);
      usage.reserve(start, start + duration, units);
      occupied.set(resource, usage);
    }
    scheduled.set(id, start);
    projectFinish = Math.max(projectFinish, start + duration);
    if (start > earliest.get(id)!)
      resourceDelays.push({
        taskId: id,
        directDays: start - constrained,
        propagatedDays: constrained - earliest.get(id)!,
      });
  }
  return {
    tasks: tasks.map((task) => {
      const start = scheduled.get(task.id);
      if (start === undefined) return task;
      return { ...task, start_date: at(start), due_date: at(start + durations.get(task.id)!) };
    }) as GanttScheduledTask<T>[],
    criticalPath,
    resourceDelays,
    projectFinish: at(projectFinish),
  };
}

/** Dependency-only whole-day CPM; ignores resource capacities. Input starts are release constraints. */
export function analyzeGanttCriticalPath(
  tasks: GanttPlanningTask[],
  dependencies: GanttDependency[],
  options: GanttSchedulingOptions = {},
): GanttCriticalPath {
  return planGanttTasks(tasks, dependencies, { ...options, resourceLeveling: undefined })
    .criticalPath;
}
