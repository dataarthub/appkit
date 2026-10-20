/**
 * Convex Data Access Adapter
 *
 * Implements the DataAccessAdapter interface using ConvexReactClient.
 * Maps Convex queries and mutations to CRUD operations.
 */

import type { DataAccessAdapter, Filter, QueryOptions } from './types';

// Convex client types (imported dynamically to avoid hard dependency)
/**
 * Structural client shape used by ConvexAdapter; host queries/mutations must implement the documented argument and result shapes. No Convex client is constructed here.
 * @see {@link ConvexAdapterConfig}.
 */
type ConvexReactClient = {
  /**
   * Invokes a configured host query.
   * @typeParam T - Expected result shape trusted by the adapter.
   * @param queryRef - Host query reference.
   * @param args - Host query arguments.
   * @returns The host query result or its rejection.
   */
  query: <T>(queryRef: unknown, args?: Record<string, unknown>) => Promise<T>;
  /**
   * Invokes a configured host mutation.
   * @typeParam T - Expected result shape trusted by the adapter.
   * @param mutationRef - Host mutation reference.
   * @param args - Host mutation arguments.
   * @returns The host mutation result or its rejection.
   */
  mutation: <T>(mutationRef: unknown, args?: Record<string, unknown>) => Promise<T>;
};

/**
 * Per-collection host query references; list receives { filter, ...options }, get receives { id }, and count receives { filter }. The referenced functions must enforce authorization and implement these shapes.
 * @see {@link ConvexAdapterConfig}.
 */
export interface ConvexQueryRefs {
  /**
   * Query returning a record array for { filter, ...options }; the adapter does not translate filter operators.
   */
  list: unknown;
  /**
   * Query returning one record or null for { id }.
   */
  get: unknown;
  /**
   * Optional query returning a number for { filter }; absence makes count reject.
   */
  count?: unknown;
}

/**
 * Per-collection host mutation references; the host owns validation, persistence, authorization and result shape.
 * @see {@link ConvexAdapterConfig}.
 */
export interface ConvexMutationRefs {
  /**
   * Mutation accepting { data } and returning a created record.
   */
  create: unknown;
  /**
   * Mutation accepting { id, data } and returning an updated record.
   */
  update: unknown;
  /**
   * Mutation accepting { id } and returning its host-defined deletion result.
   */
  delete: unknown;
  /**
   * Optional mutation accepting { items } and returning an array; absence selects sequential create calls without a shared transaction.
   */
  createMany?: unknown;
  /**
   * Optional mutation accepting { filter, data } and returning an array; absence makes updateMany reject.
   */
  updateMany?: unknown;
  /**
   * Optional mutation accepting { filter } and returning an array; absence makes deleteMany reject.
   */
  deleteMany?: unknown;
}

/**
 * Host client and collection-to-function mappings. The adapter stores these references directly and does not generate functions or validate their contracts.
 * @example
 * ```ts
 * import { ConvexAdapter } from '@alneas/appkit-core/data/convex';
 * import type { ConvexAdapterConfig } from '@alneas/appkit-core/data/convex';
 * export function connectConvex(config: ConvexAdapterConfig) {
 *   return new ConvexAdapter(config);
 * }
 * ```
 */
export interface ConvexAdapterConfig {
  /** ConvexReactClient instance */
  client: ConvexReactClient;
  /**
   * Collection names mapped to host list/get and optional count references.
   * @see {@link ConvexQueryRefs}.
   */
  queries: Record<string, ConvexQueryRefs>;
  /**
   * Collection names mapped to host CRUD and optional bulk references.
   * @see {@link ConvexMutationRefs}.
   */
  mutations: Record<string, ConvexMutationRefs>;
}

/**
 * Maps collection operations to explicitly configured Convex query/mutation functions. It does not translate filters or provide server functions; the host owns schema and permissions. isConvex identifies the adapter for cooperating React hooks, while direct methods return one-shot promises.
 * @example
 * ```ts
 * import { ConvexAdapter } from '@alneas/appkit-core/data/convex';
 * import type { ConvexAdapterConfig } from '@alneas/appkit-core/data/convex';
 * export function connectConvex(config: ConvexAdapterConfig) {
 *   return new ConvexAdapter(config);
 * }
 * ```
 */
export class ConvexAdapter implements DataAccessAdapter {
  /** Flag indicating this adapter is a Convex adapter */
  readonly isConvex: boolean = true;

  private client: ConvexReactClient;
  private queries: Record<string, ConvexQueryRefs>;
  private mutations: Record<string, ConvexMutationRefs>;

