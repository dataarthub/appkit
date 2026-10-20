import type { GanttDependency, GanttPlanningTask } from './types';

/**
 * Validate a dependency DAG and return stable topological order and incoming edges.
 *
 * @param tasks - Task records with unique IDs and parent relationships identifying summaries.
 * @param dependencies - Unique supported leaf-task links with integer lags and existing endpoints.
 * @returns Stable topological task IDs and incoming dependencies grouped by successor ID; empty input gives empty collections.
 * @throws Throws duplicate IDs, missing endpoints, summary dependencies, unsupported link types/lags or cycles.
 *
 * @example
 * ```typescript
 * import { graph } from '@alneas/appkit-core/graph/planning/graph';
 *
 * const tasks = [{ id: 'a', created_at: '2026-10-20', durationDays: 2 }];
 * const dependencies: never[] = [];
 * console.log(graph(tasks, dependencies));
 * ```
 */
export function graph(tasks: GanttPlanningTask[], dependencies: GanttDependency[]) {
  const taskMap = new Map(tasks.map((task) => [task.id, task]));
  if (taskMap.size !== tasks.length) throw new Error('Task IDs must be unique.');
  const summaries = new Set(tasks.map((task) => task.parent_id).filter(Boolean));
  const incoming = new Map<string, GanttDependency[]>();
  const outgoing = new Map<string, string[]>();
  const degree = new Map(tasks.map((task) => [task.id, 0]));
  const ids = new Set<string>();
  for (const link of dependencies) {
    if (ids.has(link.id)) throw new Error(`Duplicate dependency ID: ${link.id}`);
    ids.add(link.id);
    if (!taskMap.has(link.sourceId) || !taskMap.has(link.targetId))
      throw new Error(`Dependency ${link.id} refers to a missing task.`);
    if (summaries.has(link.sourceId) || summaries.has(link.targetId))
      throw new Error('Dependencies must connect leaf tasks, not summaries.');
    if (!['FS', 'SS', 'FF', 'SF'].includes(link.type))
      throw new Error(`Invalid dependency type: ${link.id}`);
    if (!Number.isSafeInteger(link.lagDays ?? 0))
      throw new Error(`Dependency lag must be an integer: ${link.id}`);
    const before = incoming.get(link.targetId) ?? [];
    before.push(link);
    incoming.set(link.targetId, before);
    const after = outgoing.get(link.sourceId) ?? [];
    after.push(link.targetId);
    outgoing.set(link.sourceId, after);
    degree.set(link.targetId, degree.get(link.targetId)! + 1);
  }
  const order = tasks.filter((task) => degree.get(task.id) === 0).map((task) => task.id);
  for (let i = 0; i < order.length; i++) {
    for (const next of outgoing.get(order[i]) ?? []) {
      degree.set(next, degree.get(next)! - 1);
      if (degree.get(next) === 0) order.push(next);
    }
  }
  if (order.length !== tasks.length) throw new Error('The dependency graph contains a cycle.');
  return {
    /** Task IDs in stable topological order, including summary tasks. */
    order,
    /** Incoming dependencies keyed by successor ID; tasks without incoming links have no entry. */
    incoming };
}
