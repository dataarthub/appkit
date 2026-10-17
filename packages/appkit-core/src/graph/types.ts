/**
 * Task Graph & Dependency Analysis Types
 *
 * Common type definitions for DAG analysis, CPM calculation, and graph adapters.
 */

/**
 * Represents a task node within the dependency graph.
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
  /** Custom extensible metadata */
  [key: string]: unknown;
}

/**
 * Dependency edge between tasks (predecessor -> successor).
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
 * Critical Path Method (CPM) schedule analysis result.
 */
export interface CriticalPathResult {
  /** Minimum total duration in hours required to complete the project */
  totalDurationHours: number;
  /** Ordered list of task IDs forming the critical path */
  criticalPathTaskIds: string[];
  /** Schedule metrics (early/late start/finish, slack) per task */
  taskSchedules: Record<
    string,
    {
      earlyStart: number;
      earlyFinish: number;
      lateStart: number;
      lateFinish: number;
      slack: number;
      isCritical: boolean;
    }
  >;
}

/**
 * Delay simulation (What-If analysis) impact result.
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
  /** Updated critical path task IDs resulting from the delay */
  newCriticalPathTaskIds: string[];
}

/**
 * Abstract task graph adapter interface.
 *
 * Defines the contract shared across database adapters (OCI ADB, PostgreSQL, Neo4j)
 * and the in-memory reference implementation.
 */
export interface TaskGraphAdapter {
  /** Load all tasks and dependency edges */
  loadGraph(): Promise<{ tasks: TaskNode[]; edges: TaskEdge[] }>;

  /** Retrieve top blocking tasks ranked by unblock priority score */
  getTopBlockers(): Promise<BlockerAnalysis[]>;

  /** Calculate the critical path and per-task schedule metrics */
  getCriticalPath(): Promise<CriticalPathResult>;

  /** Simulate the project-wide ripple effect of delaying a specific task */
  simulateDelay(taskId: string, delayHours: number): Promise<DelayImpact>;

  /** Verify that the dependency graph contains no cycles */
  validateAcyclic(): Promise<{ isValid: boolean; cycles: string[][] }>;
}
