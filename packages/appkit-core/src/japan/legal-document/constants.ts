/**
 * Suggested legal-document layout values; consuming renderers decide whether and how to apply them.
 *
 * @example
 * ```typescript
 * import { LAYOUT } from '@alneas/appkit-core/japan/legal-document/constants';
 *
 * console.log(LAYOUT);
 * ```
 */
export const LAYOUT = {

  /** Suggested title font size, 18. */
  titleFontSize: 18,

  /** Suggested title-reference font size, 11. */
  titleReferenceFontSize: 11,

  /** Suggested article-heading font size, 11. */
  articleFontSize: 11,

  /** Suggested body-text font size, 10. */
  bodyFontSize: 10,

  /** Suggested preamble indentation level, zero. */
  preambleIndent: 0,

  /** Suggested article indentation level, zero. */
  articleIndent: 0,

  /** Suggested body indentation level, one. */
  bodyIndent: 1,

  /** Suggested numbered-item indentation level, two. */
  numberedItemIndent: 2,

  /** Suggested continuation-line indentation level, three. */
  continuationIndent: 3,

  /** Suggested body line-height multiplier, 1.8. */
  lineHeight: 1.8,

  /** Suggested right-margin setting for signature blocks, 5. */
  signatureBlockRightMargin: 5,

  /** Suggested page-edge margin settings; each edge is 60. */
  pageMargins: {
    /** Suggested upper page margin value, 60. */
    top: 60,
    /** Suggested right page margin value, 60. */
    right: 60,
    /** Suggested lower page margin value, 60. */
    bottom: 60,
    /** Suggested left page margin value, 60. */
    left: 60 },
} as const;

/**
 * Japanese display titles keyed by application legal-document category.
 *
 * @example
 * ```typescript
 * import { DOCUMENT_TYPE_LABELS } from '@alneas/appkit-core/japan/legal-document/constants';
 *
 * console.log(DOCUMENT_TYPE_LABELS);
 * ```
 */
export const DOCUMENT_TYPE_LABELS: Record<string, string> = {

  /** Japanese title for contract. */
  contract: '契約書',

  /** Japanese title for memorandum. */
  memorandum: '覚書',

  /** Japanese title for non-disclosure agreement. */
  nda: '秘密保持契約書',

  /** Japanese title for power of attorney. */
  powerOfAttorney: '委任状',

  /** Japanese title for regulations. */
  regulations: '規約',

  /** Japanese title for application form. */
  application: '申込書',

  /** Japanese title for request form. */
  request: '申請書',
};

/**
 * Japanese introductory prose presets for selected document categories.
 *
 * @example
 * ```typescript
 * import { DOCUMENT_PREAMBLE } from '@alneas/appkit-core/japan/legal-document/constants';
 *
 * console.log(DOCUMENT_PREAMBLE);
 * ```
 */
export const DOCUMENT_PREAMBLE: Record<string, string> = {

  /** Introductory prose for contract. */
  contract: '上記当事者間において、以下のとおり契約を締結する。',

  /** Introductory prose for memorandum. */
  memorandum: '上記当事者間において、以下のとおり合意した。',

  /** Introductory prose for non-disclosure agreement. */
  nda: '上記当事者間は、機密情報の取扱いに関し、以下のとおり合意する。',
};

/**
 * Japanese closing prose presets for selected document categories.
 *
 * @example
 * ```typescript
 * import { DOCUMENT_POSTAMBLE } from '@alneas/appkit-core/japan/legal-document/constants';
 *
 * console.log(DOCUMENT_POSTAMBLE);
 * ```
 */
export const DOCUMENT_POSTAMBLE: Record<string, string> = {

  /** Closing execution-copy prose for contract. */
  contract: '以上、本契約の証として本書2通を作成し、当事者記名押印の上、各1通を保有する。',

  /** Closing execution-copy prose for memorandum. */
  memorandum: '以上、本覚書の証として本書2通を作成し、当事者記名押印の上、各1通を保有する。',

  /** Closing execution-copy prose for non-disclosure agreement. */
  nda: '以上、本契約の証として本書2通を作成し、当事者記名押印の上、各1通を保有する。',
};
