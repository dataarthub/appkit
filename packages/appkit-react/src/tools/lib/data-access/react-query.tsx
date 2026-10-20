import {
  useQuery,
  UseQueryOptions,
  QueryClient,
  useQueryClient,
  useMutation,
  UseMutationOptions,
  MutationFunction,
  queryOptions as tanstackQueryOptions,
  type QueryKey,
} from '@tanstack/react-query';
import { DataAccessAdapter, Filter, QueryOptions } from './types';
import { useDataAccess } from './data-access-context';
import { getAdapterCacheScope } from './cache-scope';

export { useDataAccess } from './data-access-context';

// --- Query Helpers (Merged from query.ts) ---

/**
 * Creates a TanStack QueryClient with five-minute stale time, one retry and no focus refetch.
 * @returns New caller-owned client; share one stable client for one application/auth domain.
 * @remarks No requests begin on construction. Supply it to QueryClientProvider; callers
 * own clearing/disposal and SSR request isolation. No CSS is required.
 * @example
 * ```ts
 * import { createQueryClient } from '@alneas/appkit-react/tools/data-access/react';
 * const queryClient = createQueryClient();
 * queryClient.clear();
 * ```
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

/**
 * Binds query invalidation to the nearest QueryClient.
 * @returns Function accepting a query key and resolving after TanStack prefix-matched invalidation/refetch work.
 * @throws Error outside QueryClientProvider.
 * @remarks The returned callback forwards invalidateQueries with queryKey only; it does
 * not establish authorization or choose a collection automatically. No CSS is required.
 * @example
 * ```tsx
 * import { QueryClientProvider } from '@tanstack/react-query';
 * import { createQueryClient, useInvalidate } from '@alneas/appkit-react/tools/data-access/react';
 * const client = createQueryClient();
 * function Refresh() { const invalidate = useInvalidate(); return <button onClick={() => { void invalidate(['tasks']); }}>Refresh</button>; }
 * export function Screen() { return <QueryClientProvider client={client}><Refresh /></QueryClientProvider>; }
 * ```
 */
export function useInvalidate() {
  const queryClient = useQueryClient();

  return (key: QueryKey) => {
    return queryClient.invalidateQueries({ queryKey: key });
  };
}

/**
 * Runs a TanStack mutation and invalidates only the explicitly configured query keys on success.
 * @typeParam TData - Resolved mutation result; defaults to unknown and may include undefined.
 * @typeParam TError - Mutation error exposed by TanStack Query; defaults to unknown.
 * @typeParam TVariables - Mutation input supplied to mutate/mutateAsync; defaults to void.
 * @typeParam TContext - Value returned by onMutate for later callbacks; defaults to unknown.
 * @param mutationFn - Host mutation function receiving variables and resolving TData; the host owns authorization and persistence.
 * @param options - TanStack mutation options plus invalidateKeys: a key array or synchronous factory
 * receiving the successful result and variables. Omitted invalidateKeys (or an empty array) invalidates nothing.
 * @returns The TanStack mutation result with status, data/error and mutate/mutateAsync controls.
 * @throws When rendered without a QueryClientProvider.
 * @remarks Requires an outer QueryClientProvider. Query keys use TanStack prefix matching.
 * On success, invalidations run concurrently and are awaited before options.onSuccess is called;
 * that callback's returned promise is not awaited by this wrapper. A key factory or invalidation
 * failure prevents that callback and propagates into mutation error handling. Mutation failures
 * are exposed through the mutation result and reject mutateAsync. This wrapper adds no retry,
 * rollback or default invalidation keys; useCreate/useUpdate supply their own defaults.
 * The normal TanStack options spread also permits options.mutationFn to override the first argument.
 * @example
 * ```tsx
 * import { QueryClientProvider } from '@tanstack/react-query';
 * import { createQueryClient, useMutationWithInvalidation } from '@alneas/appkit-react/tools/data-access/react';
 *
 * const queryClient = createQueryClient();
 * type SaveInput = { id: string; title: string };
 * type SaveResult = SaveInput | undefined;
 * function SaveButton({ save }: { save: (input: SaveInput) => Promise<SaveResult> }) {
 *   const mutation = useMutationWithInvalidation(save, {
 *     invalidateKeys: (_result, input) => [['tasks', 'detail', input.id]],
 *   });
 *   return <button onClick={() => mutation.mutate({ id: 'task-1', title: 'Review' })}>
 *     {mutation.data?.title ?? 'Save task'}
 *   </button>;
 * }
 * // Supply an authorized host implementation; this example does not fabricate persistence.
 * export function TaskEditor({ save }: { save: (input: SaveInput) => Promise<SaveResult> }) {
 *   return <QueryClientProvider client={queryClient}><SaveButton save={save} /></QueryClientProvider>;
 * }
 * ```
 */
