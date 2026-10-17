/**
 * @fileoverview Git + Markdown Content Adapter
 *
 * Manages content items as frontmatter Markdown files in a Git repository.
 * Supports bidirectional access: ERP → Git (sync) and Git → ERP (read).
 *
 * Conflict resolution:
 * - ERP-managed content (has sourceId) tracks lastSyncedAt
 * - If file was manually edited after lastSyncedAt, skip-if-edited strategy preserves edits
 * - pull-before-write option for multi-machine workflows
 *
 * @module lib/content/git-markdown-adapter
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { constants } from 'node:fs';
import { ContainedPathRoot, validateRelativePath } from '../server/contained-path';
import type {
  ContentAdapter,
  ContentItem,
  ContentFilter,
  ContentSyncResult,
  GitMarkdownConfig,
} from './types';

// =============================================================================
// Frontmatter Serialization
// =============================================================================

function toFrontmatter(item: ContentItem, includeMetadata: boolean): string {
  const lines: string[] = ['---'];

  const write = (key: string, value: unknown) => {
    if (value === undefined || value === null) return;
    if (typeof value === 'string') {
      if (
        value.includes(':') ||
        value.includes('#') ||
        value.includes('"') ||
        value.startsWith("'")
      ) {
        lines.push(`${key}: "${value.replace(/"/g, '\\"')}"`);
      } else {
        lines.push(`${key}: ${value}`);
      }
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      lines.push(`${key}: ${value}`);
    } else if (Array.isArray(value)) {
      if (value.length === 0) return;
      lines.push(`${key}:`);
      for (const v of value) lines.push(`  - ${typeof v === 'string' ? `"${v}"` : v}`);
    } else if (typeof value === 'object') {
      lines.push(`${key}: ${JSON.stringify(value)}`);
    }
  };

  // Core fields
  write('title', item.title);
  write('description', item.description);
  write('contentType', item.contentType);
  write('status', item.status);
  write('author', item.author);
  write('image', item.image);
  write('tags', item.tags);
  write('publishedAt', item.publishedAt);
  write('updatedAt', item.updatedAt);
  write('scheduledAt', item.scheduledAt);

  // SEO fields
  if (item.seoTitle) write('seoTitle', item.seoTitle);
  if (item.seoDescription) write('seoDescription', item.seoDescription);
  if (item.seoKeywords?.length) write('seoKeywords', item.seoKeywords);
  if (item.canonicalUrl) write('canonicalUrl', item.canonicalUrl);
  if (item.ogImage) write('ogImage', item.ogImage);
  if (item.jsonLd) write('jsonLd', item.jsonLd);

  // ERP ownership tracking
  if (item.sourceId) write('sourceId', item.sourceId);
  if (item.sourceTable) write('sourceTable', item.sourceTable);
  if (item.tenantId) write('tenantId', item.tenantId);
  if (item.lastSyncedAt) write('lastSyncedAt', item.lastSyncedAt);

  // Custom metadata
  if (includeMetadata && item.metadata) {
    for (const [key, value] of Object.entries(item.metadata)) {
      write(key, value);
    }
  }

  lines.push('---');
  lines.push('');
  lines.push(item.body);
  return lines.join('\n');
}

// =============================================================================
// Frontmatter Parser
// =============================================================================

function parseFrontmatter(content: string): { data: Record<string, unknown>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: content };

  const yamlStr = match[1];
  const body = match[2].trim();
  const data: Record<string, unknown> = {};
  let arrayTarget: string[] | null = null;

  for (const line of yamlStr.split('\n')) {
    const trimmed = line.trim();

    if (trimmed.startsWith('- ')) {
      if (arrayTarget) {
        let val = trimmed.slice(2).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        arrayTarget.push(val);
      }
      continue;
    }

    const kvMatch = trimmed.match(/^(\w+):\s*(.*)?$/);
    if (kvMatch) {
      const key = kvMatch[1];
      let value: unknown = kvMatch[2]?.trim();

      if (value === undefined || value === '' || value === null) {
        data[key] = [];
        arrayTarget = data[key] as string[];
        continue;
      }

      if (typeof value === 'string') {
        if (value === 'true') value = true as unknown as string;
        else if (value === 'false') value = false as unknown as string;
        else if (value === 'null') value = null as unknown as string;
        else if (/^\d+$/.test(value)) value = Number(value) as unknown as string;
        else if (/^\d+\.\d+$/.test(value)) value = Number(value) as unknown as string;
        else if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        } else if (value.startsWith('{')) {
          try {
            value = JSON.parse(value);
          } catch {
            /* keep as string */
          }
        }
      }

      data[key] = value;
      arrayTarget = null;
    }
  }

  return { data, body };
}

