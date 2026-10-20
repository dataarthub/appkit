import type { FetchLike } from './types';
import {
  DataAccessAdapter,
  OperationResult,
  QueryOptions,
  Filter,
  normalizePopulateOptions,
} from './types';

/**
 * Host API endpoint and optional authentication/transport for MongoApiAdapter. This is a custom HTTP protocol, not a direct MongoDB driver connection.
 * @see {@link MongoApiAdapter} for construction.
 */
export interface MongoApiConfig {
  /**
   * HTTP endpoint receiving POST JSON tuples of the form ["mongo/client", operation]. The host must implement this protocol and enforce authorization.
   */
  baseUrl: string;
  /**
   * Optional token supplier invoked before every request.
   * @returns A token added as Bearer authorization when truthy; an empty string omits that header. Rejections prevent the request.
   */
  getToken?: () => Promise<string>;
  /**
   * Optional host transport; defaults to global fetch when falsy. No cancellation signal or retry policy is added.
   */
  fetch?: FetchLike;
}

/**
 * Sends Mongo-style operations to a host-defined HTTP API. Every call POSTs ["mongo/client", operation] and trusts the parsed JSON result without validation or Extended JSON/ObjectId conversion. The host owns authentication, authorization, Mongo execution and response shapes.
 * @remarks QueryOptions.signal is not passed to fetch. Nested option values are JSON-serialized; nonserializable values are not normalized. Atomicity is a server property, not guaranteed by this transport wrapper.
 * @example
 * ```ts
 * import { MongoApiAdapter } from '@alneas/appkit-core/data/mongodb';
 * import type { MongoApiConfig } from '@alneas/appkit-core/data/mongodb';
 * export function connectMongoApi(config: MongoApiConfig) {
 *   return new MongoApiAdapter(config);
 * }
 * ```
 */
export class MongoApiAdapter implements DataAccessAdapter {
  private config: MongoApiConfig;

