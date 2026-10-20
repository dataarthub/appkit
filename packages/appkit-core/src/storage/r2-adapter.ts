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
 * import { R2StorageAdapter, type R2StorageConfig } from '@alneas/appkit-core/storage';
 *
 * // The host supplies storage configuration and enforces its access policy.
 * export function createStorage(config: R2StorageConfig) {
 *   return new R2StorageAdapter(config);
 * }
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
   *
   * @example
   * ```typescript
   * import { R2StorageAdapter, type R2StorageConfig } from '@alneas/appkit-core/storage';
   *
   * // The host supplies storage configuration and enforces its access policy.
   * export function createStorage(config: R2StorageConfig) {
   *   return new R2StorageAdapter(config);
   * }
   * ```
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
   * Writes file data to the configured storage backend.
   *
   * @param key - Destination object key, relative to the configured storage namespace.
   * @param data - Bytes or text to store; strings use UTF-8 and streams are buffered in memory.
   * @param options - Optional MIME type, metadata and cache settings; public is ignored.
   * @returns Metadata reported for the uploaded object.
   * @throws Rejects signing, network or non-success backend responses unless the method documents a false/null fallback.
   * @remarks Strings and streams are materialized in memory. MIME detection is local-only; remote uploads require contentType to send that header. Host access policy is external.
   * @example
   * ```typescript
   * import type { R2StorageAdapter } from '@alneas/appkit-core/storage';
   *
   * export async function example(storage: R2StorageAdapter) {
   *   return storage.upload("reports/note.txt", "hello", { contentType: "text/plain" });
   * }
   * ```
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
   * Reads the complete stored object into memory.
   *
   * @param key - Object key to retrieve.
   * @returns The downloaded bytes, or null when the object is absent.
   * @throws Rejects signing, network or non-success backend responses unless the method documents a false/null fallback.
   * @example
   * ```typescript
   * import type { R2StorageAdapter } from '@alneas/appkit-core/storage';
   *
   * export async function example(storage: R2StorageAdapter) {
   *   return storage.download("reports/note.txt");
   * }
   * ```
   */
  async download(key: string): Promise<Uint8Array | null> {
    return this.client.getObject(key);
  }


  /**
   * Signs a URL for a direct HTTP PUT upload.
   *
   * @param key - Destination object key.
   * @param options - Optional expiry in seconds, defaulting to the configured value or 3600; valid range 1–604800.
   * @returns A signed PUT URL; no object is uploaded by this call.
   * @throws Rejects invalid expiry (outside 1–604800 whole seconds) or malformed endpoint configuration.
   * @example
   * ```typescript
   * import type { R2StorageAdapter } from '@alneas/appkit-core/storage';
   *
   * export async function example(storage: R2StorageAdapter) {
   *   return storage.getUploadUrl("reports/note.txt", { expiresIn: 300 });
   * }
   * ```
   */
  async getUploadUrl(key: string, options?: Pick<StorageURLOptions, 'expiresIn'>): Promise<string> {
    return this.client.getSignedPutUrl(key, options);
  }


  /**
   * Signs a URL for an HTTP GET download.
   *
   * @param key - Object key to retrieve.
   * @param options - Optional expiry in seconds (1–604800) and download filename; signing is always performed.
   * @returns A signed GET URL; no object is fetched by this call.
   * @throws Rejects invalid expiry (outside 1–604800 whole seconds) or malformed endpoint configuration.
   * @example
   * ```typescript
   * import type { R2StorageAdapter } from '@alneas/appkit-core/storage';
   *
   * export async function example(storage: R2StorageAdapter) {
   *   return storage.getDownloadUrl("reports/note.txt", { expiresIn: 300 });
   * }
   * ```
   */
  async getDownloadUrl(key: string, options?: StorageURLOptions): Promise<string> {
    return this.client.getSignedGetUrl(key, options);
  }


  /**
   * Builds a URL for reading the configured object key.
   *
   * @param key - Object key to address.
   * @param options - Optional expiry and download filename; remote signing defaults to enabled.
   * @returns A URL string; generating it does not verify object existence or access policy.
   * @throws Rejects invalid expiry (outside 1–604800 whole seconds) or malformed endpoint configuration.
   * @remarks With signed:false and a publicUrl, returns an unsigned URL; otherwise signs a GET URL. Bucket access policy remains external.
   * @example
   * ```typescript
   * import type { R2StorageAdapter } from '@alneas/appkit-core/storage';
   *
   * export async function example(storage: R2StorageAdapter) {
   *   return storage.getUrl("reports/note.txt", { expiresIn: 300 });
   * }
   * ```
   */
  async getUrl(key: string, options?: StorageURLOptions): Promise<string> {
    const signed = options?.signed !== false;

    // Unsigned URL (public bucket)
    if (!signed && this.config.publicUrl) {
      return `${this.config.publicUrl}/${key}`;
    }

    return this.client.getSignedGetUrl(key, options);
  }


  /**
   * Requests deletion of the object key.
   *
   * @param key - Object key to delete.
   * @returns Whether deletion was acknowledged; false also covers caught transport failures.
   * @remarks For versioned storage this deletes a key, not a particular retained version.
   * @example
   * ```typescript
   * import type { R2StorageAdapter } from '@alneas/appkit-core/storage';
   *
   * export async function example(storage: R2StorageAdapter) {
   *   return storage.delete("reports/note.txt");
   * }
   * ```
   */
  async delete(key: string): Promise<boolean> {
    return this.client.deleteObject(key);
  }


  /**
   * Checks whether object metadata can be retrieved.
   *
   * @param key - Object key to inspect.
   * @returns True when a metadata lookup finds the key; false when absent.
   * @throws Rejects signing, network or non-success backend responses unless the method documents a false/null fallback.
   * @example
   * ```typescript
   * import type { R2StorageAdapter } from '@alneas/appkit-core/storage';
   *
   * export async function example(storage: R2StorageAdapter) {
   *   return storage.exists("reports/note.txt");
   * }
   * ```
   */
  async exists(key: string): Promise<boolean> {
    return (await this.head(key)) !== null;
  }


  /**
   * Retrieves metadata without downloading the object body.
   *
   * @param key - Object key to inspect.
   * @returns Object metadata, or null when the key is absent.
   * @throws Rejects signing, network or non-success backend responses unless the method documents a false/null fallback.
   * @example
   * ```typescript
   * import type { R2StorageAdapter } from '@alneas/appkit-core/storage';
   *
   * export async function example(storage: R2StorageAdapter) {
   *   return storage.head("reports/note.txt");
   * }
   * ```
   */
  async head(key: string): Promise<StorageObject | null> {
    return this.client.headObject(key);
  }


  /**
   * Lists one provider page of object keys and optional common prefixes.
   *
   * @param options - Optional prefix, delimiter, page limit and continuation token; a missing or zero limit uses 1000.
   * @returns Objects and prefixes with provider continuation state; includeMetadata is ignored.
   * @throws Rejects signing, network or non-success backend responses unless the method documents a false/null fallback.
   * @example
   * ```typescript
   * import type { R2StorageAdapter } from '@alneas/appkit-core/storage';
   *
   * export async function example(storage: R2StorageAdapter) {
   *   return storage.list({ prefix: "reports/", limit: 100 });
   * }
   * ```
   */
  async list(options?: StorageListOptions): Promise<StorageListResult> {
    return this.client.listObjects(options);
  }


  /**
   * Copies an object into a destination key.
   *
   * @param sourceKey - Existing source object key.
   * @param destinationKey - Destination key to create or overwrite.
   * @returns Metadata confirming the destination, or source metadata for a same-key copy.
   * @throws Rejects signing, network or non-success backend responses unless the method documents a false/null fallback.
   * @example
   * ```typescript
   * import type { R2StorageAdapter } from '@alneas/appkit-core/storage';
   *
   * export async function example(storage: R2StorageAdapter) {
   *   return storage.copy("reports/note.txt", "archive/note.txt");
   * }
   * ```
   */
  async copy(sourceKey: string, destinationKey: string): Promise<StorageObject> {
    return this.client.copyObject(sourceKey, destinationKey);
  }


  /**
   * Copies an object and then deletes the source key.
   *
   * @param sourceKey - Existing source object key.
   * @param destinationKey - Destination key to create or overwrite.
   * @returns Destination metadata after source deletion, or existing metadata for a same-key move.
   * @throws Rejects copy errors, missing same-key source, or source deletion failure after copying.
   * @remarks Copy and delete are separate operations: failure can leave both source and destination. Bucket versioning/retention controls remote deletion.
   * @example
   * ```typescript
   * import type { R2StorageAdapter } from '@alneas/appkit-core/storage';
   *
   * export async function example(storage: R2StorageAdapter) {
   *   return storage.move("reports/note.txt", "archive/note.txt");
   * }
   * ```
   */
  async move(sourceKey: string, destinationKey: string): Promise<StorageObject> {
    const result = await this.copy(sourceKey, destinationKey);
    if (sourceKey !== destinationKey && !await this.delete(sourceKey)) throw new Error('Copy succeeded but source deletion failed');
    return result;
  }
}
