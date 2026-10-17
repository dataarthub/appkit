import type { DataAccessAdapter } from "../../types";
import type { StorageAdapter, StorageObject, StorageURLOptions } from "../../../storage/index";

/** Logical file or folder, independent of a renderer, selection or layout. */
export interface FileNode {
  id: string;
  physicalKey?: string;
  name: string;
  kind: 'file' | 'folder';
  size?: number;
  contentType?: string;
  lastModified?: Date;
  original?: StorageObject;
  metadata?: Record<string, string>;
  isVirtual?: boolean;
}
export type FileNodeKind = FileNode['kind'];
/** File operations do not imply authorization, recursive folder operations or statutory compliance. */
export interface FileProvider {
  listNodes(path: string): Promise<{ nodes: FileNode[]; hasMore: boolean }>;
  searchNodes(criteria: FileSearchCriteria): Promise<FileNode[]>;
  uploadFile(path: string, file: File | Blob, name: string): Promise<FileNode>;
  createFolder(path: string, name: string): Promise<FileNode>;
  getUrl(node: FileNode, options?: StorageURLOptions): Promise<string>;
  deleteNodes(ids: string[]): Promise<void>;
  renameNode(id: string, newName: string): Promise<FileNode>;
  moveNode(id: string, newPath: string): Promise<FileNode>;
  updateMetadata(id: string, metadata: Record<string, string>): Promise<FileNode>;
  verifyIntegrity?(id: string): Promise<{ valid: boolean; error?: string }>;
}
export interface FileSearchCriteria { query?: string; tags?: string[]; }
/** Existing record layout. Folder records may omit file-only size/content_type at runtime. */
export interface FileRecord {
  id: string;
  folder: string;
  filename: string;
  physical_key: string;
  size: number;
  content_type: string;
  /** Comma-separated tags, with no quoting or escaped commas. */
  tags?: string;
  updated_at: string;
  kind: FileNodeKind;
}
export type FileRecordInput = Omit<FileRecord, 'size' | 'content_type'> & Partial<Pick<FileRecord, 'size' | 'content_type'>>;
export interface UploadCompensationContext {
  readonly cause: unknown;
  readonly record: Readonly<FileRecordInput>;
  readonly object: Readonly<StorageObject>;
}
export interface DataAccessFileProviderOptions {
  dataAccess: DataAccessAdapter;
  storage: StorageAdapter;
  collection?: string;
  physicalPrefix?: string;
  /** Default metadata-only. storage-and-metadata deletes the visible object key first, then its record. */
  deleteMode?: 'metadata-only' | 'storage-and-metadata';
  /** Default portable: literal case-insensitive filename substring + exact, case-sensitive AND tags. */
  searchMode?: 'portable' | 'legacy-adapter';
  /** Default 10,000. Bounds local search processing after the adapter has returned records, not network retrieval. */
  maxSearchRecords?: number;
  /** Optional exhaustive, authorized candidate lookup for indexed/back-end search. Portable predicates still apply. */
  searchRecords?: (criteria: Readonly<FileSearchCriteria>) => Promise<FileRecord[]>;
  /** Default retain. Compensation is opt-in because a rejected create may actually have committed. */
  uploadFailurePolicy?: 'retain' | 'compensate';
  /** Required for compensate: confirm definitive non-commit AND exclusive ownership of the uploaded key. A missing read-back alone is insufficient. */
  canCompensateUpload?: (context: UploadCompensationContext) => boolean | Promise<boolean>;
  /** Generate a fresh, unique ID in the application's namespace. Default Web Crypto randomUUID. */
  createId?: () => string;
}
export type FileCompensationStatus = 'not-requested' | 'retained' | 'unconfirmed' | 'deleted' | 'failed';
/** Partial failure details for reconciliation. A DB/blob pair is not a distributed transaction. */
export class FileProviderOperationError extends Error {
  constructor(
    readonly operation: 'upload' | 'delete',
    readonly stage: 'create-record' | 'lookup-record' | 'delete-storage' | 'delete-record',
    options: {
      cause: unknown; nodeId: string; physicalKey?: string; completedIds?: readonly string[];
      compensation?: FileCompensationStatus; compensationError?: unknown; storageDeleted?: boolean;
    },
  ) {
    super(`File ${operation} failed at ${stage}`, { cause: options.cause });
    this.name = 'FileProviderOperationError';
    this.nodeId = options.nodeId;
    this.physicalKey = options.physicalKey;
    this.completedIds = Object.freeze([...(options.completedIds ?? [])]);
    this.compensation = options.compensation ?? 'not-requested';
    this.compensationError = options.compensationError;
    this.storageDeleted = options.storageDeleted ?? false;
  }
  readonly nodeId: string;
  readonly physicalKey?: string;
  readonly completedIds: readonly string[];
  readonly compensation: FileCompensationStatus;
  readonly compensationError?: unknown;
  readonly storageDeleted: boolean;
}
