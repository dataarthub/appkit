/**
 * @fileoverview Cloudflare R2 Storage Adapter
 *
 * S3-compatible storage implementation for Cloudflare R2.
 * Supports secure file access via signed and unsigned URLs.
 *
 * @module lib/storage/r2-adapter
 */

import { S3CompatibleRuntime } from './s3-sigv4';
import type {
  StorageAdapter,
  StorageObject,
  StorageUploadOptions,
  StorageURLOptions,
  StorageListOptions,
  StorageListResult,
  R2StorageConfig,
} from './types';

// =============================================================================
// R2 Storage Adapter
// =============================================================================

/**
 * Storage adapter for Cloudflare R2 (S3-compatible).
 *
 * ## Features
 * - Uses S3-compatible API
 * - Signed URLs (with expiration, for private files)
 * - Unsigned URLs (for public buckets)
 * - File upload, download, list, copy, and move operations
 *
 * @example
 * ```typescript
 * const storage = new R2StorageAdapter({
 *   accountId: 'your-account-id',
 *   bucket: 'my-bucket',
 *   accessKeyId: 'your-access-key',
 *   secretAccessKey: 'your-secret-key',
 *   publicUrl: 'https://pub-xxx.r2.dev', // For public bucket (optional)
 * });
 *
 * // Upload
 * await storage.upload('invoices/inv-001.pdf', pdfBuffer, { public: true });
 *
 * // Signed URL (private)
 * const signedUrl = await storage.getUrl('invoices/inv-001.pdf', {
 *   expiresIn: 3600,
 * });
 *
 * // Unsigned URL (public bucket)
 * const publicUrl = await storage.getUrl('invoices/inv-001.pdf', {
 *   signed: false,
 * });
 * ```
 */
export class R2StorageAdapter implements StorageAdapter {
  /** S3 runtime instance */
  private client: S3CompatibleRuntime;
  /** Adapter configuration */
  private config: R2StorageConfig;

  /**
   * Creates an instance of R2StorageAdapter.
   *
   * @param config - R2 configuration (account ID, bucket, credentials)
   */
  constructor(config: R2StorageConfig) {
    this.config = config;

    const endpoint = config.endpoint || `https://${config.accountId}.r2.cloudflarestorage.com`;

    this.client = new S3CompatibleRuntime({
      region: config.region ?? 'auto',
      bucket: config.bucket,
      endpoint,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      forcePathStyle: true,
      defaultExpiresIn: config.defaultExpiresIn,
    });
  }

  /**
   * Uploads a file to R2.
   *
   * @param key - Object key (path)
   * @param data - File data
   * @param options - Upload options
   * @returns Metadata of the uploaded object
   */
  async upload(
    key: string,
    data: Uint8Array | Blob | ReadableStream | string,
    options?: StorageUploadOptions,
  ): Promise<StorageObject> {
    let payload: Uint8Array | string;

    if (typeof data === 'string') {
      payload = data;
    } else if (data instanceof Blob) {
      payload = new Uint8Array(await data.arrayBuffer());
    } else if (data instanceof ReadableStream) {
      const chunks: Uint8Array[] = [];
      const reader = data.getReader();
      let done = false;
      while (!done) {
        const result = await reader.read();
        done = result.done;
        if (result.value) {
          chunks.push(result.value);
        }
      }
      const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
      const merged = new Uint8Array(totalLen);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }
      payload = merged;
    } else {
      payload = data;
    }

    await this.client.putObject({
      key,
      body: payload,
      contentType: options?.contentType,
      cacheControl: options?.cacheControl,
      metadata: options?.metadata,
    });

    // Fetch metadata after upload
    return (await this.head(key)) || { key };
  }

  /**
   * Downloads a file from R2.
   *
   * @param key - Object key (path)
   * @returns File data as Uint8Array, or null if not found
   */
  async download(key: string): Promise<Uint8Array | null> {
    return this.client.getObject(key);
  }

  /**
   * Retrieves a URL to access the object.
   *
   * @param key - Object key (path)
   * @param options - URL generation options
   * @returns URL string (signed or unsigned)
   *
   * @example
   * ```typescript
   * // Signed URL (valid for 1 hour)
   * const signedUrl = await storage.getUrl('private/doc.pdf', {
   *   expiresIn: 3600,
   * });
   *
   * // Unsigned URL (requires publicUrl setting)
   * const publicUrl = await storage.getUrl('public/logo.png', {
   *   signed: false,
   * });
   * ```
   */
  /** Create a signed PUT URL for direct uploads. */
  async getUploadUrl(key: string, options?: Pick<StorageURLOptions, 'expiresIn'>): Promise<string> {
    return this.client.getSignedPutUrl(key, options);
  }

  /** Create a signed download URL. */
  async getDownloadUrl(key: string, options?: StorageURLOptions): Promise<string> {
    return this.client.getSignedGetUrl(key, options);
  }

  async getUrl(key: string, options?: StorageURLOptions): Promise<string> {
    const signed = options?.signed !== false;

    // Unsigned URL (public bucket)
    if (!signed && this.config.publicUrl) {
      return `${this.config.publicUrl}/${key}`;
    }

    return this.client.getSignedGetUrl(key, options);
  }

  /**
   * Deletes an object from R2.
   *
   * @param key - Object key (path)
   * @returns True if deleted successfully
   */
  async delete(key: string): Promise<boolean> {
    return this.client.deleteObject(key);
  }

  /**
   * Checks whether an object exists.
   *
   * @param key - Object key (path)
   * @returns True if the object exists
   */
  async exists(key: string): Promise<boolean> {
    return (await this.head(key)) !== null;
  }

  /**
   * Retrieves object metadata without downloading the content.
   *
   * @param key - Object key (path)
   * @returns Object metadata, or null if not found
   */
  async head(key: string): Promise<StorageObject | null> {
    return this.client.headObject(key);
  }

  /**
   * Lists objects in R2.
   *
   * @param options - List options (prefix, limit, cursor)
   * @returns Paginated list result
   *
   * @example
   * ```typescript
   * const result = await storage.list({
   *   prefix: 'invoices/2026/',
   *   limit: 100,
   * });
   *
   * // Retrieve next page
   * if (result.hasMore) {
   *   const nextPage = await storage.list({
   *     prefix: 'invoices/2026/',
   *     cursor: result.nextCursor,
   *   });
   * }
   * ```
   */
  async list(options?: StorageListOptions): Promise<StorageListResult> {
    return this.client.listObjects(options);
  }

  /**
   * Copies an object to a new key.
   *
   * @param sourceKey - Source object key
   * @param destinationKey - Destination object key
   * @returns Metadata of the copied object
   */
  async copy(sourceKey: string, destinationKey: string): Promise<StorageObject> {
    return this.client.copyObject(sourceKey, destinationKey);
  }

  /**
   * Moves an object to a new key (copy + delete).
   *
   * @param sourceKey - Source object key
   * @param destinationKey - Destination object key
   * @returns Metadata of the moved object
   */
  async move(sourceKey: string, destinationKey: string): Promise<StorageObject> {
    const result = await this.copy(sourceKey, destinationKey);
    if (sourceKey !== destinationKey && !await this.delete(sourceKey)) throw new Error('Copy succeeded but source deletion failed');
    return result;
  }
}
