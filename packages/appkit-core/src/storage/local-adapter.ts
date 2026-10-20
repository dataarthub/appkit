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
 * import { LocalStorageAdapter, type LocalStorageConfig } from '@alneas/appkit-core/storage/server';
 *
 * // The host supplies storage configuration and enforces its access policy.
 * export function createStorage(config: LocalStorageConfig) {
 *   return new LocalStorageAdapter(config);
 * }
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
   *
   * @example
   * ```typescript
   * import { LocalStorageAdapter, type LocalStorageConfig } from '@alneas/appkit-core/storage/server';
   *
   * // The host supplies storage configuration and enforces its access policy.
   * export function createStorage(config: LocalStorageConfig) {
   *   return new LocalStorageAdapter(config);
   * }
   * ```
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
   * Writes file data to the configured storage backend.
   *
   * @param key - Destination object key, relative to the configured storage namespace.
   * @param data - Bytes or text to store; strings use UTF-8 and streams are buffered in memory.
   * @param options - Optional MIME type, metadata and cache settings; public is ignored.
   * @returns Metadata reported for the uploaded object.
   * @throws Rejects filesystem containment violations or propagated I/O errors.
   * @remarks Strings and streams are materialized in memory. MIME detection is local-only; remote uploads require contentType to send that header. Host access policy is external.
   * @example
   * ```typescript
   * import type { LocalStorageAdapter } from '@alneas/appkit-core/storage/server';
   *
   * export async function example(storage: LocalStorageAdapter) {
   *   return storage.upload("reports/note.txt", "hello", { contentType: "text/plain" });
   * }
   * ```
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
   * Reads the complete stored object into memory.
   *
   * @param key - Object key to retrieve.
   * @returns File bytes, or null on any caught read error (including missing files).
   * @throws Rejects filesystem containment violations or propagated I/O errors.
   * @example
   * ```typescript
   * import type { LocalStorageAdapter } from '@alneas/appkit-core/storage/server';
   *
   * export async function example(storage: LocalStorageAdapter) {
   *   return storage.download("reports/note.txt");
   * }
   * ```
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
   * Builds a URL for reading the configured object key.
   *
   * @param key - Contained relative object key.
   * @param options - Only downloadFilename is used; signed and expiresIn are ignored.
   * @returns A URL string; generating it does not verify object existence or access policy.
   * @throws Rejects unsafe paths or containment violations.
   * @remarks Uses baseUrl when set, otherwise file:. The host must serve any HTTP URL and implement download handling/access control.
   * @example
   * ```typescript
   * import type { LocalStorageAdapter } from '@alneas/appkit-core/storage/server';
   *
   * export async function example(storage: LocalStorageAdapter) {
   *   return storage.getUrl("reports/note.txt", { expiresIn: 300 });
   * }
   * ```
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
   * Requests deletion of the object key.
   *
   * @param key - Object key to delete.
   * @returns Whether deletion was acknowledged; false also covers caught transport failures.
   * @throws Rejects unsafe local paths before deletion.
   * @example
   * ```typescript
   * import type { LocalStorageAdapter } from '@alneas/appkit-core/storage/server';
   *
   * export async function example(storage: LocalStorageAdapter) {
   *   return storage.delete("reports/note.txt");
   * }
   * ```
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
   * Checks whether object metadata can be retrieved.
   *
   * @param key - Object key to inspect.
   * @returns True when a metadata lookup finds the key; false when absent.
   * @throws Rejects filesystem containment violations or propagated I/O errors.
   * @example
   * ```typescript
   * import type { LocalStorageAdapter } from '@alneas/appkit-core/storage/server';
   *
   * export async function example(storage: LocalStorageAdapter) {
   *   return storage.exists("reports/note.txt");
   * }
   * ```
   */
  async exists(key: string): Promise<boolean> {
    const fullPath = await this.getFullPath(key);
    return existsSync(fullPath);
  }


  /**
   * Retrieves metadata without downloading the object body.
   *
   * @param key - Object key to inspect.
   * @returns Size, extension-derived MIME type and modification time, or null on any caught stat error.
   * @throws Rejects filesystem containment violations or propagated I/O errors.
   * @example
   * ```typescript
   * import type { LocalStorageAdapter } from '@alneas/appkit-core/storage/server';
   *
   * export async function example(storage: LocalStorageAdapter) {
   *   return storage.head("reports/note.txt");
   * }
   * ```
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
   * @param options - Optional prefix, '/' delimiter and combined object/prefix limit.
   * The limit defaults to 1000 when omitted or zero. cursor and includeMetadata
   * are ignored; file size, inferred MIME type and modification time are always included.
   * @returns A fresh traversal's objects and optional prefixes, without nextCursor.
   * hasMore is true when the combined count reaches the limit, including an exact
   * match with no additional entries. A missing root directory returns an empty list.
   * @throws Rejects for an unsafe prefix, a containment violation or filesystem
   * errors other than a missing directory during traversal.
   * @remarks
   * Cursor pagination is unsupported: repeating the call starts from the beginning.
   * Do not loop on hasMore; increase the limit or narrow the prefix as appropriate.
   * Symlink entries are skipped. This operation does not provide a snapshot during
   * concurrent filesystem changes. The host must protect the configured root.
   *
   * @example
   * ```typescript
   * import type { LocalStorageAdapter } from '@alneas/appkit-core/storage/server';
   *
   * export async function example(storage: LocalStorageAdapter) {
   *   return storage.list({ prefix: "reports/", limit: 100 });
   * }
   * ```
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
   * Copies an object into a destination key.
   *
   * @param sourceKey - Existing source object key.
   * @param destinationKey - Destination key to create or overwrite.
   * @returns Metadata of the uploaded destination; a same-key copy still rewrites the file.
   * @throws Rejects filesystem containment violations or propagated I/O errors.
   * @example
   * ```typescript
   * import type { LocalStorageAdapter } from '@alneas/appkit-core/storage/server';
   *
   * export async function example(storage: LocalStorageAdapter) {
   *   return storage.copy("reports/note.txt", "archive/note.txt");
   * }
   * ```
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
   * Copies an object and then deletes the source key.
   *
   * @param sourceKey - Existing source object key.
   * @param destinationKey - Destination key to create or overwrite.
   * @returns Destination metadata after source deletion, or existing metadata for a same-key move.
   * @throws Rejects copy errors, missing same-key source, or source deletion failure after copying.
   * @remarks Copy and delete are separate operations: failure can leave both source and destination. Bucket versioning/retention controls remote deletion.
   * @example
   * ```typescript
   * import type { LocalStorageAdapter } from '@alneas/appkit-core/storage/server';
   *
   * export async function example(storage: LocalStorageAdapter) {
   *   return storage.move("reports/note.txt", "archive/note.txt");
   * }
   * ```
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