export function useMutationWithInvalidation<
  TData = unknown,
  TError = unknown,
  TVariables = void,
  TContext = unknown,
>(
  mutationFn: MutationFunction<TData, TVariables>,
  options?: UseMutationOptions<TData, TError, TVariables, TContext> & {
    /** Optional explicit keys or result/variables key factory; omission invalidates nothing. */
    invalidateKeys?: QueryKey[] | ((data: TData, variables: TVariables) => QueryKey[]);
  },
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    ...options,
    onSuccess: async (data, variables, context) => {
      if (options?.invalidateKeys) {
        const keys =
          typeof options.invalidateKeys === 'function'
            ? options.invalidateKeys(data, variables)
            : options.invalidateKeys;

        await Promise.all(keys.map((key) => queryClient.invalidateQueries({ queryKey: key })));
      }
      // @ts-expect-error - Argument count mismatch between supported TanStack Query type versions
      options?.onSuccess?.(data, variables, context);
    },
  });
}

// --- Query Options Factories ---

/**
 * Creates adapter-scoped TanStack options for listing records.
 * @typeParam T - Expected record/result shape; defaults to unknown and is not runtime validation.
 * @param adapter - Host adapter performing reads.
 * @param collection - Host collection/table name.
 * @param filter - Optional adapter-specific selection criteria.
 * @param adapterOptions - Optional sort/limit/populate/etc. forwarded with TanStack abort signal.
 * @returns Query key and queryFn options accepted by useQuery or QueryClient methods.
 * @remarks Key includes collection, operation, input options and adapter cache scope. No
 * request is made until queryFn executes. Query errors reject through TanStack; aggregate
 * queryFn rejects if the adapter lacks aggregate. Abort signal support is adapter-owned.
 * @example
 * ```ts
 * import type { ComponentProps } from 'react';
 * import { DataAccessProvider, findQueryOptions } from '@alneas/appkit-react/tools/data-access/react';
 * type DataAccessAdapter = ComponentProps<typeof DataAccessProvider>['adapter'];
 * export function optionsFor(adapter: DataAccessAdapter) { return findQueryOptions<{ id: string }>(adapter, 'tasks', {}, { limit: 20 }); }
 * ```
 */
export function findQueryOptions<T = unknown>(
  adapter: DataAccessAdapter,
  collection: string,
  filter?: Filter,
  adapterOptions?: QueryOptions,
) {
  return tanstackQueryOptions({
    queryKey: [collection, 'list', filter, adapterOptions, getAdapterCacheScope(adapter)],
    queryFn: ({ signal }) => adapter.find<T>(collection, filter, { ...adapterOptions, signal }),
  });
}

/**
 * Creates adapter-scoped TanStack options for reading one record by ID.
 * @typeParam T - Expected record/result shape; defaults to unknown and is not runtime validation.
 * @param adapter - Host adapter performing reads.
 * @param collection - Host collection/table name.
 * @param id - Record identifier; a falsy ID disables the ordinary useQuery execution.
 * @param adapterOptions - Optional adapter query settings forwarded with TanStack abort signal.
 * @returns Query key and queryFn options accepted by useQuery or QueryClient methods.
 * @remarks Key includes collection, operation, input options and adapter cache scope. No
 * request is made until queryFn executes. Query errors reject through TanStack; aggregate
 * queryFn rejects if the adapter lacks aggregate. Abort signal support is adapter-owned.
 * @example
 * ```ts
 * import type { ComponentProps } from 'react';
 * import { DataAccessProvider, findOneQueryOptions } from '@alneas/appkit-react/tools/data-access/react';
 * type DataAccessAdapter = ComponentProps<typeof DataAccessProvider>['adapter'];
 * export function optionsFor(adapter: DataAccessAdapter) { return findOneQueryOptions<{ id: string }>(adapter, 'tasks', 'task-1'); }
 * ```
 */
