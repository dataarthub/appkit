import type { FetchLike } from './types';
import {
  DataAccessAdapter,
  OperationResult,
  QueryOptions,
  Filter,
  normalizePopulateOptions,
} from './types';

/**
 * Configuration for MongoDB API adapter.
 */
export interface MongoApiConfig {
  /** Connection base URL */
  baseUrl: string;
  /** Optional function to retrieve authentication token */
  getToken?: () => Promise<string>;
  /** Optional custom fetch implementation */
  fetch?: FetchLike;
}

/**
 * DataAccess adapter performing data operations via MongoDB API.
 *
 * Communicates with server-side MongoDB Client, supporting standard MongoDB queries,
 * aggregation pipelines, and joins via populate.
 */
export class MongoApiAdapter implements DataAccessAdapter {
  private config: MongoApiConfig;

  /**
   * Creates a new instance of MongoApiAdapter.
   * @param config Configuration for MongoDB API adapter
   */
  constructor(config: MongoApiConfig) {
    this.config = config;
  }

  /**
   * Sends a request to the server-side MongoDB API.
   */
  private async request<T>(opBody: Record<string, unknown>): Promise<T> {
    const fetchFn = this.config.fetch || fetch;
    const token = this.config.getToken ? await this.config.getToken() : null;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetchFn(this.config.baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(['mongo/client', opBody]),
    });

