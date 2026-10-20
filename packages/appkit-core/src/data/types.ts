/**
 * Sends an HTTP request through a host-supplied Fetch-compatible transport.
 * @param input - Request, URL object or URL string accepted by the host transport.
 * @param init - Optional method, headers, body, credentials and cancellation signal.
 * @returns A response whose body remains owned by the caller; consume or cancel it
 * according to the transport's lifecycle requirements.
 * @remarks The host supplies networking, credentials and authorization policy.
 * Rejections and cancellation behavior depend on that transport. This type does
 * not add retries, response-status validation or runtime-specific fetch properties.
 * @example
 * ```ts
 * import type { FetchLike } from '@alneas/appkit-core/data';
 * export async function readHealth(fetchImpl: FetchLike, url: URL) {
 *   const response = await fetchImpl(url, { method: 'GET' });
 *   if (!response.ok) throw new Error(`HTTP ${response.status}`);
 *   return response.text();
 * }
 * ```
 */
export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/**
 * Filter criteria for record retrieval.
 *
 * These are common filter conventions; supported operators and value semantics
 * are adapter-specific and are validated by that adapter:
 * - `$eq` (eq): Equals
 * - `$neq` (neq): Not equals
 * - `$lt` (lt), `$lte` (lte): Less than / Less than or equal to
 * - `$gt` (gt), `$gte` (gte): Greater than / Greater than or equal to
 * - `$in` (in): Included in array
 * - `$nin` (nin): Not included in array
 * - `$regex`: Regular expression match
 *
 * @example
 * ```typescript
 * import type { Filter } from '@alneas/appkit-core/data';
 * const active: Filter = { status: 'active' };
 * const eligible: Filter = {
 *   age: { $gte: 18 }, role: { $in: ['admin', 'editor'] },
 * };
 * console.log(active, eligible);
 * ```
 */
export type Filter = Record<string, unknown>;

/**
 * Names a business-document category requested through QueryOptions.docType.
 * The listed values are conventions; other strings remain valid TypeScript values.
 * This type does not validate a document or enforce a document standard.
 * @see {@link QueryOptions} for the adapter-specific document filter.
 */
export type DocType = 'Invoice' | 'PurchaseOrder' | 'DespatchAdvice' | 'RemittanceAdvice' | string;

/**
 * Requests adapter-specific filtering, ordering, projection and pagination behavior.
 * @remarks Optional fields describe requested capabilities; an adapter may support
 * only a subset. Consult its implementation before relying on cancellation,
 * joins, projection or automatic pagination. No option establishes authorization.
 * @example
 * ```ts
 * import type { QueryOptions } from '@alneas/appkit-core/data';
 * const options: QueryOptions = { sort: { createdAt: -1 }, limit: 20, skip: 0 };
 * console.log(options.limit);
 * ```
 */
export interface QueryOptions {
  /** Transport cancellation request; an adapter may ignore it. Cancellation is not a backend rollback. */
  signal?: AbortSignal;
  /** Sort order: 1 = ascending, -1 = descending */
  sort?: Record<string, number>;
  /** Upper limit on the number of records to retrieve */
  limit?: number;
  /** Number of records to skip (for pagination) */
  skip?: number;
  /** Configuration for joining related collections (populate) */
  populate?: PopulateOptions[];
  /** Field projection to limit retrieved fields */
  projection?: string[] | Record<string, unknown>;
  /** Filter by regional-edi document type */
  docType?: DocType;
  /** Requests automatic pagination when explicit limit/skip are absent; only adapters documenting this option implement it. */
  paginateAll?: boolean;

  /** Additional adapter-specific options; their names, validation and defaults are host-owned. */
  [key: string]: unknown;
}

/**
 * Describes a requested join between local references and a related collection.
 * @remarks Join support is adapter-specific. The normalization helper supplies
 * names/defaults but does not run a query, validate a relationship or authorize it.
 * @example
 * ```ts
 * import { normalizePopulateOptions, type PopulateOptions } from '@alneas/appkit-core/data';
 * const relation: PopulateOptions = {
 *   collection: 'users', localRef: 'user_id', foreignRef: 'id', as: 'user',
 * };
 * console.log(normalizePopulateOptions(relation).unwind); // true
 * ```
 */
export interface PopulateOptions {
  /** Target collection or table name to join */
  collection: string;

  /**
   * Local reference field (e.g., 'user_id', 'order_reference').
   * Based on regional-edi reference terminology.
   */
  localRef?: string;