  /**
   * Stores the host client and reference maps without executing a query or mutation.
   * @param config - Host client and collection mappings with the required argument/result shapes.
   * @example
   * ```ts
   * import { ConvexAdapter } from '@alneas/appkit-core/data/convex';
   * import type { ConvexAdapterConfig } from '@alneas/appkit-core/data/convex';
   * export function connectConvex(config: ConvexAdapterConfig) {
   *   return new ConvexAdapter(config);
   * }
   * ```
   */
  constructor(config: ConvexAdapterConfig) {
    this.client = config.client;
    this.queries = config.queries;
    this.mutations = config.mutations;
  }

  /**
   * Returns the exact configured client for cooperating integrations.
   * @returns The shared host client; the adapter does not transfer ownership or dispose it.
   * @example
   * ```ts
   * import { ConvexAdapter } from '@alneas/appkit-core/data/convex';
   * export function convexClient(adapter: ConvexAdapter) { return adapter.getClient(); }
   * ```
   */
  getClient(): ConvexReactClient {
    return this.client;
  }

  /**
   * Reads the configured query references without requiring the collection to exist.
   * @param collection - Exact collection-map key.
   * @returns The stored reference object, or undefined. Mutating that object affects subsequent adapter operations.
   * @example
   * ```ts
   * import { ConvexAdapter } from '@alneas/appkit-core/data/convex';
   * export function taskQueries(adapter: ConvexAdapter) { return adapter.getQueryRefs('tasks'); }
   * ```
   */
  getQueryRefs(collection: string): ConvexQueryRefs | undefined {
    return this.queries[collection];
  }

  /**
   * Reads the configured mutation references without requiring the collection to exist.
   * @param collection - Exact collection-map key.
   * @returns The stored reference object, or undefined. Mutating that object affects subsequent adapter operations.
   * @example
   * ```ts
   * import { ConvexAdapter } from '@alneas/appkit-core/data/convex';
   * export function taskMutations(adapter: ConvexAdapter) { return adapter.getMutationRefs('tasks'); }
   * ```
   */
  getMutationRefs(collection: string): ConvexMutationRefs | undefined {
    return this.mutations[collection];
  }

  private getQueries(collection: string): ConvexQueryRefs {
    const refs = this.queries[collection];
    if (!refs) {
      throw new Error(`No query refs configured for collection: ${collection}`);
    }
    return refs;
  }

  private getMutations(collection: string): ConvexMutationRefs {
    const refs = this.mutations[collection];
    if (!refs) {
      throw new Error(`No mutation refs configured for collection: ${collection}`);
    }
    return refs;
  }

  /**
   * Forwards list query arguments as { filter, ...options }; this is a one-shot query.
   * @typeParam T - Expected host result shape; defaults to unknown and is not runtime-validated.
   * @param collection - Exact configured collection-map key.
   * @param filter - Filter passed unchanged; the host query/mutation defines supported operations.
   * @param options - Fields spread into the list query arguments after filter; host query defines support.
   * @returns The host result cast to T[]; filter, projection and pagination semantics belong to the host query.
   * @throws Rejects when collection references are absent, a required optional capability is missing, or the host client rejects. No retries, rollback or cancellation are added.
   * @example
   * ```ts
   * import { ConvexAdapter } from '@alneas/appkit-core/data/convex';
   * export async function findTasks(adapter: ConvexAdapter) {
   *   return adapter.find('tasks', { status: 'open' }, { limit: 20 });
   * }
   * ```
   */
  async find<T = unknown>(
    collection: string,
    filter?: Filter,
    options?: QueryOptions,
  ): Promise<T[]> {
    const refs = this.getQueries(collection);
    return this.client.query<T[]>(refs.list, { filter, ...options });
  }

  /**
   * Invokes the configured get query with { id }.
   * @typeParam T - Expected host result shape; defaults to unknown and is not runtime-validated.
   * @param collection - Exact configured collection-map key.
   * @param id - Identifier passed unchanged to the host function.
   * @param _options - Accepted for compatibility and ignored.
   * @returns The host record or null.
   * @throws Rejects when collection references are absent, a required optional capability is missing, or the host client rejects. No retries, rollback or cancellation are added.
   * @example
   * ```ts
   * import { ConvexAdapter } from '@alneas/appkit-core/data/convex';
   * export async function findOneTasks(adapter: ConvexAdapter) {
   *   return adapter.findOne('tasks', 'task-1');
   * }
   * ```
   */
  async findOne<T = unknown>(
    collection: string,
    id: string,
    _options?: QueryOptions,
  ): Promise<T | null> {
    const refs = this.getQueries(collection);
    return this.client.query<T | null>(refs.get, { id });
  }

