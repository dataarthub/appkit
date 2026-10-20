export type { EdiDocType, EdiDocTypeCode, VatexCategoryId, EdiIdentifier, EdiAmount, EdiAddress, EdiParty, EdiTaxCategory, EdiTaxSubtotal, EdiTaxTotal, EdiFinancials, EdiLine, EdiAllowanceCharge, EdiReference, EdiReferences, EdiPayment, EdiBankAccount, EdiAllocation, EdiShipment, EdiPackage, EdiExtensionEnvelope, EdiStamp, EdiDocumentCommon, EdiDocumentParties, EdiDocumentLines, EdiInvoiceData, EdiCreditNoteData, EdiPurchaseOrderData, EdiDespatchAdviceData, EdiRemittanceAdviceData, EdiQuotationData, EdiDocument } from "../../data/edi";
export { DOC_TYPE_CODES } from "../../data/edi";
import type { VatexCategoryId } from "../../data/edi";

/**
 * UI labels for the JP PINT 1.1.3 aligned tax-category codes. Rates are separate values.
 *
 * @example
 * ```typescript
 * import { VATEX_LABELS } from '@alneas/appkit-core/japan/edi';
 *
 * console.log(VATEX_LABELS);
 * ```
 */
export const VATEX_LABELS: Record<VatexCategoryId, string> = {

  /** Japanese label for the taxable standard/reduced category grouping in the legacy label map. */
  S: '課税（標準・軽減税率）',

  /** Reduced-rate category label; this preset describes 8 percent. */
  AA: '軽減税率',

  /** Exempt-from-tax category label. */
  E: '非課税 (0%)',

  /** Export/zero-rated category label. */
  G: '輸出・免税 (0%)',

  /** Outside-tax-scope category label. */
  O: '対象外',
};

/**
 * Peppol ISO6523/EAS party identifiers (JP PINT 1.1.3 code lists). Tax schemes are separate.
 *
 * @example
 * ```typescript
 * import { PEPPOL_PARTY_ID_SCHEMES } from '@alneas/appkit-core/japan/edi';
 *
 * console.log(PEPPOL_PARTY_ID_SCHEMES);
 * ```
 */
export const PEPPOL_PARTY_ID_SCHEMES = {

  /** Peppol EAS 0221 scheme for Japanese qualified invoice issuer identifiers. */
  QUALIFIED_INVOICE: '0221',
  /** Peppol EAS 0188 scheme for Japanese corporate-number identifiers. */
  CORPORATE_NUMBER: '0188',
  /** Peppol EAS 0088 scheme for Global Location Numbers. */
  GLN: '0088',
} as const;
