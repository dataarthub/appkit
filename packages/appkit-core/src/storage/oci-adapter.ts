/**
 * @fileoverview OCI Object Storage Adapter
 *
 * S3-compatible storage implementation for OCI Object Storage with Object Lock (Retention Rules) support.
 * Suitable for original document retention under statutory compliance requirements.
 *
 * @module lib/storage/oci-adapter
 */

import { calculateSHA256 } from './s3-adapter';
import { S3CompatibleRuntime } from './s3-sigv4';
import type {
  StorageAdapter,
  StorageObject,
  StorageUploadOptions,
  StorageURLOptions,
  StorageListOptions,
  StorageListResult,
  OCIStorageConfig,
} from './types';

// =============================================================================
// OCI Upload Options Extension
// =============================================================================

/**
 * Additional options for OCI uploads.
 *
 * @see {@link OCIStorageAdapter.upload} for a complete configured-adapter upload example.
 */
export interface OCIUploadOptions extends StorageUploadOptions {

  /** Precomputed SHA-256 hash. */
  hash?: string;

  /** Object Lock (Retention Rules) retention expiration date. */
  retentionUntilDate?: Date;
}

// =============================================================================
// OCI Storage Adapter
// =============================================================================

/**
 * Storage adapter for OCI Object Storage (S3-compatible).
 *
 * Supports Object Lock (Retention Rules) for original document retention under compliance requirements.
 *
 * ## Features
 * - Uses OCI S3-compatible API
 * - Object Lock (Retention Rules) support
 * - Automatic SHA-256 hash calculation and metadata storage
 * - Signed URL generation
 *
 * @example
 * ```typescript
 * import { OCIStorageAdapter, type OCIStorageConfig } from '@alneas/appkit-core/storage';
 *
 * // The host supplies storage configuration and enforces its access policy.
 * export function createStorage(config: OCIStorageConfig) {
 *   return new OCIStorageAdapter(config);
 * }
 * ```
 */
export class OCIStorageAdapter implements StorageAdapter {

  /** S3-compatible runtime instance */
  private client: S3CompatibleRuntime;

  /** Adapter configuration */
  private config: OCIStorageConfig;


  /**
   * Creates an instance of OCIStorageAdapter.
   *
   * @param config - OCI configuration
   *
   * @example
   * ```typescript
   * import { OCIStorageAdapter, type OCIStorageConfig } from '@alneas/appkit-core/storage';
   *
   * // The host supplies storage configuration and enforces its access policy.
   * export function createStorage(config: OCIStorageConfig) {
   *   return new OCIStorageAdapter(config);
   * }
   * ```
   */
  constructor(config: OCIStorageConfig) {
    this.config = config;

    // Construct OCI S3-compatible endpoint
    // https://{namespace}.compat.objectstorage.{region}.oraclecloud.com
    const endpoint =
      config.endpoint ||
      `https://${config.namespace}.compat.objectstorage.${config.region}.oraclecloud.com`;

    this.client = new S3CompatibleRuntime({
      region: config.region,
      bucket: config.bucket,
      endpoint,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      // Path style is typically recommended for OCI S3-compatible API
      forcePathStyle: true,
      defaultExpiresIn: config.defaultExpiresIn,
    });
  }


  /**
   * Calculates the default retention expiration date.
   *
   * @returns Retention expiration date
   * @internal
   */
  private getDefaultRetentionDate(): Date {
    const days = this.config.defaultRetentionDays || 2555; // 7 years
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
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
   * import type { OCIStorageAdapter } from '@alneas/appkit-core/storage';
   *
   * export async function example(storage: OCIStorageAdapter) {
   *   return storage.upload("reports/note.txt", "hello", { contentType: "text/plain" });
   * }
   * ```
   */
  async upload(
    key: string,
    data: Uint8Array | Blob | ReadableStream | string,
    options?: OCIUploadOptions,
  ): Promise<StorageObject> {
    let payload: Uint8Array | string;
    let byteLength: number;

    if (typeof data === 'string') {
      payload = data;
      byteLength = new TextEncoder().encode(data).length;
    } else if (data instanceof Blob) {
      payload = new Uint8Array(await data.arrayBuffer());
      byteLength = payload.byteLength;
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
      byteLength = totalLen;
    } else {
      payload = data;
      byteLength = data.byteLength;
    }

    // Compute SHA-256 hash
    const hash = options?.hash || calculateSHA256(payload);

    // Include hash in metadata
    const metadata: Record<string, string> = {
      ...options?.metadata,
      'x-sha256': hash,
    };

    // Object Lock (Retention Rules) configuration
    // OCI's S3-compatible API interprets AWS S3 headers to apply retention rules
    const objectLockMode = this.config.objectLockEnabled
      ? this.config.objectLockMode || 'GOVERNANCE'
      : undefined;
    const objectLockRetainUntilDate = this.config.objectLockEnabled
      ? options?.retentionUntilDate || this.getDefaultRetentionDate()
      : undefined;

    await this.client.putObject({
      key,
      body: payload,
      contentType: options?.contentType,
      cacheControl: options?.cacheControl,
      metadata,
      objectLockMode,
      objectLockRetainUntilDate,
    });

    return {
      key,
      size: byteLength,
      contentType: options?.contentType,
      lastModified: new Date(),
      metadata,
    };
  }


  /**
   * Reads the complete stored object into memory.
   *
   * @param key - Object key to retrieve.
   * @returns The downloaded bytes, or null when the object is absent.
   * @throws Rejects signing, network or non-success backend responses unless the method documents a false/null fallback.
   * @example
   * ```typescript
   * import type { OCIStorageAdapter } from '@alneas/appkit-core/storage';
   *
   * export async function example(storage: OCIStorageAdapter) {
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
   * import type { OCIStorageAdapter } from '@alneas/appkit-core/storage';
   *
   * export async function example(storage: OCIStorageAdapter) {
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
   * import type { OCIStorageAdapter } from '@alneas/appkit-core/storage';
   *
   * export async function example(storage: OCIStorageAdapter) {
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
   * @example
   * ```typescript
   * import type { OCIStorageAdapter } from '@alneas/appkit-core/storage';
   *
   * export async function example(storage: OCIStorageAdapter) {
   *   return storage.getUrl("reports/note.txt", { expiresIn: 300 });
   * }
   * ```
   */
  async getUrl(key: string, options?: StorageURLOptions): Promise<string> {
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
   * import type { OCIStorageAdapter } from '@alneas/appkit-core/storage';
   *
   * export async function example(storage: OCIStorageAdapter) {
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
   * import type { OCIStorageAdapter } from '@alneas/appkit-core/storage';
   *
   * export async function example(storage: OCIStorageAdapter) {
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
   * import type { OCIStorageAdapter } from '@alneas/appkit-core/storage';
   *
   * export async function example(storage: OCIStorageAdapter) {
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
   * import type { OCIStorageAdapter } from '@alneas/appkit-core/storage';
   *
   * export async function example(storage: OCIStorageAdapter) {
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
   * import type { OCIStorageAdapter } from '@alneas/appkit-core/storage';
   *
   * export async function example(storage: OCIStorageAdapter) {
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
   * import type { OCIStorageAdapter } from '@alneas/appkit-core/storage';
   *
   * export async function example(storage: OCIStorageAdapter) {
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
