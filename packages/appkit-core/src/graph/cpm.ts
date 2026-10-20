/**
 * Critical Path Method (CPM) and DAG Analysis Utilities
 *
 * Pure functions with zero runtime dependencies.
 * Provides topological sorting, cycle detection, critical path calculation (longest path),
 * blocker centrality aggregation, and What-If delay simulation.
 */

import type {
  TaskNode,
  TaskEdge,
  BlockerAnalysis,
  CriticalPathResult,
  DelayImpact,
} from './types';

/**
 * Builds adjacency lists (successors and predecessors) from dependency edges.
 *
 * @param edges - Directed edges; omitted lagHours becomes zero. IDs and dependency types are not validated here.
 * @returns New successor/predecessor maps containing entries only for nodes participating in edges.
 *
 * @example
 * ```typescript
 * import { buildAdjacencyList } from '@alneas/appkit-core/graph';
 *
 * const tasks = [{ id: 'a', title: 'Draft', status: 'TODO', durationHours: 2 }];
 * const edges: never[] = [];
 * console.log(buildAdjacencyList(edges));
 * ```
 */
export function buildAdjacencyList(edges: TaskEdge[]): {

  /** Outgoing edges grouped by predecessor task ID. */
  successors: Map<string, Array<{
    /** Successor task ID in this outgoing edge. */
    targetId: string;
    /** Dependency lag or lead in hours, using zero when omitted. */
    lag: number }>>;

  /** Incoming edges grouped by successor task ID. */
  predecessors: Map<string, Array<{
    /** Predecessor task ID in this incoming edge. */
    targetId: string;
    /** Dependency lag or lead in hours, using zero when omitted. */
    lag: number }>>;
} {
  const successors = new Map<string, Array<{ targetId: string; lag: number }>>();
  const predecessors = new Map<string, Array<{ targetId: string; lag: number }>>();

  for (const edge of edges) {
    const lag = edge.lagHours ?? 0;

    if (!successors.has(edge.predecessorId)) {
      successors.set(edge.predecessorId, []);
    }
    successors.get(edge.predecessorId)!.push({ targetId: edge.successorId, lag });

    if (!predecessors.has(edge.successorId)) {
      predecessors.set(edge.successorId, []);
    }
    predecessors.get(edge.successorId)!.push({ targetId: edge.predecessorId, lag });
  }

  return { successors, predecessors };
}

/**
 * Detects whether circular references (cycles) exist in the dependency graph.
 *
 * @returns An array of detected cycle paths, or an empty array if acyclic.
 *
 * @param tasks - Nodes from which depth-first traversal starts.
 * @param edges - Directed dependencies to traverse; this helper does not validate endpoints.
 * @remarks Returned paths reflect DFS back edges, not an enumeration of all possible simple cycles.
 *
 * @example
 * ```typescript
 * import { detectCycles } from '@alneas/appkit-core/graph';
 *
 * const tasks = [{ id: 'a', title: 'Draft', status: 'TODO', durationHours: 2 }];
 * const edges: never[] = [];
 * console.log(detectCycles(tasks, edges));
 * ```
 */
export function detectCycles(tasks: TaskNode[], edges: TaskEdge[]): string[][] {
  const { successors } = buildAdjacencyList(edges);
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const currentPath: string[] = [];
  const cycles: string[][] = [];

  function dfs(nodeId: string) {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    currentPath.push(nodeId);

    const nextNodes = successors.get(nodeId) || [];
    for (const { targetId } of nextNodes) {
      if (!visited.has(targetId)) {
        dfs(targetId);
      } else if (recursionStack.has(targetId)) {
        const cycleStartIndex = currentPath.indexOf(targetId);
        if (cycleStartIndex !== -1) {
          cycles.push([...currentPath.slice(cycleStartIndex), targetId]);
        }
      }
    }

    currentPath.pop();
    recursionStack.delete(nodeId);
  }

  for (const task of tasks) {
    if (!visited.has(task.id)) {
      dfs(task.id);
    }
  }

  return cycles;
}

