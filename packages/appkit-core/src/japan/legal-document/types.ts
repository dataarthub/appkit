/**
 * Party classification used in legal-document metadata: individual or corporation.
 *
 * @see {@link parseLegalDocument} for a complete frontmatter/Markdown parsing example.
 */
export type PartyType = 'individual' | 'corporation';

/**
 * Party details printed in a legal-document signature block.
 *
 * @see {@link parseLegalDocument} for a complete frontmatter/Markdown parsing example.
 */
export interface PartyInfo {

  /** Party role label printed in the signature block. */
  role: string;

  /** Discriminant selecting the party or content-block variant. */
  type: PartyType;

  /** Party display name; no identity verification is performed. */
  name: string;

  /** Party address text printed verbatim. */
  address: string;

  /** Optional corporate representative text. */
  representative?: string;

  /** Whether to include the seal placeholder in the signature block. */
  seal: boolean;

  /** Optional host-owned string metadata; the built-in pdfmake builder does not render it. */
  additionalInfo?: Record<string, string>;
}

/**
 * Frontmatter-derived title, document classification, date and signing-party information.
 *
 * @see {@link parseLegalDocument} for a complete frontmatter/Markdown parsing example.
 */
export interface LegalDocumentMetadata {

  /** Document or article heading text. */
  title: string;

  /** Application document-type key, default contract when parsed frontmatter omits it. */
  documentType: string;

  /** Optional document date text; no calendar parsing is performed. */
  date?: string;

  /** Optional era metadata retained from frontmatter; not used by the pdfmake builder. */
  era?: string;

  /** Optional reference text printed with the title. */
  referenceNumber?: string;

  /** Signing parties in display order. */
  parties: PartyInfo[];
}

/**
 * Discriminated legal-document content blocks; type selects the corresponding payload fields.
 *
 * @see {@link parseLegalDocument} for a complete frontmatter/Markdown parsing example.
 */
export type DocumentBlock =
  | {
  /** Discriminant for the title content block. */
  type: 'title';
  /** Display text for this block or article item; line breaks are preserved where the renderer supports them. */
  text: string;
  /** Optional reference text printed with the title. */
  referenceNumber?: string }
  | {
  /** Discriminant for the preamble content block. */
  type: 'preamble';
  /** Display text for this block or article item; line breaks are preserved where the renderer supports them. */
  text: string }
  | {
  /** Discriminant for the article content block. */
  type: 'article';
  /** Article/item number as display text. */
  number: string;
  /** Document or article heading text. */
  title?: string;
  /** Article paragraphs and numbered items in source order. */
  children: ArticleItem[] }
  | {
  /** Discriminant for the paragraph content block. */
  type: 'paragraph';
  /** Display text for this block or article item; line breaks are preserved where the renderer supports them. */
  text: string }
  | {
  /** Discriminant for the date-block content block. */
  type: 'date-block';
  /** Display text for this block or article item; line breaks are preserved where the renderer supports them. */
  text: string }
  | {
  /** Discriminant for the postamble content block. */
  type: 'postamble';
  /** Display text for this block or article item; line breaks are preserved where the renderer supports them. */
  text: string }
  | {
  /** Discriminant for the signature-section content block. */
  type: 'signature-section';
  /** Signing parties in display order. */
  parties: PartyInfo[] };

/**
 * Paragraph or numbered item nested inside a Japanese article block.
 *
 * @see {@link parseLegalDocument} for a complete frontmatter/Markdown parsing example.
 */
export interface ArticleItem {

  /** Discriminant selecting the party or content-block variant. */
  type: 'paragraph' | 'numbered-item';

  /** Article/item number as display text. */
  number?: string;

  /** Display text for this block or article item; line breaks are preserved where the renderer supports them. */
  text: string;
}

/**
 * Structured legal-document metadata and content blocks for a host renderer.
 *
 * @see {@link parseLegalDocument} for a complete frontmatter/Markdown parsing example.
 */
export interface ParsedDocument {

  /** Parsed frontmatter values with parser defaults applied. */
  metadata: LegalDocumentMetadata;

  /** Title, prose, articles and optional date/signature blocks in render order. */
  blocks: DocumentBlock[];
}
