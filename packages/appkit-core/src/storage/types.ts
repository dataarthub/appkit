/**
 * Binary data representation (compatible with Browser, Edge, and Node.js runtimes).
 *
 * @see {@link StorageAdapter.upload} for an upload example. Adapter upload signatures support their declared subset; ArrayBuffer must be wrapped in Uint8Array first.
 */
export type BinaryData = Uint8Array | ArrayBuffer | Blob | ReadableStream | string;

// =============================================================================
// Storage Object
// =============================================================================

/**
 * Represents a file object in storage.
 *
 * @example
 * ```typescript
 * import type { StorageObject } from "@alneas/appkit-core/storage";
 *
 * const object: StorageObject = { key: "notes.txt", size: 5, contentType: "text/plain" };
 * console.log(object.key);
 * ```
 */
export interface StorageObject {

  /** Unique object key (path). */
  key: string;

  /** File size in bytes. */
  size?: number;

  /** MIME type. */
  contentType?: string;

  /** Last modified timestamp. */
  lastModified?: Date;

  /** ETag for caching and versioning. */
  etag?: string;

  /** Custom metadata key-value pairs. */
  metadata?: Record<string, string>;
}

// =============================================================================
// Operation Options
// =============================================================================

/**
 * Upload settings interpreted by the selected storage adapter.
 *
 * @remarks
 * Access control belongs to the host filesystem/server or remote bucket policy.
 * The supplied adapters ignore `public`; uploading does not configure access.
 * Local storage infers a MIME type from the key extension when contentType is
 * omitted. S3, R2 and OCI forward only an explicitly supplied contentType.
 *
 * @example
 * ```typescript
 * import type { StorageAdapter, StorageUploadOptions } from '@alneas/appkit-core/storage';
 *
 * // The host supplies an adapter configured for its storage and access policy.
 * export async function uploadReport(storage: StorageAdapter, report: Uint8Array) {
 *   const options: StorageUploadOptions = {
 *     contentType: 'application/pdf',
 *     metadata: { author: 'Taro Yamada' },
 *     cacheControl: 'max-age=3600',
 *   };
 *   return storage.upload('docs/report.pdf', report, options);
 * }
 * ```
 */
export interface StorageUploadOptions {

  /** MIME type to send. Only LocalStorageAdapter infers it from the extension when omitted. */
  contentType?: string;

  /** Custom metadata forwarded by remote adapters; ignored by LocalStorageAdapter. */
  metadata?: Record<string, string>;

  /** Cache-Control value forwarded by remote adapters; ignored by LocalStorageAdapter. */
  cacheControl?: string;

  /** Reserved access hint, ignored by all supplied adapters; neither true nor false changes access policy. */
  public?: boolean;
}

/**
 * Options for generating URLs.
 *
 * @example
 * ```typescript
 * import type { StorageAdapter } from '@alneas/appkit-core/storage';
 *
 * export async function example(storage: StorageAdapter) {
 *   return storage.getUrl("notes.txt", { signed: true, expiresIn: 300 });
 * }
 * ```
 */
export interface StorageURLOptions {

  /** Expiration time for signed URLs in seconds. */
  expiresIn?: number;

  /** Filename for forced download attachment. */
  downloadFilename?: string;

  /** Whether to generate a signed URL (default: true for private objects). */
  signed?: boolean;
}

/**
 * Options for listing objects.
 *
 * @example
 * ```typescript
 * import type { StorageAdapter, StorageListOptions } from '@alneas/appkit-core/storage';
 *
 * export async function listInvoiceDirectory(storage: StorageAdapter) {
 *   const options: StorageListOptions = {
 *     prefix: 'invoices/2026/', delimiter: '/', limit: 100,
 *   };
 *   return storage.list(options);
 * }
 * ```
 */
export interface StorageListOptions {

  /** Prefix to filter objects by. */
  prefix?: string;

  /** Delimiter character (e.g. '/' for hierarchical directory listing). */
  delimiter?: string;

  /** Provider listing limit; local storage counts objects and prefixes together (default 1000). */
  limit?: number;

  /** Provider continuation token; ignored by LocalStorageAdapter. */
  cursor?: string;

  /** Provider metadata request; local storage ignores this and always includes file metadata. */
  includeMetadata?: boolean;
}