export function findOneQueryOptions<T = unknown>(
  adapter: DataAccessAdapter,
  collection: string,
  id: string,
  adapterOptions?: QueryOptions,
) {
  return tanstackQueryOptions({
    queryKey: [collection, 'detail', id, adapterOptions, getAdapterCacheScope(adapter)],
    queryFn: ({ signal }) => adapter.findOne<T>(collection, id, { ...adapterOptions, signal }),
    enabled: !!id,
  });
}

/**
 * Creates adapter-scoped TanStack options for an aggregation pipeline.
 * @typeParam T - Expected record/result shape; defaults to unknown and is not runtime validation.
 * @param adapter - Host adapter performing reads.
 * @param collection - Host collection/table name.
 * @param pipeline - Adapter-specific aggregation stages.
 * @param options - Optional adapter settings forwarded with TanStack abort signal.
 * @returns Query key and queryFn options accepted by useQuery or QueryClient methods.
 * @remarks Key includes collection, operation, input options and adapter cache scope. No
 * request is made until queryFn executes. Query errors reject through TanStack; aggregate
 * queryFn rejects if the adapter lacks aggregate. Abort signal support is adapter-owned.
 * @example
 * ```ts
 * import type { ComponentProps } from 'react';
 * import { DataAccessProvider, aggregateQueryOptions } from '@alneas/appkit-react/tools/data-access/react';
 * type DataAccessAdapter = ComponentProps<typeof DataAccessProvider>['adapter'];
 * export function optionsFor(adapter: DataAccessAdapter) { return aggregateQueryOptions<{ count: number }>(adapter, 'tasks', []); }
 * ```
 */
export function aggregateQueryOptions<T = unknown>(
  adapter: DataAccessAdapter,
  collection: string,
  pipeline: unknown[],
  options?: QueryOptions,
) {
  return tanstackQueryOptions({
    queryKey: [collection, 'aggregate', pipeline, options, getAdapterCacheScope(adapter)],
    queryFn: ({ signal }) => {
      if (adapter.aggregate) {
        return adapter.aggregate<T>(collection, pipeline, { ...options, signal });
      }
      throw new Error('Adapter does not support aggregate');
    },
  });
}

// --- Hooks ---

/**
 * Queries a collection list through the current adapter.
 * @typeParam T - Expected result record shape, default unknown; not runtime validation.
 * @param collection - Host collection/table name.
 * @param filter - Optional adapter filter.
 * @param adapterOptions - Optional sorting/limit/populate settings.
 * @param queryOptions - TanStack query overrides; omitted values use the generated options.
 * @returns TanStack query result with data/status/error and refetch controls.
 * @throws Error without DataAccessProvider or QueryClientProvider.
 * @remarks No CSS required. Adapter failures appear in query state; keys include adapter
 * scope and input options. Query signals are forwarded, but cancellation depends on the
 * adapter. The host owns backend authorization.
 * @example
 * ```tsx
 * import type { ComponentProps } from 'react';
 * import { QueryClientProvider } from '@tanstack/react-query';
 * import { DataAccessProvider, createQueryClient, useFind } from '@alneas/appkit-react/tools/data-access/react';
 * type DataAccessAdapter = ComponentProps<typeof DataAccessProvider>['adapter'];
 * const client = createQueryClient();
 * function Content() { const query = useFind<{ id: string }>('tasks', {}, { limit: 20 }); return <output>{query.isPending ? 'Loading' : query.error ? 'Failed' : 'Ready'}</output>; }
 * export function DataScreen({ adapter }: { adapter: DataAccessAdapter }) { return <QueryClientProvider client={client}><DataAccessProvider adapter={adapter}><Content /></DataAccessProvider></QueryClientProvider>; }
 * ```
 */