// =============================================================================
// Known frontmatter keys (to extract custom metadata)
// =============================================================================

const KNOWN_KEYS = new Set([
  'title',
  'description',
  'contentType',
  'status',
  'author',
  'image',
  'tags',
  'publishedAt',
  'updatedAt',
  'scheduledAt',
  'seoTitle',
  'seoDescription',
  'seoKeywords',
  'canonicalUrl',
  'ogImage',
  'jsonLd',
  'sourceId',
  'sourceTable',
  'tenantId',
  'lastSyncedAt',
]);

function extractMetadata(data: Record<string, unknown>): Record<string, unknown> | undefined {
  const extra: Record<string, unknown> = {};
  let hasExtra = false;
  for (const [key, value] of Object.entries(data)) {
    if (!KNOWN_KEYS.has(key)) {
      extra[key] = value;
      hasExtra = true;
    }
  }
  return hasExtra ? extra : undefined;
}

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
    sourceId: data.sourceId as string | undefined,
    sourceTable: data.sourceTable as string | undefined,
    tenantId: data.tenantId as string | undefined,
    lastSyncedAt: data.lastSyncedAt as string | undefined,
    metadata: extractMetadata(data),
  };
}

// =============================================================================
// GitMarkdownAdapter
// =============================================================================

/**
 * ContentAdapter implementation that stores content as Markdown files
 * with YAML frontmatter in a Git repository.
 *
 * Supports bidirectional access and conflict resolution for
 * ERP ↔ Keystatic/editor coexistence.
 *
 * Slugs and contentDir must be relative paths without dot segments, backslashes
 * or .git components. Symlinks below the pinned repository root are rejected.
 * The repository, its Git configuration/hooks and its ancestors must be trusted
 * and protected from concurrent untrusted filesystem mutation.
 *
 * @example
 * ```typescript
 * const adapter = new GitMarkdownAdapter({
 *   repoPath: '/path/to/astro-site',
 *   contentDir: 'src/content/blog',
 *   conflictStrategy: 'skip-if-edited',
 *   pullBeforeWrite: true,
 * });
 *
 * // ERP syncs data to Git
 * await adapter.sync(erpItems, { deleteMissing: true });
 *
 * // Read back content (for ERP dashboard, search, etc.)
 * const items = await adapter.list({ status: 'published' });
 * ```
 */
export class GitMarkdownAdapter implements ContentAdapter {
  private readonly paths: ContainedPathRoot;
  private readonly config: Required<
    Omit<GitMarkdownConfig, 'commitMessage' | 'pullBeforeWrite'>
  > & {
    commitMessage: GitMarkdownConfig['commitMessage'];
    pullBeforeWrite: boolean;
  };

  /**
   *
   */
  constructor(config: GitMarkdownConfig) {
    this.validateContentRelativePath(config.contentDir);
    if (!/^(\.[a-z0-9_-]+)+$/i.test(config.extension ?? '.md')) {
      throw new Error('Unsafe path: invalid content extension');
    }
    this.paths = new ContainedPathRoot(config.repoPath);
    this.config = Object.freeze({
      repoPath: this.paths.root,
      contentDir: config.contentDir,
      extension: config.extension ?? '.md',
      autoCommit: config.autoCommit ?? true,
      commitMessage: config.commitMessage ?? undefined,
      includeMetadata: config.includeMetadata ?? true,
      conflictStrategy: config.conflictStrategy ?? 'skip-if-edited',
      pullBeforeWrite: config.pullBeforeWrite ?? false,
    });
  }

  // ─── Path helpers ────────────────────────────────────────────

  private validateContentRelativePath(value: string): void {
    validateRelativePath(value);
    if (value.split('/').some((part) => part.toLowerCase() === '.git')) {
      throw new Error('Unsafe path: Git metadata is not content');
    }
  }

