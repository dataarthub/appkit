import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
/**
 * @fileoverview S3/R2 Content Adapter
 *
 * Manages content using S3-compatible storage.
 * Supports saving in JSON or Markdown (with frontmatter) format.
 *
 * @module lib/content/s3-content-adapter
 */

import type { StorageAdapter } from '../storage/types';
import type {
  ContentAdapter,
  ContentItem,
  ContentFilter,
  ContentSyncResult,
} from './types';

const utf8Decoder = new TextDecoder('utf-8');

// =============================================================================
// Configuration
// =============================================================================

export type S3ContentFormat = 'json' | 'markdown';

export interface S3ContentAdapterConfig {
  /** StorageAdapter instance (R2, S3, Local, etc.) */
  storage: StorageAdapter;
  /** Key prefix (e.g., 'content/blog/') */
  keyPrefix: string;
  /** Storage format (default: 'json') */
  format?: S3ContentFormat;
  /** Internal index filename (default: '_index.json'). Content keys must not collide with it. */
  indexFile?: string;
}

// =============================================================================
// Frontmatter Serialization (same logic as GitMarkdownAdapter)
// =============================================================================

function toFrontmatter(item: ContentItem): string {
  const { slug: _slug, body, ...metadata } = item;
  return '---\n' + stringifyYaml(metadata) + '---\n' + body;
}

function parseFrontmatter(content: string): { data: Record<string, unknown>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: content };
  const data: unknown = parseYaml(match[1]);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Frontmatter must be an object');
  return { data: data as Record<string, unknown>, body: match[2] };
}

/** Compare persisted JSON fields, excluding server-generated sync timestamps. */
function contentFingerprint(item: ContentItem): string {
  const normalize = (value: unknown): unknown => Array.isArray(value) ? value.map(normalize) : value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).filter(([, value]) => value !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => [key, normalize(value)])) : value;
  const { updatedAt: _updatedAt, lastSyncedAt: _lastSyncedAt, ...persisted } = item;
  return JSON.stringify(normalize(persisted));
}

// =============================================================================
// Helpers
// =============================================================================

function dataToItem(slug: string, data: Record<string, unknown>, body: string): ContentItem {
  return {
    slug,
    contentType: (data.contentType as string) ?? 'page',
    title: (data.title as string) ?? slug,
    description: data.description as string | undefined,
    image: data.image as string | undefined,
    author: data.author as string | undefined,
    tags: data.tags as string[] | undefined,
    status: (data.status as ContentItem['status']) ?? 'draft',
    publishedAt: data.publishedAt as string | undefined,
    updatedAt: data.updatedAt as string | undefined,
    scheduledAt: data.scheduledAt as string | undefined,
    seoTitle: data.seoTitle as string | undefined,
    seoDescription: data.seoDescription as string | undefined,
    seoKeywords: data.seoKeywords as string[] | undefined,
    canonicalUrl: data.canonicalUrl as string | undefined,
    ogImage: data.ogImage as string | undefined,
    jsonLd: data.jsonLd as Record<string, unknown> | undefined,
    body,
    tenantId: data.tenantId as string | undefined,
    metadata: data.metadata as Record<string, unknown> | undefined,
    sourceId: data.sourceId as string | undefined,
    sourceTable: data.sourceTable as string | undefined,
    lastSyncedAt: data.lastSyncedAt as string | undefined,
  };
}

// =============================================================================
// S3ContentAdapter
// =============================================================================

/**
 * Implements ContentAdapter for S3/R2 storage.
 * Saves in JSON or Markdown (frontmatter) format.
 *
 * @example
 * ```typescript
 * const content = new S3ContentAdapter({
 *   storage: r2StorageAdapter,
 *   keyPrefix: 'content/blog/',
 *   format: 'json',
 * });
 *
 * await content.save({ slug: 'hello', title: 'Hello', body: '...', status: 'published' });
 * // → S3: content/blog/hello.json
 * ```
 */
