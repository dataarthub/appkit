/** Standard fetch call signature; custom transports need no runtime-specific helper properties. */
export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/**
 * Filter criteria for record retrieval.
 *
 * Filter operators align with regional-edi x-rules:
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
 * // Simple match
 * { status: 'active' }
 *
 * // Using comparison operators
 * { age: { $gte: 18 }, role: { $in: ['admin', 'editor'] } }
 * ```
 */
export type Filter = Record<string, unknown>;

/**
 * regional-edi document type.
 * Used for filtering and validation by doc_type.
 */
export type DocType = 'Invoice' | 'PurchaseOrder' | 'DespatchAdvice' | 'RemittanceAdvice' | string;

/**
 * Search query options.
 */
export interface QueryOptions {
  /** Optional transport cancellation signal. Adapters may ignore it; QueryClient still cancels cache writes. */
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
  /** When limit/skip are not specified, whether to fetch all data via automatic pagination (useful when exceeding limits like Supabase 1000-row cap) */
  paginateAll?: boolean;

  [key: string]: unknown;
}

/**
 * Configuration for populating related data.
 * Field names are based on regional-edi terminology.
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
   * Remote reference field in the target collection (default: 'id' or '_id').
   */
  foreignRef?: string;

  /** Alias for the joined data (e.g., 'user', 'order') */
  as?: string;

  /** Whether to unwind the array (defaults to true for single references) */
  unwind?: boolean;

  /** Nested populate configurations */
  populate?: PopulateOptions[];

  [key: string]: unknown;

  // --- Backward-compatibility aliases (deprecated) ---

  /**
   * @deprecated Use `localRef` instead.
   */
  field?: string;

  /**
   * @deprecated Use `foreignRef` instead.
   */
  foreignField?: string;
}

/**
 * Normalizes PopulateOptions (including legacy field name support).
 */
export function normalizePopulateOptions(p: PopulateOptions): {
  collection: string;
  localRef: string;
  foreignRef: string;
  as: string;
  unwind: boolean;
} {
  const localRef = p.localRef || p.field || '';
  const foreignRef = p.foreignRef || p.foreignField || '_id';
  const as = p.as || localRef.replace(/_id$/, '').replace(/_reference$/, '');
  const unwind = p.unwind !== false;
  return { collection: p.collection, localRef, foreignRef, as, unwind };
}

/**
 * Abstract adapter interface for data access.
 */
export interface DataAccessAdapter {
  /**
   * Optional non-secret cache namespace for a tenant/backend. Defaults to adapter instance identity.
   * Equal explicit scopes intentionally share cached results, so use them only for equivalent access.
   * Never use tokens or unverified profile data. Change scope when the tenant/access boundary changes.
   */
  readonly cacheScope?: string;
  /**
   * Searches for multiple records.
   * @param collection Collection or resource name
   * @param filter Search filter
   * @param options Search options (sort, limit, etc.)
   */
  find<T = unknown>(collection: string, filter?: Filter, options?: QueryOptions): Promise<T[]>;

  /**
   * Searches for a single record by ID.
   * @param collection Collection name
   * @param id Record ID
   * @param options Search options
   */
  findOne<T = unknown>(collection: string, id: string, options?: QueryOptions): Promise<T | null>;

  /**
   * Creates a new record.
   * @param collection Collection name
   * @param data Data to create
   * @param options Options
   */
  create<T = unknown>(
    collection: string,
    data: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<T>;

  /**
   * Updates a record (partial update).
   * @param collection Collection name
   * @param id Record ID
   * @param data Data to update
   * @param options Options
   */
  update<T = unknown>(
    collection: string,
    id: string,
    data: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<T>;

  /**
   * Replaces a record (full replacement).
   * @param collection Collection name
   * @param id Record ID
   * @param data New data
   * @param options Options
   */
  replace?<T = unknown>(
    collection: string,
    id: string,
    data: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<T>;

  /**
   * Deletes a record.
   * @param collection Collection name
   * @param id Record ID
   * @param options Options
   */
  delete<T = unknown>(collection: string, id: string, options?: QueryOptions): Promise<T>;

  /**
   * Executes an aggregation pipeline (MongoDB format).
   * @param collection Collection name
   * @param pipeline Pipeline definition
   * @param options Options
   */
  aggregate?<T = unknown>(
    collection: string,
    pipeline: unknown[],
    options?: QueryOptions,
  ): Promise<T[]>;

  /**
   * Counts the number of records matching the filter.
   * @param collection Collection name
   * @param filter Search filter
   * @param options Options
   */
  count(collection: string, filter?: Filter, options?: QueryOptions): Promise<number>;

  /**
   * Bulk creates multiple records.
   * @param collection Collection name
   * @param data Array of data objects to create
   * @param options Options
   */
  createMany?<T = unknown>(
    collection: string,
    data: Record<string, unknown>[],
    options?: QueryOptions,
  ): Promise<T[]>;

  /**
   * Bulk updates multiple records.
   * @param collection Collection name
   * @param filter Search filter
   * @param data Update payload
   * @param options Options
   */
  updateMany?<T = unknown>(
    collection: string,
    filter: Filter,
    data: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<T[]>;

  /**
   * Bulk deletes multiple records.
   * @param collection Collection name
   * @param filter Search filter
   * @param options Options
   */
  deleteMany?<T = unknown>(
    collection: string,
    filter: Filter,
    options?: QueryOptions,
  ): Promise<T[]>;

  // --- Explicit MongoDB-style operations ---

  /**
   * Inserts a single record and returns the operation result.
   */
  insertOne?(
    collection: string,
    data: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<OperationResult>;

  /**
   * Updates a single record and returns the operation result.
   */
  updateOne?(
    collection: string,
    filter: Filter,
    data: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<OperationResult>;

  /**
   * Replaces a single record and returns the operation result.
   */
  replaceOne?(
    collection: string,
    filter: Filter,
    data: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<OperationResult>;

  /**
   * Deletes a single record and returns the operation result.
   */
  deleteOne?(collection: string, filter: Filter, options?: QueryOptions): Promise<OperationResult>;

  /**
   * Finds a record, updates it, and returns the updated document.
   */
  findOneAndUpdate?<T = unknown>(
    collection: string,
    filter: Filter,
    data: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<T | null>;

  /**
   * Finds a record, replaces it, and returns the replaced document.
   */
  findOneAndReplace?<T = unknown>(
    collection: string,
    filter: Filter,
    data: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<T | null>;

  /**
   * Finds a record, deletes it, and returns the deleted document.
   */
  findOneAndDelete?<T = unknown>(
    collection: string,
    filter: Filter,
    options?: QueryOptions,
  ): Promise<T | null>;
}

/**
 * Represents outcome details of a database operation.
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