    if (!response.ok) {
      throw new Error(`Mongo API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Prepares update data in MongoDB operator format.
   * Wraps with $set automatically if no operator starting with $ is present.
   */
  private prepareUpdate(data: Record<string, unknown>): Record<string, unknown> {
    const hasAtomic = Object.keys(data).some((k) => k.startsWith('$'));
    return hasAtomic ? data : { $set: data };
  }

  /**
   * Searches for multiple records. Automatically switches to aggregation pipeline if populate is specified.
   */
  async find<T = unknown>(
    collection: string,
    filter?: Filter,
    options?: QueryOptions,
  ): Promise<T[]> {
    // Resolve projection
    let projection: Record<string, unknown> = {};
    if (options?.projection) {
      if (Array.isArray(options.projection)) {
        options.projection.forEach((f) => (projection[f] = 1));
      } else {
        projection = options.projection;
      }
    }
    const hasProjection = Object.keys(projection).length > 0;

    if (options?.populate && options.populate.length > 0) {
      const pipeline: unknown[] = [];

      // Normalize populate options and identify aliases
      const normalizedPopulate = options.populate.map(normalizePopulateOptions);
      const populateAliases = normalizedPopulate.map((p) => p.as);

      // Split Filter
      const localFilter: Filter = {};
      const joinedFilter: Filter = {};

      if (filter) {
        Object.entries(filter).forEach(([key, value]) => {
          const root = key.split('.')[0];
          if (populateAliases.includes(root)) {
            joinedFilter[key] = value;
          } else {
            localFilter[key] = value;
          }
        });
      }

      // 1. Match (Local)
      if (Object.keys(localFilter).length > 0) {
        pipeline.push({ $match: localFilter });
      }

      // 2. Lookup & Unwind
      normalizedPopulate.forEach((p) => {
        pipeline.push({
          $lookup: {
            from: p.collection,
            localField: p.localRef,
            foreignField: p.foreignRef,
            as: p.as,
          },
        });
        if (p.unwind) {
          pipeline.push({
            $unwind: {
              path: `$${p.as}`,
              preserveNullAndEmptyArrays: true,
            },
          });
        }
      });

      // 3. Match (Joined)
      if (Object.keys(joinedFilter).length > 0) {
        pipeline.push({ $match: joinedFilter });
      }

      // 4. Sort
      if (options.sort && Object.keys(options.sort).length > 0) {
        pipeline.push({ $sort: options.sort });
      }

      // 5. Skip
      if (options.skip) {
        pipeline.push({ $skip: options.skip });
      }

      // 6. Limit
      if (options.limit) {
        pipeline.push({ $limit: options.limit });
      }

      // 7. Project
      if (hasProjection) {
        const projectStage: Record<string, number> = {};
        Object.keys(projection).forEach((k) => (projectStage[k] = projection[k] as number));

        normalizedPopulate.forEach((p) => {
          const hasExplicitNested = Object.keys(projection).some((k) => k.startsWith(`${p.as}.`));
          if (!hasExplicitNested) {
            projectStage[p.as] = 1;
          }
        });
        pipeline.push({ $project: projectStage });
      }

      return this.aggregate<T>(collection, pipeline, options);
    }

    // Standard find
    const findOptions: Record<string, unknown> = {};
    if (options?.sort) findOptions.sort = options.sort;
    if (options?.limit) findOptions.limit = options.limit;
    if (options?.skip) findOptions.skip = options.skip;
    if (hasProjection) findOptions.projection = projection;

    return this.request<T[]>({
      collection,
      find: {
        filter: filter || {},
        options: findOptions,
      },
    });
  }

  /**
   * Searches for a single record by ID.
   */
  async findOne<T = unknown>(
    collection: string,
    id: string,
    options?: QueryOptions,
  ): Promise<T | null> {
    return this.request<T | null>({
      collection,
      findOne: {
        filter: { _id: id },
        options,
      },
    });
  }

  /**
   * Creates a new record.
   */
  async create<T = unknown>(
    collection: string,
    data: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<T> {
    return this.request<T>({
      collection,
      insertOne: { doc: data, options },
    });
  }

  /**
   * Updates a record and returns the updated document.
   */
  async update<T = unknown>(
    collection: string,
    id: string,
    data: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<T> {
    return this.request<T>({
      collection,
      findOneAndUpdate: {
        filter: { _id: id },
        update: this.prepareUpdate(data),
        options: { returnDocument: 'after', ...options },
      },
    });
  }

  /**
   * Replaces a record.
   */
  async replace<T = unknown>(
    collection: string,
    id: string,
    data: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<T> {
    return this.request<T>({
      collection,
      replaceOne: {
        filter: { _id: id },
        replacement: data,
        options,
      },
    });
  }

  /**
   * Deletes a record and returns the deleted document.
   */
  async delete<T = unknown>(collection: string, id: string, options?: QueryOptions): Promise<T> {
    return this.request<T>({
      collection,
      findOneAndDelete: {
        filter: { _id: id },
        options,
      },
    });
  }

  /**
   * Counts the number of records.
   */
  async count(collection: string, filter?: Filter, options?: QueryOptions): Promise<number> {
    const result = await this.request<{ count: number }>({
      collection,
      countDocuments: {
        filter: filter || {},
        options,
      },
    });
    return result.count;
  }

  /**
   * Bulk creates multiple records.
   */
  async createMany<T = unknown>(
    collection: string,
    data: Record<string, unknown>[],
    options?: QueryOptions,
  ): Promise<T[]> {
    return this.request<T[]>({
      collection,
      insertMany: { docs: data, options },
    });
  }

  /**
   * Bulk updates multiple records.
   */
  async updateMany<T = unknown>(
    collection: string,
    filter: Filter,
    data: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<T[]> {
    return this.request<T[]>({
      collection,
      updateMany: {
        filter,
        update: this.prepareUpdate(data),
        options,
      },
    });
  }

  /**
   * Bulk deletes multiple records.
   */
  async deleteMany<T = unknown>(
    collection: string,
    filter: Filter,
    options?: QueryOptions,
  ): Promise<T[]> {
    return this.request<T[]>({
      collection,
      deleteMany: { filter, options },
    });
  }

  // --- Explicit Mongo-Style Operations ---

  /**
   * Executes a single insert.
   */
  async insertOne(
    collection: string,
    data: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<OperationResult> {
    return this.request<OperationResult>({
      collection,
      insertOne: { doc: data, options },
    });
  }

  /**
   * Executes a single update.
   */
  async updateOne(
    collection: string,
    filter: Filter,
    data: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<OperationResult> {
    return this.request<OperationResult>({
      collection,
      updateOne: {
        filter,
        update: this.prepareUpdate(data),
        options,
      },
    });
  }

  /**
   * Executes a single replace.
   */
  async replaceOne(
    collection: string,
    filter: Filter,
    data: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<OperationResult> {
    return this.request<OperationResult>({
      collection,
      replaceOne: {
        filter,
        replacement: data,
        options,
      },
    });
  }

  /**
   * Executes a single delete.
   */
  async deleteOne(
    collection: string,
    filter: Filter,
    options?: QueryOptions,
  ): Promise<OperationResult> {
    return this.request<OperationResult>({
      collection,
      deleteOne: { filter, options },
    });
  }

  /**
   * Finds and updates a record atomically.
   */
  async findOneAndUpdate<T = unknown>(
    collection: string,
    filter: Filter,
    data: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<T | null> {
    return this.request<T | null>({
      collection,
      findOneAndUpdate: {
        filter,
        update: this.prepareUpdate(data),
        options: { returnDocument: 'after', ...options },
      },
    });
  }

  /**
   * Finds and replaces a record atomically.
   */
  async findOneAndReplace<T = unknown>(
    collection: string,
    filter: Filter,
    data: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<T | null> {
    return this.request<T | null>({
      collection,
      findOneAndReplace: {
        filter,
        replacement: data,
        options: { returnDocument: 'after', ...options },
      },
    });
  }

  /**
   * Finds and deletes a record atomically.
   */
  async findOneAndDelete<T = unknown>(
    collection: string,
    filter: Filter,
    options?: QueryOptions,
  ): Promise<T | null> {
    return this.request<T | null>({
      collection,
      findOneAndDelete: { filter, options },
    });
  }

  /**
   * Executes an aggregation pipeline.
   */
  async aggregate<T = unknown>(
    collection: string,
    pipeline: unknown[],
    options?: QueryOptions,
  ): Promise<T[]> {
    return this.request<T[]>({
      collection,
      aggregate: { pipeline, options },
    });
  }
}
