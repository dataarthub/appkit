/**
 * @fileoverview Local Storage Adapter
 *
 * File storage implementation using the local filesystem.
 * Can be used in development and testing environments without cloud dependencies.
 *
 * @module lib/storage/local-adapter
 */

import { mkdir, readFile, writeFile, unlink, stat, readdir } from 'node:fs/promises';
import { dirname, extname } from 'node:path';
import { constants, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { ContainedPathRoot } from './contained-path';
import type {
  StorageAdapter,
  StorageObject,
  StorageUploadOptions,
  StorageURLOptions,
  StorageListOptions,
  StorageListResult,
  LocalStorageConfig,
} from './types';

// =============================================================================
// MIME Type Detection
// =============================================================================

/**
 * Mapping from file extensions to MIME types.
 * @internal
 */
const MIME_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.csv': 'text/csv',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.zip': 'application/zip',
};

/**
 * Detects the MIME type from a file key.
 *
 * @param key - File key (path)
 * @returns Detected MIME type, or 'application/octet-stream' if unknown
 * @internal
 */
function detectMimeType(key: string): string {
  const ext = extname(key).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

// =============================================================================
// Local Storage Adapter
// =============================================================================

/**
 * Storage adapter for the local filesystem.
 *
 * Used to store files on the local disk instead of cloud storage
 * during development and testing.
 *
 * ## Features
 * - Uses Node.js `fs/promises`
 * - Automatic directory creation
 * - Automatic MIME type detection
 * - Recursive file listing
 *
 * Keys must be relative paths without dot segments or backslashes. Symlinks
 * below the pinned root are rejected. The directory and its ancestors must be
 * owned by the application and protected from concurrent untrusted mutation.
 *
 * @example
 * ```typescript
 * const storage = new LocalStorageAdapter({
 *   baseDir: './uploads',
 *   baseUrl: 'http://localhost:3000/files',
 * });
 *
 * // Upload
 * await storage.upload('invoices/inv-001.pdf', pdfBuffer);
 *
 * // Get URL
 * const url = await storage.getUrl('invoices/inv-001.pdf');
 * // -> 'http://localhost:3000/files/invoices/inv-001.pdf'
 *
 * // Download
 * const data = await storage.download('invoices/inv-001.pdf');
 *
 * // List
 * const { objects } = await storage.list({ prefix: 'invoices/' });
 * ```
 */
export class LocalStorageAdapter implements StorageAdapter {
  /** Adapter configuration */
  private readonly config: Readonly<LocalStorageConfig>;
  private readonly paths: ContainedPathRoot;

  /**
   * Creates an instance of LocalStorageAdapter.
   *
   * @param config - Adapter configuration
   */
  constructor(config: LocalStorageConfig) {
    this.paths = new ContainedPathRoot(config.baseDir);
    this.config = Object.freeze({ ...config, baseDir: this.paths.root });
  }

  /**
   * Resolves the full path from a relative key.
   *
   * @param key - Object key
   * @returns Full filesystem path
   * @internal
   */
  private getFullPath(key: string): Promise<string> {
    return this.paths.resolve(key);
  }

  /**
   * Uploads a file to local storage.
   *
   * Automatically creates parent directories if they do not exist.
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
    const fullPath = await this.getFullPath(key);

    // Ensure parent directory exists
    await mkdir(dirname(fullPath), { recursive: true });

    // Convert data to Uint8Array
    let buffer: Uint8Array;
    if (typeof data === 'string') {
      buffer = new TextEncoder().encode(data);
    } else if (data instanceof Blob) {
      buffer = new Uint8Array(await data.arrayBuffer());
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
      buffer = merged;
    } else {
      buffer = data;
    }

    await this.getFullPath(key);
    await writeFile(fullPath, buffer, {
      flag: constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | constants.O_NOFOLLOW,
    });

    const stats = await stat(fullPath);

    return {
      key,
      size: stats.size,
      contentType: options?.contentType || detectMimeType(key),
      lastModified: stats.mtime,
      metadata: options?.metadata,
    };
  }

  /**
   * Downloads a file from local storage.
   *
   * @param key - Object key (path)
   * @returns File data as Uint8Array, or null if not found
   */
  async download(key: string): Promise<Uint8Array | null> {
    const fullPath = await this.getFullPath(key);
    try {
      const data = await readFile(fullPath, { flag: constants.O_RDONLY | constants.O_NOFOLLOW });
      return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    } catch {
      return null;
    }
  }

  /**
   * Retrieves a URL to access the object.
   *
   * The local adapter generates a simple URL.
   * For signed URLs, use a token-based approach.
   *
   * @param key - Object key (path)
   * @param options - URL generation options
   * @returns URL string
   */
  async getUrl(key: string, options?: StorageURLOptions): Promise<string> {
    const fullPath = await this.getFullPath(key);
    const encodedKey = key.split('/').map(encodeURIComponent).join('/');
    let url = this.config.baseUrl
      ? `${this.config.baseUrl.replace(/\/+$/, '')}/${encodedKey}`
      : pathToFileURL(fullPath).href;

    if (options?.downloadFilename) {
      url += `?download=${encodeURIComponent(options.downloadFilename)}`;
    }

    return url;
  }

  /**
   * Deletes an object from local storage.
   *
   * @param key - Object key (path)
   * @returns True if deleted successfully, false if not found
   */
  async delete(key: string): Promise<boolean> {
    const fullPath = await this.getFullPath(key);
    try {
      await unlink(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Checks whether an object exists.
   *
   * @param key - Object key (path)
   * @returns True if the object exists
   */
  async exists(key: string): Promise<boolean> {
    const fullPath = await this.getFullPath(key);
    return existsSync(fullPath);
  }

  /**
   * Retrieves object metadata without downloading the content.
   *
   * @param key - Object key (path)
   * @returns Object metadata, or null if not found
   */
  async head(key: string): Promise<StorageObject | null> {
    const fullPath = await this.getFullPath(key);
    try {
      const stats = await stat(fullPath);
      return {
        key,
        size: stats.size,
        contentType: detectMimeType(key),
        lastModified: stats.mtime,
      };
    } catch {
      return null;
    }
  }

  /**
   * Lists objects in local storage.
   *
   * @param options - List options (prefix, delimiter, limit, cursor)
   * @returns Paginated list result
   */
  async list(options?: StorageListOptions): Promise<StorageListResult> {
    const prefix = options?.prefix || '';
    const delimiter = options?.delimiter;
    const limit = options?.limit || 1000;
    // Prefixes may end in '/', but must obey the same containment rules as keys.
    await this.paths.resolve(
      prefix.length > 1 && prefix.endsWith('/') ? prefix.slice(0, -1) : prefix,
      true,
    );
    const baseDir = await this.paths.resolve('', true);

    const objects: StorageObject[] = [];
    const prefixes: string[] = [];

    /**
     * Recursively traverses a directory.
     * @internal
     */
    const walk = async (dir: string, relativePath: string = ''): Promise<void> => {
      if (objects.length + prefixes.length >= limit) return;

      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (objects.length + prefixes.length >= limit) break;

        const entryRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
        if (entry.isSymbolicLink()) continue;
        const fullPath = await this.getFullPath(entryRelativePath);

        // Check prefix match
        if (prefix && !entryRelativePath.startsWith(prefix)) {
          // If entryRelativePath is a parent of the prefix, recurse into it
          if (entry.isDirectory() && prefix.startsWith(entryRelativePath + '/')) {
            await walk(fullPath, entryRelativePath);
          }
          continue;
        }

        // Delimiter processing (hierarchical listing)
        if (delimiter === '/') {
          // Target only direct children of prefix
          // prefix: "a/b/", entryRelativePath: "a/b/c", entryRelativePath: "a/b/d/e"
          const relativeToPrefix = entryRelativePath.slice(prefix.length);
          if (relativeToPrefix.includes('/')) {
            // Deeper nested directory
            const parts = relativeToPrefix.split('/');
            const subPrefix = prefix + parts[0] + '/';
            if (!prefixes.includes(subPrefix)) {
              prefixes.push(subPrefix);
            }
            continue;
          }
        }

        if (entry.isDirectory()) {
          if (delimiter === '/') {
            const subPrefix = entryRelativePath + '/';
            if (!prefixes.includes(subPrefix)) {
              prefixes.push(subPrefix);
            }
          } else {
            await walk(fullPath, entryRelativePath);
          }
        } else if (entry.isFile()) {
          const stats = await stat(fullPath);
          objects.push({
            key: entryRelativePath,
            size: stats.size,
            contentType: detectMimeType(entry.name),
            lastModified: stats.mtime,
          });
        }
      }
    };

    try {
      await walk(baseDir);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }

    return {
      objects,
      prefixes: prefixes.length > 0 ? prefixes : undefined,
      hasMore: objects.length + prefixes.length >= limit,
    };
  }

  /**
   * Copies an object to a new key.
   *
   * @param sourceKey - Source object key
   * @param destinationKey - Destination object key
   * @returns Metadata of the copied object
   * @throws If the source object does not exist
   */
  async copy(sourceKey: string, destinationKey: string): Promise<StorageObject> {
    await this.getFullPath(sourceKey);
    await this.getFullPath(destinationKey);
    const data = await this.download(sourceKey);
    if (!data) {
      throw new Error(`コピー元オブジェクトが見つかりません: ${sourceKey}`);
    }
    return this.upload(destinationKey, data);
  }

  /**
   * Moves an object to a new key (copy + delete).
   *
   * @param sourceKey - Source object key
   * @param destinationKey - Destination object key
   * @returns Metadata of the moved object
   */
  async move(sourceKey: string, destinationKey: string): Promise<StorageObject> {
    if (sourceKey === destinationKey) {
      const existing = await this.head(sourceKey);
      if (!existing) throw new Error(`Object not found: ${sourceKey}`);
      return existing;
    }
    const result = await this.copy(sourceKey, destinationKey);
    if (sourceKey !== destinationKey && !await this.delete(sourceKey)) throw new Error('Copy succeeded but source deletion failed');
    return result;
  }
}