  /**
   * Remote reference field; normalizePopulateOptions defaults an absent/empty value to '_id'.
   */
  foreignRef?: string;

  /** Alias for the joined data (e.g., 'user', 'order') */
  as?: string;

  /** Whether to flatten the related result. Normalization returns true unless this field is explicitly false. */
  unwind?: boolean;

  /** Nested populate configurations */
  populate?: PopulateOptions[];

  /** Additional adapter-specific options; their names, validation and defaults are host-owned. */
  [key: string]: unknown;

  // --- Backward-compatibility aliases (deprecated) ---

  /**
   * Legacy local reference name, used only when localRef is absent or empty.
   * @deprecated Use localRef to avoid relying on the compatibility alias.
   */
  field?: string;

  /**
   * Legacy remote reference name, used only when foreignRef is absent or empty.
   * @deprecated Use foreignRef to avoid relying on the compatibility alias.
   */
  foreignField?: string;
}

/**
 * Resolves canonical join names and compatibility aliases without querying data.
 * @param p - Join request. Non-empty canonical names take precedence over field
 * and foreignField; absent remote reference becomes '_id'.
 * @returns A new object retaining collection, deriving an alias by removing a
 * trailing '_id' or '_reference' when as is empty, and setting unwind to true
 * unless p.unwind is explicitly false. Nested populate/extensions are not copied.
 * @example
 * ```ts
 * import { normalizePopulateOptions } from '@alneas/appkit-core/data';
 * const relation = normalizePopulateOptions({ collection: 'users', localRef: 'user_id' });
 * console.log(relation.as, relation.foreignRef, relation.unwind); // 'user', '_id', true
 * ```
 */
export function normalizePopulateOptions(p: PopulateOptions): {
  /** Related collection copied from the request. */
  collection: string;
  /** Canonical or legacy local reference, or an empty string. */
  localRef: string;
  /** Canonical/legacy remote reference, or '_id'. */
  foreignRef: string;
  /** Explicit alias or the local reference without a conventional suffix. */
  as: string;
  /** True unless the request explicitly disabled unwinding. */
  unwind: boolean;
} {
  const localRef = p.localRef || p.field || '';
  const foreignRef = p.foreignRef || p.foreignField || '_id';
  const as = p.as || localRef.replace(/_id$/, '').replace(/_reference$/, '');
  const unwind = p.unwind !== false;
  return { collection: p.collection, localRef, foreignRef, as, unwind };
}

/**
 * Connects record operations to an application-selected backend.
 * @remarks Implementations own authentication, authorization, transactions,
 * filtering and identifier conversion. Optional methods must be capability-checked.
 * QueryOptions are requests rather than guarantees across every backend. Generic
 * result types describe the caller's expected shape and do not validate responses.
 * Operations can reject with backend/transport failures; cancellation and retry
 * policies are implementation-specific and do not imply transaction rollback.
 * @example
 * ```ts
 * import type { DataAccessAdapter } from '@alneas/appkit-core/data';
 * export async function loadRequests(adapter: DataAccessAdapter) {
 *   return adapter.find<{ id: string; title: string }>('requests', { status: 'open' }, { limit: 20 });
 * }
 * ```
 */
export interface DataAccessAdapter {
  /**
   * Optional non-secret cache namespace for a tenant/backend. Defaults to adapter instance identity.
   * Equal explicit scopes intentionally share cached results, so use them only for equivalent access.
   * Never use tokens or unverified profile data. Change scope when the tenant/access boundary changes.
   */
  readonly cacheScope?: string;
  /**
   * Retrieves records matching an adapter-supported filter.
   * @typeParam T - Expected adapter result shape; no runtime validation is implied.
   * @param collection - Backend collection or resource name.
   * @param filter - Optional criteria in the adapter's filter dialect; absence requests its unfiltered behavior.
   * @param options - Optional sorting, pagination, projection and transport requests.
   * @returns Records returned by the backend, including an empty array when no rows match.
   * @remarks Backend, transport and authorization failures can reject the promise.
   * Use the adapter's documented retry/cancellation policy; this contract supplies no rollback.
   * @example
   * ```ts
   * import type { DataAccessAdapter } from '@alneas/appkit-core/data';
   * export async function findExample(adapter: DataAccessAdapter) {
   *   return adapter.find<{ id: string }>('requests', { status: 'open' }, { limit: 20 });
   * }
   * ```
   */
  find<T = unknown>(collection: string, filter?: Filter, options?: QueryOptions): Promise<T[]>;

