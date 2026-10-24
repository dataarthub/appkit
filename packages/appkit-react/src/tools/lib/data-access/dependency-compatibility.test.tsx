// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  createQueryClient,
  findQueryOptions,
  useMutationWithInvalidation,
} from './react-query';
import type { DataAccessAdapter } from './types';
import { createPersistedStore } from '../state/store-factory';

const clients: ReturnType<typeof createQueryClient>[] = [];
const storageKey = 'appkit-dependency-compatibility';
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.clear());
  localStorage.removeItem(storageKey);
});
function client() {
  const value = createQueryClient();
  clients.push(value);
  return value;
}

test('query options cache repeated reads while isolating host adapters', async () => {
  const cache = client();
  const findA = vi.fn(async () => [{ id: 'a' }]);
  const findB = vi.fn(async () => [{ id: 'b' }]);
  const adapterA = { find: findA } as unknown as DataAccessAdapter;
  const adapterB = { find: findB } as unknown as DataAccessAdapter;
  const optionsA = findQueryOptions<{ id: string }>(adapterA, 'tasks', {});
  const optionsB = findQueryOptions<{ id: string }>(adapterB, 'tasks', {});
  expect(await cache.fetchQuery(optionsA)).toEqual([{ id: 'a' }]);
  expect(await cache.fetchQuery(optionsA)).toEqual([{ id: 'a' }]);
  expect(await cache.fetchQuery(optionsB)).toEqual([{ id: 'b' }]);
  expect(findA).toHaveBeenCalledTimes(1);
  expect(findB).toHaveBeenCalledTimes(1);
  expect(optionsA.queryKey).not.toEqual(optionsB.queryKey);
});

test('successful mutations invalidate only requested cache keys before the host callback', async () => {
  const cache = client();
  cache.setQueryData(['tasks', 'list'], ['old']);
  cache.setQueryData(['other', 'list'], ['other']);
  const onSuccess = vi.fn(() => {
    expect(cache.getQueryState(['tasks', 'list'])?.isInvalidated).toBe(true);
    expect(cache.getQueryState(['other', 'list'])?.isInvalidated).toBe(false);
  });
  const { result } = renderHook(
    () =>
      useMutationWithInvalidation(async (id: string) => ({ id }), {
        invalidateKeys: [['tasks']],
        onSuccess,
      }),
    {
      wrapper: ({ children }) => (
        <QueryClientProvider client={cache}>{children}</QueryClientProvider>
      ),
    },
  );
  await act(async () => {
    expect(await result.current.mutateAsync('task-1')).toEqual({
      id: 'task-1',
    });
  });
  expect(onSuccess).toHaveBeenCalledTimes(1);
  expect(cache.getQueryData(['other', 'list'])).toEqual(['other']);
});

test('persisted Zustand stores notify React selectors and restore serialized state', () => {
  type State = { count: number; increment: () => void };
  const initializer = (
    set: (partial: Partial<State>) => void,
    get: () => State,
  ) => ({ count: 0, increment: () => set({ count: get().count + 1 }) });
  const first = createPersistedStore<State>(initializer, { name: storageKey });
  const { result } = renderHook(() => first((state) => state.count));
  act(() => {
    first.getState().increment();
    first.getState().increment();
  });
  expect(result.current).toBe(2);
  expect(JSON.parse(localStorage.getItem(storageKey)!)).toEqual({
    state: { count: 2 },
    version: 1,
  });
  const restored = createPersistedStore<State>(initializer, {
    name: storageKey,
  });
  expect(restored.getState().count).toBe(2);
  restored.persist.clearStorage();
  expect(localStorage.getItem(storageKey)).toBeNull();
});