export class S3ContentAdapter implements ContentAdapter {
  private storage: StorageAdapter;
  private keyPrefix: string;
  private format: S3ContentFormat;
  private indexFile: string;
  // Serializes mutations within this adapter instance; distributed writers need a host lock/CAS.
  private mutationQueue: Promise<void> = Promise.resolve();
  private mutate(work: () => Promise<void>): Promise<void> {
    const result = this.mutationQueue.then(work);
    this.mutationQueue = result.catch(() => {});
    return result;
  }

  /**
   *
   */
  constructor(config: S3ContentAdapterConfig) {
    this.storage = config.storage;
    this.keyPrefix = config.keyPrefix.endsWith('/') ? config.keyPrefix : `${config.keyPrefix}/`;
    this.format = config.format ?? 'json';
    this.indexFile = config.indexFile ?? '_index.json';
    this.assertRelativePath(this.indexFile);
  }

  /** Keep keys unambiguous across S3 URL paths and filesystem-backed storage. */
  private assertRelativePath(value: string): void {
    if (!value || value.includes('\\') || value.split('/').some(segment => !segment || segment === '.' || segment === '..')) {
      throw new Error('Content paths require nonempty relative segments without dot segments or backslashes');
    }
  }

  private getKey(slug: string): string {
    this.assertRelativePath(slug);
    const ext = this.format === 'json' ? '.json' : '.md';
    const key = `${this.keyPrefix}${slug}${ext}`;
    if (key === `${this.keyPrefix}${this.indexFile}`) throw new Error('Content slug collides with the internal index file');
    return key;
  }

  // ─── CRUD ──────────────────────────────────────────────────

  /**
   *
   */
  async get(slug: string): Promise<ContentItem | null> {
    const key = this.getKey(slug);
    const data = await this.storage.download(key);
    if (!data) return null;

    const content = utf8Decoder.decode(data);

    if (this.format === 'json') {
      const parsed = JSON.parse(content);
      return parsed as ContentItem;
    } else {
      const { data: frontmatter, body } = parseFrontmatter(content);
      return dataToItem(slug, frontmatter, body);
    }
  }

  /**
   *
   */
  async list(filter?: ContentFilter): Promise<ContentItem[]> {
    // Fast path: retrieve item list from index file
    const indexKey = `${this.keyPrefix}${this.indexFile}`;
    const indexData = await this.storage.download(indexKey);

    let items: ContentItem[] = [];

    if (indexData) {
      const entries = JSON.parse(utf8Decoder.decode(indexData));
      items = Array.isArray(entries) ? entries : [];
    } else {
      // Fallback: scan all files when index is absent (slower)
      let cursor: string | undefined;
      const seen = new Set<string>();
      do {
        const result = await this.storage.list({ prefix: this.keyPrefix, cursor });
        for (const object of result.objects) {
          if (object.key === indexKey || object.key.endsWith('/')) continue;
          const slug = object.key.slice(this.keyPrefix.length).replace(/\.(json|md)$/, '');
          const item = await this.get(slug);
          if (item) items.push(item);
        }
        if (!result.hasMore) break;
        if (!result.nextCursor || seen.has(result.nextCursor)) throw new Error('Storage pagination did not advance');
        cursor = result.nextCursor; seen.add(cursor);
      } while (cursor);
    }

    // Apply filters
    if (filter) {
      if (filter.contentType) items = items.filter((i) => i.contentType === filter.contentType);
      if (filter.status) items = items.filter((i) => i.status === filter.status);
      if (filter.author) items = items.filter((i) => i.author === filter.author);
      if (filter.tags?.length) items = items.filter((i) => filter.tags!.some((t) => i.tags?.includes(t)));
      if (filter.search) {
        const q = filter.search.toLowerCase();
        items = items.filter(
          (i) => `${i.title} ${i.description ?? ''} ${i.body}`.toLowerCase().includes(q)
        );
      }
    }

    // Sort items
    if (filter?.sort) {
      const [field, dir] = Object.entries(filter.sort)[0] ?? ['publishedAt', -1];
      items.sort((a, b) => {
        const aVal = (a as any)[field] ?? '';
        const bVal = (b as any)[field] ?? '';
        return dir === 1 ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
      });
    }

    // Apply pagination
    const offset = filter?.offset ?? 0;
    const limit = filter?.limit;
    if (!Number.isInteger(offset) || offset < 0 || (limit !== undefined && (!Number.isInteger(limit) || limit < 0))) throw new Error('Content pagination must use nonnegative integers');
    return limit !== undefined ? items.slice(offset, offset + limit) : items.slice(offset);
  }

