/**
 * @fileoverview Database Content Adapter
 *
 * Manages content in any database (via DataAccessAdapter).
 * Flexible column mapping links existing database tables with ContentItem.
 *
 * @module lib/content/database-content-adapter
 */

import type { DataAccessAdapter, Filter, QueryOptions } from "../types";
import type {
  ContentAdapter,
  ContentItem,
  ContentFilter,
  ContentSyncResult,
} from './types';

// =============================================================================
// Column Mapping
// =============================================================================

/**
 * Mapping of ContentItem fields to database column names.
 * Unspecified fields are ignored during save and fetch operations.
 */
export interface ContentColumnMapping {
  slug: string;
  title: string;
  body: string;
  contentType?: string;
  description?: string;
  image?: string;
  author?: string;
  tags?: string;
  status?: string;
  publishedAt?: string;
  updatedAt?: string;
  scheduledAt?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
  jsonLd?: string;
  sourceId?: string;
  sourceTable?: string;
  tenantId?: string;
  lastSyncedAt?: string;
  metadata?: string;
}

/** Default column mapping (standard naming conventions) */
const DEFAULT_MAPPING: ContentColumnMapping = {
  slug: 'slug',
  title: 'title',
  body: 'body',
  contentType: 'content_type',
  description: 'description',
  image: 'image',
  author: 'author',
  tags: 'tags',
  status: 'status',
  publishedAt: 'published_at',
  updatedAt: 'updated_at',
  scheduledAt: 'scheduled_at',
  seoTitle: 'seo_title',
  seoDescription: 'seo_description',
  seoKeywords: 'seo_keywords',
  canonicalUrl: 'canonical_url',
  ogImage: 'og_image',
  jsonLd: 'json_ld',
  sourceId: 'source_id',
  sourceTable: 'source_table',
  tenantId: 'tenant_id',
  lastSyncedAt: 'last_synced_at',
  metadata: 'metadata',
};

// =============================================================================
// Configuration
// =============================================================================

export interface DatabaseContentAdapterConfig {
  /** DataAccessAdapter instance (Supabase, Oracle, Neon, etc.) */
  db: DataAccessAdapter;
  /** Content table name */
  table: string;
  /** Column mapping (defaults to snake_case) */
  mapping?: Partial<ContentColumnMapping>;
  /** Column name for tenant filtering (null to disable) */
  tenantField?: string | null;
  /** Default tenant ID */
  tenantId?: string;
}

// =============================================================================
// DatabaseContentAdapter
// =============================================================================

/**
 * Implements ContentAdapter for arbitrary databases.
 * Uses DataAccessAdapter to allow switching between databases like Supabase, Oracle, Neon, etc.
 *
 * @example
 * ```typescript
 * const content = new DatabaseContentAdapter({
 *   db: supabaseAdapter,
 *   table: 'cms_posts',
 *   tenantId: 'tenant-123',
 * });
 *
 * const posts = await content.list({ status: 'published' });
 * ```
 */
export class DatabaseContentAdapter implements ContentAdapter {
  private db: DataAccessAdapter;
  private table: string;
  private mapping: ContentColumnMapping;
  private tenantField: string | null;
  private tenantId?: string;

  /**
   *
   */
  constructor(config: DatabaseContentAdapterConfig) {
    this.db = config.db;
    this.table = config.table;
    this.mapping = { ...DEFAULT_MAPPING, ...config.mapping };
    this.tenantField = config.tenantField ?? 'tenant_id';
    this.tenantId = config.tenantId;
  }

  // ─── Helpers ───────────────────────────────────────────────

  private itemToRow(item: ContentItem): Record<string, unknown> {
    const m = this.mapping;
    const row: Record<string, unknown> = {};

    const set = (field: keyof ContentColumnMapping, value: unknown) => {
      const col = m[field];
      if (col && value !== undefined) row[col] = value;
    };

    set('slug', item.slug);
    set('title', item.title);
    set('body', item.body);
    set('contentType', item.contentType);
    set('description', item.description);
    set('image', item.image);
    set('author', item.author);
    set('tags', item.tags ? JSON.stringify(item.tags) : undefined);
    set('status', item.status);
    set('publishedAt', item.publishedAt);
    set('updatedAt', item.updatedAt);
    set('scheduledAt', item.scheduledAt);
    set('seoTitle', item.seoTitle);
    set('seoDescription', item.seoDescription);
    set('seoKeywords', item.seoKeywords ? JSON.stringify(item.seoKeywords) : undefined);
    set('canonicalUrl', item.canonicalUrl);
    set('ogImage', item.ogImage);
    set('jsonLd', item.jsonLd ? JSON.stringify(item.jsonLd) : undefined);
    set('sourceId', item.sourceId);
    set('sourceTable', item.sourceTable);
    set('lastSyncedAt', item.lastSyncedAt);
    set('metadata', item.metadata ? JSON.stringify(item.metadata) : undefined);

    if (this.tenantField && this.tenantId) {
      row[this.tenantField] = item.tenantId ?? this.tenantId;
    }

    return row;
  }

