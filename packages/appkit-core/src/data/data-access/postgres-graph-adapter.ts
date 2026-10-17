/**
 * PostgreSQL Graph Adapter (Recursive CTE)
 *
 * Adapter that operates on and retrieves task dependency graphs, blocker identification,
 * critical paths, and ripple effects utilizing PostgreSQL recursive CTEs (WITH RECURSIVE).
 * Accepts any SQL execution function (node-postgres, Neon, Supabase, Prisma, etc.).
 */

import type {
  TaskGraphAdapter,
  TaskNode,
  TaskEdge,
  BlockerAnalysis,
  CriticalPathResult,
  DelayImpact,
} from './graph/types';
import {
  calculateCriticalPath,
  analyzeBlockers,
  simulateDelayImpact,
  detectCycles,
} from './graph/cpm';
import { getPostgresDownstreamQuery } from './graph/postgres-ddl';
import { graphSqlIdentifier } from './graph/sql-identifier';

/**
 * SQL execution function type for PostgreSQL
 */
export type PostgresQueryFn = (
  sql: string,
  params?: any[],
) => Promise<{ rows: any[] } | any[]>;

/**
 * Initialization options for PostgresGraphAdapter
 */
export interface PostgresGraphAdapterOptions {
  /** SQL execution function (e.g. `(sql, params) => pool.query(sql, params)`) */
  query: PostgresQueryFn;
  /** Tasks table name (default: 'tasks') */
  tasksTable?: string;
  /** Dependencies table name (default: 'task_dependencies') */
  dependenciesTable?: string;
  /** Blocker summary view name (default: 'task_blocker_summary') */
  blockerSummaryView?: string;
}

/**
 * Task graph adapter utilizing PostgreSQL recursive CTEs.
 */
export class PostgresGraphAdapter implements TaskGraphAdapter {
  private queryFn: PostgresQueryFn;
  private tasksTable: string;
  private dependenciesTable: string;
  private blockerSummaryView: string;

  /**
   * Initializes a PostgresGraphAdapter instance.
   * @param options - Query execution function and table name configuration
   */
  constructor(options: PostgresGraphAdapterOptions) {
    this.queryFn = options.query;
    this.tasksTable = graphSqlIdentifier(options.tasksTable ?? 'tasks');
    this.dependenciesTable = graphSqlIdentifier(options.dependenciesTable ?? 'task_dependencies');
    this.blockerSummaryView = graphSqlIdentifier(options.blockerSummaryView ?? 'task_blocker_summary');
  }

  private async executeQuery(sql: string, params?: any[]): Promise<any[]> {
    const res = await this.queryFn(sql, params);
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.rows)) return res.rows;
    return [];
  }

  /**
   * Loads all tasks and dependency edges.
   * @returns Object containing tasks and edges
   */
  async loadGraph(): Promise<{ tasks: TaskNode[]; edges: TaskEdge[] }> {
    const [taskRows, edgeRows] = await Promise.all([
      this.executeQuery(
        `SELECT id, title, duration_hours, status, due_date, assignee, priority FROM ${this.tasksTable}`,
      ),
      this.executeQuery(
        `SELECT predecessor_id, successor_id, dependency_type, lag_hours FROM ${this.dependenciesTable}`,
      ),
    ]);

    const tasks: TaskNode[] = taskRows.map((r: any) => ({
      ...r,
      id: String(r.id),
      title: String(r.title || 'Untitled'),
      durationHours: Number(r.duration_hours ?? 1),
      status: String(r.status ?? 'TODO'),
      dueDate: r.due_date,
      assignee: r.assignee,
      priority: r.priority,
    }));

    const edges: TaskEdge[] = edgeRows.map((r: any) => ({
      predecessorId: String(r.predecessor_id),
      successorId: String(r.successor_id),
      dependencyType: r.dependency_type || 'FINISH_TO_START',
      lagHours: Number(r.lag_hours ?? 0),
    }));

    return { tasks, edges };
  }

  /**
   * Retrieves a list of top blockers (tasks blocking the most successor tasks).
   * @returns Array of blocker analysis results
   */
  async getTopBlockers(): Promise<BlockerAnalysis[]> {
    try {
      const rows = await this.executeQuery(
        `SELECT task_id, title, status, duration_hours, blocked_count FROM ${this.blockerSummaryView} LIMIT 20`,
      );

      if (rows.length > 0) {
        return rows.map((r: any) => ({
          taskId: String(r.task_id),
          title: String(r.title),
          status: String(r.status),
          directBlockedIds: [],
          allBlockedIds: [],
          blockedCount: Number(r.blocked_count ?? 0),
          isCritical: false,
          unblockPriorityScore: Number(r.blocked_count ?? 0) * 10,
        }));
      }
    } catch {
      // Fallback to local calculation if view does not exist or fails
    }

    const { tasks, edges } = await this.loadGraph();
    return analyzeBlockers(tasks, edges);
  }

  /**
   * Calculates the critical path (longest path and float/slack time).
   * @returns Critical path analysis result
   */
  async getCriticalPath(): Promise<CriticalPathResult> {
    const { tasks, edges } = await this.loadGraph();
    return calculateCriticalPath(tasks, edges);
  }

  /**
   * Simulates the ripple effect on downstream tasks when a task is delayed.
   * @param taskId - Origin task ID
   * @param delayHours - Delay duration (in hours)
   * @returns Delay ripple impact analysis result
   */
  async simulateDelay(taskId: string, delayHours: number): Promise<DelayImpact> {
    const { tasks, edges } = await this.loadGraph();
    return simulateDelayImpact(tasks, edges, taskId, delayHours);
  }

  /**
   * Validates that no cyclic dependencies exist in the dependency graph.
   * @returns Validation result and list of detected cycles
   */
  async validateAcyclic(): Promise<{ isValid: boolean; cycles: string[][] }> {
    const { tasks, edges } = await this.loadGraph();
    const cycles = detectCycles(tasks, edges);
    return {
      isValid: cycles.length === 0,
      cycles,
    };
  }

  /**
   * Directly retrieves downstream affected nodes for a specific task using recursive CTE.
   * @param taskId - Origin task ID
   * @returns Array of downstream tasks
   */
  async getDownstreamTasks(taskId: string): Promise<any[]> {
    const sql = getPostgresDownstreamQuery({
      tasksTable: this.tasksTable,
      dependenciesTable: this.dependenciesTable,
    });
    return this.executeQuery(sql, [taskId]);
  }
}