/**
 * Executes topological sort on the task graph using Kahn's algorithm.
 *
 * @throws Error If a cycle exists in the graph.
 *
 * @param tasks - Nodes to order with unique IDs.
 * @param edges - Directed dependencies whose endpoints should exist in tasks.
 * @returns Task IDs in dependency order; empty input returns an empty array. This helper does not fully validate the graph.
 *
 * @example
 * ```typescript
 * import { topologicalSort } from '@alneas/appkit-core/graph';
 *
 * const tasks = [{ id: 'a', title: 'Draft', status: 'TODO', durationHours: 2 }];
 * const edges: never[] = [];
 * console.log(topologicalSort(tasks, edges));
 * ```
 */
export function topologicalSort(tasks: TaskNode[], edges: TaskEdge[]): string[] {
  const inDegree = new Map<string, number>();
  const { successors } = buildAdjacencyList(edges);

  for (const task of tasks) {
    inDegree.set(task.id, 0);
  }

  for (const edge of edges) {
    if (inDegree.has(edge.successorId)) {
      inDegree.set(edge.successorId, (inDegree.get(edge.successorId) || 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [taskId, deg] of inDegree.entries()) {
    if (deg === 0) {
      queue.push(taskId);
    }
  }

  const order: string[] = [];
  while (queue.length > 0) {
    const u = queue.shift()!;
    order.push(u);

    const neighbors = successors.get(u) || [];
    for (const { targetId } of neighbors) {
      const currentDeg = inDegree.get(targetId);
      if (currentDeg !== undefined) {
        const newDeg = currentDeg - 1;
        inDegree.set(targetId, newDeg);
        if (newDeg === 0) {
          queue.push(targetId);
        }
      }
    }
  }

  if (order.length < tasks.length) {
    throw new Error('Graph has cycles or unresolvable dependencies.');
  }

  return order;
}

/**
 * Schedules tasks and determines the critical path using the Critical Path Method (CPM).
 *
 * @param tasks - Task nodes; CPM requires unique IDs and finite nonnegative durations (hours, default 1).
 * @param edges - Directed finish-to-start dependencies; CPM accepts FS/FINISH_TO_START and finite lagHours (default 0).
 * @returns Hour-based schedule metrics, project duration and all rounded-zero-slack IDs in topological order; empty input yields zero duration and empty collections.
 * @throws Throws for duplicate IDs, invalid durations/lags, unknown endpoints, unsupported dependency types or cycles.
 * @remarks This is dependency-only analysis; resources, due dates and execution status do not constrain the schedule. Tied critical branches need not form one connected path.
 *
 * @example
 * ```typescript
 * import { calculateCriticalPath } from '@alneas/appkit-core/graph';
 *
 * const tasks = [{ id: 'a', title: 'Draft', status: 'TODO', durationHours: 2 }];
 * const edges: never[] = [];
 * console.log(calculateCriticalPath(tasks, edges));
 * ```
 */
export function calculateCriticalPath(
  tasks: TaskNode[],
  edges: TaskEdge[],
): CriticalPathResult {
  const ids = new Set<string>();
  for (const task of tasks) {
    if (ids.has(task.id)) throw new Error(`Duplicate task id: ${task.id}`);
    ids.add(task.id);
    if (!Number.isFinite(task.durationHours ?? 1) || (task.durationHours ?? 1) < 0)
      throw new Error(`Invalid duration for task: ${task.id}`);
  }
  for (const edge of edges) {
    if (!ids.has(edge.predecessorId) || !ids.has(edge.successorId))
      throw new Error('Dependency references an unknown task');
    if (!Number.isFinite(edge.lagHours ?? 0)) throw new Error('Invalid dependency lag');
    // Do not silently treat SS/FF/SF as FS; those constraints need a separate solver.
    if (edge.dependencyType && !['FS', 'FINISH_TO_START'].includes(edge.dependencyType))
      throw new Error(`Unsupported CPM dependency type: ${edge.dependencyType}`);
  }
  if (tasks.length === 0) {
    return {
      totalDurationHours: 0,
      criticalPathTaskIds: [],
      taskSchedules: {},
    };
  }

  const cycles = detectCycles(tasks, edges);
  if (cycles.length > 0) {
    throw new Error(`Cannot calculate critical path on cyclic graph: ${JSON.stringify(cycles[0])}`);
  }

  const sortedOrder = topologicalSort(tasks, edges);
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const { successors, predecessors } = buildAdjacencyList(edges);

  // 1. Forward Pass (Early Start / Early Finish)
  const earlyStart = new Map<string, number>();
  const earlyFinish = new Map<string, number>();

  for (const taskId of sortedOrder) {
    const task = taskMap.get(taskId)!;
    const duration = task.durationHours ?? 1;
    const preds = predecessors.get(taskId) || [];

    let maxPredFinish = 0;
    for (const { targetId, lag } of preds) {
      const predFinish = (earlyFinish.get(targetId) || 0) + lag;
      if (predFinish > maxPredFinish) {
        maxPredFinish = predFinish;
      }
    }

    earlyStart.set(taskId, maxPredFinish);
    earlyFinish.set(taskId, maxPredFinish + duration);
  }

  // Total project completion duration
  let totalDurationHours = 0;
  for (const ef of earlyFinish.values()) {
    if (ef > totalDurationHours) {
      totalDurationHours = ef;
    }
  }

  // 2. Backward Pass (Late Start / Late Finish)
  const lateStart = new Map<string, number>();
  const lateFinish = new Map<string, number>();

  for (let i = sortedOrder.length - 1; i >= 0; i--) {
    const taskId = sortedOrder[i];
    const task = taskMap.get(taskId)!;
    const duration = task.durationHours ?? 1;
    const succs = successors.get(taskId) || [];

    let minSuccStart = totalDurationHours;
    if (succs.length > 0) {
      // Every task must finish by the project makespan, even with lead times.
      minSuccStart = totalDurationHours;
      for (const { targetId, lag } of succs) {
        const succStart = (lateStart.get(targetId) || 0) - lag;
        if (succStart < minSuccStart) {
          minSuccStart = succStart;
        }
      }
    }

    lateFinish.set(taskId, minSuccStart);
    lateStart.set(taskId, minSuccStart - duration);
  }

  // 3. Slack and critical path identification
  const taskSchedules: CriticalPathResult['taskSchedules'] = Object.create(null);
  const criticalPathSet = new Set<string>();

  for (const taskId of sortedOrder) {
    const es = earlyStart.get(taskId) || 0;
    const ef = earlyFinish.get(taskId) || 0;
    const ls = lateStart.get(taskId) || 0;
    const lf = lateFinish.get(taskId) || 0;
    // Round floating point inaccuracies
    const slack = Math.round(Math.max(0, ls - es) * 100) / 100;
    const isCritical = slack === 0;

    if (isCritical) {
      criticalPathSet.add(taskId);
    }

    taskSchedules[taskId] = {
      earlyStart: es,
      earlyFinish: ef,
      lateStart: ls,
      lateFinish: lf,
      slack,
      isCritical,
    };
  }

  // List critical path tasks ordered by topological sequence
  const criticalPathTaskIds = sortedOrder.filter((id) => criticalPathSet.has(id));

  return {
    totalDurationHours,
    criticalPathTaskIds,
    taskSchedules,
  };
}

/**
 * Analyzes blockers across tasks (centrality ranking by number of blocked downstream tasks).
 *
 * @param tasks - Nodes to rank; statuses are carried into results, not filtered.
 * @param edges - Directed dependencies used for downstream reachability.
 * @returns Every input task ranked by descending unblock score; empty input returns an empty array.
 * @remarks Critical flags are false if CPM rejects the graph, but reachability analysis continues. On cyclic input a node can be reachable from itself.
 *
 * @example
 * ```typescript
 * import { analyzeBlockers } from '@alneas/appkit-core/graph';
 *
 * const tasks = [{ id: 'a', title: 'Draft', status: 'TODO', durationHours: 2 }];
 * const edges: never[] = [];
 * console.log(analyzeBlockers(tasks, edges));
 * ```
 */
export function analyzeBlockers(tasks: TaskNode[], edges: TaskEdge[]): BlockerAnalysis[] {
  const { successors } = buildAdjacencyList(edges);

  let criticalSet = new Set<string>();
  try {
    const cpm = calculateCriticalPath(tasks, edges);
    criticalSet = new Set(cpm.criticalPathTaskIds);
  } catch {
    // Continue blocker analysis even if graph has cycles
  }

  const results: BlockerAnalysis[] = [];

  for (const task of tasks) {
    // Directly blocked tasks
    const directSuccs = successors.get(task.id) || [];
    const directBlockedIds = directSuccs.map((s) => s.targetId);

    // All downstream tasks (collected via DFS reachable nodes)
    const allBlocked = new Set<string>();
    const stack = [...directBlockedIds];

    while (stack.length > 0) {
      const nextId = stack.pop()!;
      if (!allBlocked.has(nextId)) {
        allBlocked.add(nextId);
        const nextSuccs = successors.get(nextId) || [];
        for (const s of nextSuccs) {
          if (!allBlocked.has(s.targetId)) {
            stack.push(s.targetId);
          }
        }
      }
    }

    const allBlockedIds = Array.from(allBlocked);
    const isCritical = criticalSet.has(task.id);
    const duration = task.durationHours ?? 1;

    // Unblock priority score calculation:
    // blockedCount * 10 + (isCritical ? 25 : 0) - min(20, duration * 0.5)
    const unblockPriorityScore =
      allBlockedIds.length * 10 + (isCritical ? 25 : 0) - Math.min(20, duration * 0.5);

    results.push({
      taskId: task.id,
      title: task.title,
      status: task.status,
      directBlockedIds,
      allBlockedIds,
      blockedCount: allBlockedIds.length,
      isCritical,
      unblockPriorityScore: Math.round(unblockPriorityScore * 10) / 10,
    });
  }

  // Sort descending by unblock priority score (most blocking tasks first)
  return results.sort((a, b) => b.unblockPriorityScore - a.unblockPriorityScore);
}

/**
 * Simulates the project-wide ripple effect of delaying a specific task (What-If analysis).
 *
 * @param tasks - Task nodes; CPM requires unique IDs and finite nonnegative durations (hours, default 1).
 * @param edges - Directed finish-to-start dependencies; CPM accepts FS/FINISH_TO_START and finite lagHours (default 0).
 * @param sourceTaskId - Existing task whose duration is increased.
 * @param delayHours - Finite nonnegative duration increase, in hours.
 * @returns Recomputed project delay, other tasks with later early starts, and all updated critical IDs; input arrays are not mutated.
 * @throws Throws for invalid delay, missing source ID or any CPM validation failure.
 *
 * @example
 * ```typescript
 * import { simulateDelayImpact } from '@alneas/appkit-core/graph';
 *
 * const tasks = [{ id: 'a', title: 'Draft', status: 'TODO', durationHours: 2 }];
 * const edges: never[] = [];
 * console.log(simulateDelayImpact(tasks, edges, 'a', 1));
 * ```
 */
export function simulateDelayImpact(
  tasks: TaskNode[],
  edges: TaskEdge[],
  sourceTaskId: string,
  delayHours: number,
): DelayImpact {
  if (!Number.isFinite(delayHours) || delayHours < 0) throw new Error('Delay must be finite and nonnegative');
  const baseCpm = calculateCriticalPath(tasks, edges);
  const targetTask = tasks.find((t) => t.id === sourceTaskId);

  if (!targetTask) {
    throw new Error(`Task with id "${sourceTaskId}" not found.`);
  }

  // Create a virtual task list with the source task's duration increased by the delay
  const modifiedTasks = tasks.map((t) => {
    if (t.id === sourceTaskId) {
      return {
        ...t,
        durationHours: (t.durationHours ?? 1) + delayHours,
      };
    }
    return t;
  });

  const modifiedCpm = calculateCriticalPath(modifiedTasks, edges);
  const projectDelayHours = Math.max(
    0,
    modifiedCpm.totalDurationHours - baseCpm.totalDurationHours,
  );

  // Identify downstream tasks whose early start time was delayed
  const affectedTaskIds: string[] = [];
  for (const [id, schedule] of Object.entries(modifiedCpm.taskSchedules)) {
    if (id === sourceTaskId) continue;
    const baseSchedule = baseCpm.taskSchedules[id];
    if (baseSchedule && schedule.earlyStart > baseSchedule.earlyStart) {
      affectedTaskIds.push(id);
    }
  }

  return {
    sourceTaskId,
    delayHours,
    affectedTaskIds,
    projectDelayHours,
    newCriticalPathTaskIds: modifiedCpm.criticalPathTaskIds,
  };
}
