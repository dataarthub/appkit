/**
 * Represents a task node within the dependency graph.
 *
 * @see {@link InMemoryTaskGraphAdapter} for a complete graph construction and analysis example.
 */
export interface TaskNode {

  /** Unique identifier for the task */
  id: string;

  /** Human-readable task title */
  title: string;

  /** Estimated duration in hours (defaults to 1) */
  durationHours?: number;

  /** Execution status ('TODO' | 'IN_PROGRESS' | 'DONE' | string) */
  status: string;

  /** Due date deadline */
  dueDate?: string | Date | null;

  /** Assigned user or agent identifier */
  assignee?: string;

  /** Importance or priority level ('low' | 'medium' | 'high' | 'urgent', etc.) */
  priority?: string;

  /** Additional consumer-owned metadata indexed by field name; CPM ignores these fields. */
  [key: string]: unknown;
}

/**
 * Dependency edge between tasks (predecessor -> successor).
 *
 * @see {@link InMemoryTaskGraphAdapter} for a complete graph construction and analysis example.
 */
export interface TaskEdge {

  /** Predecessor task ID (must be completed first) */
  predecessorId: string;

  /** Successor task ID (blocked until predecessor completes) */
  successorId: string;

  /** Dependency relationship type (default: 'FINISH_TO_START') */
  dependencyType?: 'FINISH_TO_START' | 'START_TO_START' | 'FINISH_TO_FINISH' | string;

  /** Lag or lead time in hours (default: 0) */
  lagHours?: number;
}

/**
 * Bottleneck / blocker analysis result for a task.
 *
 * @see {@link InMemoryTaskGraphAdapter} for a complete graph construction and analysis example.
 */
export interface BlockerAnalysis {

  /** Task identifier */
  taskId: string;

  /** Task title */
  title: string;

  /** Current execution status */
  status: string;

  /** Task IDs directly blocked by this task */
  directBlockedIds: string[];

  /** All downstream task IDs recursively blocked by this task */
  allBlockedIds: string[];

  /** Total count of downstream blocked tasks */
  blockedCount: number;

  /** Whether this task lies on the critical path */
  isCritical: boolean;

  /** Unblock priority score derived from blocked count, duration, and criticality */
  unblockPriorityScore: number;
}

/**
 * CPM schedule metrics and all tasks whose rounded slack is zero.
 *
 * @remarks
 * Critical task IDs are in topological order and may span tied branches or
 * disconnected tasks. Adjacent IDs do not imply a dependency edge; use the
 * original edges to draw dependencies. Empty input produces zero duration,
 * an empty ID list and an empty taskSchedules object.
 * @example
 * ```typescript
 * import { calculateCriticalPath, type TaskNode, type TaskEdge } from '@alneas/appkit-core/graph';
 *
 * const tasks: TaskNode[] = ['a', 'b', 'c', 'd'].map(id => ({
 *   id, title: id, status: 'TODO', durationHours: 1,
 * }));
 * const edges: TaskEdge[] = [
 *   { predecessorId: 'a', successorId: 'b' },
 *   { predecessorId: 'a', successorId: 'c' },
 *   { predecessorId: 'b', successorId: 'd' },
 *   { predecessorId: 'c', successorId: 'd' },
 * ];
 * const result = calculateCriticalPath(tasks, edges);
 * console.log(result.criticalPathTaskIds); // ['a', 'b', 'c', 'd']; no b -> c edge.
 * ```
 */
export interface CriticalPathResult {

  /** Minimum total duration in hours required to complete the project */
  totalDurationHours: number;

  /** All tasks with slack rounded to zero, in topological order; may include multiple branches, not a single connected path. */
  criticalPathTaskIds: string[];

  /** Hour-based schedule metrics per task; slack is nonnegative and rounded to two decimal places. */
  taskSchedules: Record<
    string,
    {

    /** Earliest start offset from the project origin, in hours. */
    earlyStart: number;

    /** Earliest finish offset from the project origin, in hours. */
    earlyFinish: number;

    /** Latest start offset that preserves calculated project completion, in hours. */
    lateStart: number;

    /** Latest finish offset that preserves calculated project completion, in hours. */
    lateFinish: number;

    /** Nonnegative lateStart minus earlyStart, rounded to two decimal places, in hours. */
    slack: number;

    /** True when the rounded slack equals zero. */
    isCritical: boolean;
    }
  >;
}