  private rowToItem(row: Record<string, unknown>): ContentItem {
    const m = this.mapping;

    const get = (field: keyof ContentColumnMapping): unknown => {
      const col = m[field];
      return col ? row[col] : undefined;
    };

    const parseJson = (val: unknown): any => {
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return val; }
      }
      return val;
    };

    return {
      slug: String(get('slug') ?? ''),
      title: String(get('title') ?? ''),
      body: String(get('body') ?? ''),
      contentType: String(get('contentType') ?? 'page'),
      description: get('description') as string | undefined,
      image: get('image') as string | undefined,
      author: get('author') as string | undefined,
      tags: parseJson(get('tags')) as string[] | undefined,
      status: (get('status') as ContentItem['status']) ?? 'draft',
      publishedAt: get('publishedAt') as string | undefined,
      updatedAt: get('updatedAt') as string | undefined,
      scheduledAt: get('scheduledAt') as string | undefined,
      seoTitle: get('seoTitle') as string | undefined,
      seoDescription: get('seoDescription') as string | undefined,
      seoKeywords: parseJson(get('seoKeywords')) as string[] | undefined,
      canonicalUrl: get('canonicalUrl') as string | undefined,
      ogImage: get('ogImage') as string | undefined,
      jsonLd: parseJson(get('jsonLd')) as Record<string, unknown> | undefined,
      sourceId: get('sourceId') as string | undefined,
      sourceTable: get('sourceTable') as string | undefined,
      tenantId: get('tenantId') as string | undefined,
      lastSyncedAt: get('lastSyncedAt') as string | undefined,
      metadata: parseJson(get('metadata')) as Record<string, unknown> | undefined,
    };
  }

  private buildFilter(filter?: ContentFilter): Filter {
    const f: Filter = {};
    const m = this.mapping;

    if (this.tenantField && this.tenantId) {
      f[this.tenantField] = this.tenantId;
    }
    if (filter?.contentType && m.contentType) f[m.contentType] = filter.contentType;
    if (filter?.status && m.status) f[m.status] = filter.status;
    if (filter?.author && m.author) f[m.author] = filter.author;

    return f;
  }

  // ─── CRUD ──────────────────────────────────────────────────

  /**
   *
   */
  async get(slug: string): Promise<ContentItem | null> {
    const slugCol = this.mapping.slug;
    const filter: Filter = { [slugCol]: slug };
    if (this.tenantField && this.tenantId) {
      filter[this.tenantField] = this.tenantId;
    }

    const rows = await this.db.find<Record<string, unknown>>(this.table, filter, { limit: 1 });
    return rows.length > 0 ? this.rowToItem(rows[0]) : null;
  }

  /**
   *
   */
  async list(filter?: ContentFilter): Promise<ContentItem[]> {
    const dbFilter = this.buildFilter(filter);
    const options: QueryOptions = {};

    if (filter?.sort) {
      options.sort = filter.sort;
    } else {
      // Default: sort by publishedAt descending
      const pubCol = this.mapping.publishedAt;
      if (pubCol) options.sort = { [pubCol]: -1 };
    }
    if (filter?.limit) options.limit = filter.limit;
    if (filter?.offset) options.skip = filter.offset;

    const rows = await this.db.find<Record<string, unknown>>(this.table, dbFilter, options);
    return rows.map((row) => this.rowToItem(row));
  }

  /**
   *
   */
  async save(item: ContentItem): Promise<void> {
    const row = this.itemToRow(item);
    const slugCol = this.mapping.slug;

    // UPSERT: check existence then insert or update
    const existing = await this.get(item.slug);
    if (existing) {
      await this.db.update(this.table, row[slugCol] as string, row);
    } else {
      await this.db.create(this.table, row);
    }
  }

  /**
   *
   */
  async delete(slug: string): Promise<void> {
    const slugCol = this.mapping.slug;
    const filter: Filter = { [slugCol]: slug };
    if (this.tenantField && this.tenantId) {
      filter[this.tenantField] = this.tenantId;
    }

    if (this.db.deleteMany) {
      await this.db.deleteMany(this.table, filter);
    }
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

    // Index existing items
    const existingItems = await this.list();
    const existingMap = new Map(existingItems.map((i) => [i.slug, i]));

    for (const item of items) {
      try {
        const existing = existingMap.get(item.slug);
        if (existing) {
          if (existing.body === item.body && existing.title === item.title) {
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
}
