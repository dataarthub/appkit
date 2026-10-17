/**
 * Generic HTTP / REST Task Graph Adapter
 *
 * Adapter that communicates with BFF (Backend for Frontend) REST API servers
 * (such as Hono, Express, Next.js API Routes, Cloudflare Workers, etc.)
 * to fetch and manipulate task graphs, critical paths, and blocker analyses.
 * Even if the server only provides a minimal graph retrieval API (GET /api/graph),
 * all features continue to work by automatically falling back to the client-side Pure TS analysis engine (cpm.ts).
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

/**
 * Initialization options for HttpTaskGraphAdapter
 */
export interface HttpTaskGraphAdapterOptions {
  /**
   * Base URL of the API endpoint (e.g., "http://localhost:3000/api/graph" or "/api/graph")
   */
  baseUrl: string;

  /**
   * Custom fetch function (for SSR, testing, or mocking)
   */
  fetch?: typeof fetch;

  /**
   * Authentication token retrieval function (Better Auth, Firebase, OCI IAM tokens, etc.)
   */
  getToken?: () => Promise<string | null> | string | null;

  /**
   * Static Bearer authentication token
   */
  authToken?: string;

  /**
   * Custom HTTP headers or dynamic header generator function
   */
  headers?: Record<string, string> | (() => Promise<Record<string, string>> | Record<string, string>);

  /**
   * Credentials setting for fetch requests ('include' to enable cookie-based authentication)
   */
  credentials?: RequestCredentials;

  /**
   * Paths for various sub-endpoints (default paths used if unspecified)
   */
  endpoints?: {
    /** Graph retrieval endpoint (default: '' or '/graph') */
    graph?: string;
    /** Top blockers endpoint (default: '/top-blockers') */
    topBlockers?: string;
    /** Critical path endpoint (default: '/critical-path') */
    criticalPath?: string;
    /** Delay simulation endpoint (default: '/simulate-delay') */
    simulateDelay?: string;
    /** Cycle validation endpoint (default: '/validate') */
    validate?: string;
  };

  /**
   * Whether to fallback to calculations via the Pure TS CPM analysis engine
   * when detailed endpoints are not provided by the server (default: true)
   */
  enableClientFallback?: boolean;
}

/**
 * Adapter that operates on task graphs via REST APIs such as BFF / Hono servers
 */
export class HttpTaskGraphAdapter implements TaskGraphAdapter {
  private baseUrl: string;
  private fetchFn: typeof fetch;
  private options: HttpTaskGraphAdapterOptions;
  private endpoints: Required<NonNullable<HttpTaskGraphAdapterOptions['endpoints']>>;
  private enableClientFallback: boolean;

  /**
   * Initializes an HttpTaskGraphAdapter instance.
   * @param options - Target URL, authentication info, and endpoint configuration
   */
  constructor(options: HttpTaskGraphAdapterOptions) {
    this.options = options;
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.fetchFn = options.fetch || globalThis.fetch.bind(globalThis);
    this.enableClientFallback = options.enableClientFallback ?? true;

    this.endpoints = {
      graph: options.endpoints?.graph ?? '',
      topBlockers: options.endpoints?.topBlockers ?? '/top-blockers',
      criticalPath: options.endpoints?.criticalPath ?? '/critical-path',
      simulateDelay: options.endpoints?.simulateDelay ?? '/simulate-delay',
      validate: options.endpoints?.validate ?? '/validate',
    };
  }

  /**
   * Resolves authentication token and custom headers.
   */
  private async resolveHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (this.options.authToken) {
      headers['Authorization'] = `Bearer ${this.options.authToken}`;
    } else if (this.options.getToken) {
      const token = await this.options.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    if (this.options.headers) {
      const extraHeaders =
        typeof this.options.headers === 'function'
          ? await this.options.headers()
          : this.options.headers;
      Object.assign(headers, extraHeaders);
    }

    return headers;
  }

