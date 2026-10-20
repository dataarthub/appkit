/**
 * Scheduling inputs only; presentation fields belong to the consumer's task type.
 *
 * @see {@link planGanttTasks} for a complete working-calendar scheduling example.
 */
export interface GanttPlanningTask {

  /** Unique task identifier referenced by dependencies. */
  id: string;

  /** Fallback release/start date when start_date is absent. */
  created_at: string | Date;

  /** Optional release date; the planner never pulls tasks earlier than this date. */
  start_date?: string | Date | null;

  /** Optional exclusive end; omission infers one calendar-day span before calendar conversion. */
  due_date?: string | Date | null;

  /** Optional parent task ID; referenced parent rows are treated as summaries and excluded from leaf planning. */
  parent_id?: string | null;

  /** Optional resource identifier used when explicit resource assignments are absent. */
  assignee_id?: string | null;

  /** Optional nonnegative integer working-day duration; overrides date-derived duration, including zero-day milestones. */
  durationDays?: number;

  /** Optional simultaneous resource demand on every occupied working day; duplicate resource IDs are summed. */
  resourceAssignments?: GanttResourceAssignment[];
}

/**
 * A directed dependency between leaf tasks. End dates are exclusive.
 *
 * @see {@link planGanttTasks} for a complete working-calendar scheduling example.
 */
export interface GanttDependency {

  /** Unique dependency ID. */
  id: string;

  /** Predecessor task ID. Summary tasks are not supported. */
  sourceId: string;

  /** Successor task ID. */
  targetId: string;

  /** Finish/Start endpoints: FS, SS, FF or SF. */
  type: 'FS' | 'SS' | 'FF' | 'SF';

  /** Integer lag: calendar days in legacy scheduling, working days with scheduling options. Negative values allow lead time. */
  lagDays?: number;
}

/**
 * One shared local-date calendar. No automatic country holiday lookup or per-resource shifts.
 *
 * @see {@link planGanttTasks} for a complete working-calendar scheduling example.
 */
export interface GanttWorkingCalendar {

  /** Working weekdays, Sunday=0. Default Monday–Friday. Empty is allowed with workingDates. */
  workingWeekdays?: number[];

  /** Non-working local dates, strictly YYYY-MM-DD. */
  holidays?: string[];

  /** Explicit working-date overrides; take precedence over holidays and weekdays. */
  workingDates?: string[];
}

/**
 * Resource capacity is expressed in the same units as task assignments.
 *
 * @see {@link planGanttTasks} for a complete working-calendar scheduling example.
 */
export interface GanttResource {

  /** Unique resource identifier. */
  id: string;

  /** Positive finite capacity; default 1. */
  capacity?: number;
}

/**
 * Resources are occupied simultaneously on every working day of a non-split task.
 *
 * @see {@link planGanttTasks} for a complete working-calendar scheduling example.
 */
export interface GanttResourceAssignment {

  /** Must match a configured resource when an explicit resource list is supplied. */
  resourceId: string;

  /** Positive finite demand; default 1. Duplicate assignments are summed. */
  units?: number;
}

/**
 * Deterministic serial leveling, in stable topological/input order. No task splitting or optimality guarantee.
 *
 * @see {@link planGanttTasks} for a complete working-calendar scheduling example.
 */
export interface GanttResourceLeveling {

  /** Enable capacity-constrained scheduling. Default false. */
  enabled?: boolean;

  /** Omit to infer resources from assignments/assignee_id, each at capacity 1. */
  resources?: GanttResource[];
}

/**
 * Opt-in day planner. Dates must be local midnight or YYYY-MM-DD; end dates are exclusive working-day boundaries.
 *
 * @see {@link planGanttTasks} for a complete working-calendar scheduling example.
 */
export interface GanttSchedulingOptions {

  /** Omit for seven working days per week; an empty calendar object means Monday–Friday. */
  calendar?: GanttWorkingCalendar;

  /** Optional capacity leveling, never enabled implicitly. */
  resourceLeveling?: GanttResourceLeveling;

  /** Bounded search horizon from the earliest leaf start. Default 3660, maximum 36600 calendar days. */
  maxCalendarDays?: number;
}

/**
 * Dependency-only CPM timing. Input start dates are release constraints, not an instruction to start ASAP.
 *
 * @see {@link planGanttTasks} for a complete working-calendar scheduling example.
 */
export interface GanttCriticalTask {

  /** Leaf task identifier. */
  taskId: string;

  /** Earliest feasible start/finish respecting release dates and dependencies. */
  earlyStart: Date;

  /** Exclusive earliest finish boundary on the shared working calendar. */
  earlyFinish: Date;

  /** Latest start/finish without delaying the dependency-only project finish. */
  lateStart: Date;

  /** Exclusive latest finish boundary that preserves dependency-only project completion. */
  lateFinish: Date;

  /** Total float in working days. Does not account for resource contention. */
  totalFloatDays: number;

  /** True when total float is zero. */
  critical: boolean;
}

/**
 * CPM analysis of leaf tasks; resource capacities are deliberately excluded.
 *
 * @see {@link planGanttTasks} for a complete working-calendar scheduling example.
 */
export interface GanttCriticalPath {

  /** Per-task timing, in input order. Summary tasks are excluded. */
  tasks: GanttCriticalTask[];

  /** Zero-float task IDs; multiple critical branches may exist. */
  taskIds: string[];

  /** Tight links connecting zero-float tasks. */
  dependencyIds: string[];

  /** Dependency-only finish, or null for no leaf tasks. */
  projectFinish: Date | null;
}

/**
 * Immutable scheduling result with separate dependency and capacity diagnostics.
 *
 * @see {@link planGanttTasks} for a complete working-calendar scheduling example.
 * @typeParam T - Consumer task shape extending GanttPlanningTask; defaults to GanttPlanningTask where allowed.
 */
export type GanttScheduledTask<T extends GanttPlanningTask> = {
  [K in keyof T]: K extends 'start_date' | 'due_date' ? T[K] | Date : T[K];
} & Pick<GanttPlanningTask, 'start_date' | 'due_date'>;

/**
 * Scheduled task records and separate dependency/capacity diagnostics.
 *
 * @see {@link planGanttTasks} for a complete working-calendar scheduling example.
 * @typeParam T - Consumer task shape extending GanttPlanningTask; defaults to GanttPlanningTask where allowed.
 */
export interface GanttScheduleResult<T extends GanttPlanningTask = GanttPlanningTask> {

  /** Scheduled tasks in original order; summaries are left unchanged for the hierarchy rollup. */
  tasks: GanttScheduledTask<T>[];

  /** Dependency-only CPM, before leveling; this is not a resource-constrained critical chain. */
  criticalPath: GanttCriticalPath;

  /** Direct capacity delays and propagated predecessor delays, in working days. */
  resourceDelays: Array<{
    /** Leaf task whose schedule was delayed. */
    taskId: string;
    /** Additional working days caused directly by resource-capacity contention. */
    directDays: number;
    /** Additional working days inherited from predecessors after leveling. */
    propagatedDays: number }>;

  /** Finish after optional leveling, or null when empty. */
  projectFinish: Date | null;
}
