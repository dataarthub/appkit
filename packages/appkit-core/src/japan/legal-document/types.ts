export type PartyType = 'individual' | 'corporation';

export interface PartyInfo {
  role: string;
  type: PartyType;
  name: string;
  address: string;
  representative?: string;
  seal: boolean;
  additionalInfo?: Record<string, string>;
}

export interface LegalDocumentMetadata {
  title: string;
  documentType: string;
  date?: string;
  era?: string;
  referenceNumber?: string;
  parties: PartyInfo[];
}

export type DocumentBlock =
  | { type: 'title'; text: string; referenceNumber?: string }
  | { type: 'preamble'; text: string }
  | { type: 'article'; number: string; title?: string; children: ArticleItem[] }
  | { type: 'paragraph'; text: string }
  | { type: 'date-block'; text: string }
  | { type: 'postamble'; text: string }
  | { type: 'signature-section'; parties: PartyInfo[] };

export interface ArticleItem {
  type: 'paragraph' | 'numbered-item';
  number?: string;
  text: string;
}

export interface ParsedDocument {
  metadata: LegalDocumentMetadata;
  blocks: DocumentBlock[];
}