  /**
   * Invokes create with { data }.
   * @typeParam T - Expected host result shape; defaults to unknown and is not runtime-validated.
   * @param collection - Exact configured collection-map key.
   * @param data - Record data, or batch records, passed unchanged to the host function.
   * @param _options - Accepted for compatibility and ignored.
   * @returns The host-created record.
   * @throws Rejects when collection references are absent, a required optional capability is missing, or the host client rejects. No retries, rollback or cancellation are added.
   * @example
   * ```ts
   * import { ConvexAdapter } from '@alneas/appkit-core/data/convex';
   * export async function createTasks(adapter: ConvexAdapter) {
   *   return adapter.create('tasks', { title: 'Draft' });
   * }
   * ```
   */
  async create<T = unknown>(
    collection: string,
    data: Record<string, unknown>,
    _options?: QueryOptions,
  ): Promise<T> {
    const refs = this.getMutations(collection);
    return this.client.mutation<T>(refs.create, { data });
  }

  /**
   * Invokes update with { id, data }.
   * @typeParam T - Expected host result shape; defaults to unknown and is not runtime-validated.
   * @param collection - Exact configured collection-map key.
   * @param id - Identifier passed unchanged to the host function.
   * @param data - Record data, or batch records, passed unchanged to the host function.
   * @param _options - Accepted for compatibility and ignored.
   * @returns The host-updated record; partial/replace semantics belong to that function.
   * @throws Rejects when collection references are absent, a required optional capability is missing, or the host client rejects. No retries, rollback or cancellation are added.
   * @example
   * ```ts
   * import { ConvexAdapter } from '@alneas/appkit-core/data/convex';
   * export async function updateTasks(adapter: ConvexAdapter) {
   *   return adapter.update('tasks', 'task-1', { title: 'Reviewed' });
   * }
   * ```
   */
  async update<T = unknown>(
    collection: string,
    id: string,
    data: Record<string, unknown>,
    _options?: QueryOptions,
  ): Promise<T> {
    const refs = this.getMutations(collection);
    return this.client.mutation<T>(refs.update, { id, data });
  }

  /**
   * Invokes delete with { id }.
   * @typeParam T - Expected host result shape; defaults to unknown and is not runtime-validated.
   * @param collection - Exact configured collection-map key.
   * @param id - Identifier passed unchanged to the host function.
   * @param _options - Accepted for compatibility and ignored.
   * @returns The host deletion result cast to T; no readback or result normalization is added.
   * @throws Rejects when collection references are absent, a required optional capability is missing, or the host client rejects. No retries, rollback or cancellation are added.
   * @example
   * ```ts
   * import { ConvexAdapter } from '@alneas/appkit-core/data/convex';
   * export async function deleteTasks(adapter: ConvexAdapter) {
   *   return adapter.delete('tasks', 'task-1');
   * }
   * ```
   */
  async delete<T = unknown>(collection: string, id: string, _options?: QueryOptions): Promise<T> {
    const refs = this.getMutations(collection);
    return this.client.mutation<T>(refs.delete, { id });
  }

  /**
   * Invokes the optional count query with { filter }.
   * @param collection - Exact configured collection-map key.
   * @param filter - Filter passed unchanged; the host query/mutation defines supported operations.
   * @param _options - Accepted for compatibility and ignored.
   * @returns The host count, trusted without numeric validation.
   * @throws Rejects when collection references are absent, a required optional capability is missing, or the host client rejects. No retries, rollback or cancellation are added.
   * @example
   * ```ts
   * import { ConvexAdapter } from '@alneas/appkit-core/data/convex';
   * export async function countTasks(adapter: ConvexAdapter) {
   *   return adapter.count('tasks', { status: 'open' });
   * }
   * ```
   */
  async count(collection: string, filter?: Filter, _options?: QueryOptions): Promise<number> {
    const refs = this.getQueries(collection);
    if (!refs.count) {
      throw new Error(`Count query not configured for collection: ${collection}`);
    }
    return this.client.query<number>(refs.count, { filter });
  }