  /**
   * Stores the supplied configuration by reference without validating or contacting its endpoint.
   * @param config - Host endpoint implementing the documented tuple protocol, with optional token supplier and fetch.
   * @example
   * ```ts
   * import { MongoApiAdapter } from '@alneas/appkit-core/data/mongodb';
   * import type { MongoApiConfig } from '@alneas/appkit-core/data/mongodb';
   * export function connectMongoApi(config: MongoApiConfig) {
   *   return new MongoApiAdapter(config);
   * }
   * ```
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
   * Lists records, using a generated aggregation pipeline when populate is nonempty.
   * @typeParam T - Expected server result shape; defaults to unknown and is not runtime-validated.
   * @param collection - Collection name sent unchanged to the host API.
   * @param filter - Mongo-style filter serialized as JSON; empty filters may select every record.
   * @param options - Options serialized to the operation body, except find constructs its own supported option subset. signal does not cancel the HTTP request.
   * @returns Server JSON cast to T[]. Standard find forwards sort, truthy limit/skip and projection. Populate splits top-level filter keys by joined alias and adds lookup/unwind/sort/pagination/projection stages; it is not a general recursive filter rewrite.
   * @throws Rejects for token/transport/JSON failures or a non-OK HTTP response. Successful HTTP JSON is trusted even if it represents an application error.
   * @example
   * ```ts
   * import { MongoApiAdapter } from '@alneas/appkit-core/data/mongodb';
   * export async function findTasks(adapter: MongoApiAdapter) {
   *   return adapter.find('tasks', { status: 'open' }, { limit: 20 });
   * }
   * ```
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
   * Requests findOne with an _id equality filter.
   * @typeParam T - Expected server result shape; defaults to unknown and is not runtime-validated.
   * @param collection - Collection name sent unchanged to the host API.
   * @param id - String matched against _id; conversion belongs to the endpoint.
   * @param options - Options serialized to the operation body, except find constructs its own supported option subset. signal does not cancel the HTTP request.
   * @returns Server JSON cast to a record or null; id is sent as a string without ObjectId conversion.
   * @throws Rejects for token/transport/JSON failures or a non-OK HTTP response. Successful HTTP JSON is trusted even if it represents an application error.
   * @example
   * ```ts
   * import { MongoApiAdapter } from '@alneas/appkit-core/data/mongodb';
   * export async function findOneTasks(adapter: MongoApiAdapter) {
   *   return adapter.findOne('tasks', 'task-1');
   * }
   * ```
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
   * Sends insertOne with the input document unchanged.
   * @typeParam T - Expected server result shape; defaults to unknown and is not runtime-validated.
   * @param collection - Collection name sent unchanged to the host API.
   * @param data - Document(s) serialized as JSON; validation and persistence belong to the endpoint.
   * @param options - Options serialized to the operation body, except find constructs its own supported option subset. signal does not cancel the HTTP request.
   * @returns Server JSON cast to T. The endpoint must return a record for create even though insertOne expects operation metadata for the same wire operation.
   * @throws Rejects for token/transport/JSON failures or a non-OK HTTP response. Successful HTTP JSON is trusted even if it represents an application error.
   * @example
   * ```ts
   * import { MongoApiAdapter } from '@alneas/appkit-core/data/mongodb';
   * export async function createTasks(adapter: MongoApiAdapter) {
   *   return adapter.create('tasks', { title: 'Draft' });
   * }
   * ```
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
   * Sends findOneAndUpdate for a string _id.
   * @typeParam T - Expected server result shape; defaults to unknown and is not runtime-validated.
   * @param collection - Collection name sent unchanged to the host API.
   * @param id - String matched against _id; conversion belongs to the endpoint.
   * @param data - Document(s) serialized as JSON; validation and persistence belong to the endpoint.
   * @param options - Options serialized to the operation body, except find constructs its own supported option subset. signal does not cancel the HTTP request.
   * @returns Server JSON cast to T. returnDocument defaults to after but may be overridden by options. Data without any $-prefixed key is wrapped in $set; otherwise it is forwarded as an operator document.
   * @throws Rejects for token/transport/JSON failures or a non-OK HTTP response. Successful HTTP JSON is trusted even if it represents an application error.
   * @example
   * ```ts
   * import { MongoApiAdapter } from '@alneas/appkit-core/data/mongodb';
   * export async function updateTasks(adapter: MongoApiAdapter) {
   *   return adapter.update('tasks', 'task-1', { title: 'Reviewed' });
   * }
   * ```
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
   * Sends replaceOne for a string _id without wrapping data in $set.
   * @typeParam T - Expected server result shape; defaults to unknown and is not runtime-validated.
   * @param collection - Collection name sent unchanged to the host API.
   * @param id - String matched against _id; conversion belongs to the endpoint.
   * @param data - Document(s) serialized as JSON; validation and persistence belong to the endpoint.
   * @param options - Options serialized to the operation body, except find constructs its own supported option subset. signal does not cancel the HTTP request.
   * @returns Server JSON cast to T; this wrapper does not read back a replacement or normalize Mongo result metadata.
   * @throws Rejects for token/transport/JSON failures or a non-OK HTTP response. Successful HTTP JSON is trusted even if it represents an application error.
   * @example
   * ```ts
   * import { MongoApiAdapter } from '@alneas/appkit-core/data/mongodb';
   * export async function replaceTasks(adapter: MongoApiAdapter) {
   *   return adapter.replace('tasks', 'task-1', { title: 'Reviewed' });
   * }
   * ```
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
   * Sends findOneAndDelete for a string _id.
   * @typeParam T - Expected server result shape; defaults to unknown and is not runtime-validated.
   * @param collection - Collection name sent unchanged to the host API.
   * @param id - String matched against _id; conversion belongs to the endpoint.
   * @param options - Options serialized to the operation body, except find constructs its own supported option subset. signal does not cancel the HTTP request.
   * @returns Server JSON cast to T; missing-row and returned-document behavior are owned by the endpoint.
   * @throws Rejects for token/transport/JSON failures or a non-OK HTTP response. Successful HTTP JSON is trusted even if it represents an application error.
   * @example
   * ```ts
   * import { MongoApiAdapter } from '@alneas/appkit-core/data/mongodb';
   * export async function deleteTasks(adapter: MongoApiAdapter) {
   *   return adapter.delete('tasks', 'task-1');
   * }
   * ```
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
   * Requests countDocuments using the supplied filter or an empty filter.
   * @param collection - Collection name sent unchanged to the host API.
   * @param filter - Mongo-style filter serialized as JSON; empty filters may select every record.
   * @param options - Options serialized to the operation body, except find constructs its own supported option subset. signal does not cancel the HTTP request.
   * @returns The count property from server JSON, without numeric validation.
   * @throws Rejects for token/transport/JSON failures or a non-OK HTTP response. Successful HTTP JSON is trusted even if it represents an application error.
   * @example
   * ```ts
   * import { MongoApiAdapter } from '@alneas/appkit-core/data/mongodb';
   * export async function countTasks(adapter: MongoApiAdapter) {
   *   return adapter.count('tasks', { status: 'open' });
   * }
   * ```
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
   * Sends all input documents in one insertMany operation.
   * @typeParam T - Expected server result shape; defaults to unknown and is not runtime-validated.
   * @param collection - Collection name sent unchanged to the host API.
   * @param data - Document(s) serialized as JSON; validation and persistence belong to the endpoint.
   * @param options - Options serialized to the operation body, except find constructs its own supported option subset. signal does not cancel the HTTP request.
   * @returns Server JSON cast to T[]; no transaction, ordering or document reread is added.
   * @throws Rejects for token/transport/JSON failures or a non-OK HTTP response. Successful HTTP JSON is trusted even if it represents an application error.
   * @example
   * ```ts
   * import { MongoApiAdapter } from '@alneas/appkit-core/data/mongodb';
   * export async function createManyTasks(adapter: MongoApiAdapter) {
   *   return adapter.createMany('tasks', [{ title: 'Draft' }]);
   * }
   * ```
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
   * Sends updateMany with an operator document or an automatic $set wrapper.
   * @typeParam T - Expected server result shape; defaults to unknown and is not runtime-validated.
   * @param collection - Collection name sent unchanged to the host API.
   * @param filter - Mongo-style filter serialized as JSON; empty filters may select every record.
   * @param data - Document(s) serialized as JSON; validation and persistence belong to the endpoint.
   * @param options - Options serialized to the operation body, except find constructs its own supported option subset. signal does not cancel the HTTP request.
   * @returns Server JSON cast to T[]; this adapter does not convert standard Mongo update result metadata into rows.
   * @throws Rejects for token/transport/JSON failures or a non-OK HTTP response. Successful HTTP JSON is trusted even if it represents an application error.
   * @example
   * ```ts
   * import { MongoApiAdapter } from '@alneas/appkit-core/data/mongodb';
   * export async function updateManyTasks(adapter: MongoApiAdapter) {
   *   return adapter.updateMany('tasks', { status: 'open' }, { status: 'closed' });
   * }
   * ```
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
   * Sends deleteMany with the supplied filter.
   * @typeParam T - Expected server result shape; defaults to unknown and is not runtime-validated.
   * @param collection - Collection name sent unchanged to the host API.
   * @param filter - Mongo-style filter serialized as JSON; empty filters may select every record.
   * @param options - Options serialized to the operation body, except find constructs its own supported option subset. signal does not cancel the HTTP request.
   * @returns Server JSON cast to T[]; this adapter does not convert standard Mongo delete result metadata into rows.
   * @throws Rejects for token/transport/JSON failures or a non-OK HTTP response. Successful HTTP JSON is trusted even if it represents an application error.
   * @example
   * ```ts
   * import { MongoApiAdapter } from '@alneas/appkit-core/data/mongodb';
   * export async function deleteManyTasks(adapter: MongoApiAdapter) {
   *   return adapter.deleteMany('tasks', { status: 'archived' });
   * }
   * ```
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
   * Sends the same insertOne wire operation used by create.
   * @param collection - Collection name sent unchanged to the host API.
   * @param data - Document(s) serialized as JSON; validation and persistence belong to the endpoint.
   * @param options - Options serialized to the operation body, except find constructs its own supported option subset. signal does not cancel the HTTP request.
   * @returns Server JSON cast to OperationResult without normalization; the host must provide the expected metadata.
   * @throws Rejects for token/transport/JSON failures or a non-OK HTTP response. Successful HTTP JSON is trusted even if it represents an application error.
   * @example
   * ```ts
   * import { MongoApiAdapter } from '@alneas/appkit-core/data/mongodb';
   * export async function insertOneTasks(adapter: MongoApiAdapter) {
   *   return adapter.insertOne('tasks', { title: 'Draft' });
   * }
   * ```
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
   * Sends updateOne, wrapping data in $set only when no top-level $ key exists.
   * @param collection - Collection name sent unchanged to the host API.
   * @param filter - Mongo-style filter serialized as JSON; empty filters may select every record.
   * @param data - Document(s) serialized as JSON; validation and persistence belong to the endpoint.
   * @param options - Options serialized to the operation body, except find constructs its own supported option subset. signal does not cancel the HTTP request.
   * @returns Server JSON cast to OperationResult without normalization.
   * @throws Rejects for token/transport/JSON failures or a non-OK HTTP response. Successful HTTP JSON is trusted even if it represents an application error.
   * @example
   * ```ts
   * import { MongoApiAdapter } from '@alneas/appkit-core/data/mongodb';
   * export async function updateOneTasks(adapter: MongoApiAdapter) {
   *   return adapter.updateOne('tasks', { _id: 'task-1' }, { title: 'Reviewed' });
   * }
   * ```
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
   * Sends a filtered replaceOne operation using data as replacement.
   * @param collection - Collection name sent unchanged to the host API.
   * @param filter - Mongo-style filter serialized as JSON; empty filters may select every record.
   * @param data - Document(s) serialized as JSON; validation and persistence belong to the endpoint.
   * @param options - Options serialized to the operation body, except find constructs its own supported option subset. signal does not cancel the HTTP request.
   * @returns Server JSON cast to OperationResult without normalization.
   * @throws Rejects for token/transport/JSON failures or a non-OK HTTP response. Successful HTTP JSON is trusted even if it represents an application error.
   * @example
   * ```ts
   * import { MongoApiAdapter } from '@alneas/appkit-core/data/mongodb';
   * export async function replaceOneTasks(adapter: MongoApiAdapter) {
   *   return adapter.replaceOne('tasks', { _id: 'task-1' }, { title: 'Reviewed' });
   * }
   * ```
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
   * Sends a filtered deleteOne operation.
   * @param collection - Collection name sent unchanged to the host API.
   * @param filter - Mongo-style filter serialized as JSON; empty filters may select every record.
   * @param options - Options serialized to the operation body, except find constructs its own supported option subset. signal does not cancel the HTTP request.
   * @returns Server JSON cast to OperationResult without normalization.
   * @throws Rejects for token/transport/JSON failures or a non-OK HTTP response. Successful HTTP JSON is trusted even if it represents an application error.
   * @example
   * ```ts
   * import { MongoApiAdapter } from '@alneas/appkit-core/data/mongodb';
   * export async function deleteOneTasks(adapter: MongoApiAdapter) {
   *   return adapter.deleteOne('tasks', { _id: 'task-1' });
   * }
   * ```
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
   * Requests a filtered findOneAndUpdate with automatic $set for plain data.
   * @typeParam T - Expected server result shape; defaults to unknown and is not runtime-validated.
   * @param collection - Collection name sent unchanged to the host API.
   * @param filter - Mongo-style filter serialized as JSON; empty filters may select every record.
   * @param data - Document(s) serialized as JSON; validation and persistence belong to the endpoint.
   * @param options - Options serialized to the operation body, except find constructs its own supported option subset. signal does not cancel the HTTP request.
   * @returns Server JSON cast to T or null. returnDocument defaults to after, with caller options overriding it; server owns atomicity.
   * @throws Rejects for token/transport/JSON failures or a non-OK HTTP response. Successful HTTP JSON is trusted even if it represents an application error.
   * @example
   * ```ts
   * import { MongoApiAdapter } from '@alneas/appkit-core/data/mongodb';
   * export async function findOneAndUpdateTasks(adapter: MongoApiAdapter) {
   *   return adapter.findOneAndUpdate('tasks', { _id: 'task-1' }, { title: 'Reviewed' });
   * }
   * ```
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
   * Requests a filtered findOneAndReplace using the whole replacement document.
   * @typeParam T - Expected server result shape; defaults to unknown and is not runtime-validated.
   * @param collection - Collection name sent unchanged to the host API.
   * @param filter - Mongo-style filter serialized as JSON; empty filters may select every record.
   * @param data - Document(s) serialized as JSON; validation and persistence belong to the endpoint.
   * @param options - Options serialized to the operation body, except find constructs its own supported option subset. signal does not cancel the HTTP request.
   * @returns Server JSON cast to T or null. returnDocument defaults to after, with caller options overriding it; server owns atomicity.
   * @throws Rejects for token/transport/JSON failures or a non-OK HTTP response. Successful HTTP JSON is trusted even if it represents an application error.
   * @example
   * ```ts
   * import { MongoApiAdapter } from '@alneas/appkit-core/data/mongodb';
   * export async function findOneAndReplaceTasks(adapter: MongoApiAdapter) {
   *   return adapter.findOneAndReplace('tasks', { _id: 'task-1' }, { title: 'Reviewed' });
   * }
   * ```
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
   * Requests a filtered findOneAndDelete operation.
   * @typeParam T - Expected server result shape; defaults to unknown and is not runtime-validated.
   * @param collection - Collection name sent unchanged to the host API.
   * @param filter - Mongo-style filter serialized as JSON; empty filters may select every record.
   * @param options - Options serialized to the operation body, except find constructs its own supported option subset. signal does not cancel the HTTP request.
   * @returns Server JSON cast to T or null; server owns atomicity and missing-row handling.
   * @throws Rejects for token/transport/JSON failures or a non-OK HTTP response. Successful HTTP JSON is trusted even if it represents an application error.
   * @example
   * ```ts
   * import { MongoApiAdapter } from '@alneas/appkit-core/data/mongodb';
   * export async function findOneAndDeleteTasks(adapter: MongoApiAdapter) {
   *   return adapter.findOneAndDelete('tasks', { _id: 'task-1' });
   * }
   * ```
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
   * Forwards an aggregation pipeline without inspecting or rewriting stages.
   * @typeParam T - Expected server result shape; defaults to unknown and is not runtime-validated.
   * @param collection - Collection name sent unchanged to the host API.
   * @param pipeline - Mongo aggregation stages serialized unchanged.
   * @param options - Options serialized to the operation body, except find constructs its own supported option subset. signal does not cancel the HTTP request.
   * @returns Server JSON cast to T[]; stage support and execution policy belong to the endpoint.
   * @throws Rejects for token/transport/JSON failures or a non-OK HTTP response. Successful HTTP JSON is trusted even if it represents an application error.
   * @example
   * ```ts
   * import { MongoApiAdapter } from '@alneas/appkit-core/data/mongodb';
   * export async function aggregateTasks(adapter: MongoApiAdapter) {
   *   return adapter.aggregate('tasks', [{ $match: { status: 'open' } }]);
   * }
   * ```
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