export function useFind<T = unknown>(
  collection: string,
  filter?: Filter,
  adapterOptions?: QueryOptions,
  queryOptions?: Omit<UseQueryOptions<T[], Error>, 'queryKey' | 'queryFn'>,
) {
  const adapter = useDataAccess();
  const options = findQueryOptions<T>(adapter, collection, filter, adapterOptions);
  return useQuery({
    ...options,
    ...queryOptions,
  } as UseQueryOptions<T[], Error>);
}

/**
 * Queries one record through the current adapter.
 * @typeParam T - Expected result record shape, default unknown; not runtime validation.
 * @param collection - Host collection/table name.
 * @param id - Record ID; empty ID disables the default query.
 * @param adapterOptions - Optional adapter read settings.
 * @param queryOptions - TanStack query overrides; omitted values use the generated options.
 * @returns TanStack query result with data/status/error and refetch controls. Data resolves to a record or null when absent.
 * @throws Error without DataAccessProvider or QueryClientProvider.
 * @remarks No CSS required. Adapter failures appear in query state; keys include adapter
 * scope and input options. Query signals are forwarded, but cancellation depends on the
 * adapter. The host owns backend authorization.
 * @example
 * ```tsx
 * import type { ComponentProps } from 'react';
 * import { QueryClientProvider } from '@tanstack/react-query';
 * import { DataAccessProvider, createQueryClient, useFindOne } from '@alneas/appkit-react/tools/data-access/react';
 * type DataAccessAdapter = ComponentProps<typeof DataAccessProvider>['adapter'];
 * const client = createQueryClient();
 * function Content() { const query = useFindOne<{ id: string }>('tasks', 'task-1'); return <output>{query.isPending ? 'Loading' : query.error ? 'Failed' : 'Ready'}</output>; }
 * export function DataScreen({ adapter }: { adapter: DataAccessAdapter }) { return <QueryClientProvider client={client}><DataAccessProvider adapter={adapter}><Content /></DataAccessProvider></QueryClientProvider>; }
 * ```
 */
export function useFindOne<T = unknown>(
  collection: string,
  id: string,
  adapterOptions?: QueryOptions,
  queryOptions?: Omit<UseQueryOptions<T | null, Error>, 'queryKey' | 'queryFn'>,
) {
  const adapter = useDataAccess();
  const options = findOneQueryOptions<T>(adapter, collection, id, adapterOptions);
  return useQuery({
    ...options,
    ...queryOptions,
  } as UseQueryOptions<T | null, Error>);
}

/**
 * Creates one record through the current data-access adapter and invalidates collection queries.
 * @typeParam T - Created record result returned by the adapter; defaults to unknown.
 * @typeParam TVariables - Mutation variables; must contain data and optional adapter options at runtime.
 * @param collection - Adapter collection/table name.
 * @param options - Optional onSuccess callback receiving the created result and variables, plus replacement
 * invalidation keys. Omitted invalidateKeys defaults to [[collection]]; [] disables invalidation.
 * @returns A mutation result whose mutate/mutateAsync accepts { data, options? } by default.
 * @throws When rendered without the required query or data-access provider.
 * @remarks Requires QueryClientProvider and DataAccessProvider with a real host adapter.
 * The adapter owns persistence, authorization and error semantics. Defaults are supplied by this
 * helper, not useMutationWithInvalidation. Callback promises are not awaited by that wrapper.
 * @example
 * ```tsx
 * import { QueryClientProvider } from '@tanstack/react-query';
 * import { DataAccessProvider, createQueryClient, useCreate } from '@alneas/appkit-react/tools/data-access/react';
 * import type { ComponentProps } from 'react';
 * const client = createQueryClient();
 * function CreateTask() {
 *   const create = useCreate<{ id: string; title: string }>('tasks');
 *   return <button onClick={() => create.mutate({ data: { title: 'Review' } })}>Create</button>;
 * }
 * export function TaskCreator({ adapter }: Pick<ComponentProps<typeof DataAccessProvider>, 'adapter'>) {
 *   return <QueryClientProvider client={client}><DataAccessProvider adapter={adapter}>
 *     <CreateTask />
 *   </DataAccessProvider></QueryClientProvider>;
 * }
 * ```
 */
export function useCreate<
  T = unknown,
  TVariables = { data: Record<string, unknown>; options?: QueryOptions },
