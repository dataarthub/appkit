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
 * const storage = new OCIStorageAdapter({
 *   namespace: 'your-tenancy-namespace',
 *   region: 'ap-tokyo-1',
 *   bucket: 'my-compliance-bucket',
 *   accessKeyId: process.env.OCI_ACCESS_KEY_ID!,
 *   secretAccessKey: process.env.OCI_SECRET_ACCESS_KEY!,
 *   objectLockEnabled: true,
 * });
 *
 * // Upload
 * await storage.upload('invoices/inv-001.pdf', pdfBuffer);
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
   * Uploads a file to OCI.
   *
   * @param key - Object key (path)
   * @param data - File data
   * @param options - Upload options
   * @returns Metadata of the uploaded object
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
   * Downloads a file from OCI.
   *
   * @param key - Object key (path)
   * @returns File data as Uint8Array, or null if not found
   */
  async download(key: string): Promise<Uint8Array | null> {
    return this.client.getObject(key);
  }

  /**
   * Retrieves a signed URL.
   *
   * @param key - Object key (path)
   * @param options - URL generation options
   * @returns Signed URL
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
    return this.client.getSignedGetUrl(key, options);
  }

  /**
   * Deletes an object from OCI.
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
   * Lists objects in OCI.
   *
   * @param options - List options
   * @returns Paginated list result
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
