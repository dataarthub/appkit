import type { ParsedDocument, DocumentBlock, PartyInfo } from '../legal-document/types';

const FONT_SIZES = {
  title: 18,
  reference: 11,
  article: 11,
  body: 10,
  small: 9,
  seal: 8,
};

function buildPdfmakeTitle(block: DocumentBlock & { type: 'title' }) {
  const lines: any[] = [
    { text: block.text, style: 'docTitle', alignment: 'center' as const },
  ];
  if (block.referenceNumber) {
    lines.push({
      text: block.referenceNumber,
      style: 'docReference',
      alignment: 'center' as const,
      margin: [0, 2, 0, 12],
    });
  } else {
    lines[lines.length - 1].margin = [0, 0, 0, 12];
  }
  return lines;
}

function buildPdfmakeArticle(block: DocumentBlock & { type: 'article' }) {
  const header = `第${block.number}条${block.title ? `（${block.title}）` : ''}`;
  const children: any[] = [];
  const childrenCount = block.children.length;

  for (let i = 0; i < childrenCount; i++) {
    const item = block.children[i];
    if (item.type === 'numbered-item') {
      const columns: any[] = [
        { text: `${item.number}.\u3000`, width: 22, alignment: 'left' as const },
        { text: item.text, width: '*' as const },
      ];
      if (item.text.includes('\n')) {
        const parts = item.text.split('\n');
        columns[1] = { stack: parts.map((p) => ({ text: p })), width: '*' as const };
      }
      children.push({
        columns,
        columnGap: 2,
        margin: [0, i === 0 ? 3 : 1, 0, 1],
      });
    } else {
      children.push({
        text: item.text,
        margin: [0, i === 0 ? 3 : 1, 0, 1],
      });
    }
  }

  return {
    stack: [
      { text: header, style: 'articleHeader' },
      { stack: children, margin: [FONT_SIZES.body * 1.5, 0, 0, 0] },
    ],
    margin: [FONT_SIZES.body, 0, 0, 6],
  };
}

function buildSignatureParty(party: PartyInfo) {
  const lines: any[] = [
    { text: party.role, style: 'signatureRole' },
    { text: `住所 ${party.address}`, style: 'signatureText' },
    { text: `氏名 ${party.name}`, style: 'signatureText' },
  ];
  if (party.representative) {
    lines.push({
      text: `\u3000\u3000\u3000${party.representative}`,
      style: 'signatureText',
      margin: [0, 0, 0, 2],
    });
  }
  if (party.seal) {
    lines.push({
      table: {
        widths: [22],
        body: [[{ text: '印', alignment: 'center', fontSize: FONT_SIZES.seal, margin: [0, 6, 0, 6] }]],
      },
      layout: {
        hLineWidth: () => 1,
        vLineWidth: () => 1,
        hLineColor: () => '#999',
        vLineColor: () => '#999',
      },
      margin: [0, 4, 0, 0],
      alignment: 'right' as const,
    });
  }
  return {
    alignment: 'right' as const,
    stack: lines,
    margin: [0, 8, 0, 0],
  };
}

/** Builds pdfmake document definition content from a ParsedDocument. */
export function buildLegalDocumentPdfmakeContent(
  parsed: ParsedDocument,
) {
  const content: any[] = [];

  for (const block of parsed.blocks) {
    switch (block.type) {
      case 'title':
        content.push(...buildPdfmakeTitle(block));
        break;
      case 'preamble':
        content.push({ text: block.text, margin: [0, 0, 0, 8], leading: 26 });
        break;
      case 'article':
        content.push(buildPdfmakeArticle(block));
        break;
      case 'paragraph':
        content.push({ text: block.text, margin: [0, 0, 0, 6], leading: 26 });
        break;
      case 'date-block':
        content.push({
          text: block.text,
          alignment: 'right' as const,
          margin: [0, 16, 0, 8],
        });
        break;
      case 'postamble':
        content.push({ text: block.text, margin: [0, 0, 0, 6], leading: 26 });
        break;
      case 'signature-section':
        for (const party of block.parties) {
          content.push(buildSignatureParty(party));
        }
        break;
    }
  }

  return {
    content,
    styles: {
      docTitle: {
        fontSize: FONT_SIZES.title,
        bold: true,
        alignment: 'center',
      },
      docReference: {
        fontSize: FONT_SIZES.reference,
      },
      articleHeader: {
        fontSize: FONT_SIZES.article,
        bold: true,
      },
      signatureRole: {
        fontSize: FONT_SIZES.body,
        bold: true,
        margin: [0, 0, 0, 2],
      },
      signatureText: {
        fontSize: FONT_SIZES.body,
      },
    },
    pageSize: 'A4' as const,
    pageMargins: [40, 50, 40, 50] as [number, number, number, number],
    defaultStyle: {
      fontSize: FONT_SIZES.body,
      lineHeight: 1.7,
    },
  };
}