>(
  collection: string,
  options?: {
    /**
     * Callback after successful mutation and awaited invalidations.
     * @param data - Adapter result.
     * @param variables - Original mutation variables.
     * @returns No value; callback promise results are not awaited by the wrapper.
     */
    onSuccess?: (data: T, variables: TVariables) => void;
    /**
     * Optional replacement query keys using prefix matching; [] disables invalidation, omission uses this hook default.
     */
    invalidateKeys?: unknown[][];
  },
) {
  const adapter = useDataAccess();
  return useMutationWithInvalidation<T, Error, TVariables>(
    (variables) => {
      const vars = variables as { data: Record<string, unknown>; options?: QueryOptions };
      return adapter.create<T>(collection, vars.data, vars.options);
    },
    {
      onSuccess: options?.onSuccess,
      invalidateKeys: options?.invalidateKeys || [[collection]],
    },
  );
}

/**
 * Updates one record through the current adapter and invalidates list and matching detail queries.
 * @typeParam T - Updated record result returned by the adapter; defaults to unknown.
 * @typeParam TVariables - Mutation variables; must contain id, data and optional adapter options at runtime.
 * @param collection - Adapter collection/table name.
 * @param options - Optional onSuccess callback receiving the updated result and variables, plus replacement
 * invalidation keys. Omitted keys default to [[collection, 'list'], [collection, 'detail', variables.id]];
 * [] disables invalidation.
 * @returns A mutation result whose mutate/mutateAsync accepts { id, data, options? } by default.
 * @throws When rendered without the required query or data-access provider.
 * @remarks Requires QueryClientProvider and DataAccessProvider with a real host adapter.
 * The adapter determines update semantics, authorization, persistence and errors. Invalidation
 * defaults are supplied by this helper; the underlying wrapper has no automatic defaults.
 * @example
 * ```tsx
 * import { QueryClientProvider } from '@tanstack/react-query';
 * import { DataAccessProvider, createQueryClient, useUpdate } from '@alneas/appkit-react/tools/data-access/react';
 * import type { ComponentProps } from 'react';
 * const client = createQueryClient();
 * function UpdateTask() {
 *   const update = useUpdate<{ id: string; title: string }>('tasks');
 *   return <button onClick={() => update.mutate({ id: 'task-1', data: { title: 'Reviewed' } })}>Update</button>;
 * }
 * export function TaskUpdater({ adapter }: Pick<ComponentProps<typeof DataAccessProvider>, 'adapter'>) {
 *   return <QueryClientProvider client={client}><DataAccessProvider adapter={adapter}>
 *     <UpdateTask />
 *   </DataAccessProvider></QueryClientProvider>;
 * }
 * ```
 */
export function useUpdate<
  T = unknown,
  TVariables = { id: string; data: Record<string, unknown>; options?: QueryOptions },
>(
  collection: string,
  options?: {
    /**
     * Callback after successful mutation and awaited invalidations.
     * @param data - Adapter result.
     * @param variables - Original mutation variables.
     * @returns No value; callback promise results are not awaited by the wrapper.
     */
    onSuccess?: (data: T, variables: TVariables) => void;
    /**
     * Optional replacement query keys using prefix matching; [] disables invalidation, omission uses this hook default.
     */
    invalidateKeys?: unknown[][];
  },
) {
  const adapter = useDataAccess();
  return useMutationWithInvalidation<T, Error, TVariables>(
    (variables) => {
      const vars = variables as {
        id: string;
        data: Record<string, unknown>;
        options?: QueryOptions;
      };
      return adapter.update<T>(collection, vars.id, vars.data, vars.options);
    },
    {
      onSuccess: options?.onSuccess,
      // リストと、特定の詳細アイテムの両方のキャッシュを無効化する
      invalidateKeys: (_data, variables) => {
        const vars = variables as { id: string };
        return (
          options?.invalidateKeys || [
            [collection, 'list'],
            [collection, 'detail', vars.id],
          ]
        );
      },
    },
  );
}

