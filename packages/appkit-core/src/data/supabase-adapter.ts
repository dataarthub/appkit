import { validateFilter, comparisonOperators } from './internal/query-safety';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  DataAccessAdapter,
  QueryOptions,
  OperationResult,
  Filter,
  normalizePopulateOptions,
} from './types';

type SupabaseQueryLike = {
  gt: (key: string, value: unknown) => SupabaseQueryLike;
  lt: (key: string, value: unknown) => SupabaseQueryLike;
  gte: (key: string, value: unknown) => SupabaseQueryLike;
  lte: (key: string, value: unknown) => SupabaseQueryLike;
  eq: (key: string, value: unknown) => SupabaseQueryLike;
  neq: (key: string, value: unknown) => SupabaseQueryLike;
  in: (key: string, value: unknown[]) => SupabaseQueryLike;
  not: (key: string, operator: string, value: string) => SupabaseQueryLike;
  is: (key: string, value: null) => SupabaseQueryLike;
  ilike: (key: string, value: string) => SupabaseQueryLike;
  order: (key: string, options: { ascending: boolean }) => SupabaseQueryLike;
  limit: (count: number) => SupabaseQueryLike;
  range: (from: number, to: number) => SupabaseQueryLike;
  select: (columns?: string, options?: { count?: 'exact'; head?: boolean }) => SupabaseQueryLike;
  insert: (values: Record<string, unknown> | Record<string, unknown>[]) => SupabaseQueryLike;
  update: (values: Record<string, unknown>) => SupabaseQueryLike;
  delete: () => SupabaseQueryLike;
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
  single: () => Promise<{ data: unknown; error: unknown }>;
};

type SupabaseQueryResult = {
  data?: unknown;
  error?: unknown;
  count?: number | null;
};

/**
 * Maps supported Mongo-style filters and CRUD calls to a host Supabase PostgREST client. The client and database policies own sessions, schema and authorization.
 * @remarks Supports restricted comparisons/$and and $ilike; $or is rejected. Related selections use PostgREST foreign-key syntax. QueryOptions.signal is not wired to cancellation. Replacement methods perform partial updates. Write methods named One do not add a one-row mutation limit; use uniquely identifying filters.
 * @example
 * ```ts
 * import { SupabaseAdapter } from '@alneas/appkit-core/data/supabase';
 * import type { SupabaseClient } from '@supabase/supabase-js';
 * export function connectSupabase(client: SupabaseClient) {
 *   return new SupabaseAdapter(client);
 * }
 * ```
 */
export class SupabaseAdapter implements DataAccessAdapter {
  protected client: SupabaseClient;

  /**
   * Stores the configured host client without making a request or validating schema.
   * @param client - Host-owned Supabase client with appropriate session and backend policies.
   * @example
   * ```ts
   * import { SupabaseAdapter } from '@alneas/appkit-core/data/supabase';
   * import type { SupabaseClient } from '@supabase/supabase-js';
   * export function connectSupabase(client: SupabaseClient) {
   *   return new SupabaseAdapter(client);
   * }
   * ```
   */
  constructor(client: SupabaseClient) {
    this.client = client;
  }

