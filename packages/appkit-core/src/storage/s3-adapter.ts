/**
 * @fileoverview AWS S3 Storage Adapter
 *
 * AWS S3 storage implementation with Object Lock support.
 * Suitable for original document retention under statutory compliance requirements.
 *
 * @module lib/storage/s3-adapter
 */

import { sha256Hex } from './crypto';
import { S3CompatibleRuntime } from './s3-sigv4';
import type {
  StorageAdapter,
  StorageObject,
  StorageUploadOptions,
  StorageURLOptions,
  StorageListOptions,
  StorageListResult,
  S3StorageConfig,
} from './types';

// =============================================================================
// S3 Upload Options Extension
// =============================================================================

/**
 * Additional options for S3 uploads.
 */
export interface S3UploadOptions extends StorageUploadOptions {
  /** Precomputed SHA-256 hash. */
  hash?: string;
  /** Object Lock retention expiration date. */
  retentionUntilDate?: Date;
  /** Object Lock mode (GOVERNANCE or COMPLIANCE). */
  objectLockMode?: 'GOVERNANCE' | 'COMPLIANCE';
}

// =============================================================================
// Hash Calculation Utility
// =============================================================================

/**
 * Calculates the SHA-256 hash of data (Web standard compliant, works in browsers).
 *
 * @param data - Data to hash
 * @returns Hex-encoded hash string
 */
export function calculateSHA256(data: Uint8Array | ArrayBuffer | string): string {
  return sha256Hex(data);
}

// =============================================================================
// S3 Storage Adapter
// =============================================================================

/**
 * Storage adapter for AWS S3.
 *
 * Supports Object Lock (WORM) for original document retention under compliance requirements.
 *
 * ## Features
 * - Object Lock (Compliance/Governance) support
 * - Automatic SHA-256 hash calculation and metadata storage
 * - Signed URL generation
 * - Tag-based metadata storage
 *
 * @example
 * ```typescript
 * const storage = new S3StorageAdapter({
 *   region: 'ap-northeast-1',
 *   bucket: 'my-compliance-bucket',
 *   accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
 *   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
 *   objectLockEnabled: true,
 *   defaultRetentionDays: 2555, // 7 years
 * });
 *
 * // Upload with Object Lock
 * await storage.upload('invoices/inv-001.pdf', pdfBuffer);
 *
 * // Generate signed URL
 * const url = await storage.getUrl('invoices/inv-001.pdf', { expiresIn: 3600 });
 * ```
 */
export class S3StorageAdapter implements StorageAdapter {
  /** S3 runtime instance */
  private client: S3CompatibleRuntime;
  /** Adapter configuration */
  private config: S3StorageConfig;

  /**
   * Creates an instance of S3StorageAdapter.
   *
   * @param config - S3 configuration
   */
  constructor(config: S3StorageConfig) {
    this.config = config;

    this.client = new S3CompatibleRuntime({
      region: config.region,
      bucket: config.bucket,
      endpoint: config.endpoint,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      forcePathStyle: !!config.endpoint, // For LocalStack / custom S3 endpoints
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
   * Uploads a file to S3.
   *
   * If Object Lock is enabled, retention settings are automatically applied.
   * The SHA-256 hash is computed automatically and saved in the object metadata.
   *
   * @param key - Object key (path)
   * @param data - File data
   * @param options - Upload options
   * @returns Metadata of the uploaded object
   */
  async upload(
    key: string,
    data: Uint8Array | Blob | ReadableStream | string,
    options?: S3UploadOptions,
  ): Promise<StorageObject> {
    let payload: Uint8Array | string;
    let byteLength: number;

    if (typeof data === 'string') {
      payload = data;
      byteLength = new TextEncoder().encode(data).length;
    } else if (data instanceof Blob) {
      const arrayBuffer = await data.arrayBuffer();
      payload = new Uint8Array(arrayBuffer);
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

    // Configure Object Lock
    const objectLockMode = this.config.objectLockEnabled
      ? options?.objectLockMode || this.config.objectLockMode || 'COMPLIANCE'
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
   * Downloads a file from S3.
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
   * Deletes an object from S3.
   *
   * Versioned S3 can create a delete marker while retaining locked versions. This API deletes a key, not a specific version.
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
   * Lists objects in S3.
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
   * A move can fail after copying. Locked versions and delete markers follow the bucket versioning policy.
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

  /**
   * Retrieves the SHA-256 hash of an object.
   *
   * @param key - Object key
   * @returns Hash string, or null if not found
   */
  async getHash(key: string): Promise<string | null> {
    const meta = await this.head(key);
    return meta?.metadata?.['x-sha256'] || null;
  }

  /**
   * Verifies the integrity of an object.
   *
   * @param key - Object key
   * @returns True if verification succeeds
   */
  async verifyHash(key: string): Promise<boolean> {
    const storedHash = await this.getHash(key);
    if (!storedHash) return false;

    const data = await this.download(key);
    if (!data) return false;

    const calculatedHash = calculateSHA256(data as any);
    return storedHash === calculatedHash;
  }
}
