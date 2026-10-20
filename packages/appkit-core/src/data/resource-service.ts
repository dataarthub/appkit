import type { DataAccessAdapter, Filter, QueryOptions } from './types';
import type { HeaderMapping, UploadProgress } from './common-types';

/**
 * Scalar cell accepted by a resource ingestion handler; null and undefined represent host-defined missing values.
 * @see {@link CsvRow} and {@link ResourceService.ingest}.
 */
export type CsvCellValue = string | number | boolean | null | undefined;
/**
 * Maps input column names to scalar CSV cells; conversion and validation belong to the ingestion handler.
 * @see {@link ResourceService.ingest} for consumption and {@link HeaderMapping} for column mapping.
 */
export type CsvRow = Record<string, CsvCellValue>;

/**
 * Host-defined attachment metadata with common optional classification fields. Neither this interface nor createResourceService validates, uploads or persists metadata.
 * @see {@link ResourceService.attachFile}.
 */
export interface UploadFileMetadata {
  /** File type (DRAWING, PHOTO, etc.) */
  fileType?: string;
  /** Major category classification */
  category?: string;
  /** Minor subcategory classification */
  subcategory?: string;
  /** File description */
  description?: string;
  /** Custom tags */
  tags?: string[];
  /**
   * Additional application metadata passed unchanged to the host attachment implementation.
   */
  [key: string]: unknown;
}

/**
 * Binds an adapter to one collection and optionally exposes host ingestion/attachment handlers. Operations preserve backend-specific filtering, authorization, rejection and deletion behavior.
 * @typeParam T - Record shape expected from the adapter; no runtime validation is added.
 * @typeParam TMetadata - Attachment metadata accepted by the host handler; defaults to UploadFileMetadata.
 * @example
 * ```ts
 * import { createResourceService } from '@alneas/appkit-core/data/resource-service';
 * import type { DataAccessAdapter } from '@alneas/appkit-core/data';
 * export function taskService(adapter: DataAccessAdapter) {
 *   return createResourceService<{ id: string; title: string }>(adapter, 'tasks');
 * }
 * ```
 */
export interface ResourceService<T, TMetadata extends UploadFileMetadata = UploadFileMetadata> {
  /**
   * Returns matching records using a shallow merge of defaultQueryOptions and call options.
   * @param filters - Optional backend filter; absence selects an empty filter.
   * @param options - Per-call options overriding find defaults.
   * @returns Records returned by adapter.find, in backend-defined order.
   */
  find: (filters?: Filter, options?: QueryOptions) => Promise<T[]>;
  /**
   * Looks up one record by identifier without applying find defaults.
   * @param id - Backend record identifier.
   * @param options - Options forwarded unchanged to adapter.findOne.
   * @returns Matching record or null, as reported by the adapter.
   */
  findOne: (id: string, options?: QueryOptions) => Promise<T | null>;
  /**
   * Creates one record without applying find defaults.
   * @param data - Partial record passed to adapter.create; required-field handling belongs to the backend.
   * @param options - Options forwarded unchanged.
   * @returns Created record reported by the adapter.
   */
  create: (data: Partial<T>, options?: QueryOptions) => Promise<T>;
  /**
   * Updates one record by identifier using the adapter's update semantics.
   * @param id - Backend record identifier.
   * @param data - Partial values to update.
   * @param options - Options forwarded unchanged.
   * @returns Updated record reported by the adapter.
   */
  update: (id: string, data: Partial<T>, options?: QueryOptions) => Promise<T>;
  /**
   * Deletes one record using the adapter's physical or logical deletion policy.
   * @param id - Backend record identifier.
   * @param options - Options forwarded unchanged.
   * @returns Backend-specific deletion result; there is no common affected-row shape.
   */
  delete: (id: string, options?: QueryOptions) => Promise<unknown>;
  /**
   * Delegates multiple records to the optional adapter.createMany capability.
   * @param data - Records submitted in one adapter call; atomicity and ordering are backend-specific.
   * @param options - Options forwarded unchanged.
   * @returns Created records; rejects with an unsupported-capability error when createMany is absent.
   */
  bulkCreate: (data: Partial<T>[], options?: QueryOptions) => Promise<T[]>;
  /**
   * Delegates a filtered partial update to the optional adapter.updateMany capability.
   * @param filter - Backend filter selecting records.
   * @param data - Partial values submitted to updateMany.
   * @param options - Options forwarded unchanged.
   * @returns Updated records; rejects with an unsupported-capability error when updateMany is absent.
   */
  bulkUpdate: (filter: Filter, data: Partial<T>, options?: QueryOptions) => Promise<T[]>;
  /**
   * Runs a host-provided CSV ingestion routine when supplied; absent when the factory receives no ingest handler.
   * @param data - Input rows with source column names.
   * @param mapping - Host-interpreted column mappings and conversion instructions.
   * @param options - Optional progress, batching and error-policy requests, with defaults determined by the handler.
   * @returns Host-reported counters and errors; partial writes and transactional behavior depend on that handler.
   */
  ingest?: (
    data: CsvRow[],
    mapping: HeaderMapping[],
    options?: {
      /**
       * Optional host progress callback.
       * @param processed - Number of rows the host reports as processed.
       * @param total - Total row count reported by the host.
       * @returns No result; callback error handling depends on the host ingestion implementation.
       */
      onProgress?: (processed: number, total: number) => void;
      /** Batch size for chunked processing */
      batchSize?: number;
      /** Whether to abort processing upon encountering an error */
      stopOnError?: boolean;
    },
  ) => Promise<UploadProgress>;
  /**
   * Invokes the host attachment handler when configured; the generic service adds no storage, validation or association logic.
   * @param file - Browser-compatible File to upload.
   * @param entityId - Target resource identifier interpreted by the handler.
   * @param metadata - Optional application metadata forwarded unchanged.
   * @returns The handler-specific upload/association result.
   */
  attachFile?: (file: File, entityId: string, metadata?: TMetadata) => Promise<unknown>;
}

