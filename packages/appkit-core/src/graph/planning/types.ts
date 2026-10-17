/** Scheduling inputs only; presentation fields belong to the consumer's task type. */
export interface GanttPlanningTask {
  id: string;
  created_at: string | Date;
  start_date?: string | Date | null;
  due_date?: string | Date | null;
  parent_id?: string | null;
  assignee_id?: string | null;
  durationDays?: number;
  resourceAssignments?: GanttResourceAssignment[];
}

/** A directed dependency between leaf tasks. End dates are exclusive. */
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

/** One shared local-date calendar. No automatic country holiday lookup or per-resource shifts. */
export interface GanttWorkingCalendar {
  /** Working weekdays, Sunday=0. Default Monday–Friday. Empty is allowed with workingDates. */
  workingWeekdays?: number[];
  /** Non-working local dates, strictly YYYY-MM-DD. */
  holidays?: string[];
  /** Explicit working-date overrides; take precedence over holidays and weekdays. */
  workingDates?: string[];
}

/** Resource capacity is expressed in the same units as task assignments. */
export interface GanttResource {
  /** Unique resource identifier. */
  id: string;
  /** Positive finite capacity; default 1. */
  capacity?: number;
}

/** Resources are occupied simultaneously on every working day of a non-split task. */
export interface GanttResourceAssignment {
  /** Must match a configured resource when an explicit resource list is supplied. */
  resourceId: string;
  /** Positive finite demand; default 1. Duplicate assignments are summed. */
  units?: number;
}

/** Deterministic serial leveling, in stable topological/input order. No task splitting or optimality guarantee. */
export interface GanttResourceLeveling {
  /** Enable capacity-constrained scheduling. Default false. */
  enabled?: boolean;
  /** Omit to infer resources from assignments/assignee_id, each at capacity 1. */
  resources?: GanttResource[];
}

/** Opt-in day planner. Dates must be local midnight or YYYY-MM-DD; end dates are exclusive working-day boundaries. */
export interface GanttSchedulingOptions {
  /** Omit for seven working days per week; an empty calendar object means Monday–Friday. */
  calendar?: GanttWorkingCalendar;
  /** Optional capacity leveling, never enabled implicitly. */
  resourceLeveling?: GanttResourceLeveling;
  /** Bounded search horizon from the earliest leaf start. Default 3660, maximum 36600 calendar days. */
  maxCalendarDays?: number;
}

/** Dependency-only CPM timing. Input start dates are release constraints, not an instruction to start ASAP. */
export interface GanttCriticalTask {
  /** Leaf task identifier. */
  taskId: string;
  /** Earliest feasible start/finish respecting release dates and dependencies. */
  earlyStart: Date;
  earlyFinish: Date;
  /** Latest start/finish without delaying the dependency-only project finish. */
  lateStart: Date;
  lateFinish: Date;
  /** Total float in working days. Does not account for resource contention. */
  totalFloatDays: number;
  /** True when total float is zero. */
  critical: boolean;
}

/** CPM analysis of leaf tasks; resource capacities are deliberately excluded. */
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

/** Immutable scheduling result with separate dependency and capacity diagnostics. */
export type GanttScheduledTask<T extends GanttPlanningTask> = {
  [K in keyof T]: K extends 'start_date' | 'due_date' ? T[K] | Date : T[K];
} & Pick<GanttPlanningTask, 'start_date' | 'due_date'>;

export interface GanttScheduleResult<T extends GanttPlanningTask = GanttPlanningTask> {
  /** Scheduled tasks in original order; summaries are left unchanged for the hierarchy rollup. */
  tasks: GanttScheduledTask<T>[];
  /** Dependency-only CPM, before leveling; this is not a resource-constrained critical chain. */
  criticalPath: GanttCriticalPath;
  /** Direct capacity delays and propagated predecessor delays, in working days. */
  resourceDelays: Array<{ taskId: string; directDays: number; propagatedDays: number }>;
  /** Finish after optional leveling, or null when empty. */
  projectFinish: Date | null;
}