/**
 * Deletes one record through the current adapter.
 * @typeParam T - Adapter result record shape, defaults to unknown.
 * @typeParam TVariables - Mutation variables; must provide id and optional adapter options.
 * @param collection - Host collection/table name.
 * @param options - Optional successful-result callback and replacement invalidation keys.
 * @returns TanStack mutation result with explicit mutate/mutateAsync controls.
 * @throws Error without required providers; adapter failures reject mutateAsync and populate mutation error state.
 * @remarks Requires DataAccessProvider inside QueryClientProvider; no CSS. Omitted
 * invalidation keys default to [[collection]]; [] disables invalidation. Callback promise
 * results are not awaited by the underlying wrapper. Persistence, atomicity and
 * authorization are host-owned; no rollback is supplied.
 * @example
 * ```tsx
 * import type { ComponentProps } from 'react';
 * import { QueryClientProvider } from '@tanstack/react-query';
 * import { DataAccessProvider, createQueryClient, useDelete } from '@alneas/appkit-react/tools/data-access/react';
 * type DataAccessAdapter = ComponentProps<typeof DataAccessProvider>['adapter'];
 * const client = createQueryClient();
 * function Action() { const mutation = useDelete('tasks'); return <button onClick={() => mutation.mutate({ id: 'task-1' })}>Run host mutation</button>; }
 * export function DataScreen({ adapter }: { adapter: DataAccessAdapter }) { return <QueryClientProvider client={client}><DataAccessProvider adapter={adapter}><Action /></DataAccessProvider></QueryClientProvider>; }
 * ```
 */
export function useDelete<T = unknown, TVariables = { id: string; options?: QueryOptions }>(
  collection: string,
  options?: {
    /**
     * Callback after successful mutation and awaited invalidations.
     * @param data - Adapter result.
     * @param variables - Original mutation variables.
     * @returns No value; callback promise results are not awaited by the wrapper.
     */
    onSuccess?: (data: T, variables: TVariables) => void;
    /**
     * Optional replacement query keys using prefix matching; [] disables invalidation, omission uses this hook default.
     */
    invalidateKeys?: unknown[][];
  },
) {
  const adapter = useDataAccess();
  return useMutationWithInvalidation<T, Error, TVariables>(
    (variables) => {
      const vars = (typeof variables === 'string' ? { id: variables } : variables) as {
        id: string;
        options?: QueryOptions;
      };
      return adapter.delete<T>(collection, vars.id, vars.options);
    },
    {
      onSuccess: options?.onSuccess,
      invalidateKeys: options?.invalidateKeys || [[collection]],
    },
  );
}

/**
 * Creates multiple records through the current adapter.
 * @typeParam T - Adapter result record shape, defaults to unknown.
 * @typeParam TVariables - Mutation variables; must provide data array and optional adapter options.
 * @param collection - Host collection/table name.
 * @param options - Optional successful-result callback and replacement invalidation keys.
 * @returns TanStack mutation result with explicit mutate/mutateAsync controls.
 * @throws Error without required providers; mutation rejects if adapter lacks createMany or fails.
 * @remarks Requires DataAccessProvider inside QueryClientProvider; no CSS. Omitted
 * invalidation keys default to [[collection]]; [] disables invalidation. Callback promise
 * results are not awaited by the underlying wrapper. Persistence, atomicity and
 * authorization are host-owned; no rollback is supplied.
 * @example
 * ```tsx
 * import type { ComponentProps } from 'react';
 * import { QueryClientProvider } from '@tanstack/react-query';
 * import { DataAccessProvider, createQueryClient, useCreateMany } from '@alneas/appkit-react/tools/data-access/react';
 * type DataAccessAdapter = ComponentProps<typeof DataAccessProvider>['adapter'];
 * const client = createQueryClient();
 * function Action() { const mutation = useCreateMany('tasks'); return <button onClick={() => mutation.mutate({ data: [{ title: 'Review' }] })}>Run host mutation</button>; }
 * export function DataScreen({ adapter }: { adapter: DataAccessAdapter }) { return <QueryClientProvider client={client}><DataAccessProvider adapter={adapter}><Action /></DataAccessProvider></QueryClientProvider>; }
 * ```
 */
export function useCreateMany<
  T = unknown,
  TVariables = { data: Record<string, unknown>[]; options?: QueryOptions },
