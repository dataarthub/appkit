import type { EdiDocType, EdiDocTypeCode, VatexCategoryId } from './types';

/** A code list entry containing code value, Japanese/English labels, and description. */
export interface CodelistEntry {
  code: string;
  label_ja?: string;
  label_en?: string;
  description?: string;
}

/**
 * List of codes and Japanese labels for each document type (EdiDocType).
 * Invoice supports 3 types of codes: 380, 384, and 389.
 */
export const DOC_TYPE_MAP: Record<EdiDocType, { codes: EdiDocTypeCode[]; label_ja: string }> = {
  Invoice: { codes: ['380', '384', '389'], label_ja: '請求書' },
  CreditNote: { codes: ['381'], label_ja: '返還インボイス' },
  PurchaseOrder: { codes: [null], label_ja: '発注書' },
  DespatchAdvice: { codes: [null], label_ja: '納品書' },
  RemittanceAdvice: { codes: [null], label_ja: '入金消込' },
  Quotation: { codes: [null], label_ja: '見積書' },
};

/** Japanese labels for UNCL1001 document type codes. */
export const DOC_TYPE_CODE_LABELS: Record<string, string> = {
  '380': '適格請求書',
  '381': '返還インボイス/貸方票',
  '384': '修正インボイス',
  '389': '自己発行インボイス',
};

/** JP PINT 1.1.3 aligned tax categories; VATEX_CATEGORIES is the historical API name, not exemption-reason codes. Rates are supplied separately. */
export const VATEX_CATEGORIES: Record<VatexCategoryId, CodelistEntry> = {
  S: { code: 'S', label_ja: '標準税率', label_en: 'Standard rate', description: '10%' },
  AA: { code: 'AA', label_ja: '軽減税率', label_en: 'Reduced rate', description: '8%' },
  E: { code: 'E', label_ja: '非課税', label_en: 'Exempt from tax', description: '0%' },
  G: { code: 'G', label_ja: '輸出・免税取引', label_en: 'Free export', description: '0%' },
  O: { code: 'O', label_ja: '対象外', label_en: 'Outside scope', description: '0%' },
};

/** UN/CEFACT Rec20 unit code list. Examples: C62=piece, KGM=kg, MTR=m, etc. */
export const UNIT_CODES: Record<string, CodelistEntry> = {
  C62: { code: 'C62', label_ja: '個', label_en: 'Piece' },
  KGM: { code: 'KGM', label_ja: 'キログラム', label_en: 'Kilogram' },
  MTR: { code: 'MTR', label_ja: 'メートル', label_en: 'Meter' },
  LTR: { code: 'LTR', label_ja: 'リットル', label_en: 'Litre' },
  HUR: { code: 'HUR', label_ja: '時間', label_en: 'Hour' },
  DAY: { code: 'DAY', label_ja: '日', label_en: 'Day' },
  SET: { code: 'SET', label_ja: 'セット', label_en: 'Set' },
  BOX: { code: 'BOX', label_ja: '箱', label_en: 'Box' },
  EA: { code: 'EA', label_ja: '個', label_en: 'Each' },
};

/** UNCL5189/UNCL7161 allowance and charge reason code list. */
export const ALLOWANCE_REASON_CODES: Record<string, CodelistEntry> = {
  '95': { code: '95', label_ja: '値引', label_en: 'Discount' },
  '100': { code: '100', label_ja: '割増', label_en: 'Charge' },
  '41': { code: '41', label_ja: '送料', label_en: 'Shipping' },
  '46': { code: '46', label_ja: '消費税', label_en: 'Consumption tax' },
};

/** Selected UNCL4461 D.16B payment means codes (Peppol May 2026 code list). */
export const PAYMENT_MEANS_CODES: Record<string, CodelistEntry> = {
  '30': { code: '30', label_ja: '振込', label_en: 'Credit transfer' },
  '42': { code: '42', label_ja: '銀行口座への支払', label_en: 'Payment to bank account' },
  '1': { code: '1', label_ja: '支払手段未定義', label_en: 'Instrument not defined' },
  '10': { code: '10', label_ja: '現金', label_en: 'In cash' },
};
