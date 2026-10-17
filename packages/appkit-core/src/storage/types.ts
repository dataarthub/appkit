/**
 * @fileoverview Storage Abstraction Type Definitions
 *
 * Defines unified interfaces for file storage operations.
 * Supports local filesystem and cloud storage (Cloudflare R2, S3-compatible).
 *
 * @module lib/storage/types
 */

/**
 * Binary data representation (compatible with Browser, Edge, and Node.js runtimes).
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
 * const object: StorageObject = {
 *   key: 'invoices/2026/INV-001.pdf',
 *   size: 102400,
 *   contentType: 'application/pdf',
 *   lastModified: new Date('2026-01-12'),
 * };
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
 * Options for uploading files.
 *
 * @example
 * ```typescript
 * await storage.upload('docs/report.pdf', buffer, {
 *   contentType: 'application/pdf',
 *   metadata: { author: 'Taro Yamada' },
 *   cacheControl: 'max-age=3600',
 * });
 * ```
 */
export interface StorageUploadOptions {
  /** MIME type (auto-detected if omitted). */
  contentType?: string;
  /** Custom metadata to attach. */
  metadata?: Record<string, string>;
  /** Cache-Control header value. */
  cacheControl?: string;
  /** Whether the object should be publicly accessible (default: false). */
  public?: boolean;
}

/**
 * Options for generating URLs.
 *
 * @example
 * ```typescript
 * // Signed URL (valid for 1 hour)
 * const url = await storage.getUrl('private/doc.pdf', {
 *   expiresIn: 3600,
 *   signed: true,
 * });
 *
 * // Download URL
 * const downloadUrl = await storage.getUrl('file.pdf', {
 *   downloadFilename: 'invoice.pdf',
 * });
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
 * const result = await storage.list({
 *   prefix: 'invoices/2026/',
 *   delimiter: '/',
 *   limit: 100,
 * });
 * ```
 */
export interface StorageListOptions {
  /** Prefix to filter objects by. */
  prefix?: string;
  /** Delimiter character (e.g. '/' for hierarchical directory listing). */
  delimiter?: string;
  /** Maximum number of objects to return. */
  limit?: number;
  /** Continuation token for pagination. */
  cursor?: string;
  /** Whether to include object metadata. */
  includeMetadata?: boolean;
}

/**
 * Result of a list operation.
 *
 * @example
 * ```typescript
 * const { objects, prefixes, hasMore, nextCursor } = await storage.list();
 * if (hasMore) {
 *   const nextPage = await storage.list({ cursor: nextCursor });
 * }
 * ```
 */