>(
  collection: string,
  options?: {
    /**
     * Callback after successful mutation and awaited invalidations.
     * @param data - Adapter result.
     * @param variables - Original mutation variables.
     * @returns No value; callback promise results are not awaited by the wrapper.
     */
    onSuccess?: (data: T[], variables: TVariables) => void;
    /**
     * Optional replacement query keys using prefix matching; [] disables invalidation, omission uses this hook default.
     */
    invalidateKeys?: unknown[][];
  },
) {
  const adapter = useDataAccess();
  return useMutationWithInvalidation<T[], Error, TVariables>(
    (variables) => {
      const vars = variables as { data: Record<string, unknown>[]; options?: QueryOptions };
      if (!adapter.createMany) throw new Error('Adapter does not support createMany');
      return adapter.createMany<T>(collection, vars.data, vars.options);
    },
    {
      onSuccess: options?.onSuccess,
      invalidateKeys: options?.invalidateKeys || [[collection]],
    },
  );
}

/**
 * Updates records matching an adapter filter.
 * @typeParam T - Adapter result record shape, defaults to unknown.
 * @typeParam TVariables - Mutation variables; must provide filter, data and optional adapter options.
 * @param collection - Host collection/table name.
 * @param options - Optional successful-result callback and replacement invalidation keys.
 * @returns TanStack mutation result with explicit mutate/mutateAsync controls.
 * @throws Error without required providers; mutation rejects if adapter lacks updateMany or fails.
 * @remarks Requires DataAccessProvider inside QueryClientProvider; no CSS. Omitted
 * invalidation keys default to [[collection], [collection, 'list']]; [] disables invalidation. Callback promise
 * results are not awaited by the underlying wrapper. Persistence, atomicity and
 * authorization are host-owned; no rollback is supplied.
 * @example
 * ```tsx
 * import type { ComponentProps } from 'react';
 * import { QueryClientProvider } from '@tanstack/react-query';
 * import { DataAccessProvider, createQueryClient, useUpdateMany } from '@alneas/appkit-react/tools/data-access/react';
 * type DataAccessAdapter = ComponentProps<typeof DataAccessProvider>['adapter'];
 * const client = createQueryClient();
 * function Action() { const mutation = useUpdateMany('tasks'); return <button onClick={() => mutation.mutate({ filter: { state: 'draft' }, data: { state: 'reviewed' } })}>Run host mutation</button>; }
 * export function DataScreen({ adapter }: { adapter: DataAccessAdapter }) { return <QueryClientProvider client={client}><DataAccessProvider adapter={adapter}><Action /></DataAccessProvider></QueryClientProvider>; }
 * ```
 */
export function useUpdateMany<
  T = unknown,
  TVariables = { filter: Filter; data: Record<string, unknown>; options?: QueryOptions },
>(
  collection: string,
  options?: {
    /**
     * Callback after successful mutation and awaited invalidations.
     * @param data - Adapter result.
     * @param variables - Original mutation variables.
     * @returns No value; callback promise results are not awaited by the wrapper.
     */
    onSuccess?: (data: T[], variables: TVariables) => void;
    /**
     * Optional replacement query keys using prefix matching; [] disables invalidation, omission uses this hook default.
     */
    invalidateKeys?: unknown[][];
  },
) {
  const adapter = useDataAccess();
  return useMutationWithInvalidation<T[], Error, TVariables>(
    (variables) => {
      const vars = variables as {
        filter: Filter;
        data: Record<string, unknown>;
        options?: QueryOptions;
      };
      if (!adapter.updateMany) throw new Error('Adapter does not support updateMany');
      return adapter.updateMany<T>(collection, vars.filter, vars.data, vars.options);
    },
    {
      onSuccess: options?.onSuccess,
      invalidateKeys: options?.invalidateKeys || [[collection], [collection, 'list']],
    },
  );
}

