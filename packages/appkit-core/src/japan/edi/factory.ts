import * as core from "../../data/edi";
import type { EdiAmount, EdiFinancials, EdiTaxCategory, EdiTaxSubtotal, EdiDocumentContext } from "../../data/edi";
import { PEPPOL_PARTY_ID_SCHEMES } from './types';
export { createIdentifier, createTaxCategory, createLine, createParty, createExtension } from "../../data/edi";
/** Defaults identify JP PINT billing. This does not certify the document against all JP PINT rules. */
export const JAPANESE_EDI_DEFAULTS: EdiDocumentContext = Object.freeze({
  currency: 'JPY', schemaVersion: '2.1.0', profile: 'jp-pint-1.1.3',
  customizationId: 'urn:peppol:pint:billing-1@jp-1',
  profileId: 'urn:peppol:bis:billing',
});
export function createAmount(value: number, currency = 'JPY'): EdiAmount { return core.createAmount(value, currency); }
/** Seller tax identifier uses the VAT tax scheme, not an endpoint schemeID. */
export function createTaxId(value: string) { return core.createIdentifier('VAT', value); }
/** Party/endpoint identifier for a Japanese qualified invoice issuer (EAS 0221). */
export function createQualifiedInvoicePartyId(value: string) { return core.createIdentifier(PEPPOL_PARTY_ID_SCHEMES.QUALIFIED_INVOICE, value); }
export function createCorporateNumber(value: string) { return core.createIdentifier(PEPPOL_PARTY_ID_SCHEMES.CORPORATE_NUMBER, value); }
export function createTaxSubtotal(taxable: number, tax: number, category: EdiTaxCategory, currency = 'JPY'): EdiTaxSubtotal { return core.createTaxSubtotal(taxable, tax, category, currency); }
export function createFinancials(subtotals: EdiTaxSubtotal[], prepaid = 0, currency = 'JPY'): EdiFinancials { return core.createFinancials(subtotals, prepaid, currency); }
type JapaneseOptions<T> = Omit<T, keyof EdiDocumentContext> & Partial<EdiDocumentContext>;

/** Delegates to generic EDI construction with explicit, overridable Japanese application defaults. */
export function createInvoice(
  id: Parameters<typeof core.createInvoice>[0],
  issueDate: Parameters<typeof core.createInvoice>[1],
  supplier: Parameters<typeof core.createInvoice>[2],
  buyer: Parameters<typeof core.createInvoice>[3],
  lines: Parameters<typeof core.createInvoice>[4],
  financials: Parameters<typeof core.createInvoice>[5],
  options?: JapaneseOptions<Parameters<typeof core.createInvoice>[6]>,
): ReturnType<typeof core.createInvoice> {
  return core.createInvoice(id, issueDate, supplier, buyer, lines, financials, { ...JAPANESE_EDI_DEFAULTS, ...options });
}

/** Delegates to generic EDI construction with explicit, overridable Japanese application defaults. */
export function createCreditNote(
  id: Parameters<typeof core.createCreditNote>[0],
  issueDate: Parameters<typeof core.createCreditNote>[1],
  supplier: Parameters<typeof core.createCreditNote>[2],
  buyer: Parameters<typeof core.createCreditNote>[3],
  lines: Parameters<typeof core.createCreditNote>[4],
  financials: Parameters<typeof core.createCreditNote>[5],
  billingReference: Parameters<typeof core.createCreditNote>[6],
  options?: JapaneseOptions<Parameters<typeof core.createCreditNote>[7]>,
): ReturnType<typeof core.createCreditNote> {
  return core.createCreditNote(id, issueDate, supplier, buyer, lines, financials, billingReference, { ...JAPANESE_EDI_DEFAULTS, ...options });
}

/** Delegates to generic EDI construction with explicit, overridable Japanese application defaults. */
export function createPurchaseOrder(
  id: Parameters<typeof core.createPurchaseOrder>[0],
  issueDate: Parameters<typeof core.createPurchaseOrder>[1],
  supplier: Parameters<typeof core.createPurchaseOrder>[2],
  buyer: Parameters<typeof core.createPurchaseOrder>[3],
  lines: Parameters<typeof core.createPurchaseOrder>[4],
  options?: JapaneseOptions<Parameters<typeof core.createPurchaseOrder>[5]>,
): ReturnType<typeof core.createPurchaseOrder> {
  return core.createPurchaseOrder(id, issueDate, supplier, buyer, lines, { ...JAPANESE_EDI_DEFAULTS, ...options });
}

/** Delegates to generic EDI construction with explicit, overridable Japanese application defaults. */
export function createQuotation(
  id: Parameters<typeof core.createQuotation>[0],
  issueDate: Parameters<typeof core.createQuotation>[1],
  supplier: Parameters<typeof core.createQuotation>[2],
  buyer: Parameters<typeof core.createQuotation>[3],
  lines: Parameters<typeof core.createQuotation>[4],
  options?: JapaneseOptions<Parameters<typeof core.createQuotation>[5]>,
): ReturnType<typeof core.createQuotation> {
  return core.createQuotation(id, issueDate, supplier, buyer, lines, { ...JAPANESE_EDI_DEFAULTS, ...options });
}

/** Delegates to generic EDI construction with explicit, overridable Japanese application defaults. */
export function createDespatchAdvice(
  id: Parameters<typeof core.createDespatchAdvice>[0],
  issueDate: Parameters<typeof core.createDespatchAdvice>[1],
  supplier: Parameters<typeof core.createDespatchAdvice>[2],
  buyer: Parameters<typeof core.createDespatchAdvice>[3],
  lines: Parameters<typeof core.createDespatchAdvice>[4],
  orderReference: Parameters<typeof core.createDespatchAdvice>[5],
  options?: JapaneseOptions<Parameters<typeof core.createDespatchAdvice>[6]>,
): ReturnType<typeof core.createDespatchAdvice> {
  return core.createDespatchAdvice(id, issueDate, supplier, buyer, lines, orderReference, { ...JAPANESE_EDI_DEFAULTS, ...options });
}

/** Delegates to generic EDI construction with explicit, overridable Japanese application defaults. */
export function createRemittanceAdvice(
  id: Parameters<typeof core.createRemittanceAdvice>[0],
  issueDate: Parameters<typeof core.createRemittanceAdvice>[1],
  supplier: Parameters<typeof core.createRemittanceAdvice>[2],
  buyer: Parameters<typeof core.createRemittanceAdvice>[3],
  allocations: Parameters<typeof core.createRemittanceAdvice>[4],
  payment: Parameters<typeof core.createRemittanceAdvice>[5],
  options?: JapaneseOptions<Parameters<typeof core.createRemittanceAdvice>[6]>,
): ReturnType<typeof core.createRemittanceAdvice> {
  return core.createRemittanceAdvice(id, issueDate, supplier, buyer, allocations, payment, { ...JAPANESE_EDI_DEFAULTS, ...options });
}
