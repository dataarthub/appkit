/**
 * Convex Data Access Adapter
 *
 * Implements the DataAccessAdapter interface using ConvexReactClient.
 * Maps Convex queries and mutations to CRUD operations.
 */

import type { DataAccessAdapter, Filter, QueryOptions } from './types';

// Convex client types (imported dynamically to avoid hard dependency)
type ConvexReactClient = {
  query: <T>(queryRef: unknown, args?: Record<string, unknown>) => Promise<T>;
  mutation: <T>(mutationRef: unknown, args?: Record<string, unknown>) => Promise<T>;
};

/**
 * Convex query function references.
 *
 * Defines Convex function references for query operations on a collection.
 * These are functions imported from `convex/_generated/api`.
 */
export interface ConvexQueryRefs {
  /**
   * List retrieval query
   * @example api.users.list
   */
  list: unknown;
  /**
   * Single item retrieval query
   * @example api.users.get
   */
  get: unknown;
  /**
   * Count query (optional)
   * @example api.users.count
   */
  count?: unknown;
}

/**
 * Convex mutation function references.
 *
 * Defines Convex function references for mutation operations on a collection.
 */
export interface ConvexMutationRefs {
  /**
   * Create mutation
   * @example api.users.create
   */
  create: unknown;
  /**
   * Update mutation
   * @example api.users.update
   */
  update: unknown;
  /**
   * Delete mutation
   * @example api.users.delete
   */
  delete: unknown;
  /**
   * Bulk create mutation (optional)
   */
  createMany?: unknown;
  /**
   * Bulk update mutation (optional)
   */
  updateMany?: unknown;
  /**
   * Bulk delete mutation (optional)
   */
  deleteMany?: unknown;
}

/**
 * ConvexAdapter configuration options.
 */
export interface ConvexAdapterConfig {
  /** ConvexReactClient instance */
  client: ConvexReactClient;
  /**
   * Mapping of collection names to query function references
   * @example { users: { list: api.users.list, get: api.users.get } }
   */
  queries: Record<string, ConvexQueryRefs>;
  /**
   * Mapping of collection names to mutation function references
   * @example { users: { create: api.users.create, update: api.users.update, delete: api.users.delete } }
   */
  mutations: Record<string, ConvexMutationRefs>;
}

/**
 * Convex Data Access Adapter
 *
 * Implements the DataAccessAdapter interface with Convex.
 * The `isConvex: true` flag enables detection by React Query hooks
 * to switch to native Convex real-time queries.
 */
export class ConvexAdapter implements DataAccessAdapter {
  /** Flag indicating this adapter is a Convex adapter */
  readonly isConvex: boolean = true;

  private client: ConvexReactClient;
  private queries: Record<string, ConvexQueryRefs>;
  private mutations: Record<string, ConvexMutationRefs>;

  /**
   * Creates a new instance of ConvexAdapter.
   * @param config Adapter configuration
   */
  constructor(config: ConvexAdapterConfig) {
    this.client = config.client;
    this.queries = config.queries;
    this.mutations = config.mutations;
  }

  /**
   * Gets the Convex client (for real-time hooks)
   */
  getClient(): ConvexReactClient {
    return this.client;
  }

  /**
   * Gets query references for a collection
   */
  getQueryRefs(collection: string): ConvexQueryRefs | undefined {
    return this.queries[collection];
  }

  /**
   * Gets mutation references for a collection
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
   * Retrieves multiple records.
   *
   * @param collection - Collection name
   * @param filter - Optional filter criteria
   * @param options - Optional query options
   * @returns Array of data records
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
   * Retrieves a single record by ID.
   *
   * @param collection - Collection name
   * @param id - Document ID
   * @param _options - Query options (currently unused)
   * @returns Data record or null
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
   * Creates a new record.
   *
   * @param collection - Collection name
   * @param data - Data to create
   * @param _options - Query options (currently unused)
   * @returns Created data record
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
   * Updates a record.
   *
   * @param collection - Collection name
   * @param id - Document ID to update
   * @param data - Update data
   * @param _options - Query options (currently unused)
   * @returns Updated data record
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
   * Deletes a record.
   *
   * @param collection - Collection name
   * @param id - Document ID to delete
   * @param _options - Query options (currently unused)
   * @returns Deleted data record
   */
  async delete<T = unknown>(collection: string, id: string, _options?: QueryOptions): Promise<T> {
    const refs = this.getMutations(collection);
    return this.client.mutation<T>(refs.delete, { id });
  }

  /**
   * Counts the number of records.
   *
   * @param collection - Collection name
   * @param filter - Optional filter criteria
   * @param _options - Query options (currently unused)
   * @returns Record count
   * @throws Error if count query is not configured
   */
  async count(collection: string, filter?: Filter, _options?: QueryOptions): Promise<number> {
    const refs = this.getQueries(collection);
    if (!refs.count) {
      throw new Error(`Count query not configured for collection: ${collection}`);
    }
    return this.client.query<number>(refs.count, { filter });
  }

  /**
   * Bulk creates multiple records.
   *
   * @param collection - Collection name
   * @param data - Array of data records to create
   * @param _options - Query options (currently unused)
   * @returns Array of created data records
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
   * Updates multiple records matching the criteria.
   *
   * @param collection - Collection name
   * @param filter - Filter criteria
   * @param data - Update data
   * @param _options - Query options (currently unused)
   * @returns Array of updated data records
   * @throws Error if updateMany is not configured
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
   * Deletes multiple records matching the criteria.
   *
   * @param collection - Collection name
   * @param filter - Filter criteria
   * @param _options - Query options (currently unused)
   * @returns Array of deleted data records
   * @throws Error if deleteMany is not configured
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
 * Type guard: Determines whether the adapter is a ConvexAdapter.
 *
 * @param adapter - DataAccessAdapter to check
 * @returns True if ConvexAdapter
 *
 * @example
 * ```typescript
 * if (isConvexAdapter(adapter)) {
 *   // Use Convex-specific features
 *   const client = adapter.getClient();
 * }
 * ```
 */
export function isConvexAdapter(adapter: DataAccessAdapter): adapter is ConvexAdapter {
  return 'isConvex' in adapter && (adapter as ConvexAdapter).isConvex === true;
}