/**
 * Objects and provider-specific continuation information returned by a listing.
 *
 * @remarks
 * LocalStorageAdapter never supplies nextCursor. Its hasMore means the combined
 * object/prefix count reached the limit, even when no additional entry exists.
 * Local listings cannot continue beyond that limit with cursor.
 *
 * @example
 * ```typescript
 * import type { StorageAdapter } from '@alneas/appkit-core/storage';
 *
 * export async function listInvoices(storage: StorageAdapter) {
 *   const options = { prefix: 'invoices/', limit: 100 };
 *   const first = await storage.list(options);
 *   // Continue only when the adapter actually supplies a cursor.
 *   const next = first.hasMore && first.nextCursor !== undefined
 *     ? await storage.list({ ...options, cursor: first.nextCursor })
 *     : undefined;
 *   return { first, next };
 * }
 * ```
 */
export interface StorageListResult {

  /** Array of storage objects. */
  objects: StorageObject[];

  /** Array of common prefixes (subdirectories). */
  prefixes?: string[];

  /** Provider continuation token, if supported and returned; absence alone does not guarantee completeness. */
  nextCursor?: string;

  /** Provider continuation indicator; local storage reports only whether the listing limit was reached. */
  hasMore: boolean;
}

// =============================================================================
// Storage Adapter Interface
// =============================================================================

/**
 * Unified storage adapter interface.
 *
 * Provides a consistent API for file operations across different
 * storage providers (local filesystem, Cloudflare R2, AWS S3, etc.).
 *
 * ## Implementations
 * - `LocalStorageAdapter`: Local filesystem (for development and testing)
 * - `R2StorageAdapter`: Cloudflare R2 (for production delivery)
 *
 * @example
 * ```typescript
 * import type { StorageAdapter } from '@alneas/appkit-core/storage';
 *
 * export async function example(storage: StorageAdapter) {
 *   return storage.upload("notes.txt", "hello", { contentType: "text/plain" });
 * }
 * ```
 */
export interface StorageAdapter {

  /**
   * Uploads a file to storage.
   *
   * @param key - Object key (path)
   * @param data - File data (Uint8Array, Blob, ReadableStream, or string)
   * @param options - Adapter-specific settings; see {@link StorageUploadOptions} for MIME and access-policy limits.
   * @returns Metadata reported by the selected adapter for the uploaded object.
   * @throws Rejects when the selected adapter rejects the upload.
   * @remarks The host configures persistence and access control. The public option
   * does not change access policy in any supplied adapter.
   *
   * @example
   * ```typescript
   * import type { StorageAdapter } from '@alneas/appkit-core/storage';
   *
   * export async function saveInvoice(storage: StorageAdapter, pdfBuffer: Uint8Array) {
   *   return storage.upload('invoices/2026/inv-001.pdf', pdfBuffer, {
   *     contentType: 'application/pdf',
   *   });
   * }
   * ```
   */
  upload(
    key: string,
    data: Uint8Array | Blob | ReadableStream | string,
    options?: StorageUploadOptions,
  ): Promise<StorageObject>;


  /**
   * Downloads a file from storage.
   *
   * @param key - Object key (path)
   * @returns File data as Uint8Array, or null if not found
   *
   * @example
   * ```typescript
   * import type { StorageAdapter } from '@alneas/appkit-core/storage';
   *
   * export async function example(storage: StorageAdapter) {
   *   return storage.download("reports/note.txt");
   * }
   * ```
   */
  download(key: string): Promise<Uint8Array | null>;


  /**
   * Retrieves a URL to access the object.
   *
   * @param key - Object key (path)
   * @param options - URL generation options
   * @returns URL string (signed or public depending on options)
   *
   * @example
   * ```typescript
   * import type { StorageAdapter } from '@alneas/appkit-core/storage';
   *
   * export async function example(storage: StorageAdapter) {
   *   return storage.getUrl("reports/note.txt", { expiresIn: 300 });
   * }
   * ```
   */
  getUrl(key: string, options?: StorageURLOptions): Promise<string>;

  /**
   * Signs a URL for a direct HTTP PUT upload.
   *
   * @param key - Destination object key.
   * @param options - Optional expiry in seconds, defaulting to the configured value or 3600; valid range 1–604800.
   * @returns A signed PUT URL; no object is uploaded by this call.
   * @throws Rejects when the supplied adapter rejects the operation.
   * @example
   * ```typescript
   * import type { StorageAdapter } from '@alneas/appkit-core/storage';
   *
   * export async function example(storage: StorageAdapter) {
   *   return storage.getUploadUrl?.("reports/note.txt", { expiresIn: 300 });
   * }
   * ```
   */
  getUploadUrl?(key: string, options?: Pick<StorageURLOptions, 'expiresIn'>): Promise<string>;