/**
 * Delay simulation (What-If analysis) impact result.
 *
 * @see {@link InMemoryTaskGraphAdapter} for a complete graph construction and analysis example.
 */
export interface DelayImpact {

  /** The source task ID where delay was simulated */
  sourceTaskId: string;

  /** The simulated delay in hours */
  delayHours: number;

  /** Downstream task IDs whose early start is pushed back */
  affectedTaskIds: string[];

  /** Net delay impact on the overall project completion in hours */
  projectDelayHours: number;

  /** All updated zero-slack task IDs in topological order; these need not form a single connected path. */
  newCriticalPathTaskIds: string[];
}

/**
 * Abstract task graph adapter interface.
 *
 * Defines the contract shared across database adapters (OCI ADB, PostgreSQL, Neo4j)
 * and the in-memory reference implementation.
 *
 * @see {@link InMemoryTaskGraphAdapter} for a complete graph construction and analysis example.
 */
export interface TaskGraphAdapter {

  /**
   * Load all tasks and dependency edges
   *
   * @returns Current graph arrays; ownership and refresh behavior belong to the adapter.
   * @throws Rejects when the implementation or its graph loader rejects.
   *
   * @example
   * ```typescript
   * import type { TaskGraphAdapter } from '@alneas/appkit-core/graph';
   *
   * export async function example(adapter: TaskGraphAdapter) {
   *   return adapter.loadGraph();
   * }
   * ```
   */
  loadGraph(): Promise<{
    /** Current task nodes supplied by the adapter. */
    tasks: TaskNode[];
    /** Current directed dependencies supplied by the adapter. */
    edges: TaskEdge[] }>;


  /**
   * Retrieve top blocking tasks ranked by unblock priority score
   *
   * @returns Task blocker rankings; an empty graph gives an empty array.
   * @throws Rejects when the implementation or its graph loader rejects.
   *
   * @example
   * ```typescript
   * import type { TaskGraphAdapter } from '@alneas/appkit-core/graph';
   *
   * export async function example(adapter: TaskGraphAdapter) {
   *   return adapter.getTopBlockers();
   * }
   * ```
   */
  getTopBlockers(): Promise<BlockerAnalysis[]>;


  /**
   * Calculate the critical path and per-task schedule metrics
   *
   * @returns Dependency schedule and all critical task IDs; tied branches can occur.
   * @throws Rejects when the implementation or its graph loader rejects.
   *
   * @example
   * ```typescript
   * import type { TaskGraphAdapter } from '@alneas/appkit-core/graph';
   *
   * export async function example(adapter: TaskGraphAdapter) {
   *   return adapter.getCriticalPath();
   * }
   * ```
   */
  getCriticalPath(): Promise<CriticalPathResult>;


  /**
   * Simulate the project-wide ripple effect of delaying a specific task
   *
   * @returns Recomputed impact after increasing one task duration, in hours.
   * @throws Rejects when the implementation or its graph loader rejects.
   * @param taskId - Existing task whose duration is increased.
   * @param delayHours - Finite nonnegative duration increase, in hours.
   *
   * @example
   * ```typescript
   * import type { TaskGraphAdapter } from '@alneas/appkit-core/graph';
   *
   * export async function example(adapter: TaskGraphAdapter) {
   *   return adapter.simulateDelay('a', 1);
   * }
   * ```
   */
  simulateDelay(taskId: string, delayHours: number): Promise<DelayImpact>;


  /**
   * Verify that the dependency graph contains no cycles
   *
   * @returns Cycle detection flag and detected cycle paths.
   * @throws Rejects when the implementation or its graph loader rejects.
   *
   * @example
   * ```typescript
   * import type { TaskGraphAdapter } from '@alneas/appkit-core/graph';
   *
   * export async function example(adapter: TaskGraphAdapter) {
   *   return adapter.validateAcyclic();
   * }
   * ```
   */
  validateAcyclic(): Promise<{
    /** True when depth-first cycle detection found no cycle. */
    isValid: boolean;
    /** Detected DFS cycle paths with repeated starting ID; empty for an acyclic graph. */
    cycles: string[][] }>;
}
