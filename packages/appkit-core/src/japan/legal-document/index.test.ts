import { describe, it, expect } from 'bun:test';
import { parseLegalDocument } from './parser';
import { LAYOUT, DOCUMENT_TYPE_LABELS, DOCUMENT_PREAMBLE } from './constants';

describe('Legal Document Parser & Constants', () => {
  it('exposes layout constants and document labels', () => {
    expect(LAYOUT.titleFontSize).toBe(18);
    expect(DOCUMENT_TYPE_LABELS.contract).toBe('契約書');
    expect(DOCUMENT_PREAMBLE.nda).toContain('機密情報の取扱い');
  });

  it('parses frontmatter and structured articles from markdown', () => {
    const markdown = `---
title: 業務委託契約書
documentType: contract
date: 2026-10-15
parties:
  - role: 甲
    type: corporation
    name: 株式会社テスト甲
    address: 東京都千代田区1-1-1
  - role: 乙
    type: corporation
    name: 株式会社テスト乙
    address: 東京都港区2-2-2
---

甲及び乙は、以下のとおり合意する。

第1条（目的）
乙は甲に対し、本業務を適切に遂行するものとする。
1．業務の詳細は個別契約において定める。
2．納期は甲乙協議の上で決定する。

第2条（秘密保持）
甲及び乙は、相手方の秘密情報を第三者に開示してはならない。
`;

    const parsed = parseLegalDocument(markdown);
    expect(parsed.metadata.title).toBe('業務委託契約書');
    expect(parsed.metadata.documentType).toBe('contract');
    expect(parsed.metadata.parties?.length).toBe(2);
    expect(parsed.metadata.parties?.[0].role).toBe('甲');

    expect(parsed.blocks.length).toBeGreaterThan(0);
    const articles = parsed.blocks.filter((b) => b.type === 'article');
    expect(articles.length).toBe(2);

    const art1 = articles[0];
    if (art1.type === 'article') {
      expect(art1.number).toBe('1');
      expect(art1.title).toBe('目的');
      expect(art1.children.length).toBe(3); // 1 main paragraph + 2 numbered items
    }
  });

  it('handles markdown without frontmatter gracefully', () => {
    const rawMarkdown = `第1条（総則）
本規定はすべての構成員に適用される。
`;
    const parsed = parseLegalDocument(rawMarkdown);
    expect(parsed.metadata.title).toBe('無題');
    const articles = parsed.blocks.filter((b) => b.type === 'article');
    expect(articles.length).toBe(1);
  });

  it('handles CRLF line endings in frontmatter and body', () => {
    const crlfMarkdown = "---\r\ntitle: CRLF契約書\r\ndocumentType: agreement\r\n---\r\n\r\n第1条（合意）\r\n両者は合意する。\r\n";
    const parsed = parseLegalDocument(crlfMarkdown);
    expect(parsed.metadata.title).toBe('CRLF契約書');
    expect(parsed.metadata.documentType).toBe('agreement');
    const articles = parsed.blocks.filter((b) => b.type === 'article');
    expect(articles.length).toBe(1);
    expect(articles[0].title).toBe('合意');
  });
});
