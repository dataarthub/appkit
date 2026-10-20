/**
 * In-Memory / Base Task Graph Adapter
 *
 * Generic adapter providing all TaskGraphAdapter methods using the CPM engine (cpm.ts)
 * over tasks and dependencies supplied from any source (REST API, Supabase, SQLite, memory).
 */

import type {
  TaskGraphAdapter,
  TaskNode,
  TaskEdge,
  BlockerAnalysis,
  CriticalPathResult,
  DelayImpact,
} from './types';
import {
  calculateCriticalPath,
  analyzeBlockers,
  simulateDelayImpact,
  detectCycles,
} from './cpm';

/**
 * Initialization options for InMemoryTaskGraphAdapter.
 *
 * @see {@link InMemoryTaskGraphAdapter} for construction and analysis setup.
 */
export interface InMemoryTaskGraphAdapterOptions {

  /** Initial array of tasks */
  tasks?: TaskNode[];

  /** Initial array of dependency edges */
  edges?: TaskEdge[];

  /**
   * Optional dynamic loader function to fetch graph data
   *
   * @returns Graph data to replace the current arrays before each analysis; rejected loader errors propagate.
   * @remarks Called without arguments for every loadGraph/analysis invocation. The host owns I/O, authorization and persistence.
   *
   * @example
   * ```typescript
   * import type { InMemoryTaskGraphAdapterOptions } from '@alneas/appkit-core/graph';
   *
   * export function withLoader(loadData: NonNullable<InMemoryTaskGraphAdapterOptions['loadData']>) {
   *   return { loadData } satisfies InMemoryTaskGraphAdapterOptions;
   * }
   * ```
   */
  loadData?: () => Promise<{
    /** Task nodes supplied by the loader or current graph state; not deep-cloned. */
    tasks: TaskNode[];
    /** Directed dependencies supplied with the graph; not deep-cloned. */
    edges: TaskEdge[] }>;
}

/**
 * In-memory task graph adapter.
 * Operates without external DB dependencies, or alongside arbitrary loader functions.
 *
 * @remarks No persistent storage is provided. Initial/setData arrays are shallow-copied; task objects and returned arrays remain shared. When configured, loadData is invoked on every graph-loading analysis call and its failures propagate.
 *
 * @example
 * ```typescript
 * import { InMemoryTaskGraphAdapter } from '@alneas/appkit-core/graph';
 *
 * const adapter = new InMemoryTaskGraphAdapter({
 *   tasks: [{ id: 'a', title: 'Draft', status: 'TODO', durationHours: 2 }],
 *   edges: [],
 * });
 * console.log(await adapter.getCriticalPath());
 * ```
 */
export class InMemoryTaskGraphAdapter implements TaskGraphAdapter {
  private tasks: TaskNode[];
  private edges: TaskEdge[];
  private loadDataFn?: () => Promise<{ tasks: TaskNode[]; edges: TaskEdge[] }>;


  /**
   * Creates an in-memory graph or a graph refreshed through a host-supplied loader.
   *
   * @param options - Optional initial arrays and loader; defaults to empty arrays without a loader.
   * @example
   * ```typescript
   * import { InMemoryTaskGraphAdapter } from '@alneas/appkit-core/graph';
   *
   * const adapter = new InMemoryTaskGraphAdapter({
   *   tasks: [{ id: 'a', title: 'Draft', status: 'TODO', durationHours: 2 }],
   *   edges: [],
   * });
   * console.log(await adapter.getCriticalPath());
   * ```
   */
  constructor(options: InMemoryTaskGraphAdapterOptions = {}) {
    this.tasks = options.tasks ? [...options.tasks] : [];
    this.edges = options.edges ? [...options.edges] : [];
    this.loadDataFn = options.loadData;
  }


  /**
   * Sets graph data directly.
   * @param tasks - Array of task nodes
   * @param edges - Array of dependency edges
   *
   * @returns No value; replaces stored arrays with shallow copies of the supplied arrays.
   *
   * @example
   * ```typescript
   * import type { InMemoryTaskGraphAdapter } from '@alneas/appkit-core/graph';
   *
   * export async function example(adapter: InMemoryTaskGraphAdapter) {
   *   return adapter.setData([{ id: 'a', title: 'Draft', status: 'TODO' }], []);
   * }
   * ```
   */
  setData(tasks: TaskNode[], edges: TaskEdge[]): void {
    this.tasks = [...tasks];
    this.edges = [...edges];
  }


