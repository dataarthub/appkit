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
 */
export interface InMemoryTaskGraphAdapterOptions {
  /** Initial array of tasks */
  tasks?: TaskNode[];
  /** Initial array of dependency edges */
  edges?: TaskEdge[];
  /** Optional dynamic loader function to fetch graph data */
  loadData?: () => Promise<{ tasks: TaskNode[]; edges: TaskEdge[] }>;
}

/**
 * In-memory task graph adapter.
 * Operates without external DB dependencies, or alongside arbitrary loader functions.
 */
export class InMemoryTaskGraphAdapter implements TaskGraphAdapter {
  private tasks: TaskNode[];
  private edges: TaskEdge[];
  private loadDataFn?: () => Promise<{ tasks: TaskNode[]; edges: TaskEdge[] }>;

  /**
   * Initializes the adapter instance.
   * @param options - Initial tasks/edges or dynamic loader function
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
   */
  setData(tasks: TaskNode[], edges: TaskEdge[]): void {
    this.tasks = [...tasks];
    this.edges = [...edges];
  }

  /**
   * Loads graph data (tasks and dependency edges).
   * @returns Object containing tasks and edges
   */
  async loadGraph(): Promise<{ tasks: TaskNode[]; edges: TaskEdge[] }> {
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
   */
  async getTopBlockers(): Promise<BlockerAnalysis[]> {
    const { tasks, edges } = await this.loadGraph();
    return analyzeBlockers(tasks, edges);
  }

  /**
   * Calculates the critical path (longest path and slack schedule).
   * @returns Critical path schedule analysis result
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
   */
  async simulateDelay(taskId: string, delayHours: number): Promise<DelayImpact> {
    const { tasks, edges } = await this.loadGraph();
    return simulateDelayImpact(tasks, edges, taskId, delayHours);
  }

  /**
   * Verifies that the dependency graph contains no circular references (cycles).
   * @returns Validation result with flag and any detected cycle paths
   */
  async validateAcyclic(): Promise<{ isValid: boolean; cycles: string[][] }> {
    const { tasks, edges } = await this.loadGraph();
    const cycles = detectCycles(tasks, edges);
    return {
      isValid: cycles.length === 0,
      cycles,
    };
  }
}