export interface StorageListResult {
  /** Array of storage objects. */
  objects: StorageObject[];
  /** Array of common prefixes (subdirectories). */
  prefixes?: string[];
  /** Cursor for the next page, or undefined if no more pages. */
  nextCursor?: string;
  /** Whether there are more results available. */
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
 * // Development environment
 * const storage = new LocalStorageAdapter({
 *   baseDir: './uploads',
 * });
 *
 * // Production environment
 * const storage = new R2StorageAdapter({
 *   accountId: 'xxx',
 *   bucket: 'my-bucket',
 *   accessKeyId: 'xxx',
 *   secretAccessKey: 'xxx',
 * });
 *
 * // Common API
 * await storage.upload('invoices/inv-001.pdf', pdfBuffer);
 * const url = await storage.getUrl('invoices/inv-001.pdf', { expiresIn: 3600 });
 * const { objects } = await storage.list({ prefix: 'invoices/' });
 * ```
 */
export interface StorageAdapter {
  /**
   * Uploads a file to storage.
   *
   * @param key - Object key (path)
   * @param data - File data (Uint8Array, Blob, ReadableStream, or string)
   * @param options - Upload options
   * @returns Metadata of the uploaded object
   *
   * @example
   * ```typescript
   * const result = await storage.upload(
   *   'invoices/2026/inv-001.pdf',
   *   pdfBuffer,
   *   { contentType: 'application/pdf' }
   * );
   * console.log(result.key, result.size);
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
   * const data = await storage.download('invoices/inv-001.pdf');
   * if (data) {
   *   fs.writeFileSync('local-copy.pdf', data);
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
   * // Signed URL (valid for 1 hour)
   * const signedUrl = await storage.getUrl('private/doc.pdf', {
   *   expiresIn: 3600,
   * });
   *
   * // Public URL
   * const publicUrl = await storage.getUrl('public/logo.png', {
   *   signed: false,
   * });
   * ```
   */
  getUrl(key: string, options?: StorageURLOptions): Promise<string>;
  /** Optional direct-upload capability for remote storage adapters. */
  getUploadUrl?(key: string, options?: Pick<StorageURLOptions, 'expiresIn'>): Promise<string>;
  /** Optional explicit signed-download capability. */
  getDownloadUrl?(key: string, options?: StorageURLOptions): Promise<string>;

  /**
   * Deletes an object from storage.
   *
   * @param key - Object key (path)
   * @returns True if deleted successfully, false if the object did not exist
   *
   * @example
   * ```typescript
   * const deleted = await storage.delete('temp/old-file.txt');
   * console.log(deleted ? 'Deleted' : 'Not found');
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
   * if (await storage.exists('config.json')) {
   *   const data = await storage.download('config.json');
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
   * const meta = await storage.head('invoices/inv-001.pdf');
   * if (meta) {
   *   console.log(`Size: ${meta.size} bytes`);
   *   console.log(`Last modified: ${meta.lastModified}`);
   * }
   * ```
   */
  head(key: string): Promise<StorageObject | null>;

  /**
   * Lists objects in storage.
   *
   * @param options - List options (prefix, delimiter, limit, cursor)
   * @returns Paginated list result
   *
   * @example
   * ```typescript
   * // Filter by prefix
   * const result = await storage.list({
   *   prefix: 'invoices/2026/',
   *   limit: 50,
   * });
   *
   * for (const obj of result.objects) {
   *   console.log(obj.key, obj.size);
   * }
   *
   * // Retrieve next page
   * if (result.hasMore) {
   *   const nextPage = await storage.list({ cursor: result.nextCursor });
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
   * await storage.copy('templates/invoice.pdf', 'invoices/inv-001.pdf');
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
   * await storage.move('temp/upload.pdf', 'invoices/inv-001.pdf');
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
 * const config: LocalStorageConfig = {
 *   baseDir: './uploads',
 *   baseUrl: 'http://localhost:3000/files',
 * };
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
 * const config: R2StorageConfig = {
 *   accountId: process.env.R2_ACCOUNT_ID!,
 *   bucket: 'my-bucket',
 *   accessKeyId: process.env.R2_ACCESS_KEY_ID!,
 *   secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
 *   publicUrl: 'https://pub-xxx.r2.dev',
 *   defaultExpiresIn: 3600,
 * };
 * ```
 */
export interface R2StorageConfig {
  /** Signing region for a custom S3-compatible endpoint; defaults to R2 auto. */
  region?: string;
  /** Cloudflare account ID. */
  accountId: string;
  /** R2 bucket name. */
  bucket: string;
  /** Access key ID. */
  accessKeyId: string;
  /** Secret access key. */
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
 * const config: S3StorageConfig = {
 *   region: 'ap-northeast-1',
 *   bucket: 'my-compliance-bucket',
 *   accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
 *   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
 *   objectLockEnabled: true,
 *   defaultRetentionDays: 2555, // 7 years
 * };
 * ```
 */
export interface S3StorageConfig {
  /** AWS region. */
  region: string;
  /** S3 bucket name. */
  bucket: string;
  /** Access key ID. */
  accessKeyId: string;
  /** Secret access key. */
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
 * const config: OCIStorageConfig = {
 *   namespace: 'your-tenancy-namespace',
 *   region: 'ap-tokyo-1',
 *   bucket: 'my-compliance-bucket',
 *   accessKeyId: process.env.OCI_ACCESS_KEY_ID!,
 *   secretAccessKey: process.env.OCI_SECRET_ACCESS_KEY!,
 *   objectLockEnabled: true,
 * };
 * ```
 */
export interface OCIStorageConfig {
  /** OCI tenancy namespace. */
  namespace: string;
  /** OCI region (e.g. ap-tokyo-1). */
  region: string;
  /** Bucket name. */
  bucket: string;
  /** Access key ID (Customer Secret Key). */
  accessKeyId: string;
  /** Secret access key (Customer Secret Key). */
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

