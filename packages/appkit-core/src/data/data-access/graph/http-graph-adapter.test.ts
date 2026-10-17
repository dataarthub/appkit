import { describe, it, expect, mock } from 'bun:test';
import { HttpTaskGraphAdapter } from '../http-graph-adapter';
import { createTaskGraphWebHandler } from './web-handler';
import { InMemoryTaskGraphAdapter } from './in-memory-adapter';
import type { TaskNode, TaskEdge } from './types';

describe('HttpTaskGraphAdapter & createTaskGraphWebHandler (Hono / BFF)', () => {
  const sampleTasks: TaskNode[] = [
    { id: 't1', title: 'Task 1', durationHours: 4, status: 'DONE' },
    { id: 't2', title: 'Task 2', durationHours: 6, status: 'TODO' },
    { id: 't3', title: 'Task 3', durationHours: 2, status: 'TODO' },
  ];

  const sampleEdges: TaskEdge[] = [
    { predecessorId: 't1', successorId: 't2', dependencyType: 'FINISH_TO_START' },
    { predecessorId: 't2', successorId: 't3', dependencyType: 'FINISH_TO_START' },
  ];

  it('connects to Web Handler (Hono BFF style) and executes full graph analysis', async () => {
    const backendAdapter = new InMemoryTaskGraphAdapter({ tasks: sampleTasks, edges: sampleEdges });
    const webHandler = createTaskGraphWebHandler(backendAdapter, { basePath: '/api/graph' });

    // Web Standard Request/Response ハンドラーを fetch として使用（Hono の BFF をシミュレート）
    const customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const req = new Request(url, init);
      return webHandler(req);
    };

    const clientAdapter = new HttpTaskGraphAdapter({
      baseUrl: 'http://localhost:3000/api/graph',
      fetch: customFetch as any,
    });

    // 1. loadGraph
    const { tasks, edges } = await clientAdapter.loadGraph();
    expect(tasks.length).toBe(3);
    expect(edges.length).toBe(2);

    // 2. getTopBlockers
    const blockers = await clientAdapter.getTopBlockers();
    expect(blockers.length).toBe(3);
    expect(blockers[0].taskId).toBe('t1');
    expect(blockers[0].blockedCount).toBe(2);

    // 3. getCriticalPath
    const cp = await clientAdapter.getCriticalPath();
    expect(cp.totalDurationHours).toBe(12);
    expect(cp.criticalPathTaskIds).toEqual(['t1', 't2', 't3']);

    // 4. simulateDelay
    const impact = await clientAdapter.simulateDelay('t2', 3);
    expect(impact.sourceTaskId).toBe('t2');
    expect(impact.projectDelayHours).toBe(3);
    expect(impact.affectedTaskIds).toContain('t3');

    // 5. validateAcyclic
    const validation = await clientAdapter.validateAcyclic();
    expect(validation.isValid).toBe(true);
  });

  it('automatically falls back to client-side CPM calculation when BFF only provides GET /api/graph', async () => {
    // 最小限の Hono ルート: GET /api/graph のみ実装し、他は 404 を返す BFF サーバー
    const mockFetch = mock(async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr === 'http://localhost:3000/api/graph' || urlStr === 'http://localhost:3000/api/graph/') {
        return new Response(
          JSON.stringify({
            tasks: sampleTasks,
            edges: sampleEdges,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      // その他（top-blockers, critical-path, simulate-delay 等）は未実装のため 404
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    });

    const clientAdapter = new HttpTaskGraphAdapter({
      baseUrl: 'http://localhost:3000/api/graph',
      fetch: mockFetch as any,
      enableClientFallback: true,
    });

    // グラフ取得
    const { tasks, edges } = await clientAdapter.loadGraph();
    expect(tasks.length).toBe(3);
    expect(edges.length).toBe(2);

    // サーバーが 404 でも、クライアント側の CPM エンジンで安全にフォールバック計算されること
    const blockers = await clientAdapter.getTopBlockers();
    expect(blockers.length).toBe(3);
    expect(blockers[0].taskId).toBe('t1');

    const cp = await clientAdapter.getCriticalPath();
    expect(cp.totalDurationHours).toBe(12);

    const impact = await clientAdapter.simulateDelay('t1', 2);
    expect(impact.projectDelayHours).toBe(2);

    const acyclic = await clientAdapter.validateAcyclic();
    expect(acyclic.isValid).toBe(true);
  });

  it('propagates Bearer auth token and custom headers to the BFF server', async () => {
    let interceptedAuth: string | null = null;
    let interceptedTenant: string | null = null;

    const mockFetch = mock(async (_url: string | URL | Request, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      interceptedAuth = headers.get('Authorization');
      interceptedTenant = headers.get('X-Tenant-Id');

      return new Response(
        JSON.stringify({
          tasks: [],
          edges: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });

    const clientAdapter = new HttpTaskGraphAdapter({
      baseUrl: 'https://bff.example.com/api/graph',
      fetch: mockFetch as any,
      getToken: async () => 'hono-jwt-token-999',
      headers: {
        'X-Tenant-Id': 'tenant-hono-corp',
      },
    });

    await clientAdapter.loadGraph();

    expect(interceptedAuth as string | null).toBe('Bearer hono-jwt-token-999');
    expect(interceptedTenant as string | null).toBe('tenant-hono-corp');
  });

  it('correctly returns empty array without throwing when blocker API returns HTTP 200 with [] and fallback is disabled', async () => {
    // ユーザーの指摘した再現シナリオ: サーバーが 200 + [] を返し、enableClientFallback: false の場合
    const mockFetch = mock(async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes('top-blockers')) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    });

    const clientAdapter = new HttpTaskGraphAdapter({
      baseUrl: 'http://localhost:3000/api/graph',
      fetch: mockFetch as any,
      enableClientFallback: false, // フォールバック無効
    });

    // 200 + [] は正常な「ブロッカー0件」であるため、例外にならず空配列が返ること！
    const blockers = await clientAdapter.getTopBlockers();
    expect(Array.isArray(blockers)).toBe(true);
    expect(blockers.length).toBe(0);
  });

  it('handles CORS OPTIONS preflight request in createTaskGraphWebHandler', async () => {
    const backendAdapter = new InMemoryTaskGraphAdapter({ tasks: [], edges: [] });
    const webHandler = createTaskGraphWebHandler(backendAdapter, {
      basePath: '/api/graph',
      cors: {
        origin: 'https://my-frontend-app.com',
      },
    });

    const preflightReq = new Request('http://localhost:3000/api/graph/top-blockers', {
      method: 'OPTIONS',
    });

    const res = await webHandler(preflightReq);
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://my-frontend-app.com');
  });
});
