import { parse as parseYaml } from 'yaml';
import type {
  ParsedDocument,
  LegalDocumentMetadata,
  DocumentBlock,
  ArticleItem,
} from './types';

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const ARTICLE_HEADER_RE = /^第(\d+(?:の\d+)?)条\s*（[^）]*）\s*$/;
const ARTICLE_HEADER_CAPTURE_RE = /^第(\d+(?:の\d+)?)条\s*（([^）]*)）\s*$/;
const NUMBERED_ITEM_RE = /^[\u3000\s]*(\d+)[．.]\s*(.+)$/;

function detectFrontmatter(markdown: string): { yaml: string; rest: string } | null {
  if (!markdown.startsWith('---\n') && !markdown.startsWith('---\r\n')) return null;
  const match = markdown.match(FRONTMATTER_RE);
  if (!match) return null;
  return {
    yaml: match[1],
    rest: markdown.slice(match[0].length).trimStart(),
  };
}

function parseYamlFrontmatter(yamlText: string): Partial<LegalDocumentMetadata> {
  try {
    const parsed = parseYaml(yamlText);
    if (!parsed || typeof parsed !== 'object') return {};

    const metadata: Partial<LegalDocumentMetadata> = {};
    if (typeof parsed.title === 'string') metadata.title = parsed.title;
    if (typeof parsed.documentType === 'string') metadata.documentType = parsed.documentType;
    if (typeof parsed.date === 'string') metadata.date = parsed.date;
    if (typeof parsed.era === 'string') metadata.era = parsed.era;
    if (typeof parsed.referenceNumber === 'string') metadata.referenceNumber = parsed.referenceNumber;
    if (Array.isArray(parsed.parties)) {
      metadata.parties = parsed.parties.map((p: Record<string, unknown>) => ({
        role: String(p.role ?? ''),
        type: p.type === 'individual' ? 'individual' as const : 'corporation' as const,
        name: String(p.name ?? ''),
        address: String(p.address ?? ''),
        representative: p.representative ? String(p.representative) : undefined,
        seal: p.seal !== false,
        additionalInfo: p.additionalInfo as Record<string, string> | undefined,
      }));
    }
    return metadata;
  } catch {
    return {};
  }
}

/** @internal */
function isIndented(line: string): boolean {
  return line.startsWith('\u3000') || line.startsWith('\t') || line.startsWith('  ');
}

/** Parses the article body (array of lines) and converts them into a list of paragraphs and numbered items. */
function parseArticleBody(lines: string[]): ArticleItem[] {
  const items: ArticleItem[] = [];

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) {
      items.push({ type: 'paragraph', text: '' });
      continue;
    }

    const numberedMatch = trimmed.match(NUMBERED_ITEM_RE);
    if (numberedMatch) {
      items.push({
        type: 'numbered-item',
        number: numberedMatch[1],
        text: numberedMatch[2],
      });
      continue;
    }

    const last = items[items.length - 1];
    if (last && !trimmed.startsWith('第')) {
      if (last.text === '') {
        last.text = trimmed;
      } else if (last.type === 'numbered-item' || last.type === 'paragraph') {
        last.text += '\n' + trimmed;
      }
    } else {
      items.push({ type: 'paragraph', text: trimmed });
    }
  }

  return items.filter((i) => i.text !== '');
}

/** Parses Japanese legal documents formatted in Markdown and returns structured data. */
export function parseLegalDocument(markdown: string): ParsedDocument {
  const fm = detectFrontmatter(markdown);
  const fmMeta = fm ? parseYamlFrontmatter(fm.yaml) : {};
  const bodyText = fm ? fm.rest : markdown.trim();

  const metadata: LegalDocumentMetadata = {
    title: fmMeta.title || '無題',
    documentType: fmMeta.documentType || 'contract',
    parties: fmMeta.parties || [],
    date: fmMeta.date,
    era: fmMeta.era,
    referenceNumber: fmMeta.referenceNumber,
  };

  const blocks: DocumentBlock[] = [];
  const lines = bodyText.split(/\r?\n/);

  blocks.push({
    type: 'title',
    text: metadata.title,
    referenceNumber: metadata.referenceNumber,
  });

  const preambleLines: string[] = [];
  const postambleLines: string[] = [];
  const articleSections: { number: string; title?: string; lines: string[] }[] = [];
  let currentArticle: { number: string; title?: string; lines: string[] } | null = null;
  let foundArticle = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentArticle) currentArticle.lines.push('');
      continue;
    }

    const isArticleHeader = ARTICLE_HEADER_RE.test(trimmed);

    if (isArticleHeader) {
      const cap = trimmed.match(ARTICLE_HEADER_CAPTURE_RE)!;
      if (currentArticle) articleSections.push(currentArticle);
      currentArticle = {
        number: cap[1],
        title: cap[2] || undefined,
        lines: [],
      };
      foundArticle = true;
      continue;
    }

    if (!foundArticle) {
      preambleLines.push(trimmed);
      continue;
    }

    if (currentArticle) {
      if (isIndented(line) && currentArticle.lines.some((l) => l.trim())) {
        currentArticle.lines.push(line);
      } else if (isIndented(line)) {
        currentArticle.lines.push(line);
      } else if (NUMBERED_ITEM_RE.test(trimmed)) {
        currentArticle.lines.push(line);
      } else if (currentArticle.lines.length > 0 && currentArticle.lines.some((l) => l.trim() && isIndented(l))) {
        postambleLines.push(trimmed);
      } else {
        currentArticle.lines.push(line);
      }
    } else {
      postambleLines.push(trimmed);
    }
  }

  if (currentArticle) articleSections.push(currentArticle);

  if (preambleLines.length > 0) {
    blocks.push({ type: 'preamble', text: preambleLines.join('') });
  }

  for (const article of articleSections) {
    blocks.push({
      type: 'article',
      number: article.number,
      title: article.title,
      children: parseArticleBody(article.lines),
    });
  }

  if (postambleLines.length > 0) {
    blocks.push({ type: 'postamble', text: postambleLines.join('') });
  }

  if (metadata.date) {
    blocks.push({ type: 'date-block', text: metadata.date });
  }

  if (metadata.parties.length > 0) {
    blocks.push({ type: 'signature-section', parties: metadata.parties });
  }

  return { metadata, blocks };
}