  /**
   *
   */
  async save(item: ContentItem): Promise<void> {
    return this.mutate(async () => {
    const key = this.getKey(item.slug);
    const updatedAt = new Date().toISOString();
    const itemWithDate = { ...item, updatedAt };

    if (this.format === 'json') {
      await this.storage.upload(key, JSON.stringify(itemWithDate, null, 2), {
        contentType: 'application/json',
      });
    } else {
      await this.storage.upload(key, toFrontmatter(itemWithDate), {
        contentType: 'text/markdown',
      });
    }

    // Update index
    await this.updateIndex(itemWithDate);
    });
  }

  /**
   *
   */
  async delete(slug: string): Promise<void> {
    const key = this.getKey(slug);
    return this.mutate(async () => {
      if (!await this.storage.delete(key) && await this.storage.exists(key)) throw new Error('Content deletion failed');
      await this.removeFromIndex(slug);
    });
  }

  /**
   *
   */
  async sync(items: ContentItem[], options?: { deleteMissing?: boolean }): Promise<ContentSyncResult> {
    const start = Date.now();
    let created = 0;
    let updated = 0;
    let deleted = 0;
    let unchanged = 0;
    const errors: Array<{ slug: string; error: string }> = [];

    const existingItems = await this.list();
    const existingMap = new Map(existingItems.map((i) => [i.slug, i]));

    for (const item of items) {
      try {
        const existing = existingMap.get(item.slug);
        if (existing) {
          if (contentFingerprint(existing) === contentFingerprint(item)) {
            unchanged++;
          } else {
            await this.save({ ...item, lastSyncedAt: new Date().toISOString() });
            updated++;
          }
        } else {
          await this.save({ ...item, lastSyncedAt: new Date().toISOString() });
          created++;
        }
        existingMap.delete(item.slug);
      } catch (e) {
        errors.push({ slug: item.slug, error: (e as Error).message });
      }
    }

    if (options?.deleteMissing) {
      for (const [slug, item] of existingMap) {
        if (item.sourceId) {
          try {
            await this.delete(slug);
            deleted++;
          } catch (e) {
            errors.push({ slug, error: (e as Error).message });
          }
        }
      }
    }

    return { created, updated, deleted, unchanged, skipped: 0, durationMs: Date.now() - start, errors };
  }

  // ─── Index Management ──────────────────────────────────────

  private async updateIndex(item: ContentItem): Promise<void> {
    const indexKey = `${this.keyPrefix}${this.indexFile}`;
    let entries: ContentItem[] = [];

    const existing = await this.storage.download(indexKey);
    if (existing) {
      entries = JSON.parse(utf8Decoder.decode(existing));
    } else {
      entries = await this.list();
    }

    const idx = entries.findIndex((e) => e.slug === item.slug);
    if (idx >= 0) {
      entries[idx] = item;
    } else {
      entries.push(item);
    }

    await this.storage.upload(indexKey, JSON.stringify(entries, null, 2), {
      contentType: 'application/json',
    });
  }

  private async removeFromIndex(slug: string): Promise<void> {
    const indexKey = `${this.keyPrefix}${this.indexFile}`;
    const existing = await this.storage.download(indexKey);
    if (!existing) return;

    let entries: ContentItem[] = JSON.parse(utf8Decoder.decode(existing));
    entries = entries.filter((e) => e.slug !== slug);

    await this.storage.upload(indexKey, JSON.stringify(entries, null, 2), {
      contentType: 'application/json',
    });
  }
}
