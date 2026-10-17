export type { EdiDocType, EdiDocTypeCode, VatexCategoryId, EdiIdentifier, EdiAmount, EdiAddress, EdiParty, EdiTaxCategory, EdiTaxSubtotal, EdiTaxTotal, EdiFinancials, EdiLine, EdiAllowanceCharge, EdiReference, EdiReferences, EdiPayment, EdiBankAccount, EdiAllocation, EdiShipment, EdiPackage, EdiExtensionEnvelope, EdiStamp, EdiDocumentCommon, EdiDocumentParties, EdiDocumentLines, EdiInvoiceData, EdiCreditNoteData, EdiPurchaseOrderData, EdiDespatchAdviceData, EdiRemittanceAdviceData, EdiQuotationData, EdiDocument } from "../../data/edi";
export { DOC_TYPE_CODES } from "../../data/edi";
import type { VatexCategoryId } from "../../data/edi";

/** UI labels for the JP PINT 1.1.3 aligned tax-category codes. Rates are separate values. */
export const VATEX_LABELS: Record<VatexCategoryId, string> = {
  S: '課税（標準・軽減税率）',
  AA: '軽減税率',
  E: '非課税 (0%)',
  G: '輸出・免税 (0%)',
  O: '対象外',
};

/** Peppol ISO6523/EAS party identifiers (JP PINT 1.1.3 code lists). Tax schemes are separate. */
export const PEPPOL_PARTY_ID_SCHEMES = {
  QUALIFIED_INVOICE: '0221', CORPORATE_NUMBER: '0188', GLN: '0088',
} as const;