  /**
   * Common HTTP request execution helper
   */
  private async request<T>(path: string, init?: RequestInit): Promise<{ ok: boolean; data?: T; status: number }> {
    const fullPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${this.baseUrl}${fullPath === '/' ? '' : fullPath}`;
    const headers = await this.resolveHeaders();

    const reqHeaders = new Headers(init?.headers);
    for (const [k, v] of Object.entries(headers)) {
      if (!reqHeaders.has(k)) {
        reqHeaders.set(k, v);
      }
    }

    try {
      const res = await this.fetchFn(url, {
        ...init,
        headers: reqHeaders,
        credentials: this.options.credentials,
      });

      if (res.ok) {
        const data = (await res.json()) as T;
        return { ok: true, data, status: res.status };
      }
      return { ok: false, status: res.status };
    } catch {
      return { ok: false, status: 0 };
    }
  }

  /**
   * Loads all tasks and dependency edges from the BFF server.
   */
  async loadGraph(): Promise<{ tasks: TaskNode[]; edges: TaskEdge[] }> {
    const res = await this.request<{ tasks?: TaskNode[]; edges?: TaskEdge[] }>(
      this.endpoints.graph,
      { method: 'GET' },
    );

    if (res.ok && res.data) {
      return {
        tasks: Array.isArray(res.data.tasks) ? res.data.tasks : [],
        edges: Array.isArray(res.data.edges) ? res.data.edges : [],
      };
    }

    throw new Error(`Failed to load task graph from BFF server (HTTP status: ${res.status})`);
  }

  /**
   * Retrieves a list of top blockers (tasks blocking the most successor tasks).
   * Automatically falls back to local computation if the endpoint is unavailable on the BFF server.
   */
  async getTopBlockers(): Promise<BlockerAnalysis[]> {
    const res = await this.request<BlockerAnalysis[]>(this.endpoints.topBlockers, {
      method: 'GET',
    });

    if (res.ok && Array.isArray(res.data)) {
      return res.data;
    }

    if (this.enableClientFallback) {
      const { tasks, edges } = await this.loadGraph();
      return analyzeBlockers(tasks, edges);
    }

    throw new Error(`BFF server does not provide ${this.endpoints.topBlockers} and fallback is disabled.`);
  }

  /**
   * Calculates the critical path (longest path and float/slack time).
   * Automatically falls back to local computation if the endpoint is unavailable on the BFF server.
   */
  async getCriticalPath(): Promise<CriticalPathResult> {
    const res = await this.request<CriticalPathResult>(this.endpoints.criticalPath, {
      method: 'GET',
    });

    if (res.ok && res.data && Array.isArray(res.data.criticalPathTaskIds)) {
      return res.data;
    }

    if (this.enableClientFallback) {
      const { tasks, edges } = await this.loadGraph();
      return calculateCriticalPath(tasks, edges);
    }

    throw new Error(`BFF server does not provide ${this.endpoints.criticalPath} and fallback is disabled.`);
  }

  /**
   * Simulates the ripple effect on downstream tasks when a task is delayed.
   * Automatically falls back to local computation if the endpoint is unavailable on the BFF server.
   */
  async simulateDelay(taskId: string, delayHours: number): Promise<DelayImpact> {
    const headers = { 'Content-Type': 'application/json' };
    const res = await this.request<DelayImpact>(this.endpoints.simulateDelay, {
      method: 'POST',
      headers,
      body: JSON.stringify({ taskId, delayHours }),
    });

    if (res.ok && res.data && typeof res.data.projectDelayHours === 'number') {
      return res.data;
    }

    if (this.enableClientFallback) {
      const { tasks, edges } = await this.loadGraph();
      return simulateDelayImpact(tasks, edges, taskId, delayHours);
    }

    throw new Error(`BFF server does not provide ${this.endpoints.simulateDelay} and fallback is disabled.`);
  }

  /**
   * Validates that no cyclic dependencies exist in the dependency graph.
   * Automatically falls back to local computation if the endpoint is unavailable on the BFF server.
   */
  async validateAcyclic(): Promise<{ isValid: boolean; cycles: string[][] }> {
    const res = await this.request<{ isValid: boolean; cycles: string[][] }>(
      this.endpoints.validate,
      { method: 'GET' },
    );

    if (res.ok && res.data && Array.isArray(res.data.cycles)) {
      return res.data;
    }

    if (this.enableClientFallback) {
      const { tasks, edges } = await this.loadGraph();
      const cycles = detectCycles(tasks, edges);
      return {
        isValid: cycles.length === 0,
        cycles,
      };
    }

    throw new Error(`BFF server does not provide ${this.endpoints.validate} and fallback is disabled.`);
  }
}
