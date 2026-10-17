import type { FetchLike } from './types';
import { describe, test, expect } from 'bun:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseAdapter } from './supabase-adapter';
import { SupabaseGraphQLAdapter } from './supabase-graphql-adapter';
import { MongoApiAdapter } from './mongo-adapter';
import { ConvexAdapter } from './convex-adapter';
import { NeonAdapter } from './neon-adapter';

for (const provider of ['mongodb'] as const) {
  describe(`${provider} HTTP boundary`, () => {
    test('sends the current token and serializes record filters', async () => {
      const requests: RequestInit[] = [];
      const config = { baseUrl: 'https://backend.invalid', getToken: async () => 'test-token', fetch: (async (_url, init) => { requests.push(init ?? {}); return Response.json([{ id: 'a' }]); }) as FetchLike };
      const adapter = new MongoApiAdapter(config);
      expect(await adapter.find('records', { title: '日本語' }, { limit: 5 })).toEqual([{ id: 'a' }]);
      expect(new Headers(requests[0]?.headers).get('Authorization')).toBe('Bearer test-token');
      const body = String(requests[0]?.body);
      expect(body).toContain('日本語'); expect(body).toContain('records'); expect(body).toContain('5');
    });
    test('rejects HTTP failures instead of returning successful records', async () => {
      const config = { baseUrl: 'https://backend.invalid', fetch: (async () => new Response('failure', { status: 503 })) as FetchLike };
      const adapter = new MongoApiAdapter(config);
      await expect(adapter.find('records')).rejects.toThrow('503');
    });
  });
}

test('Supabase forwards selection, zero-valued filters, sorting and errors', async () => {
  const calls: unknown[][] = [];
  const row = { id: 'a' };
  let error: Error | null = null;
  const query: Record<string, unknown> = {};
  for (const name of ['select', 'eq', 'order', 'limit', 'range']) query[name] = (...args: unknown[]) => { calls.push([name, ...args]); return query; };
  query.then = (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({ data: [row], error }));
  const client = { from: (collection: string) => { calls.push(['from', collection]); return query; } } as unknown as SupabaseClient;
  const adapter = new SupabaseAdapter(client);
  expect(await adapter.find('records', { amount: 0 }, { projection: ['id'], sort: { id: -1 }, limit: 2 })).toEqual([row]);
  expect(calls).toContainEqual(['eq', 'amount', 0]); expect(calls).toContainEqual(['select', 'id']);
  expect(calls).toContainEqual(['order', 'id', { ascending: false }]);
  error = new Error('denied'); await expect(adapter.find('records')).rejects.toThrow('denied');
});

test('Supabase GraphQL uses the live session token and handles GraphQL errors', async () => {
  let init: RequestInit | undefined;
  const client = { auth: { getSession: async () => ({ data: { session: { access_token: 'session-token' } } }) } } as unknown as SupabaseClient;
  const adapter = new SupabaseGraphQLAdapter(client, { supabaseUrl: 'https://sample.invalid', supabaseKey: 'public-key', fetch: async (_url, options) => { init = options; return Response.json({ errors: [{ message: 'denied' }] }); } });
    await expect(adapter.find('records', {}, { projection: ['id'] })).rejects.toThrow('GraphQL Error');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer session-token');

});

test('Convex dispatches configured function references without importing React or the SDK', async () => {
  const calls: unknown[][] = [];
  const adapter = new ConvexAdapter({
    client: { query: async <T>(...args: unknown[]) => { calls.push(args); return [{ id: 'a' }] as T; }, mutation: async <T>(...args: unknown[]) => { calls.push(args); return { id: 'b' } as T; } },
    queries: { records: { list: 'records:list', get: 'records:get' } },
    mutations: { records: { create: 'records:create', update: 'records:update', delete: 'records:delete' } },
  });
  expect(await adapter.find('records', { active: true }, { limit: 3 })).toEqual([{ id: 'a' }]);
  expect(calls[0]).toEqual(['records:list', { filter: { active: true }, limit: 3 }]);
  await expect(adapter.find('missing')).rejects.toThrow('No query refs');
});

test('Neon supports injected execution with bound values and rejects unsafe identifiers', async () => {
  const calls: unknown[][] = [];
  const adapter = new NeonAdapter({ queryFn: async (query, values) => { calls.push([query, values]); return [{ id: 'a' }]; } });
  expect(await adapter.find('records', { title: "'; DROP TABLE records; --" }, { limit: 2 })).toEqual([{ id: 'a' }]);
  expect(String(calls[0]?.[0])).toContain('"title" = $1');
  expect(calls[0]?.[1]).toEqual(["'; DROP TABLE records; --"]);
  await expect(adapter.find('records; DROP TABLE records')).rejects.toThrow('Invalid SQL identifier');
});

test('Supabase findOne returns null for an absent row and preserves backend errors', async () => {
  let result: { data: unknown; error: unknown } = { data: null, error: null };
  const query = { select: () => query, eq: () => query, maybeSingle: async () => result };
  const adapter = new SupabaseAdapter({ from: () => query } as unknown as SupabaseClient);
  expect(await adapter.findOne('records', 'missing')).toBeNull();
  result = { data: { id: 'a' }, error: null };expect(await adapter.findOne('records', 'a')).toEqual({ id: 'a' });
  result = { data: null, error: new Error('permission denied') };
  await expect(adapter.findOne('records', 'a')).rejects.toThrow('permission denied');
});
