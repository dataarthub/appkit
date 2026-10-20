import type { EdiDocType, EdiDocTypeCode, VatexCategoryId } from './types';

/**
 * A code list entry containing code value, Japanese/English labels, and description.
 *
 * @see {@link UNIT_CODES} for a typed code-list usage example.
 */
export interface CodelistEntry {

  /** Serialized business code, independent of translated labels. */
  code: string;

  /** Optional Japanese display label. */
  label_ja?: string;

  /** Optional English display label. */
  label_en?: string;

  /** Optional contextual description; not validation or tax determination. */
  description?: string;
}

/**
 * List of codes and Japanese labels for each document type (EdiDocType).
 * Invoice supports 3 types of codes: 380, 384, and 389.
 *
 * @example
 * ```typescript
 * import { DOC_TYPE_MAP } from '@alneas/appkit-core/japan/edi';
 *
 * console.log(DOC_TYPE_MAP);
 * ```
 */
export const DOC_TYPE_MAP: Record<EdiDocType, {
  /** Allowed document type codes in this application map; null denotes no assigned numeric code. */
  codes: EdiDocTypeCode[];
  /** Optional Japanese display label. */
  label_ja: string }> = {

  /** Invoice family: codes 380, 384 and 389. */
  Invoice: { codes: ['380', '384', '389'], label_ja: '請求書' },

  /** Credit-note family: code 381. */
  CreditNote: { codes: ['381'], label_ja: '返還インボイス' },

  /** Purchase-order family with no numeric type code in this preset. */
  PurchaseOrder: { codes: [null], label_ja: '発注書' },

  /** Despatch-advice family with no numeric type code in this preset. */
  DespatchAdvice: { codes: [null], label_ja: '納品書' },

  /** Remittance-advice family with no numeric type code in this preset. */
  RemittanceAdvice: { codes: [null], label_ja: '入金消込' },

  /** Quotation family with no numeric type code in this preset. */
  Quotation: { codes: [null], label_ja: '見積書' },
};

/**
 * Japanese labels for UNCL1001 document type codes.
 *
 * @example
 * ```typescript
 * import { DOC_TYPE_CODE_LABELS } from '@alneas/appkit-core/japan/edi';
 *
 * console.log(DOC_TYPE_CODE_LABELS);
 * ```
 */
export const DOC_TYPE_CODE_LABELS: Record<string, string> = {

  /** Qualified invoice document code. */
  '380': '適格請求書',

  /** Credit-note / returned-invoice document code. */
  '381': '返還インボイス/貸方票',

  /** Corrected invoice document code. */
  '384': '修正インボイス',

  /** Self-billed invoice document code. */
  '389': '自己発行インボイス',
};

/**
 * JP PINT 1.1.3 aligned tax categories; VATEX_CATEGORIES is the historical API name, not exemption-reason codes. Rates are supplied separately.
 *
 * @example
 * ```typescript
 * import { VATEX_CATEGORIES } from '@alneas/appkit-core/japan/edi';
 *
 * console.log(VATEX_CATEGORIES);
 * ```
 */
export const VATEX_CATEGORIES: Record<VatexCategoryId, CodelistEntry> = {

  /** Standard-rate category label; this preset describes 10 percent. */
  S: { code: 'S', label_ja: '標準税率', label_en: 'Standard rate', description: '10%' },

  /** Reduced-rate category label; this preset describes 8 percent. */
  AA: { code: 'AA', label_ja: '軽減税率', label_en: 'Reduced rate', description: '8%' },

  /** Exempt-from-tax category label. */
  E: { code: 'E', label_ja: '非課税', label_en: 'Exempt from tax', description: '0%' },

  /** Export/zero-rated category label. */
  G: { code: 'G', label_ja: '輸出・免税取引', label_en: 'Free export', description: '0%' },

  /** Outside-tax-scope category label. */
  O: { code: 'O', label_ja: '対象外', label_en: 'Outside scope', description: '0%' },
};

/**
 * UN/CEFACT Rec20 unit code list. Examples: C62=piece, KGM=kg, MTR=m, etc.
 *
 * @example
 * ```typescript
 * import { UNIT_CODES } from '@alneas/appkit-core/japan/edi';
 *
 * console.log(UNIT_CODES);
 * ```
 */
export const UNIT_CODES: Record<string, CodelistEntry> = {

  /** Count of pieces unit. */
  C62: { code: 'C62', label_ja: '個', label_en: 'Piece' },

  /** Mass in kilograms unit. */
  KGM: { code: 'KGM', label_ja: 'キログラム', label_en: 'Kilogram' },

  /** Length in metres unit. */
  MTR: { code: 'MTR', label_ja: 'メートル', label_en: 'Meter' },

  /** Volume in litres unit. */
  LTR: { code: 'LTR', label_ja: 'リットル', label_en: 'Litre' },

  /** Elapsed work in hours unit. */
  HUR: { code: 'HUR', label_ja: '時間', label_en: 'Hour' },

  /** Elapsed work in days unit. */
  DAY: { code: 'DAY', label_ja: '日', label_en: 'Day' },

  /** A set of items unit. */
  SET: { code: 'SET', label_ja: 'セット', label_en: 'Set' },

  /** A box of items unit. */
  BOX: { code: 'BOX', label_ja: '箱', label_en: 'Box' },

  /** Each-item count unit. */
  EA: { code: 'EA', label_ja: '個', label_en: 'Each' },
};

/**
 * UNCL5189/UNCL7161 allowance and charge reason code list.
 *
 * @example
 * ```typescript
 * import { ALLOWANCE_REASON_CODES } from '@alneas/appkit-core/japan/edi';
 *
 * console.log(ALLOWANCE_REASON_CODES);
 * ```
 */
export const ALLOWANCE_REASON_CODES: Record<string, CodelistEntry> = {

  /** Allowance for a discount. */
  '95': { code: '95', label_ja: '値引', label_en: 'Discount' },

  /** Charge or surcharge reason. */
  '100': { code: '100', label_ja: '割増', label_en: 'Charge' },

  /** Shipping charge reason. */
  '41': { code: '41', label_ja: '送料', label_en: 'Shipping' },

  /** Consumption-tax charge reason. */
  '46': { code: '46', label_ja: '消費税', label_en: 'Consumption tax' },
};

/**
 * Selected UNCL4461 D.16B payment means codes (Peppol May 2026 code list).
 *
 * @example
 * ```typescript
 * import { PAYMENT_MEANS_CODES } from '@alneas/appkit-core/japan/edi';
 *
 * console.log(PAYMENT_MEANS_CODES);
 * ```
 */
export const PAYMENT_MEANS_CODES: Record<string, CodelistEntry> = {

  /** Credit-transfer payment means. */
  '30': { code: '30', label_ja: '振込', label_en: 'Credit transfer' },

  /** Payment-to-bank-account means. */
  '42': { code: '42', label_ja: '銀行口座への支払', label_en: 'Payment to bank account' },

  /** Unspecified payment instrument. */
  '1': { code: '1', label_ja: '支払手段未定義', label_en: 'Instrument not defined' },

  /** Cash payment means. */
  '10': { code: '10', label_ja: '現金', label_en: 'In cash' },
};
