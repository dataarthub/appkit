/**
 * Task Graph Web Standard API Handler
 *
 * Dispatcher helper for serving task graph API routes in Web Standard (`Request` / `Response`)
 * environments such as Hono, Bun.serve, Cloudflare Workers, Next.js App Router (route.ts), Deno, etc.
 */

import type { TaskGraphAdapter } from './types';

/**
 * Configuration options for the Web handler
 */
export interface TaskGraphWebHandlerOptions {
  /**
   * Route prefix (e.g. '/api/graph'. If omitted, the trailing subpath is automatically determined from the request URL pathname)
   */
  basePath?: string;

  /**
   * Automatic addition of CORS headers (default: true)
   */
  cors?:
    | boolean
    | {
        origin?: string;
        methods?: string[];
        headers?: string[];
      };
}

/**
 * Creates a task graph API handler conforming to Web Standard (Request -> Response).
 *
 * @example Usage in Hono BFF server:
 * ```typescript
 * import { Hono } from 'hono';
 * import { createTaskGraphWebHandler } from "./web-handler";
 * import { PostgresGraphAdapter } from "../postgres-graph-adapter";
 *
 * const app = new Hono();
 * const adapter = new PostgresGraphAdapter({ ... });
 * const handleGraph = createTaskGraphWebHandler(adapter, { basePath: '/api/graph' });
 *
 * // Mount on Hono routes
 * app.all('/api/graph', (c) => handleGraph(c.req.raw));
 * app.all('/api/graph/*', (c) => handleGraph(c.req.raw));
 * ```
 *
 * @example Next.js App Router (app/api/graph/[...slug]/route.ts):
 * ```typescript
 * import { createTaskGraphWebHandler } from "./web-handler";
 * import { PostgresGraphAdapter } from "../postgres-graph-adapter";
 *
 * const handler = createTaskGraphWebHandler(new PostgresGraphAdapter({ ... }), { basePath: '/api/graph' });
 * export const GET = handler;
 * export const POST = handler;
 * ```
 */
export function createTaskGraphWebHandler(
  adapter: TaskGraphAdapter,
  options: TaskGraphWebHandlerOptions = {},
): (request: Request) => Promise<Response> {
  const basePath = options.basePath ? options.basePath.replace(/\/+$/, '') : '';
  const corsEnabled = options.cors !== false;

  const corsHeaders: Record<string, string> = corsEnabled
    ? {
        'Access-Control-Allow-Origin':
          typeof options.cors === 'object' && options.cors.origin ? options.cors.origin : '*',
        'Access-Control-Allow-Methods':
          typeof options.cors === 'object' && options.cors.methods
            ? options.cors.methods.join(', ')
            : 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers':
          typeof options.cors === 'object' && options.cors.headers
            ? options.cors.headers.join(', ')
            : 'Content-Type, Authorization, X-Requested-With',
      }
    : {};

  function jsonResponse(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        ...corsHeaders,
      },
    });
  }

  return async function handleTaskGraphRequest(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS' && corsEnabled) {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    let pathname = url.pathname;

    if (basePath && pathname.startsWith(basePath)) {
      pathname = pathname.slice(basePath.length);
    }
    pathname = pathname.replace(/^\/+/, '').replace(/\/+$/, '');

    try {
      // 1. GET / or GET /graph -> loadGraph()
      if (request.method === 'GET' && (pathname === '' || pathname === 'graph')) {
        const graph = await adapter.loadGraph();
        return jsonResponse(graph);
      }

      // 2. GET /top-blockers -> getTopBlockers()
      if (request.method === 'GET' && pathname === 'top-blockers') {
        const blockers = await adapter.getTopBlockers();
        return jsonResponse(blockers);
      }

      // 3. GET /critical-path -> getCriticalPath()
      if (request.method === 'GET' && pathname === 'critical-path') {
        const criticalPath = await adapter.getCriticalPath();
        return jsonResponse(criticalPath);
      }

      // 4. POST /simulate-delay -> simulateDelay()
      if (request.method === 'POST' && pathname === 'simulate-delay') {
        const body = (await request.json().catch(() => ({}))) as {
          taskId?: string;
          delayHours?: number;
        };
        if (!body.taskId || typeof body.delayHours !== 'number') {
          return jsonResponse(
            { error: 'Invalid request body. Required: { taskId: string, delayHours: number }' },
            400,
          );
        }
        const impact = await adapter.simulateDelay(body.taskId, body.delayHours);
        return jsonResponse(impact);
      }

      // 5. GET /validate -> validateAcyclic()
      if (request.method === 'GET' && pathname === 'validate') {
        const result = await adapter.validateAcyclic();
        return jsonResponse(result);
      }

      return jsonResponse({ error: `Not Found: ${request.method} ${url.pathname}` }, 404);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Internal server error';
      return jsonResponse({ error: errorMessage }, 500);
    }
  };
}