  /**
   * Signs a URL for an HTTP GET download.
   *
   * @param key - Object key to retrieve.
   * @param options - Optional expiry in seconds (1–604800) and download filename; signing is always performed.
   * @returns A signed GET URL; no object is fetched by this call.
   * @throws Rejects when the supplied adapter rejects the operation.
   * @example
   * ```typescript
   * import type { StorageAdapter } from '@alneas/appkit-core/storage';
   *
   * export async function example(storage: StorageAdapter) {
   *   return storage.getDownloadUrl?.("reports/note.txt", { expiresIn: 300 });
   * }
   * ```
   */
  getDownloadUrl?(key: string, options?: StorageURLOptions): Promise<string>;


  /**
   * Deletes an object from storage.
   *
   * @param key - Object key (path)
   * @returns True if deleted successfully, false if the object did not exist
   *
   * @example
   * ```typescript
   * import type { StorageAdapter } from '@alneas/appkit-core/storage';
   *
   * export async function example(storage: StorageAdapter) {
   *   return storage.delete("reports/note.txt");
   * }
   * ```
   */
  delete(key: string): Promise<boolean>;


  /**
   * Checks whether an object exists in storage.
   *
   * @param key - Object key (path)
   * @returns True if the object exists
   *
   * @example
   * ```typescript
   * import type { StorageAdapter } from '@alneas/appkit-core/storage';
   *
   * export async function example(storage: StorageAdapter) {
   *   return storage.exists("reports/note.txt");
   * }
   * ```
   */
  exists(key: string): Promise<boolean>;


  /**
   * Retrieves object metadata without downloading the content.
   *
   * @param key - Object key (path)
   * @returns Object metadata, or null if not found
   *
   * @example
   * ```typescript
   * import type { StorageAdapter } from '@alneas/appkit-core/storage';
   *
   * export async function example(storage: StorageAdapter) {
   *   return storage.head("reports/note.txt");
   * }
   * ```
   */
  head(key: string): Promise<StorageObject | null>;


  /**
   * Lists objects in storage.
   *
   * @param options - Provider-specific filters and limits; omitted options use adapter defaults.
   * @returns Objects, optional prefixes and provider-specific continuation information; see {@link StorageListResult}.
   * @throws Rejects when the selected adapter rejects the listing request.
   * @remarks LocalStorageAdapter ignores cursor and never supplies nextCursor. Its
   * hasMore reports reaching the limit, so it cannot drive a pagination loop.
   * @example
   * ```typescript
   * import type { StorageAdapter } from '@alneas/appkit-core/storage';
   *
   * export async function firstInvoicePage(storage: StorageAdapter) {
   *   return storage.list({ prefix: 'invoices/2026/', limit: 50 });
   * }
   * ```
   */
  list(options?: StorageListOptions): Promise<StorageListResult>;


  /**
   * Copies an object to a new key.
   *
   * @param sourceKey - Source object key
   * @param destinationKey - Destination object key
   * @returns Metadata of the copied object
   *
   * @example
   * ```typescript
   * import type { StorageAdapter } from '@alneas/appkit-core/storage';
   *
   * export async function example(storage: StorageAdapter) {
   *   return storage.copy?.("reports/note.txt", "archive/note.txt");
   * }
   * ```
   */
  copy?(sourceKey: string, destinationKey: string): Promise<StorageObject>;


  /**
   * Moves an object to a new key (copy + delete).
   *
   * @param sourceKey - Source object key
   * @param destinationKey - Destination object key
   * @returns Metadata of the moved object
   *
   * @example
   * ```typescript
   * import type { StorageAdapter } from '@alneas/appkit-core/storage';
   *
   * export async function example(storage: StorageAdapter) {
   *   return storage.move?.("reports/note.txt", "archive/note.txt");
   * }
   * ```
   */
  move?(sourceKey: string, destinationKey: string): Promise<StorageObject>;
}

// =============================================================================
// Adapter Configuration
// =============================================================================

/**
 * Configuration for LocalStorageAdapter.
 *
 * @example
 * ```typescript
 * import type { LocalStorageConfig } from "@alneas/appkit-core/storage";
 *
 * // The host provides real credentials/endpoint or its application-owned local directory.
 * export function inspectConfig(config: LocalStorageConfig) {
 *   return config.baseDir;
 * }
 * ```
 */