  private getContentPath(slug: string): Promise<string> {
    this.validateContentRelativePath(slug);
    return this.paths.resolve(`${this.config.contentDir}/${slug}${this.config.extension}`);
  }

  private async ensureDir(): Promise<void> {
    await fs.mkdir(await this.paths.resolve(this.config.contentDir), { recursive: true });
  }

  // ─── Git helpers ─────────────────────────────────────────────

  private async gitPull(): Promise<void> {
    if (!this.config.pullBeforeWrite) return;
    await this.paths.resolve(this.config.contentDir);
    try {
      await this.runGit(['pull', '--rebase', '--autostash']);
    } catch {
      // Pull failure is non-fatal
    }
  }

  private async runGit(args: string[]): Promise<void> {
    const { execFile } = await import('node:child_process');
    await new Promise<void>((resolve, reject) => {
      execFile('git', args, { cwd: this.config.repoPath, shell: false }, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  private async gitCommit(
    filePath: string,
    item: ContentItem,
    action: 'create' | 'update' | 'delete',
  ): Promise<void> {
    if (!this.config.autoCommit) return;
    await this.getContentPath(item.slug);
    try {
      const relPath = path.relative(this.config.repoPath, filePath);

      let message: string;
      if (typeof this.config.commitMessage === 'function') {
        message = this.config.commitMessage(item, action);
      } else if (this.config.commitMessage) {
        message = this.config.commitMessage;
      } else {
        message = `content: ${action} ${item.slug}`;
      }

      await this.runGit(['--literal-pathspecs', 'add', '--', relPath]);
      await this.runGit(['commit', '-m', message]);
    } catch {
      // Git operations are best-effort
    }
  }

  // ─── Conflict detection ──────────────────────────────────────

  /**
   * Checks if a file was manually edited after the last ERP sync.
   * Uses file mtime vs lastSyncedAt comparison.
   */
  private async wasManuallyEdited(
    filePath: string,
    lastSyncedAt: string | undefined,
  ): Promise<boolean> {
    if (!lastSyncedAt) return false;
    try {
      const stat = await fs.stat(filePath);
      const fileMtime = stat.mtime.toISOString();
      // If file was modified after last sync, it was manually edited
      return fileMtime > lastSyncedAt;
    } catch {
      return false;
    }
  }

  // ─── CRUD ────────────────────────────────────────────────────

  /**
   *
   */
  async get(slug: string): Promise<ContentItem | null> {
    const filePath = await this.getContentPath(slug);
    try {
      const raw = await fs.readFile(filePath, {
        encoding: 'utf-8',
        flag: constants.O_RDONLY | constants.O_NOFOLLOW,
      });
      const { data, body } = parseFrontmatter(raw);
      return dataToItem(slug, data, body);
    } catch {
      return null;
    }
  }

  /**
   *
   */
  async list(filter?: ContentFilter): Promise<ContentItem[]> {
    const dir = await this.paths.resolve(this.config.contentDir);
    let files: string[];
    try {
      files = await fs.readdir(dir);
    } catch {
      return [];
    }

    const mdFiles = files.filter((f) => f.endsWith(this.config.extension));
    const items: ContentItem[] = [];

    for (const file of mdFiles) {
      const slug = file.slice(0, -this.config.extension.length);
      const item = await this.get(slug);
      if (item && this.matchesFilter(item, filter)) {
        items.push(item);
      }
    }

    // Sort
    if (filter?.sort) {
      const [sortField, sortDir] = Object.entries(filter.sort)[0] ?? ['publishedAt', -1];
      items.sort((a, b) => {
        const aVal = (a as any)[sortField] ?? '';
        const bVal = (b as any)[sortField] ?? '';
        return sortDir === 1
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
    }

    const offset = filter?.offset ?? 0;
    const limit = filter?.limit;
    return limit ? items.slice(offset, offset + limit) : items.slice(offset);
  }

  private matchesFilter(item: ContentItem, filter?: ContentFilter): boolean {
    if (!filter) return true;
    if (filter.contentType && item.contentType !== filter.contentType) return false;
    if (filter.status && item.status !== filter.status) return false;
    if (filter.author && item.author !== filter.author) return false;
    if (filter.tags?.length && !filter.tags.some((t) => item.tags?.includes(t))) return false;
    if (filter.erpManagedOnly && !item.sourceId) return false;
    if (filter.publishedAfter && item.publishedAt && item.publishedAt < filter.publishedAfter)
      return false;
    if (filter.publishedBefore && item.publishedAt && item.publishedAt > filter.publishedBefore)
      return false;
    if (filter.search) {
      const q = filter.search.toLowerCase();
      const searchable = `${item.title} ${item.description ?? ''} ${item.body}`.toLowerCase();
      if (!searchable.includes(q)) return false;
    }
    return true;
  }

  /**
   *
   */
  async save(item: ContentItem): Promise<void> {
    await this.getContentPath(item.slug);
    await this.ensureDir();
    await this.gitPull();

    const filePath = await this.getContentPath(item.slug);
    const content = toFrontmatter(item, this.config.includeMetadata);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await this.getContentPath(item.slug);
    await fs.writeFile(filePath, content, {
      encoding: 'utf-8',
      flag: constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | constants.O_NOFOLLOW,
    });
    await this.gitCommit(filePath, item, 'create');
  }

  /**
   *
   */
  async delete(slug: string): Promise<void> {
    const filePath = await this.getContentPath(slug);
    try {
      await fs.unlink(filePath);
      await this.gitCommit(filePath, { slug } as ContentItem, 'delete');
    } catch {
      // File doesn't exist
    }
  }

  // ─── Sync (diff-based with conflict resolution) ──────────────

  /**
   *
   */
  async sync(
    items: ContentItem[],
    options?: { deleteMissing?: boolean },
  ): Promise<ContentSyncResult> {
    // Validate the batch before pull or deleteMissing can have side effects.
    await this.paths.resolve(this.config.contentDir);
    for (const item of items) await this.getContentPath(item.slug);
    const start = Date.now();
    let created = 0;
    let updated = 0;
    let deleted = 0;
    let unchanged = 0;
    let skipped = 0;
    const errors: Array<{ slug: string; error: string }> = [];

    await this.gitPull();

    // Build index of existing files
    const existingSlugs = new Set<string>();
    const dir = await this.paths.resolve(this.config.contentDir);
    try {
      const files = await fs.readdir(dir);
      for (const f of files) {
        if (f.endsWith(this.config.extension)) {
          existingSlugs.add(f.slice(0, -this.config.extension.length));
        }
      }
    } catch {
      /* empty */
    }

    // Process incoming items
    for (const item of items) {
      try {
        const existing = await this.get(item.slug);
        const now = new Date().toISOString();

        if (existing) {
          // ── Conflict check for ERP-managed content ──
          if (
            existing.sourceId &&
            existing.lastSyncedAt &&
            this.config.conflictStrategy !== 'overwrite'
          ) {
            const edited = await this.wasManuallyEdited(
              await this.getContentPath(item.slug),
              existing.lastSyncedAt,
            );
            if (edited) {
              if (this.config.conflictStrategy === 'skip-if-edited') {
                skipped++;
                continue;
              }
              if (this.config.conflictStrategy === 'merge-frontmatter') {
                // Preserve manual body, update frontmatter fields
                const merged: ContentItem = {
                  ...item,
                  body: existing.body, // Keep manual body
                  lastSyncedAt: now,
                };
                await this.save(merged);
                updated++;
                continue;
              }
            }
          }

          // ── Normal diff ──
          if (
            existing.body === item.body &&
            existing.title === item.title &&
            JSON.stringify(existing.metadata) === JSON.stringify(item.metadata)
          ) {
            unchanged++;
          } else {
            await this.save({ ...item, lastSyncedAt: now });
            updated++;
          }
        } else {
          // New item
          await this.save({ ...item, lastSyncedAt: now });
          created++;
        }
        existingSlugs.delete(item.slug);
      } catch (e) {
        errors.push({ slug: item.slug, error: (e as Error).message });
      }
    }

    // Delete missing
    if (options?.deleteMissing) {
      for (const slug of existingSlugs) {
        try {
          const existing = await this.get(slug);
          // Only delete ERP-managed content (has sourceId)
          if (existing?.sourceId) {
            await this.delete(slug);
            deleted++;
          }
        } catch (e) {
          errors.push({ slug, error: (e as Error).message });
        }
      }
    }

    return {
      created,
      updated,
      deleted,
      unchanged,
      skipped,
      durationMs: Date.now() - start,
      errors,
    };
  }
}
