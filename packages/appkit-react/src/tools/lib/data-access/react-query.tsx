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
 * アプリケーション全体で使用する QueryClient を作成します。
 * デフォルト設定として、staleTime: 5分, retry: 1, refetchOnWindowFocus: false が設定されています。
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
 * 指定したキーのクエリキャッシュを手動で無効化（再取得要求）するためのフックです。
 * @returns クエリキーを受け取り、無効化を実行する関数
 */
export function useInvalidate() {
  const queryClient = useQueryClient();

  return (key: QueryKey) => {
    return queryClient.invalidateQueries({ queryKey: key });
  };
}

/**
 * useMutation のラッパーフックです。
 * Mutation 成功時に、指定したキーまたは自動生成されたキーに基づいてクエリの無効化を行います。
 *
 * @param mutationFn - 実行する非同期関数
 * @param options.invalidateKeys - 無効化したいクエリキーの配列、または結果からキーを生成する関数
 */
export function useMutationWithInvalidation<
  TData = unknown,
  TError = unknown,
  TVariables = void,
  TContext = unknown,
>(
  mutationFn: MutationFunction<TData, TVariables>,
  options?: UseMutationOptions<TData, TError, TVariables, TContext> & {
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
 * useFind および ensureQueryData 用の QueryOptions を生成します。
 *
 * @param adapter - DataAccessAdapter インスタンス
 * @param collection - コレクション名
 * @param filter - フィルタ条件
 * @param adapterOptions - クエリオプション
 * @returns TanStack Query 用のオプションオブジェクト
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
 * useFindOne および ensureQueryData 用の QueryOptions を生成します。
 *
 * @param adapter - DataAccessAdapter インスタンス
 * @param collection - コレクション名
 * @param id - ドキュメントID
 * @param adapterOptions - クエリオプション
 * @returns TanStack Query 用のオプションオブジェクト
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
 * useAggregate および ensureQueryData 用の QueryOptions を生成します。
 *
 * @param adapter - DataAccessAdapter インスタンス
 * @param collection - コレクション名
 * @param pipeline - Aggregation Pipeline
 * @param options - クエリオプション
 * @returns TanStack Query 用のオプションオブジェクト
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
 * コレクションから複数のレコードを取得し、React Query による自動キャッシュを行います。
 *
 * @param collection - コレクション/テーブル名
 * @param filter - フィルタ条件 ($eq, $in, $gte など)
 * @param adapterOptions - ソート、取得制限、Populate などのオプション
 * @param queryOptions - React Query (useQuery) のオプション (enabled, staleTime など)
 * @returns useQuery の結果オブジェクト (data, isLoading, error等)
 *
 * @example
 * ```tsx
 * const { data: users, isLoading } = useFind<User>('users', { role: 'admin' }, { sort: { name: 1 }, limit: 50 });
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
 * ID指定で単一のデータを取得します。
 *
 * @param collection - 取得対象のコレクション/テーブル名
 * @param id - ドキュメント/レコードのID
 * @param adapterOptions - Populate などのクエリオプション
 * @param queryOptions - React Query (useQuery) のオプション
 * @returns useQuery の結果オブジェクト (data, isLoading, error等)
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
 * 新規データを作成するためのフックです。
 * 成功時にキャッシュの無効化（Invalidation）を自動的に行います。
 *
 * @param collection - 対象のコレクション/テーブル名
 * @param options.onSuccess - 成功時のコールバック
 * @param options.invalidateKeys - 無効化するクエリキー（デフォルトは `[[collection]]`）
 * @returns useMutation の結果オブジェクト (mutate, isLoading等)
 */
export function useCreate<
  T = unknown,
  TVariables = { data: Record<string, unknown>; options?: QueryOptions },
>(
  collection: string,
  options?: {
    onSuccess?: (data: T, variables: TVariables) => void;
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
 * データを更新するためのフックです。
 * 成功時にリストと詳細のキャッシュを自動的に無効化します。
 *
 * @param collection - 対象のコレクション/テーブル名
 * @param options.onSuccess - 成功時のコールバック
 * @param options.invalidateKeys - 無効化キー（デフォルトはリストと対象IDの詳細）
 * @returns useMutation の結果オブジェクト (mutate, isLoading等)
 */
export function useUpdate<
  T = unknown,
  TVariables = { id: string; data: Record<string, unknown>; options?: QueryOptions },
>(
  collection: string,
  options?: {
    onSuccess?: (data: T, variables: TVariables) => void;
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
 * データを削除するためのフックです。
 *
 * @param collection - 対象のコレクション/テーブル名
 * @param options.onSuccess - 成功時のコールバック
 * @param options.invalidateKeys - 無効化キー
 * @returns useMutation の結果オブジェクト (mutate, isLoading等)
 */
export function useDelete<T = unknown, TVariables = { id: string; options?: QueryOptions }>(
  collection: string,
  options?: {
    onSuccess?: (data: T, variables: TVariables) => void;
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
 * 複数のデータを一括作成するためのフックです。
 *
 * @param collection - 対象のコレクション/テーブル名
 * @param options.onSuccess - 成功時のコールバック
 * @param options.invalidateKeys - 無効化キー（デフォルトは `[[collection]]`）
 * @returns useMutation の結果オブジェクト (mutate, isLoading等)
 */
export function useCreateMany<
  T = unknown,
  TVariables = { data: Record<string, unknown>[]; options?: QueryOptions },
>(
  collection: string,
  options?: {
    onSuccess?: (data: T[], variables: TVariables) => void;
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
 * 条件に一致する複数のデータを一括更新するためのフックです。
 *
 * @param collection - 対象のコレクション/テーブル名
 * @param options.onSuccess - 成功時のコールバック
 * @param options.invalidateKeys - 無効化キー（デフォルトは `[[collection]]`）
 * @returns useMutation の結果オブジェクト (mutate, isLoading等)
 */
export function useUpdateMany<
  T = unknown,
  TVariables = { filter: Filter; data: Record<string, unknown>; options?: QueryOptions },
>(
  collection: string,
  options?: {
    onSuccess?: (data: T[], variables: TVariables) => void;
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
 * 条件に一致する複数のデータを一括削除するためのフックです。
 *
 * @param collection - 対象のコレクション/テーブル名
 * @param options.onSuccess - 成功時のコールバック
 * @param options.invalidateKeys - 無効化キー（デフォルトは `[[collection]]`）
 * @returns useMutation の結果オブジェクト (mutate, isLoading等)
 */
export function useDeleteMany<T = unknown, TVariables = { filter: Filter; options?: QueryOptions }>(
  collection: string,
  options?: {
    onSuccess?: (data: T[], variables: TVariables) => void;
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
 * Aggregation Pipelineを実行するためのフックです。
 *
 * @param collection - 対象のコレクション/テーブル名
 * @param pipeline - Aggregation Pipeline
 * @param options - クエリオプション
 * @param queryOptions - React Query (useQuery) のオプション
 * @returns useQuery の結果オブジェクト (data, isLoading, error等)
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
