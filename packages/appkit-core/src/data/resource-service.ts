import type { DataAccessAdapter, Filter, QueryOptions } from './types';
import type { HeaderMapping, UploadProgress } from './common-types';

export type CsvCellValue = string | number | boolean | null | undefined;
export type CsvRow = Record<string, CsvCellValue>;

/**
 * Represents a metadata object for file attachments.
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
  [key: string]: unknown;
}

/**
 * Interface for a service providing type-safe resource operations.
 */
export interface ResourceService<T, TMetadata extends UploadFileMetadata = UploadFileMetadata> {
  /** Retrieves a list of resources matching the criteria */
  find: (filters?: Filter, options?: QueryOptions) => Promise<T[]>;
  /** Retrieves a single resource record by ID */
  findOne: (id: string, options?: QueryOptions) => Promise<T | null>;
  /** Creates a new resource record */
  create: (data: Partial<T>, options?: QueryOptions) => Promise<T>;
  /** Updates the resource record with the specified ID */
  update: (id: string, data: Partial<T>, options?: QueryOptions) => Promise<T>;
  /** Physically or logically deletes the resource record with the specified ID */
  delete: (id: string, options?: QueryOptions) => Promise<unknown>;
  /** Bulk creates multiple resource records */
  bulkCreate: (data: Partial<T>[], options?: QueryOptions) => Promise<T[]>;
  /** Bulk updates multiple records matching the filter criteria */
  bulkUpdate: (filter: Filter, data: Partial<T>, options?: QueryOptions) => Promise<T[]>;
  /**
   * Bulk imports CSV data rows according to header mapping definitions.
   * An optional progress handler can be configured.
   */
  ingest?: (
    data: CsvRow[],
    mapping: HeaderMapping[],
    options?: {
      /** Callback to report progress */
      onProgress?: (processed: number, total: number) => void;
      /** Batch size for chunked processing */
      batchSize?: number;
      /** Whether to abort processing upon encountering an error */
      stopOnError?: boolean;
    },
  ) => Promise<UploadProgress>;
  /**
   * Uploads and associates a file with a specific resource record.
   */
  attachFile?: (file: File, entityId: string, metadata?: TMetadata) => Promise<unknown>;
}

/**
 * Options for generating a resource service.
 */
export interface ResourceServiceOptions<_T, TMetadata extends UploadFileMetadata = UploadFileMetadata> {
  /** Default QueryOptions for find(); per-call options override these values */
  defaultQueryOptions?: QueryOptions;
  /** Custom override implementation for bulk CSV ingestion */
  ingest?: (
    data: CsvRow[],
    mapping: HeaderMapping[],
    options?: {
      onProgress?: (processed: number, total: number) => void;
      batchSize?: number;
      stopOnError?: boolean;
    },
  ) => Promise<UploadProgress>;
  /** Custom override implementation for file attachment upload */
  attachFile?: (file: File, entityId: string, metadata?: TMetadata) => Promise<unknown>;
}

const DEFAULT_FILTER: Filter = {};

/**
 * Creates a generic service providing type-safe CRUD operations on a collection (table).
 *
 * @param dbAdapter Database access adapter
 * @param collection Name of the target table or collection
 * @param options Custom processing options for CSV import, file attachment, etc.
 * @returns Resource service object
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