export interface LocalStorageConfig {

  /** Base directory for storage. */
  baseDir: string;

  /** Base URL for generating public URLs (optional). */
  baseUrl?: string;
}

/**
 * Configuration for R2StorageAdapter (S3-compatible).
 *
 * @example
 * ```typescript
 * import type { R2StorageConfig } from "@alneas/appkit-core/storage";
 *
 * // The host provides real credentials/endpoint or its application-owned local directory.
 * export function inspectConfig(config: R2StorageConfig) {
 *   return config.bucket;
 * }
 * ```
 */
export interface R2StorageConfig {

  /** Signing region for a custom S3-compatible endpoint; defaults to R2 auto. */
  region?: string;

  /** Cloudflare account ID. */
  accountId: string;

  /** R2 bucket name. */
  bucket: string;

  /** Host-supplied credential identifier included in signed remote requests. */
  accessKeyId: string;

  /** Host-supplied signing secret; keep it outside untrusted client code. */
  secretAccessKey: string;

  /** Custom endpoint URL (optional, auto-derived from accountId). */
  endpoint?: string;

  /** Public bucket URL for unsigned access (optional). */
  publicUrl?: string;

  /** Default expiration time for signed URLs in seconds (default: 3600). */
  defaultExpiresIn?: number;
}

// =============================================================================
// S3 Adapter Configuration
// =============================================================================

/**
 * Configuration for S3StorageAdapter.
 *
 * Configuration for AWS S3 bucket with Object Lock support.
 * Can be used for original document retention under statutory compliance requirements.
 *
 * @example
 * ```typescript
 * import type { S3StorageConfig } from "@alneas/appkit-core/storage";
 *
 * // The host provides real credentials/endpoint or its application-owned local directory.
 * export function inspectConfig(config: S3StorageConfig) {
 *   return config.bucket;
 * }
 * ```
 */
export interface S3StorageConfig {

  /** AWS region. */
  region: string;

  /** S3 bucket name. */
  bucket: string;

  /** Host-supplied credential identifier included in signed remote requests. */
  accessKeyId: string;

  /** Host-supplied signing secret; keep it outside untrusted client code. */
  secretAccessKey: string;

  /** Custom endpoint URL (optional, e.g. LocalStack). */
  endpoint?: string;

  /** Whether Object Lock is enabled (default: false). */
  objectLockEnabled?: boolean;

  /** Object Lock retention mode (default: COMPLIANCE). */
  objectLockMode?: 'GOVERNANCE' | 'COMPLIANCE';

  /** Default retention period in days (default: 2555 days = 7 years). */
  defaultRetentionDays?: number;

  /** Default expiration time for signed URLs in seconds (default: 3600). */
  defaultExpiresIn?: number;
}

/**
 * Configuration for OCIStorageAdapter (S3-compatible).
 *
 * Configuration for OCI Object Storage bucket with Object Lock (Retention Rules) support.
 * Can be used for original document retention under statutory compliance requirements.
 *
 * @example
 * ```typescript
 * import type { OCIStorageConfig } from "@alneas/appkit-core/storage";
 *
 * // The host provides real credentials/endpoint or its application-owned local directory.
 * export function inspectConfig(config: OCIStorageConfig) {
 *   return config.bucket;
 * }
 * ```
 */
export interface OCIStorageConfig {

  /** OCI tenancy namespace. */
  namespace: string;

  /** OCI region (e.g. ap-tokyo-1). */
  region: string;

  /** Bucket name. */
  bucket: string;

  /** Host-supplied credential identifier included in signed remote requests. */
  accessKeyId: string;

  /** Host-supplied signing secret; keep it outside untrusted client code. */
  secretAccessKey: string;

  /** Custom endpoint URL (optional). */
  endpoint?: string;

  /** Whether Object Lock is enabled (default: false). */
  objectLockEnabled?: boolean;

  /**
   * Object Lock retention mode (default: GOVERNANCE).
   * - COMPLIANCE: No user (including administrators) can delete objects during retention. Risk of retained data post-cancellation.
   * - GOVERNANCE: Users with administrative privileges can delete objects. Requires internal administration rules for legal compliance.
   */
  objectLockMode?: 'GOVERNANCE' | 'COMPLIANCE';

  /** Default retention period in days (default: 2555 days = 7 years). */
  defaultRetentionDays?: number;

  /** Default expiration time for signed URLs in seconds (default: 3600). */
  defaultExpiresIn?: number;
}

