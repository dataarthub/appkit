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
 * DataAccess adapter performing data operations via Supabase (PostgREST).
 *
 * Converts MongoDB-style filter operators into Supabase query builder syntax.
 * Also supports joining related tables (Inner/Left Join) via populate.
 */
export class SupabaseAdapter implements DataAccessAdapter {
  protected client: SupabaseClient;

  /**
   * Creates a new instance of SupabaseAdapter.
   * @param client SupabaseClient instance
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
   * Searches for multiple records.
   * When options.paginateAll is specified, automatically executes repeated queries (auto-pagination)
   * to retrieve all records and bypass Supabase (PostgREST) default 1000-row limit.
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
   * Emulates an aggregation pipeline or executes a count operation.
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
   * Searches for a single record by ID.
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
   * Creates a new record.
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
   * Partially updates a record.
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
   * Replaces a record.
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
   * Deletes a record.
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
   * Counts the number of records matching the filter.
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
   * Bulk creates multiple records.
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
   * Bulk updates multiple records.
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
   * Bulk deletes multiple records.
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
   * Executes a single insert and returns an OperationResult.
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
   * Executes a single update and returns an OperationResult.
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
   * Executes a single replace.
   */
  async replaceOne(
    collection: string,
    filter: Filter,
    data: Record<string, unknown>,
  ): Promise<OperationResult> {
    return this.updateOne(collection, filter, data);
  }

  /**
   * Executes a single delete and returns an OperationResult.
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
   * Finds and updates a record atomically.
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
   * Finds and replaces a record atomically.
   */
  async findOneAndReplace<T = unknown>(
    collection: string,
    filter: Filter,
    data: Record<string, unknown>,
  ): Promise<T | null> {
    return this.findOneAndUpdate<T>(collection, filter, data);
  }

  /**
   * Finds and deletes a record atomically.
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
