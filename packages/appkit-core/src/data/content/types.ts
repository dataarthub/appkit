/**
 * @fileoverview Content Adapter for SSG (Astro, Next.js, Hugo)
 *
 * Bridges ERP data with static site generators by managing content items
 * with frontmatter, SEO metadata, and Markdown body.
 *
 * @module lib/content/types
 */

// =============================================================================
// Content Item
// =============================================================================

/**
 * A content item represents a single piece of publishable content
 * (blog post, plan page, news article, etc.)
 */
export interface ContentItem {
  /** Unique slug (used as filename and URL path) */
  slug: string;
  /** Content type (e.g., 'post', 'plan', 'news', 'page') */
  contentType: string;

  // -- Frontmatter fields --
  /** Display title */
  title: string;
  /** Short description / excerpt */
  description?: string;
  /** Hero / cover image key (in storage) */
  image?: string;
  /** Author name */
  author?: string;
  /** Tags for categorization */
  tags?: string[];
  /** Publication status */
  status: 'draft' | 'published' | 'archived';
  /** Publish date (ISO 8601) */
  publishedAt?: string;
  /** Last updated date (ISO 8601) */
  updatedAt?: string;
  /** Scheduled publish date (ISO 8601, for future publishing) */
  scheduledAt?: string;

  // -- SEO metadata --
  /** SEO title (falls back to title) */
  seoTitle?: string;
  /** SEO description (falls back to description) */
  seoDescription?: string;
  /** SEO keywords */
  seoKeywords?: string[];
  /** Canonical URL */
  canonicalUrl?: string;
  /** Open Graph image key */
  ogImage?: string;
  /** Schema.org structured data (JSON-LD) */
  jsonLd?: Record<string, unknown>;

  // -- Content body --
  /** Markdown body content */
  body: string;

  // -- ERP ownership tracking (for conflict resolution) --
  /** Source record ID in the database. Present = ERP-managed content. */
  sourceId?: string;
  /** Source table/collection name */
  sourceTable?: string;
  /** Tenant ID */
  tenantId?: string;
  /** Timestamp of last ERP sync (ISO 8601). Used for conflict detection. */
  lastSyncedAt?: string;

  // -- Custom metadata (for domain-specific fields) --
  /** Arbitrary metadata stored in frontmatter */
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Content Filter
// =============================================================================

/**
 * Filter options for listing content items.
 */
export interface ContentFilter {
  /** Filter by content type */
  contentType?: string;
  /** Filter by status */
  status?: ContentItem['status'];
  /** Filter by tags (any match) */
  tags?: string[];
  /** Filter by author */
  author?: string;
  /** Full-text search in title and body */
  search?: string;
  /** Published after this date */
  publishedAfter?: string;
  /** Published before this date */
  publishedBefore?: string;
  /** Only ERP-managed content (has sourceId) */
  erpManagedOnly?: boolean;
  /** Max results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Sort field and direction */
  sort?: Record<string, 1 | -1>;
}

// =============================================================================
// Sync Result
// =============================================================================

/**
 * Result of a content sync operation.
 */
export interface ContentSyncResult {
  /** Number of items created */
  created: number;
  /** Number of items updated */
  updated: number;
  /** Number of items deleted */
  deleted: number;
  /** Number of items unchanged */
  unchanged: number;
  /** Number of items skipped due to manual edits */
  skipped: number;
  /** Duration in milliseconds */
  durationMs: number;
  /** Errors encountered */
  errors: Array<{ slug: string; error: string }>;
}

// =============================================================================
// Build / Deploy Result
// =============================================================================

/**
 * Result of a static site build.
 */
export interface BuildResult {
  success: boolean;
  outputDir?: string;
  durationMs?: number;
  output?: string;
  error?: string;
}

/**
 * Result of a deploy operation (e.g., to R2/Cloudflare Pages).
 */
export interface DeployResult {
  success: boolean;
  filesDeployed?: number;
  durationMs?: number;
  error?: string;
}

// =============================================================================
// Content Adapter Configuration
// =============================================================================

/**
 * Configuration for GitMarkdownAdapter.
 */
export interface GitMarkdownConfig {
  /** Path to the Git repository */
  repoPath: string;
  /** Relative directory within the repo, without dot segments, backslashes or symlinks (e.g., 'src/content/blog'). */
  contentDir: string;
  /** Dot-prefixed alphanumeric extension (default: '.md'); path separators are forbidden. */
  extension?: string;
  /** Auto-commit on writes (default: true) */
  autoCommit?: boolean;
  /** Commit message template */
  commitMessage?: string | ((item: ContentItem, action: 'create' | 'update' | 'delete') => string);
  /** Whether to include all metadata fields in frontmatter (default: true) */
  includeMetadata?: boolean;
  /**
   * Conflict resolution strategy for ERP-managed content.
   * - 'overwrite': Always overwrite (ignore manual edits)
   * - 'skip-if-edited': Skip if file was manually edited since last sync (default)
   * - 'merge-frontmatter': Update frontmatter only, preserve manual body edits
   */
  conflictStrategy?: 'overwrite' | 'skip-if-edited' | 'merge-frontmatter';
  /** Pull from remote before write (default: false) */
  pullBeforeWrite?: boolean;
}

// =============================================================================
// Content Adapter Interface
// =============================================================================

/**
 * Content adapter interface for SSG content management.
 *
 * Manages content items as Markdown files with frontmatter,
 * suitable for Astro, Next.js (MDX), Hugo, and other SSGs.
 */
export interface ContentAdapter {
  get(slug: string): Promise<ContentItem | null>;
  list(filter?: ContentFilter): Promise<ContentItem[]>;
  save(item: ContentItem): Promise<void>;
  delete(slug: string): Promise<void>;
  sync(items: ContentItem[], options?: { deleteMissing?: boolean }): Promise<ContentSyncResult>;
  build?(command?: string): Promise<BuildResult>;
  deploy?(
    outputDir: string,
    target: { upload: (key: string, data: Uint8Array, options?: any) => Promise<any> },
  ): Promise<DeployResult>;
}