/**
 * Configures query defaults and optional host capabilities for createResourceService.
 * @typeParam _T - Reserved record parameter retained for compatibility; it currently does not affect these option fields.
 * @typeParam TMetadata - Metadata accepted by attachFile; defaults to UploadFileMetadata.
 * @see {@link createResourceService} for a public-import example.
 */
export interface ResourceServiceOptions<_T, TMetadata extends UploadFileMetadata = UploadFileMetadata> {
  /**
   * Shallow defaults applied only by find. A per-call property overrides the default even when explicitly undefined; other operations do not merge these options.
   */
  defaultQueryOptions?: QueryOptions;
  /**
   * Optional handler copied directly to the returned service without wrapping or default processing.
   * @param data - Input CSV rows.
   * @param mapping - Column mapping instructions.
   * @param options - Optional progress, batching and error policy interpreted by the host.
   * @returns Handler-specific completion counters and errors.
   */
  ingest?: (
    data: CsvRow[],
    mapping: HeaderMapping[],
    options?: {
      /**
       * Optional progress callback forwarded to the host ingestion implementation.
       * @param processed - Processed row count reported by the host.
       * @param total - Total row count reported by the host.
       * @returns No result; the generic factory does not invoke this callback.
       */
      onProgress?: (processed: number, total: number) => void;
      /**
       * Optional batching request; no generic default or chunking is supplied by the factory.
       */
      batchSize?: number;
      /**
       * Optional host error-policy request; the factory does not implement abort or rollback.
       */
      stopOnError?: boolean;
    },
  ) => Promise<UploadProgress>;
  /**
   * Optional handler copied directly to the returned service; no handler means no file capability.
   * @param file - Host-supplied File.
   * @param entityId - Resource identifier for association.
   * @param metadata - Optional typed metadata.
   * @returns Host-specific attachment result.
   */
  attachFile?: (file: File, entityId: string, metadata?: TMetadata) => Promise<unknown>;
}

const DEFAULT_FILTER: Filter = {};

/**
 * Creates collection-bound CRUD methods and copies optional host handlers onto the service.
 * @typeParam T - Expected record shape, trusted without runtime validation.
 * @typeParam TMetadata - Attachment metadata shape; defaults to UploadFileMetadata.
 * @param dbAdapter - Host-created adapter responsible for persistence, credentials and authorization.
 * @param collection - Backend collection or table name forwarded to every adapter operation.
 * @param options - Optional find-only query defaults and host ingestion/attachment handlers. No handlers are synthesized.
 * @returns A new service. bulkCreate and bulkUpdate are always present but reject when their adapter capability is absent.
 * @remarks Errors are propagated. Operations add no retries, transaction, cancellation, schema conversion or automatic validation.
 * @example
 * ```ts
 * import { createResourceService } from '@alneas/appkit-core/data/resource-service';
 * import type { DataAccessAdapter } from '@alneas/appkit-core/data';
 * export function taskService(adapter: DataAccessAdapter) {
 *   return createResourceService<{ id: string; title: string }>(adapter, 'tasks');
 * }
 * ```
 */
export function createResourceService<T, TMetadata extends UploadFileMetadata = UploadFileMetadata>(
  dbAdapter: DataAccessAdapter,
  collection: string,
  options?: ResourceServiceOptions<T, TMetadata>,
): ResourceService<T, TMetadata> {
  return {
    find: async (filters?: Filter, queryOpts?: QueryOptions) => {
      const mergedOptions = { ...options?.defaultQueryOptions, ...queryOpts } as QueryOptions;
      return await dbAdapter.find<T>(collection, filters || DEFAULT_FILTER, mergedOptions);
    },
    findOne: async (id: string, queryOpts?: QueryOptions) => {
      return await dbAdapter.findOne<T>(collection, id, queryOpts as QueryOptions);
    },
    create: async (data: Partial<T>, queryOpts?: QueryOptions) => {
      return await dbAdapter.create<T>(collection, data, queryOpts as QueryOptions);
    },
    update: async (id: string, data: Partial<T>, queryOpts?: QueryOptions) => {
      return await dbAdapter.update<T>(collection, id, data, queryOpts as QueryOptions);
    },
    delete: async (id: string, queryOpts?: QueryOptions) => {
      return await dbAdapter.delete(collection, id, queryOpts as QueryOptions);
    },
    bulkCreate: async (data: Partial<T>[], queryOpts?: QueryOptions) => {
      if (!dbAdapter.createMany) {
        throw new Error('Adapter does not support bulkCreate');
      }
      return await dbAdapter.createMany<T>(
        collection,
        data as Record<string, unknown>[],
        queryOpts as QueryOptions,
      );
    },
    bulkUpdate: async (filter: Filter, data: Partial<T>, queryOpts?: QueryOptions) => {
      if (!dbAdapter.updateMany) {
        throw new Error('Adapter does not support bulkUpdate');
      }
      return await dbAdapter.updateMany<T>(collection, filter, data, queryOpts as QueryOptions);
    },
    ingest: options?.ingest,
    attachFile: options?.attachFile,
  };
}
