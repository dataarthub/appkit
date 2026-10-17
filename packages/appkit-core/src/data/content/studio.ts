/** Publication status of a document managed by Content Studio. */
export type ContentStudioStatus = 'draft' | 'scheduled' | 'published' | 'archived';

/**
 * Backend-agnostic document model shared between the authoring UI and the backend.
 * The body is held in a host-chosen string representation, such as Markdown.
 */
export interface ContentStudioDocument {
  /** Host-assigned document ID. Can be an empty string for a new draft. */
  id: string;
  /** Collection identifier. */
  collection: string;
  /** Document locale. */
  locale: string;
  /** Slug used for URLs or filenames. */
  slug: string;
  /** Display title. */
  title: string;
  /** Summary used for listings and SEO. */
  summary?: string;
  /** Body content. The UI or host interprets its format. */
  body: string;
  /** Optional tags. */
  tags: string[];
  /** Publication status. */
  status: ContentStudioStatus;
  /** Collection-specific additional data. */
  data: Record<string, unknown>;
  /** Creation date and time (ISO 8601). */
  createdAt?: string;
  /** Modification date and time (ISO 8601). Can also be used for conflict detection. */
  modifiedAt?: string;
}

/** Definition of a collection displayed in Content Studio. */
export interface ContentStudioCollection {
  /** Collection identifier. */
  id: string;
  /** Label displayed in the UI. */
  label: string;
  /** Description displayed in the UI. */
  description?: string;
  /** Selectable locales. Uses the UI locale if omitted. */
  locales?: readonly string[];
  /** Whether the rich text editor can be displayed. */
  supportsRichText?: boolean;
  /** Host metadata indicating whether media capabilities are available. */
  supportsMedia?: boolean;
  /** Constructs host-specific initial values for a new draft. */
  createDraft?: (input: {
    collection: string;
    locale: string;
    id: string;
    slug: string;
  }) => ContentStudioDocument;
}

/** Query conditions for retrieving a document list. */
export interface ContentStudioListQuery {
  /** Target collection. */
  collection: string;
  /** Filters by locale. */
  locale?: string;
  /** Search term matched against title or host-defined search targets. */
  search?: string;
  /** Filters by publication status. `all` does not restrict by status. */
  status?: ContentStudioStatus | 'all';
  /** Maximum number of items per page. */
  limit?: number;
  /** Continuation cursor issued by the host. */
  cursor?: string;
}

/** Document list and next page cursor. */
export interface ContentStudioListResult {
  /** Documents for the current page. */
  items: ContentStudioDocument[];
  /** Host-defined cursor when a next page exists. */
  nextCursor?: string;
}

/** Conflict detection and audit options for draft saving. */
export interface ContentStudioSaveOptions {
  /** Expected timestamp ensuring save succeeds only if unchanged since this time. */
  expectedModifiedAt?: string;
  /** Reason recorded in the host-side audit log. */
  reason?: string;
}

/** Options for publishing or scheduling publication. */
export interface ContentStudioPublishOptions {
  /** Scheduled publication timestamp (ISO 8601). */
  scheduledAt?: string;
  /** Reason recorded in the host-side audit log. */
  reason?: string;
}

/** Overview of publication history associated with a document. */
export interface ContentStudioRevision {
  /** Revision ID. */
  id: string;
  /** Target document ID. */
  documentId: string;
  /** Target collection. */
  collection: string;
  /** Publication status at that revision. */
  status: ContentStudioStatus;
  /** Creation date and time (ISO 8601). */
  createdAt: string;
  /** Creator identifier. */
  createdBy?: string;
  /** Change message or note. */
  message?: string;
}

/**
 * Boundary between the Content Studio UI and the host backend.
 *
 * Implemented by backends such as EAOS, D1/R2, or alternative APIs. Authentication,
 * authorization, persistence, and publishing workflows reside outside this boundary,
 * keeping the App Core and React UI decoupled from specific services.
 */
export interface ContentStudioProvider {
  /** Retrieves a list of documents. */
  list(query: ContentStudioListQuery): Promise<ContentStudioListResult>;
  /** Retrieves a document by ID. Returns `null` if not found. */
  get(documentId: string): Promise<ContentStudioDocument | null>;
  /** Saves a draft and returns the persisted document. */
  saveDraft(
    document: ContentStudioDocument,
    options?: ContentStudioSaveOptions,
  ): Promise<ContentStudioDocument>;
  /** Publishes or schedules a document for publication and returns the updated document. */
  publish(
    documentId: string,
    options?: ContentStudioPublishOptions,
  ): Promise<ContentStudioDocument>;
  /** Optional API implemented only by hosts that provide revision history. */
  listRevisions?(documentId: string): Promise<ContentStudioRevision[]>;
}