  /**
   * Loads graph data (tasks and dependency edges).
   * @returns Object containing tasks and edges
   *
   * @remarks A configured loader runs every time; returned arrays are the current stored references, not snapshots.
   * @throws Rejects if the supplied loader rejects.
   *
   * @example
   * ```typescript
   * import type { InMemoryTaskGraphAdapter } from '@alneas/appkit-core/graph';
   *
   * export async function example(adapter: InMemoryTaskGraphAdapter) {
   *   return adapter.loadGraph();
   * }
   * ```
   */
  async loadGraph(): Promise<{
    /** Task nodes supplied by the loader or current graph state; not deep-cloned. */
    tasks: TaskNode[];
    /** Directed dependencies supplied with the graph; not deep-cloned. */
    edges: TaskEdge[] }> {
    if (this.loadDataFn) {
      const result = await this.loadDataFn();
      this.tasks = result.tasks;
      this.edges = result.edges;
    }
    return { tasks: this.tasks, edges: this.edges };
  }


  /**
   * Retrieves top blocking tasks ranked by unblock priority score.
   * @returns Array of blocker analysis results
   *
   * @throws Rejects if the supplied loader rejects.
   *
   * @example
   * ```typescript
   * import type { InMemoryTaskGraphAdapter } from '@alneas/appkit-core/graph';
   *
   * export async function example(adapter: InMemoryTaskGraphAdapter) {
   *   return adapter.getTopBlockers();
   * }
   * ```
   */
  async getTopBlockers(): Promise<BlockerAnalysis[]> {
    const { tasks, edges } = await this.loadGraph();
    return analyzeBlockers(tasks, edges);
  }


  /**
   * Calculates the critical path (longest path and slack schedule).
   * @returns Critical path schedule analysis result
   *
   * @throws Rejects loader failures or invalid CPM inputs.
   * @remarks Critical IDs include all rounded-zero-slack tasks, potentially across branches.
   *
   * @example
   * ```typescript
   * import type { InMemoryTaskGraphAdapter } from '@alneas/appkit-core/graph';
   *
   * export async function example(adapter: InMemoryTaskGraphAdapter) {
   *   return adapter.getCriticalPath();
   * }
   * ```
   */
  async getCriticalPath(): Promise<CriticalPathResult> {
    const { tasks, edges } = await this.loadGraph();
    return calculateCriticalPath(tasks, edges);
  }


  /**
   * Simulates the project-wide ripple effect of delaying a specific task.
   * @param taskId - The source task ID where delay occurs
   * @param delayHours - Simulated delay duration in hours
   * @returns Delay impact simulation result
   *
   * @throws Rejects loader failures, invalid delay, missing task IDs or invalid CPM inputs.
   *
   * @example
   * ```typescript
   * import type { InMemoryTaskGraphAdapter } from '@alneas/appkit-core/graph';
   *
   * export async function example(adapter: InMemoryTaskGraphAdapter) {
   *   return adapter.simulateDelay('a', 1);
   * }
   * ```
   */
  async simulateDelay(taskId: string, delayHours: number): Promise<DelayImpact> {
    const { tasks, edges } = await this.loadGraph();
    return simulateDelayImpact(tasks, edges, taskId, delayHours);
  }


  /**
   * Verifies that the dependency graph contains no circular references (cycles).
   * @returns Validation result with flag and any detected cycle paths
   *
   * @throws Rejects if the supplied loader rejects.
   *
   * @example
   * ```typescript
   * import type { InMemoryTaskGraphAdapter } from '@alneas/appkit-core/graph';
   *
   * export async function example(adapter: InMemoryTaskGraphAdapter) {
   *   return adapter.validateAcyclic();
   * }
   * ```
   */
  async validateAcyclic(): Promise<{
    /** True when depth-first cycle detection found no cycle. */
    isValid: boolean;
    /** Detected DFS cycle paths with repeated starting ID; empty for an acyclic graph. */
    cycles: string[][] }> {
    const { tasks, edges } = await this.loadGraph();
    const cycles = detectCycles(tasks, edges);
    return {
      isValid: cycles.length === 0,
      cycles,
    };
  }
}