/**
 * Deletes records matching an adapter filter.
 * @typeParam T - Adapter result record shape, defaults to unknown.
 * @typeParam TVariables - Mutation variables; must provide filter and optional adapter options.
 * @param collection - Host collection/table name.
 * @param options - Optional successful-result callback and replacement invalidation keys.
 * @returns TanStack mutation result with explicit mutate/mutateAsync controls.
 * @throws Error without required providers; mutation rejects if adapter lacks deleteMany or fails.
 * @remarks Requires DataAccessProvider inside QueryClientProvider; no CSS. Omitted
 * invalidation keys default to [[collection]]; [] disables invalidation. Callback promise
 * results are not awaited by the underlying wrapper. Persistence, atomicity and
 * authorization are host-owned; no rollback is supplied.
 * @example
 * ```tsx
 * import type { ComponentProps } from 'react';
 * import { QueryClientProvider } from '@tanstack/react-query';
 * import { DataAccessProvider, createQueryClient, useDeleteMany } from '@alneas/appkit-react/tools/data-access/react';
 * type DataAccessAdapter = ComponentProps<typeof DataAccessProvider>['adapter'];
 * const client = createQueryClient();
 * function Action() { const mutation = useDeleteMany('tasks'); return <button onClick={() => mutation.mutate({ filter: { state: 'obsolete' } })}>Run host mutation</button>; }
 * export function DataScreen({ adapter }: { adapter: DataAccessAdapter }) { return <QueryClientProvider client={client}><DataAccessProvider adapter={adapter}><Action /></DataAccessProvider></QueryClientProvider>; }
 * ```
 */
export function useDeleteMany<T = unknown, TVariables = { filter: Filter; options?: QueryOptions }>(
  collection: string,
  options?: {
    /**
     * Callback after successful mutation and awaited invalidations.
     * @param data - Adapter result.
     * @param variables - Original mutation variables.
     * @returns No value; callback promise results are not awaited by the wrapper.
     */
    onSuccess?: (data: T[], variables: TVariables) => void;
    /**
     * Optional replacement query keys using prefix matching; [] disables invalidation, omission uses this hook default.
     */
    invalidateKeys?: unknown[][];
  },
) {
  const adapter = useDataAccess();
  return useMutationWithInvalidation<T[], Error, TVariables>(
    (variables) => {
      const vars = variables as { filter: Filter; options?: QueryOptions };
      if (!adapter.deleteMany) throw new Error('Adapter does not support deleteMany');
      return adapter.deleteMany<T>(collection, vars.filter, vars.options);
    },
    {
      onSuccess: options?.onSuccess,
      invalidateKeys: options?.invalidateKeys || [[collection]],
    },
  );
}

/**
 * Queries an aggregation pipeline through the current adapter.
 * @typeParam T - Expected result record shape, default unknown; not runtime validation.
 * @param collection - Host collection/table name.
 * @param pipeline - Adapter-specific aggregation stages.
 * @param options - Optional adapter query settings.
 * @param queryOptions - TanStack query overrides; omitted values use the generated options.
 * @returns TanStack query result with data/status/error and refetch controls. Missing aggregate capability becomes a query error.
 * @throws Error without DataAccessProvider or QueryClientProvider.
 * @remarks No CSS required. Adapter failures appear in query state; keys include adapter
 * scope and input options. Query signals are forwarded, but cancellation depends on the
 * adapter. The host owns backend authorization.
 * @example
 * ```tsx
 * import type { ComponentProps } from 'react';
 * import { QueryClientProvider } from '@tanstack/react-query';
 * import { DataAccessProvider, createQueryClient, useAggregate } from '@alneas/appkit-react/tools/data-access/react';
 * type DataAccessAdapter = ComponentProps<typeof DataAccessProvider>['adapter'];
 * const client = createQueryClient();
 * function Content() { const query = useAggregate<{ count: number }>('tasks', []); return <output>{query.isPending ? 'Loading' : query.error ? 'Failed' : 'Ready'}</output>; }
 * export function DataScreen({ adapter }: { adapter: DataAccessAdapter }) { return <QueryClientProvider client={client}><DataAccessProvider adapter={adapter}><Content /></DataAccessProvider></QueryClientProvider>; }
 * ```
 */
export function useAggregate<T = unknown>(
  collection: string,
  pipeline: unknown[],
  options?: QueryOptions,
  queryOptions?: Omit<UseQueryOptions<T[], Error>, 'queryKey' | 'queryFn'>,
) {
  const adapter = useDataAccess();
  const aggOptions = aggregateQueryOptions<T>(adapter, collection, pipeline, options);
  return useQuery({
    ...aggOptions,
    ...queryOptions,
  } as UseQueryOptions<T[], Error>);
}