  /**
   * Invokes optional createMany with { items }, otherwise calls create sequentially.
   * @typeParam T - Expected host result shape; defaults to unknown and is not runtime-validated.
   * @param collection - Exact configured collection-map key.
   * @param data - Record data, or batch records, passed unchanged to the host function.
   * @param _options - Accepted for compatibility and ignored.
   * @returns Host result array, or fallback results in input order. A fallback failure can leave earlier records created; empty input still requires a configured collection.
   * @throws Rejects when collection references are absent, a required optional capability is missing, or the host client rejects. No retries, rollback or cancellation are added.
   * @example
   * ```ts
   * import { ConvexAdapter } from '@alneas/appkit-core/data/convex';
   * export async function createManyTasks(adapter: ConvexAdapter) {
   *   return adapter.createMany('tasks', [{ title: 'Draft' }]);
   * }
   * ```
   */
  async createMany<T = unknown>(
    collection: string,
    data: Record<string, unknown>[],
    _options?: QueryOptions,
  ): Promise<T[]> {
    const refs = this.getMutations(collection);
    if (!refs.createMany) {
      // Fallback: create one by one
      const results: T[] = [];
      for (const item of data) {
        const created = await this.create<T>(collection, item);
        results.push(created);
      }
      return results;
    }
    return this.client.mutation<T[]>(refs.createMany, { items: data });
  }

  /**
   * Invokes required-for-this-call updateMany with { filter, data }.
   * @typeParam T - Expected host result shape; defaults to unknown and is not runtime-validated.
   * @param collection - Exact configured collection-map key.
   * @param filter - Filter passed unchanged; the host query/mutation defines supported operations.
   * @param data - Record data, or batch records, passed unchanged to the host function.
   * @param _options - Accepted for compatibility and ignored.
   * @returns Host-updated record array; no client fallback is provided.
   * @throws Rejects when collection references are absent, a required optional capability is missing, or the host client rejects. No retries, rollback or cancellation are added.
   * @example
   * ```ts
   * import { ConvexAdapter } from '@alneas/appkit-core/data/convex';
   * export async function updateManyTasks(adapter: ConvexAdapter) {
   *   return adapter.updateMany('tasks', { status: 'open' }, { status: 'closed' });
   * }
   * ```
   */
  async updateMany<T = unknown>(
    collection: string,
    filter: Filter,
    data: Record<string, unknown>,
    _options?: QueryOptions,
  ): Promise<T[]> {
    const refs = this.getMutations(collection);
    if (!refs.updateMany) {
      throw new Error(`updateMany not configured for collection: ${collection}`);
    }
    return this.client.mutation<T[]>(refs.updateMany, { filter, data });
  }

  /**
   * Invokes required-for-this-call deleteMany with { filter }.
   * @typeParam T - Expected host result shape; defaults to unknown and is not runtime-validated.
   * @param collection - Exact configured collection-map key.
   * @param filter - Filter passed unchanged; the host query/mutation defines supported operations.
   * @param _options - Accepted for compatibility and ignored.
   * @returns Host-deleted record array; no client fallback is provided.
   * @throws Rejects when collection references are absent, a required optional capability is missing, or the host client rejects. No retries, rollback or cancellation are added.
   * @example
   * ```ts
   * import { ConvexAdapter } from '@alneas/appkit-core/data/convex';
   * export async function deleteManyTasks(adapter: ConvexAdapter) {
   *   return adapter.deleteMany('tasks', { status: 'archived' });
   * }
   * ```
   */
  async deleteMany<T = unknown>(
    collection: string,
    filter: Filter,
    _options?: QueryOptions,
  ): Promise<T[]> {
    const refs = this.getMutations(collection);
    if (!refs.deleteMany) {
      throw new Error(`deleteMany not configured for collection: ${collection}`);
    }
    return this.client.mutation<T[]>(refs.deleteMany, { filter });
  }
}

/**
 * Checks only whether the adapter exposes isConvex equal to true.
 * @param adapter - Adapter to inspect.
 * @returns True for the marker, narrowing the type to ConvexAdapter. This does not check instanceof, client methods or reference-map validity.
 * @example
 * ```ts
 * import { isConvexAdapter } from '@alneas/appkit-core/data/convex';
 * import type { DataAccessAdapter } from '@alneas/appkit-core/data';
 * export function getConvexClient(adapter: DataAccessAdapter) {
 *   return isConvexAdapter(adapter) ? adapter.getClient() : undefined;
 * }
 * ```
 */
export function isConvexAdapter(adapter: DataAccessAdapter): adapter is ConvexAdapter {
  return 'isConvex' in adapter && (adapter as ConvexAdapter).isConvex === true;
}