  /**
   * Applies the filter object to the Supabase query.
   */
  private applyFilter(
    query: SupabaseQueryLike,
    filter: Record<string, unknown>,
  ): SupabaseQueryLike {
    validateFilter(filter, [...comparisonOperators, '$ilike'], ['$and']);
    Object.entries(filter).forEach(([key, value]) => {
      if (key === '$and' && Array.isArray(value)) {
        // Supabase doesn't natively chain an .and() in the same way for top level array without string format.
        // However, chaining multiple .eq() / filters acts as an AND.
        // So we can just recursively apply each filter in the array.
        value.forEach((subFilter) => {
          if (typeof subFilter === 'object' && subFilter !== null) {
            query = this.applyFilter(query, subFilter as Record<string, unknown>);
          }
        });
        return;
      }
      if (key === '$or' && Array.isArray(value)) {
        // Fallback for $or: Not fully mapped to Supabase .or() string syntax yet,
        // but usually handled via PostgREST string: `or=(a.eq.1,b.eq.2)`
        // For simplicity, we log a warning for complex $or.
        throw new Error('Unsupported logical filter: $or');
      }

      // Convert null to SQL IS NULL (eq(key, null) does not work)
      if (value === null) {
        query = query.is(key, null);
        return;
      }

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Operator processing
        Object.entries(value).forEach(([op, opValue]) => {
          switch (op) {
            case '$gt':
              query = query.gt(key, opValue);
              break;
            case '$lt':
              query = query.lt(key, opValue);
              break;
            case '$gte':
              query = query.gte(key, opValue);
              break;
            case '$lte':
              query = query.lte(key, opValue);
              break;
            case '$eq':
              // Use IS NULL when null
              query = opValue === null ? query.is(key, null) : query.eq(key, opValue);
              break;
            case '$ne':
            case '$neq':
              // Use IS NOT NULL when null
              query = opValue === null ? query.not(key, 'is', 'null') : query.neq(key, opValue);
              break;
            case '$in':
              query = query.in(key, opValue as unknown[]);
              break;
            case '$nin':
              query = query.not(
                key,
                'in',
                `(${(opValue as unknown[]).map((v) => (typeof v === 'string' ? JSON.stringify(v) : v)).join(',')})`,
              );
              break;
            case '$ilike':
              query = query.ilike(key, opValue as string);
              break;
            case '$regex':
              query = query.ilike(key, `%${opValue}%`);
              break;
            default:
              throw new Error(`Unsupported filter operator: ${op}`);
          }
        });
      } else {
        // Simple equality
        query = query.eq(key, value);
      }
    });
    return query;
  }

  /**
   * Builds the Supabase select string from Projection and Populate options.
   */
  private buildSelect(options?: QueryOptions): string {
    if (!options?.projection && !options?.populate) return '*';

    const rootFields: string[] = [];
    const nestedFields: Record<string, string[]> = {};

    // Parse projection
    let projectionKeys: string[] = [];
    if (options?.projection) {
      if (Array.isArray(options.projection)) {
        projectionKeys = options.projection;
      } else {
        projectionKeys = Object.entries(options.projection)
          .filter(([, v]) => !!v)
          .map(([k]) => k);
      }
    }

    if (projectionKeys.length > 0) {
      projectionKeys.forEach((f) => {
        if (f.includes('.')) {
          const [alias, ...rest] = f.split('.');
          const subField = rest.join('.');
          if (!nestedFields[alias]) nestedFields[alias] = [];
          nestedFields[alias].push(subField);
        } else {
          rootFields.push(f);
        }
      });
    }

    const selections: string[] = [];

    if (projectionKeys.length === 0) {
      selections.push('*');
    } else if (rootFields.length > 0) {
      selections.push(rootFields.join(','));
    }

    // Parse populate
    if (options?.populate) {
      options.populate.forEach((p) => {
        const normalized = normalizePopulateOptions(p);
        const alias = normalized.as || normalized.collection;
        const explicitSubFields = nestedFields[alias];

        const subSelect =
          explicitSubFields && explicitSubFields.length > 0 ? explicitSubFields.join(',') : '*';

        selections.push(`${alias}:${normalized.collection}!${normalized.localRef}(${subSelect})`);
      });
    }

    return selections.join(',') || '*';
  }

  /**
   * Selects matching rows with optional projection/populate, top-level sorting and range controls.
   * @typeParam T - Expected response shape; defaults to unknown and is not runtime-validated.
   * @param collection - Table name accessible through the supplied client and its database policies.
   * @param filter - Supported comparisons/$and; $or is rejected. Empty filters impose no row restriction.
   * @param options - Projection/populate and, for find, sort/pagination requests. Related-field sort keys are skipped and signal is ignored.
   * @returns Response rows cast to T[]. Truthy skip without limit requests ten rows. paginateAll loops in pages of 1,000 only when limit is falsy and skip is undefined, stopping at a short page; server caps below 1,000 can stop early. Use a stable sort when paging, and account for concurrent writes.
   * @throws Rejects on unsupported filters and errors returned by the supplied client, including response-cardinality errors where single selection is requested. No wrapper retry or rollback is added.
   * @example
   * ```ts
   * import { SupabaseAdapter } from '@alneas/appkit-core/data/supabase';
   * export async function findTasks(adapter: SupabaseAdapter) {
   *   return adapter.find('tasks', { status: 'open' }, { limit: 20 });
   * }
   * ```
   */
  async find<T = unknown>(
    collection: string,
    filter?: Filter,
    options?: QueryOptions,
  ): Promise<T[]> {
    let query = this.client
      .from(collection)
      .select(this.buildSelect(options)) as unknown as SupabaseQueryLike;

    validateFilter(filter, [...comparisonOperators, '$ilike'], ['$and']);
    if (filter) {
      query = this.applyFilter(query, filter);
    }

    if (options?.sort) {
      Object.entries(options.sort).forEach(([key, value]) => {
        if (key.includes('.')) return; // Sorting by related table columns has limitations
        query = query.order(key, { ascending: value === 1 });
      });
    }

    // Only when options.paginateAll is explicitly true, fetch all data via auto-pagination
    if (options?.paginateAll && !options?.limit && options?.skip === undefined) {
      let allData: T[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const pageQuery = query.range(from, from + pageSize - 1);
        const { data, error } = await (pageQuery as unknown as Promise<SupabaseQueryResult>);
        if (error) throw error;
        const pageData = data as T[];
        allData = allData.concat(pageData);
        if (pageData.length < pageSize) {
          hasMore = false;
        } else {
          from += pageSize;
        }
      }
      return allData as T[];
    }

    // Otherwise execute regular query (apply limit/skip if specified)
    if (options?.limit || options?.skip) {
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.skip) {
        query = query.range(options.skip, options.skip + (options.limit || 10) - 1);
      }
    }
    const { data, error } = await (query as unknown as Promise<SupabaseQueryResult>);
    if (error) throw error;
    return data as T[];
  }

  /**
   * Emulates a limited subset of aggregation stages with PostgREST queries.
   * @typeParam T - Expected response shape; defaults to unknown and is not runtime-validated.
   * @param collection - Table name accessible through the supplied client and its database policies.
   * @param pipeline - Limited PostgREST-compatible stage objects; only each object's first key is interpreted.
   * @param options - Projection/populate used for select. Other controls come from supported pipeline stages.
   * @returns Rows, or [{ count: number }] when any $count stage exists. Supports first-key $match/$sort/$skip/$limit/$count only; unsupported stages warn and are skipped. Count ignores sorting/pagination and always uses key count. A positive skip without limit requests an inclusive range of 1,001 rows; no later pages are fetched.
   * @throws Rejects on unsupported filters and errors returned by the supplied client, including response-cardinality errors where single selection is requested. No wrapper retry or rollback is added.
   * @example
   * ```ts
   * import { SupabaseAdapter } from '@alneas/appkit-core/data/supabase';
   * export async function aggregateTasks(adapter: SupabaseAdapter) {
   *   return adapter.aggregate('tasks', [{ $match: { status: 'open' } }, { $limit: 20 }]);
   * }
   * ```
   */
  async aggregate<T = unknown>(
    collection: string,
    pipeline: Array<Record<string, unknown>>,
    options?: QueryOptions,
  ): Promise<T[]> {
    let query = this.client
      .from(collection)
      .select(this.buildSelect(options)) as unknown as SupabaseQueryLike;
    let isCount = false;
    let skip = 0;
    let limit = 0;

    for (const stage of pipeline) {
      const op = Object.keys(stage)[0];
      const value = stage[op];

      switch (op) {
        case '$match':
          if (value && typeof value === 'object') {
            query = this.applyFilter(query, value as Record<string, unknown>);
          }
          break;
        case '$sort':
          Object.entries(value as Record<string, number>).forEach(([k, v]) => {
            if (k.includes('.')) return;
            query = query.order(k, { ascending: v === 1 });
          });
          break;
        case '$skip':
          skip = value as number;
          break;
        case '$limit':
          limit = value as number;
          break;
        case '$count':
          isCount = true;
          break;
        default:
          console.warn(`SupabaseAdapter: Unsupported aggregate stage ${op}`);
      }
    }

    if (isCount) {
      let countQuery = this.client
        .from(collection)
        .select('*', { count: 'exact', head: true }) as unknown as SupabaseQueryLike;
      for (const stage of pipeline) {
        if (stage.$match && typeof stage.$match === 'object') {
          countQuery = this.applyFilter(countQuery, stage.$match as Record<string, unknown>);
        }
      }
      const { count, error } = await (countQuery as unknown as Promise<SupabaseQueryResult>);
      if (error) throw error;
      return [{ count: count || 0 }] as unknown as T[];
    }

    if (limit > 0) {
      query = query.range(skip, skip + limit - 1);
    } else if (skip > 0) {
      query = query.range(skip, skip + 1000);
    }

    const { data, error } = await (query as unknown as Promise<SupabaseQueryResult>);
    if (error) throw error;
    return data as T[];
  }

  /**
   * Selects a row by id using maybeSingle.
   * @typeParam T - Expected response shape; defaults to unknown and is not runtime-validated.
   * @param collection - Table name accessible through the supplied client and its database policies.
   * @param id - String compared with the id column; uniqueness belongs to the database schema.
   * @param options - Projection/populate and, for find, sort/pagination requests. Related-field sort keys are skipped and signal is ignored.
   * @returns A row or null; multiple rows and other Supabase errors reject. Projection/populate apply, while sorting/pagination options do not.
   * @throws Rejects on unsupported filters and errors returned by the supplied client, including response-cardinality errors where single selection is requested. No wrapper retry or rollback is added.
   * @example
   * ```ts
   * import { SupabaseAdapter } from '@alneas/appkit-core/data/supabase';
   * export async function findOneTasks(adapter: SupabaseAdapter) {
   *   return adapter.findOne('tasks', 'task-1');
   * }
   * ```
   */
  async findOne<T = unknown>(
    collection: string,
    id: string,
    options?: QueryOptions,
  ): Promise<T | null> {
    let query = this.client
      .from(collection)
      .select(this.buildSelect(options)) as unknown as SupabaseQueryLike;
    query = query.eq('id', id);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data as T;
  }

  /**
   * Normalizes values, inserts one row and requests a single returned record.
   * @typeParam T - Expected response shape; defaults to unknown and is not runtime-validated.
   * @param collection - Table name accessible through the supplied client and its database policies.
   * @param data - Input record values or batch rows; see this method's normalization behavior.
   * @param _options - Accepted for interface compatibility and ignored.
   * @returns The response cast to T. Top-level empty strings become null, $unset keys become null, and $inc is warned about and removed; other operators are not generally translated.
   * @throws Rejects on unsupported filters and errors returned by the supplied client, including response-cardinality errors where single selection is requested. No wrapper retry or rollback is added.
   * @example
   * ```ts
   * import { SupabaseAdapter } from '@alneas/appkit-core/data/supabase';
   * export async function createTasks(adapter: SupabaseAdapter) {
   *   return adapter.create('tasks', { title: 'Draft' });
   * }
   * ```
   */
  async create<T = unknown>(
    collection: string,
    data: Record<string, unknown>,
    _options?: QueryOptions,
  ): Promise<T> {
    const normalizedData = this.normalizeUpdateData(data);
    const { data: created, error } = await (
      this.client.from(collection) as unknown as SupabaseQueryLike
    )
      .insert(normalizedData)
      .select()
      .single();
    if (error) throw error;
    return created as T;
  }

  /**
   * Normalizes update data for Supabase/SQL (e.g. converting operators).
   */
  private normalizeUpdateData(data: Record<string, unknown>): Record<string, unknown> {
    const normalized = { ...data };

    if (normalized.$unset) {
      const unset = normalized.$unset as Record<string, unknown>;
      Object.keys(unset).forEach((key) => {
        normalized[key] = null;
      });
      delete normalized.$unset;
    }

    if (normalized.$inc) {
      console.warn(
        'SupabaseAdapter: $inc operator is not supported in standard REST updates. Use an RPC function or read-modify-write manually.',
      );
      delete normalized.$inc;
    }

    for (const key of Object.keys(normalized)) {
      if (normalized[key] === '') {
        normalized[key] = null;
      }
    }

    return normalized;
  }

  /**
   * Normalizes values and partially updates rows matching id, selecting a single response.
   * @typeParam T - Expected response shape; defaults to unknown and is not runtime-validated.
   * @param collection - Table name accessible through the supplied client and its database policies.
   * @param id - String compared with the id column; uniqueness belongs to the database schema.
   * @param data - Input record values or batch rows; see this method's normalization behavior.
   * @param _options - Accepted for interface compatibility and ignored.
   * @returns The response cast to T; missing/multiple-row errors propagate. Top-level empty strings become null, $unset keys become null, and $inc is warned about and removed; other operators are not generally translated.
   * @throws Rejects on unsupported filters and errors returned by the supplied client, including response-cardinality errors where single selection is requested. No wrapper retry or rollback is added.
   * @example
   * ```ts
   * import { SupabaseAdapter } from '@alneas/appkit-core/data/supabase';
   * export async function updateTasks(adapter: SupabaseAdapter) {
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
    const normalizedData = this.normalizeUpdateData(data);
    const { data: updated, error } = await (
      this.client.from(collection) as unknown as SupabaseQueryLike
    )
      .update(normalizedData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return updated as T;
  }

  /**
   * Partially updates rows matching id, retaining omitted columns.
   * @typeParam T - Expected response shape; defaults to unknown and is not runtime-validated.
   * @param collection - Table name accessible through the supplied client and its database policies.
   * @param id - String compared with the id column; uniqueness belongs to the database schema.
   * @param data - Input record values or batch rows; see this method's normalization behavior.
   * @param _options - Accepted for interface compatibility and ignored.
   * @returns The same normalized partial-update response as update; this does not clear unspecified columns. Top-level empty strings become null, $unset keys become null, and $inc is warned about and removed; other operators are not generally translated.
   * @throws Rejects on unsupported filters and errors returned by the supplied client, including response-cardinality errors where single selection is requested. No wrapper retry or rollback is added.
   * @example
   * ```ts
   * import { SupabaseAdapter } from '@alneas/appkit-core/data/supabase';
   * export async function replaceTasks(adapter: SupabaseAdapter) {
   *   return adapter.replace('tasks', 'task-1', { title: 'Reviewed' });
   * }
   * ```
   */
  async replace<T = unknown>(
    collection: string,
    id: string,
    data: Record<string, unknown>,
    _options?: QueryOptions,
  ): Promise<T> {
    const normalizedData = this.normalizeUpdateData(data);
    const { data: replaced, error } = await (
      this.client.from(collection) as unknown as SupabaseQueryLike
    )
      .update(normalizedData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return replaced as T;
  }

  /**
   * Deletes rows matching id and requests a single returned record.
   * @typeParam T - Expected response shape; defaults to unknown and is not runtime-validated.
   * @param collection - Table name accessible through the supplied client and its database policies.
   * @param id - String compared with the id column; uniqueness belongs to the database schema.
   * @param _options - Accepted for interface compatibility and ignored.
   * @returns The deleted response cast to T; missing/multiple-row errors propagate.
   * @throws Rejects on unsupported filters and errors returned by the supplied client, including response-cardinality errors where single selection is requested. No wrapper retry or rollback is added.
   * @example
   * ```ts
   * import { SupabaseAdapter } from '@alneas/appkit-core/data/supabase';
   * export async function deleteTasks(adapter: SupabaseAdapter) {
   *   return adapter.delete('tasks', 'task-1');
   * }
   * ```
   */
  async delete<T = unknown>(collection: string, id: string, _options?: QueryOptions): Promise<T> {
    const { data: deleted, error } = await (
      this.client.from(collection) as unknown as SupabaseQueryLike
    )
      .delete()
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return deleted as T;
  }

  /**
   * Requests an exact count using a head-only selection.
   * @param collection - Table name accessible through the supplied client and its database policies.
   * @param filter - Supported comparisons/$and; $or is rejected. Empty filters impose no row restriction.
   * @param _options - Accepted for interface compatibility and ignored.
   * @returns The reported count or zero when absent/falsy; no rows are returned.
   * @throws Rejects on unsupported filters and errors returned by the supplied client, including response-cardinality errors where single selection is requested. No wrapper retry or rollback is added.
   * @example
   * ```ts
   * import { SupabaseAdapter } from '@alneas/appkit-core/data/supabase';
   * export async function countTasks(adapter: SupabaseAdapter) {
   *   return adapter.count('tasks', { status: 'open' });
   * }
   * ```
   */
  async count(collection: string, filter?: Filter, _options?: QueryOptions): Promise<number> {
    let query = this.client
      .from(collection)
      .select('*', { count: 'exact', head: true }) as unknown as SupabaseQueryLike;
    validateFilter(filter, [...comparisonOperators, '$ilike'], ['$and']);
    if (filter) {
      query = this.applyFilter(query, filter);
    }
    const { count, error } = await (query as unknown as Promise<SupabaseQueryResult>);
    if (error) throw error;
    return count || 0;
  }

  /**
   * Inserts the batch unchanged and selects returned rows.
   * @typeParam T - Expected response shape; defaults to unknown and is not runtime-validated.
   * @param collection - Table name accessible through the supplied client and its database policies.
   * @param data - Input record values or batch rows; see this method's normalization behavior.
   * @param _options - Accepted for interface compatibility and ignored.
   * @returns Response rows cast to T[]. Unlike create, this method does not normalize empty strings, $unset or $inc.
   * @throws Rejects on unsupported filters and errors returned by the supplied client, including response-cardinality errors where single selection is requested. No wrapper retry or rollback is added.
   * @example
   * ```ts
   * import { SupabaseAdapter } from '@alneas/appkit-core/data/supabase';
   * export async function createManyTasks(adapter: SupabaseAdapter) {
   *   return adapter.createMany('tasks', [{ title: 'Draft' }]);
   * }
   * ```
   */
  async createMany<T = unknown>(
    collection: string,
    data: Record<string, unknown>[],
    _options?: QueryOptions,
  ): Promise<T[]> {
    const query = (this.client.from(collection) as unknown as SupabaseQueryLike)
      .insert(data)
      .select();
    const { data: created, error } = await (query as unknown as Promise<SupabaseQueryResult>);
    if (error) throw error;
    return created as T[];
  }

  /**
   * Normalizes data and updates every row matching the supported filter.
   * @typeParam T - Expected response shape; defaults to unknown and is not runtime-validated.
   * @param collection - Table name accessible through the supplied client and its database policies.
   * @param filter - Supported comparisons/$and; $or is rejected. Empty filters impose no row restriction.
   * @param data - Input record values or batch rows; see this method's normalization behavior.
   * @param _options - Accepted for interface compatibility and ignored.
   * @returns Response rows cast to T[]; empty filters can update all visible rows. Top-level empty strings become null, $unset keys become null, and $inc is warned about and removed; other operators are not generally translated.
   * @throws Rejects on unsupported filters and errors returned by the supplied client, including response-cardinality errors where single selection is requested. No wrapper retry or rollback is added.
   * @example
   * ```ts
   * import { SupabaseAdapter } from '@alneas/appkit-core/data/supabase';
   * export async function updateManyTasks(adapter: SupabaseAdapter) {
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
    const normalizedData = this.normalizeUpdateData(data);
    let query = (this.client.from(collection) as unknown as SupabaseQueryLike).update(
      normalizedData,
    );
    validateFilter(filter, [...comparisonOperators, '$ilike'], ['$and']);
    if (filter) {
      query = this.applyFilter(query, filter);
    }
    const { data: updated, error } =
      await (query.select() as unknown as Promise<SupabaseQueryResult>);
    if (error) throw error;
    return updated as T[];
  }

  /**
   * Deletes every row matching the supported filter and selects deleted rows.
   * @typeParam T - Expected response shape; defaults to unknown and is not runtime-validated.
   * @param collection - Table name accessible through the supplied client and its database policies.
   * @param filter - Supported comparisons/$and; $or is rejected. Empty filters impose no row restriction.
   * @param _options - Accepted for interface compatibility and ignored.
   * @returns Response rows cast to T[]; empty filters can delete all visible rows.
   * @throws Rejects on unsupported filters and errors returned by the supplied client, including response-cardinality errors where single selection is requested. No wrapper retry or rollback is added.
   * @example
   * ```ts
   * import { SupabaseAdapter } from '@alneas/appkit-core/data/supabase';
   * export async function deleteManyTasks(adapter: SupabaseAdapter) {
   *   return adapter.deleteMany('tasks', { status: 'archived' });
   * }
   * ```
   */
  async deleteMany<T = unknown>(
    collection: string,
    filter: Filter,
    _options?: QueryOptions,
  ): Promise<T[]> {
    let query = (this.client.from(collection) as unknown as SupabaseQueryLike).delete();
    validateFilter(filter, [...comparisonOperators, '$ilike'], ['$and']);
    if (filter) {
      query = this.applyFilter(query, filter);
    }
    const { data: deleted, error } =
      await (query.select() as unknown as Promise<SupabaseQueryResult>);
    if (error) throw error;
    return deleted as T[];
  }

  // --- Explicit Mongo-Style Operations ---

  /**
   * Inserts one row unchanged and derives OperationResult from a single selected response.
   * @param collection - Table name accessible through the supplied client and its database policies.
   * @param data - Input record values or batch rows; see this method's normalization behavior.
   * @returns acknowledged true and insertedId only when the returned id is a string. Other counts are absent; no create-style value normalization is applied.
   * @throws Rejects on unsupported filters and errors returned by the supplied client, including response-cardinality errors where single selection is requested. No wrapper retry or rollback is added.
   * @example
   * ```ts
   * import { SupabaseAdapter } from '@alneas/appkit-core/data/supabase';
   * export async function insertOneTasks(adapter: SupabaseAdapter) {
   *   return adapter.insertOne('tasks', { title: 'Draft' });
   * }
   * ```
   */
  async insertOne(collection: string, data: Record<string, unknown>): Promise<OperationResult> {
    const { data: created, error } = await (
      this.client.from(collection) as unknown as SupabaseQueryLike
    )
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    const createdRecord = created as Record<string, unknown> | null;
    return {
      acknowledged: true,
      insertedId: typeof createdRecord?.id === 'string' ? createdRecord.id : undefined,
    };
  }

  /**
   * Normalizes data and updates all matching rows, without imposing a one-row limit.
   * @param collection - Table name accessible through the supplied client and its database policies.
   * @param filter - Supported comparisons/$and; $or is rejected. Empty filters impose no row restriction.
   * @param data - Input record values or batch rows; see this method's normalization behavior.
   * @returns acknowledged true with matchedCount and modifiedCount both set to the reported exact count or zero. These do not distinguish rows whose stored values actually changed. Top-level empty strings become null, $unset keys become null, and $inc is warned about and removed; other operators are not generally translated.
   * @throws Rejects on unsupported filters and errors returned by the supplied client, including response-cardinality errors where single selection is requested. No wrapper retry or rollback is added.
   * @example
   * ```ts
   * import { SupabaseAdapter } from '@alneas/appkit-core/data/supabase';
   * export async function updateOneTasks(adapter: SupabaseAdapter) {
   *   return adapter.updateOne('tasks', { id: 'task-1' }, { title: 'Reviewed' });
   * }
   * ```
   */
  async updateOne(
    collection: string,
    filter: Filter,
    data: Record<string, unknown>,
  ): Promise<OperationResult> {
    const normalizedData = this.normalizeUpdateData(data);
    let query = (this.client.from(collection) as unknown as SupabaseQueryLike).update(
      normalizedData,
    );
    validateFilter(filter, [...comparisonOperators, '$ilike'], ['$and']);
    if (filter) {
      query = this.applyFilter(query, filter);
    }

    const countQuery = query as unknown as {
      select: (
        columns: string,
        options: { count: 'exact'; head: true },
      ) => Promise<{
        count: number | null;
        error: Error | null;
      }>;
    };
    const { count, error } = await countQuery.select('*', { count: 'exact', head: true });
    if (error) throw error;
    return {
      acknowledged: true,
      matchedCount: count || 0,
      modifiedCount: count || 0,
    };
  }

  /**
   * Applies an update through updateOne; omitted columns are retained.
   *
   * @param collection - Supabase table name accessible to the supplied client.
   * @param filter - Supported comparison/AND filters; this method does not add an ID filter.
   * @param data - Fields to update, normalized like updateOne (not a full replacement).
   * @returns Acknowledged result whose matchedCount and modifiedCount are the returned exact count, or zero when absent.
   * @throws Rejects for unsupported filters and propagated Supabase errors.
   * @remarks Despite its name, this method delegates to updateOne. It does not
   * clear omitted columns or add a one-row limit; narrow the filter explicitly.
   * The supplied client and backend policies determine authorization.
   * @example
   * ```typescript
   * import type { SupabaseAdapter } from '@alneas/appkit-core/data/supabase';
   *
   * export async function renameUser(adapter: SupabaseAdapter, id: string) {
   *   return adapter.replaceOne('users', { id }, { name: 'New name' });
   * }
   * ```
   */
  async replaceOne(
    collection: string,
    filter: Filter,
    data: Record<string, unknown>,
  ): Promise<OperationResult> {
    return this.updateOne(collection, filter, data);
  }

  /**
   * Deletes all matching rows, without imposing a one-row limit.
   * @param collection - Table name accessible through the supplied client and its database policies.
   * @param filter - Supported comparisons/$and; $or is rejected. Empty filters impose no row restriction.
   * @returns acknowledged true and deletedCount from the reported exact count or zero.
   * @throws Rejects on unsupported filters and errors returned by the supplied client, including response-cardinality errors where single selection is requested. No wrapper retry or rollback is added.
   * @example
   * ```ts
   * import { SupabaseAdapter } from '@alneas/appkit-core/data/supabase';
   * export async function deleteOneTasks(adapter: SupabaseAdapter) {
   *   return adapter.deleteOne('tasks', { id: 'task-1' });
   * }
   * ```
   */
  async deleteOne(collection: string, filter: Filter): Promise<OperationResult> {
    let query = (this.client.from(collection) as unknown as SupabaseQueryLike).delete();
    validateFilter(filter, [...comparisonOperators, '$ilike'], ['$and']);
    if (filter) {
      query = this.applyFilter(query, filter);
    }

    const countQuery = query as unknown as {
      select: (
        columns: string,
        options: { count: 'exact'; head: true },
      ) => Promise<{
        count: number | null;
        error: Error | null;
      }>;
    };
    const { count, error } = await countQuery.select('*', { count: 'exact', head: true });
    if (error) throw error;
    return {
      acknowledged: true,
      deletedCount: count || 0,
    };
  }

  /**
   * Normalizes data, updates matching rows and requests a single selected response.
   * @typeParam T - Expected response shape; defaults to unknown and is not runtime-validated.
   * @param collection - Table name accessible through the supplied client and its database policies.
   * @param filter - Supported comparisons/$and; $or is rejected. Empty filters impose no row restriction.
   * @param data - Input record values or batch rows; see this method's normalization behavior.
   * @returns The selected response cast to T, or null if returned without an error. Absence is not normalized to null; single-row errors propagate. There is no one-row mutation limit, and a response-selection error does not establish rollback. Top-level empty strings become null, $unset keys become null, and $inc is warned about and removed; other operators are not generally translated.
   * @throws Rejects on unsupported filters and errors returned by the supplied client, including response-cardinality errors where single selection is requested. No wrapper retry or rollback is added.
   * @example
   * ```ts
   * import { SupabaseAdapter } from '@alneas/appkit-core/data/supabase';
   * export async function findOneAndUpdateTasks(adapter: SupabaseAdapter) {
   *   return adapter.findOneAndUpdate('tasks', { id: 'task-1' }, { title: 'Reviewed' });
   * }
   * ```
   */
  async findOneAndUpdate<T = unknown>(
    collection: string,
    filter: Filter,
    data: Record<string, unknown>,
  ): Promise<T | null> {
    const normalizedData = this.normalizeUpdateData(data);
    let query = (this.client.from(collection) as unknown as SupabaseQueryLike).update(
      normalizedData,
    );
    validateFilter(filter, [...comparisonOperators, '$ilike'], ['$and']);
    if (filter) {
      query = this.applyFilter(query, filter);
    }
    const { data: updated, error } = await query.select().single();
    if (error) throw error;
    return updated as T;
  }

  /**
   * Updates supplied fields and returns the selected row, retaining omitted columns.
   *
   * @typeParam T - Expected returned row shape; the adapter casts the response without runtime validation.
   * @param collection - Supabase table name accessible to the supplied client.
   * @param filter - Supported comparison/AND filters identifying the intended row.
   * @param data - Partial field values: empty strings and $unset keys become null;
   * $inc is warned about and removed rather than applied.
   * @returns The selected response cast to T (or null if returned without an error).
   * @throws Rejects for unsupported filters and errors returned by Supabase,
   * including single-row selection errors; absence is not converted to null.
   * @remarks
   * This method delegates to findOneAndUpdate and is not a whole-record replacement.
   * It issues update(...).select().single() without a one-row mutation limit;
   * choose a uniquely identifying filter. A single-row response error does not
   * by itself establish whether the database mutation was rolled back.
   * The host must supply a configured adapter/client and enforce access policies.
   * @example
   * ```typescript
   * import type { SupabaseAdapter } from '@alneas/appkit-core/data/supabase';
   *
   * type User = { id: string; name: string; email: string };
   * export async function renameUser(adapter: SupabaseAdapter, id: string) {
   *   // Only name is supplied; the existing email column is retained.
   *   return adapter.findOneAndReplace<User>('users', { id }, { name: 'New name' });
   * }
   * ```
   */
  async findOneAndReplace<T = unknown>(
    collection: string,
    filter: Filter,
    data: Record<string, unknown>,
  ): Promise<T | null> {
    return this.findOneAndUpdate<T>(collection, filter, data);
  }

  /**
   * Deletes matching rows and requests a single selected response.
   * @typeParam T - Expected response shape; defaults to unknown and is not runtime-validated.
   * @param collection - Table name accessible through the supplied client and its database policies.
   * @param filter - Supported comparisons/$and; $or is rejected. Empty filters impose no row restriction.
   * @returns The selected deleted response cast to T, or null if returned without an error. There is no one-row mutation limit; absence and multiple-row errors propagate rather than being normalized to null, and selection errors do not establish rollback.
   * @throws Rejects on unsupported filters and errors returned by the supplied client, including response-cardinality errors where single selection is requested. No wrapper retry or rollback is added.
   * @example
   * ```ts
   * import { SupabaseAdapter } from '@alneas/appkit-core/data/supabase';
   * export async function findOneAndDeleteTasks(adapter: SupabaseAdapter) {
   *   return adapter.findOneAndDelete('tasks', { id: 'task-1' });
   * }
   * ```
   */
  async findOneAndDelete<T = unknown>(collection: string, filter: Filter): Promise<T | null> {
    let query = (this.client.from(collection) as unknown as SupabaseQueryLike).delete();
    validateFilter(filter, [...comparisonOperators, '$ilike'], ['$and']);
    if (filter) {
      query = this.applyFilter(query, filter);
    }
    const { data: deleted, error } = await query.select().single();
    if (error) throw error;
    return deleted as T;
  }
}