  /**
   * Retrieves a record using the backend's identifier lookup.
   * @typeParam T - Expected adapter result shape; no runtime validation is implied.
   * @param collection - Backend collection or resource name.
   * @param id - Identifier in the form accepted by the selected adapter.
   * @param options - Optional projection, populate and transport requests.
   * @returns The record or null according to the adapter's not-found behavior; some backends reject instead of returning null.
   * @remarks Backend, transport and authorization failures can reject the promise.
   * Use the adapter's documented retry/cancellation policy; this contract supplies no rollback.
   * @example
   * ```ts
   * import type { DataAccessAdapter } from '@alneas/appkit-core/data';
   * export async function findOneExample(adapter: DataAccessAdapter) {
   *   return adapter.findOne<{ id: string }>('requests', 'request-1');
   * }
   * ```
   */
  findOne<T = unknown>(collection: string, id: string, options?: QueryOptions): Promise<T | null>;

  /**
   * Requests creation of a record.
   * @typeParam T - Expected adapter result shape; no runtime validation is implied.
   * @param collection - Backend collection or resource name.
   * @param data - Fields to insert; server-generated fields and validation are backend-owned.
   * @param options - Optional adapter-specific write/transport settings.
   * @returns The adapter's created-record result; it need not be the same object as data.
   * @remarks Backend, transport and authorization failures can reject the promise.
   * Use the adapter's documented retry/cancellation policy; this contract supplies no rollback.
   * @example
   * ```ts
   * import type { DataAccessAdapter } from '@alneas/appkit-core/data';
   * export async function createExample(adapter: DataAccessAdapter) {
   *   return adapter.create<{ id: string; title: string }>('requests', { title: 'Review' });
   * }
   * ```
   */
  create<T = unknown>(
    collection: string,
    data: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<T>;

  /**
   * Requests a partial record update by identifier.
   * @typeParam T - Expected adapter result shape; no runtime validation is implied.
   * @param collection - Backend collection or resource name.
   * @param id - Identifier accepted by the selected adapter.
   * @param data - Fields or update operators supported by that adapter.
   * @param options - Optional adapter-specific write/transport settings.
   * @returns The adapter's update result as T. Omitted-field and returned-document semantics depend on the backend.
   * @remarks Backend, transport and authorization failures can reject the promise.
   * Use the adapter's documented retry/cancellation policy; this contract supplies no rollback.
   * @example
   * ```ts
   * import type { DataAccessAdapter } from '@alneas/appkit-core/data';
   * export async function updateExample(adapter: DataAccessAdapter) {
   *   return adapter.update<{ id: string }>('requests', 'request-1', { status: 'review' });
   * }
   * ```
   */
  update<T = unknown>(
    collection: string,
    id: string,
    data: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<T>;

  /**
   * Requests record replacement when supported by the adapter.
   * @typeParam T - Expected adapter result shape; no runtime validation is implied.
   * @param collection - Backend collection or resource name.
   * @param id - Identifier accepted by the selected adapter.
   * @param data - Requested new record contents; verify the adapter's omitted-field semantics.
   * @param options - Optional adapter-specific write/transport settings.
   * @returns The adapter's replacement result as T; this interface alone does not establish whole-record clearing semantics.
   * @remarks Backend, transport and authorization failures can reject the promise.
   * Use the adapter's documented retry/cancellation policy; this contract supplies no rollback.
   * @example
   * ```ts
   * import type { DataAccessAdapter } from '@alneas/appkit-core/data';
   * export async function replaceExample(adapter: DataAccessAdapter) {
   *   if (!adapter.replace) throw new Error('Replacement is unavailable');
 *   return adapter.replace<{ id: string }>('requests', 'request-1', { title: 'Revised' });
   * }
   * ```
   */
  replace?<T = unknown>(
    collection: string,
    id: string,
    data: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<T>;

  /**
   * Requests deletion of a record by identifier.
   * @typeParam T - Expected adapter result shape; no runtime validation is implied.
   * @param collection - Backend collection or resource name.
   * @param id - Identifier accepted by the selected adapter.
   * @param options - Optional adapter-specific write/transport settings.
   * @returns An adapter-defined deletion result as T, such as a boolean, count or deleted-record value.
   * @remarks Backend, transport and authorization failures can reject the promise.
   * Use the adapter's documented retry/cancellation policy; this contract supplies no rollback.
   * @example
   * ```ts
   * import type { DataAccessAdapter } from '@alneas/appkit-core/data';
   * export async function deleteExample(adapter: DataAccessAdapter) {
   *   return adapter.delete<unknown>('requests', 'request-1');
   * }
   * ```
   */
  delete<T = unknown>(collection: string, id: string, options?: QueryOptions): Promise<T>;

  /**
   * Runs an aggregation pipeline on an adapter supporting that capability.
   * @typeParam T - Expected adapter result shape; no runtime validation is implied.
   * @param collection - Backend collection or resource name.
   * @param pipeline - Ordered stages in the selected backend's supported pipeline dialect.
   * @param options - Optional adapter-specific aggregation/transport settings.
   * @returns Aggregation result rows; this interface does not validate stages or impose execution limits.
   * @remarks Backend, transport and authorization failures can reject the promise.
   * Use the adapter's documented retry/cancellation policy; this contract supplies no rollback.
   * @example
   * ```ts
   * import type { DataAccessAdapter } from '@alneas/appkit-core/data';
   * export async function aggregateExample(adapter: DataAccessAdapter) {
   *   if (!adapter.aggregate) throw new Error('Aggregation is unavailable');
 *   return adapter.aggregate<{ count: number }>('requests', [{ $count: 'count' }]);
   * }
   * ```
   */
  aggregate?<T = unknown>(
    collection: string,
    pipeline: unknown[],
    options?: QueryOptions,
  ): Promise<T[]>;

  /**
   * Counts records matching an adapter-supported filter.
   * @param collection - Backend collection or resource name.
   * @param filter - Optional criteria in the adapter's supported filter dialect.
   * @param options - Optional adapter-specific query/transport settings.
   * @returns The backend-reported matching-record count.
   * @remarks Backend, transport and authorization failures can reject the promise.
   * Use the adapter's documented retry/cancellation policy; this contract supplies no rollback.
   * @example
   * ```ts
   * import type { DataAccessAdapter } from '@alneas/appkit-core/data';
   * export async function countExample(adapter: DataAccessAdapter) {
   *   return adapter.count('requests', { status: 'open' });
   * }
   * ```
   */
  count(collection: string, filter?: Filter, options?: QueryOptions): Promise<number>;

  /**
   * Requests insertion of multiple records on a capable adapter.
   * @typeParam T - Expected adapter result shape; no runtime validation is implied.
   * @param collection - Backend collection or resource name.
   * @param data - Records to insert; batching and transaction behavior are backend-specific.
   * @param options - Optional adapter-specific bulk-write/transport settings.
   * @returns Adapter-provided inserted-record results; ordering and partial failure behavior are implementation-specific.
   * @remarks Backend, transport and authorization failures can reject the promise.
   * Use the adapter's documented retry/cancellation policy; this contract supplies no rollback.
   * @example
   * ```ts
   * import type { DataAccessAdapter } from '@alneas/appkit-core/data';
   * export async function createManyExample(adapter: DataAccessAdapter) {
   *   if (!adapter.createMany) throw new Error('Bulk creation is unavailable');
 *   return adapter.createMany<{ id: string }>('requests', [{ title: 'First' }]);
   * }
   * ```
   */
  createMany?<T = unknown>(
    collection: string,
    data: Record<string, unknown>[],
    options?: QueryOptions,
  ): Promise<T[]>;

  /**
   * Requests updates to records selected by a filter.
   * @typeParam T - Expected adapter result shape; no runtime validation is implied.
   * @param collection - Backend collection or resource name.
   * @param filter - Criteria identifying the requested update set.
   * @param data - Fields or update operators accepted by the backend.
   * @param options - Optional adapter-specific bulk-write/transport settings.
   * @returns Adapter-provided update results. Atomicity and partial outcomes are not standardized by this interface.
   * @remarks Backend, transport and authorization failures can reject the promise.
   * Use the adapter's documented retry/cancellation policy; this contract supplies no rollback.
   * @example
   * ```ts
   * import type { DataAccessAdapter } from '@alneas/appkit-core/data';
   * export async function updateManyExample(adapter: DataAccessAdapter) {
   *   if (!adapter.updateMany) throw new Error('Bulk update is unavailable');
 *   return adapter.updateMany<{ id: string }>('requests', { status: 'open' }, { status: 'review' });
   * }
   * ```
   */
  updateMany?<T = unknown>(
    collection: string,
    filter: Filter,
    data: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<T[]>;

  /**
   * Requests deletion of records selected by a filter.
   * @typeParam T - Expected adapter result shape; no runtime validation is implied.
   * @param collection - Backend collection or resource name.
   * @param filter - Criteria identifying the requested deletion set.
   * @param options - Optional adapter-specific bulk-write/transport settings.
   * @returns An array of adapter-defined deletion results; do not assume these are deleted records.
   * @remarks Backend, transport and authorization failures can reject the promise.
   * Use the adapter's documented retry/cancellation policy; this contract supplies no rollback.
   * @example
   * ```ts
   * import type { DataAccessAdapter } from '@alneas/appkit-core/data';
   * export async function deleteManyExample(adapter: DataAccessAdapter) {
   *   if (!adapter.deleteMany) throw new Error('Bulk deletion is unavailable');
 *   return adapter.deleteMany<unknown>('requests', { archived: true });
   * }
   * ```
   */
  deleteMany?<T = unknown>(
    collection: string,
    filter: Filter,
    options?: QueryOptions,
  ): Promise<T[]>;

  // --- Explicit MongoDB-style operations ---

  /**
   * Inserts one record and returns operation metadata when supported.
   * @param collection - Backend collection or resource name.
   * @param data - Fields to insert, interpreted by the selected adapter.
   * @param options - Optional adapter-specific write/transport settings.
   * @returns Acknowledgement and available operation counts/identifiers; omitted metadata remains unknown.
   * @remarks Backend, transport and authorization failures can reject the promise.
   * Use the adapter's documented retry/cancellation policy; this contract supplies no rollback.
   * @example
   * ```ts
   * import type { DataAccessAdapter } from '@alneas/appkit-core/data';
   * export async function insertOneExample(adapter: DataAccessAdapter) {
   *   if (!adapter.insertOne) throw new Error('Operation metadata is unavailable');
 *   return adapter.insertOne('requests', { title: 'Review' });
   * }
   * ```
   */
  insertOne?(
    collection: string,
    data: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<OperationResult>;

  /**
   * Updates one selected record and returns operation metadata.
   * @param collection - Backend collection or resource name.
   * @param filter - Backend-supported selection criteria.
   * @param data - Fields or update operators accepted by the backend.
   * @param options - Optional adapter-specific write/transport settings.
   * @returns Acknowledgement and any reported match/modification counts.
   * @remarks Backend, transport and authorization failures can reject the promise.
   * Use the adapter's documented retry/cancellation policy; this contract supplies no rollback.
   * @example
   * ```ts
   * import type { DataAccessAdapter } from '@alneas/appkit-core/data';
   * export async function updateOneExample(adapter: DataAccessAdapter) {
   *   if (!adapter.updateOne) throw new Error('updateOne is unavailable');
 *   return adapter.updateOne('requests', { id: 'request-1' }, { status: 'review' });
   * }
   * ```
   */
  updateOne?(
    collection: string,
    filter: Filter,
    data: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<OperationResult>;

  /**
   * Requests replacement of one selected record and returns metadata.
   * @param collection - Backend collection or resource name.
   * @param filter - Backend-supported selection criteria.
   * @param data - Requested replacement contents; verify backend-specific omitted-field behavior.
   * @param options - Optional adapter-specific write/transport settings.
   * @returns Acknowledgement and any reported operation counts. Some adapters implement partial-update compatibility behavior.
   * @remarks Backend, transport and authorization failures can reject the promise.
   * Use the adapter's documented retry/cancellation policy; this contract supplies no rollback.
   * @example
   * ```ts
   * import type { DataAccessAdapter } from '@alneas/appkit-core/data';
   * export async function replaceOneExample(adapter: DataAccessAdapter) {
   *   if (!adapter.replaceOne) throw new Error('replaceOne is unavailable');
 *   return adapter.replaceOne('requests', { id: 'request-1' }, { title: 'Revised' });
   * }
   * ```
   */
  replaceOne?(
    collection: string,
    filter: Filter,
    data: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<OperationResult>;

  /**
   * Deletes one selected record and returns operation metadata.
   * @param collection - Backend collection or resource name.
   * @param filter - Backend-supported selection criteria.
   * @param options - Optional adapter-specific write/transport settings.
   * @returns Acknowledgement and any backend-reported deletion count.
   * @remarks Backend, transport and authorization failures can reject the promise.
   * Use the adapter's documented retry/cancellation policy; this contract supplies no rollback.
   * @example
   * ```ts
   * import type { DataAccessAdapter } from '@alneas/appkit-core/data';
   * export async function deleteOneExample(adapter: DataAccessAdapter) {
   *   if (!adapter.deleteOne) throw new Error('deleteOne is unavailable');
 *   return adapter.deleteOne('requests', { id: 'request-1' });
   * }
   * ```
   */
  deleteOne?(collection: string, filter: Filter, options?: QueryOptions): Promise<OperationResult>;

  /**
   * Requests an update and document result for one matching record.
   * @typeParam T - Expected adapter result shape; no runtime validation is implied.
   * @param collection - Backend collection or resource name.
   * @param filter - Backend-supported selection criteria.
   * @param data - Fields or update operators accepted by the backend.
   * @param options - Optional adapter-specific write/transport settings.
   * @returns An adapter-provided document or null; verify whether it returns the pre/post-update document and how missing records are handled.
   * @remarks Backend, transport and authorization failures can reject the promise.
   * Use the adapter's documented retry/cancellation policy; this contract supplies no rollback.
   * @example
   * ```ts
   * import type { DataAccessAdapter } from '@alneas/appkit-core/data';
   * export async function findOneAndUpdateExample(adapter: DataAccessAdapter) {
   *   if (!adapter.findOneAndUpdate) throw new Error('findOneAndUpdate is unavailable');
 *   return adapter.findOneAndUpdate<{ id: string }>('requests', { id: 'request-1' }, { status: 'review' });
   * }
   * ```
   */
  findOneAndUpdate?<T = unknown>(
    collection: string,
    filter: Filter,
    data: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<T | null>;

  /**
   * Requests replacement and a document result for one matching record.
   * @typeParam T - Expected adapter result shape; no runtime validation is implied.
   * @param collection - Backend collection or resource name.
   * @param filter - Backend-supported selection criteria.
   * @param data - Requested new contents; verify actual replacement versus partial-update behavior in the selected adapter.
   * @param options - Optional adapter-specific write/transport settings.
   * @returns An adapter-provided document or null. This interface does not guarantee whole-record replacement or a transaction across calls.
   * @remarks Backend, transport and authorization failures can reject the promise.
   * Use the adapter's documented retry/cancellation policy; this contract supplies no rollback.
   * @example
   * ```ts
   * import type { DataAccessAdapter } from '@alneas/appkit-core/data';
   * export async function findOneAndReplaceExample(adapter: DataAccessAdapter) {
   *   if (!adapter.findOneAndReplace) throw new Error('findOneAndReplace is unavailable');
 *   return adapter.findOneAndReplace<{ id: string }>('requests', { id: 'request-1' }, { title: 'Revised' });
   * }
   * ```
   */
  findOneAndReplace?<T = unknown>(
    collection: string,
    filter: Filter,
    data: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<T | null>;

  /**
   * Requests deletion and a document result for one matching record.
   * @typeParam T - Expected adapter result shape; no runtime validation is implied.
   * @param collection - Backend collection or resource name.
   * @param filter - Backend-supported selection criteria.
   * @param options - Optional adapter-specific write/transport settings.
   * @returns The adapter's deleted-document result or null; backend missing-record errors may reject instead.
   * @remarks Backend, transport and authorization failures can reject the promise.
   * Use the adapter's documented retry/cancellation policy; this contract supplies no rollback.
   * @example
   * ```ts
   * import type { DataAccessAdapter } from '@alneas/appkit-core/data';
   * export async function findOneAndDeleteExample(adapter: DataAccessAdapter) {
   *   if (!adapter.findOneAndDelete) throw new Error('findOneAndDelete is unavailable');
 *   return adapter.findOneAndDelete<{ id: string }>('requests', { id: 'request-1' });
   * }
   * ```
   */
  findOneAndDelete?<T = unknown>(
    collection: string,
    filter: Filter,
    options?: QueryOptions,
  ): Promise<T | null>;
}

/**
 * Reports acknowledgement and backend-supplied operation counts or identifiers.
 * Optional fields are not zero merely because they are absent. Acknowledgement
 * alone does not certify durability, a business invariant or a transaction.
 * @see {@link DataAccessAdapter.insertOne} and {@link DataAccessAdapter.updateOne}
 * for capability-checked operation examples.
 */
export interface OperationResult {
  /** Whether the operation was acknowledged */
  acknowledged: boolean;
  /** Number of records matching the criteria */
  matchedCount?: number;
  /** Number of records actually modified */
  modifiedCount?: number;
  /** Number of records deleted */
  deletedCount?: number;
  /** Inserted record ID */
  insertedId?: string;
  /** Upserted record ID */
  upsertedId?: string;
}
