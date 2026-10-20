import * as core from "../../data/edi";
import type { EdiAmount, EdiFinancials, EdiTaxCategory, EdiTaxSubtotal, EdiDocumentContext } from "../../data/edi";
import { PEPPOL_PARTY_ID_SCHEMES } from './types';
export { createIdentifier, createTaxCategory, createLine, createParty, createExtension } from "../../data/edi";
/**
 * Defaults identify JP PINT billing. This does not certify the document against all JP PINT rules.
 *
 * @see {@link createInvoice} for Japanese-default construction.
 */
export const JAPANESE_EDI_DEFAULTS: EdiDocumentContext = Object.freeze({
  currency: 'JPY', schemaVersion: '2.1.0', profile: 'jp-pint-1.1.3',
  customizationId: 'urn:peppol:pint:billing-1@jp-1',
  profileId: 'urn:peppol:bis:billing',
});
/**
 * Wraps a numeric amount with an explicit or default JPY currency.
 *
 * @param value - Numeric amount in the selected currency; no currency conversion or validation is performed.
 * @param currency - Currency code, default JPY.
 * @returns A new EDI amount record.
 * @example
 * ```typescript
 * import { createAmount } from '@alneas/appkit-core/japan/edi/factory';
 *
 * console.log(createAmount(1000));
 * ```
 */
export function createAmount(value: number, currency = 'JPY'): EdiAmount { return core.createAmount(value, currency); }
/**
 * Creates a seller tax identifier using the VAT tax scheme.
 *
 * @param value - Host-supplied tax registration identifier; no registry validation is performed.
 * @returns A new VAT identifier record.
 * @example
 * ```typescript
 * import { createTaxId } from '@alneas/appkit-core/japan/edi/factory';
 *
 * console.log(createTaxId('T1234567890123'));
 * ```
 */
export function createTaxId(value: string) { return core.createIdentifier('VAT', value); }
/**
 * Creates an EAS 0221 party/endpoint identifier.
 *
 * @param value - Host-supplied qualified invoice issuer identifier; not a verification of registration.
 * @returns A new identifier with scheme 0221.
 * @example
 * ```typescript
 * import { createQualifiedInvoicePartyId } from '@alneas/appkit-core/japan/edi/factory';
 *
 * console.log(createQualifiedInvoicePartyId('T1234567890123'));
 * ```
 */
export function createQualifiedInvoicePartyId(value: string) { return core.createIdentifier(PEPPOL_PARTY_ID_SCHEMES.QUALIFIED_INVOICE, value); }
/**
 * Creates an EAS 0188 Japanese corporate-number identifier.
 *
 * @param value - Host-supplied corporate number; no registry lookup is performed.
 * @returns A new identifier with scheme 0188.
 * @example
 * ```typescript
 * import { createCorporateNumber } from '@alneas/appkit-core/japan/edi/factory';
 *
 * console.log(createCorporateNumber('1234567890123'));
 * ```
 */
export function createCorporateNumber(value: string) { return core.createIdentifier(PEPPOL_PARTY_ID_SCHEMES.CORPORATE_NUMBER, value); }
/**
 * Builds a tax subtotal with Japanese currency defaults.
 *
 * @param taxable - Taxable base amount in currency units.
 * @param tax - Precomputed tax amount; not calculated from the category rate.
 * @param category - Explicit tax category/rate descriptor.
 * @param currency - Currency code, default JPY.
 * @returns A new taxable/tax subtotal using the supplied category.
 * @example
 * ```typescript
 * import { createTaxSubtotal } from '@alneas/appkit-core/japan/edi/factory';
 *
 * console.log(createTaxSubtotal(1000, 100, { id: 'S', percent: 10, tax_scheme: 'VAT' }));
 * ```
 */
export function createTaxSubtotal(taxable: number, tax: number, category: EdiTaxCategory, currency = 'JPY'): EdiTaxSubtotal { return core.createTaxSubtotal(taxable, tax, category, currency); }
/**
 * Aggregates tax subtotals into financial totals using JPY by default.
 *
 * @param subtotals - Precomputed taxable/tax amounts, expected in one currency.
 * @param prepaid - Already-paid amount in currency units, default 0.
 * @param currency - Currency code applied to output totals, default JPY.
 * @returns Tax-exclusive/inclusive, tax-total, prepaid and payable amounts; empty subtotals produce zero totals before prepayment.
 * @example
 * ```typescript
 * import { createFinancials } from '@alneas/appkit-core/japan/edi/factory';
 *
 * console.log(createFinancials([]));
 * ```
 */
export function createFinancials(subtotals: EdiTaxSubtotal[], prepaid = 0, currency = 'JPY'): EdiFinancials { return core.createFinancials(subtotals, prepaid, currency); }
/**
 * Generic EDI document options with every document-context field made optional for Japanese defaults.
 *
 * @typeParam T - Generic factory option shape whose contextual fields may be overridden.
 * @see {@link createInvoice} for Japanese document-context usage.
 */
type JapaneseOptions<T> = Omit<T, keyof EdiDocumentContext> & Partial<EdiDocumentContext>;

/**
 * Constructs a Invoice data record with overridable Japanese profile/currency defaults.
 *
 * @param id - Document identifier supplied by the host.
 * @param issueDate - Issue-date text supplied by the host; no date parsing is performed.
 * @param supplier - Supplier party record.
 * @param buyer - Buyer party record.
 * @param lines - Precomputed line records; the factory does not validate tax/profile compliance.
 * @param financials - Precomputed document financial totals.
 * @param options - Optional document fields; Japanese context defaults are merged first and supplied values override them.
 * @returns A new Invoice data object with overridable Japanese document-context defaults.
 * @remarks This constructs data only; no persistence, transmission or complete JP PINT/Schematron validation is performed.
 *
 * @example
 * ```typescript
 * import { createInvoice } from '@alneas/appkit-core/japan/edi/factory';
 *
 * // The host provides the document's real parties, lines and any financial/reference inputs.
 * export function build(...inputs: Parameters<typeof createInvoice>) {
 *   return createInvoice(...inputs);
 * }
 * ```
 */
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

/**
 * Constructs a CreditNote data record with overridable Japanese profile/currency defaults.
 *
 * @param id - Document identifier supplied by the host.
 * @param issueDate - Issue-date text supplied by the host; no date parsing is performed.
 * @param supplier - Supplier party record.
 * @param buyer - Buyer party record.
 * @param lines - Precomputed line records; the factory does not validate tax/profile compliance.
 * @param financials - Precomputed document financial totals.
 * @param billingReference - Reference to the original invoice for this credit note.
 * @param options - Optional document fields; Japanese context defaults are merged first and supplied values override them.
 * @returns A new CreditNote data object with overridable Japanese document-context defaults.
 * @remarks This constructs data only; no persistence, transmission or complete JP PINT/Schematron validation is performed.
 *
 * @example
 * ```typescript
 * import { createCreditNote } from '@alneas/appkit-core/japan/edi/factory';
 *
 * // The host provides the document's real parties, lines and any financial/reference inputs.
 * export function build(...inputs: Parameters<typeof createCreditNote>) {
 *   return createCreditNote(...inputs);
 * }
 * ```
 */
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

/**
 * Constructs a PurchaseOrder data record with overridable Japanese profile/currency defaults.
 *
 * @param id - Document identifier supplied by the host.
 * @param issueDate - Issue-date text supplied by the host; no date parsing is performed.
 * @param supplier - Supplier party record.
 * @param buyer - Buyer party record.
 * @param lines - Precomputed line records; the factory does not validate tax/profile compliance.
 * @param options - Optional document fields; Japanese context defaults are merged first and supplied values override them.
 * @returns A new PurchaseOrder data object with overridable Japanese document-context defaults.
 * @remarks This constructs data only; no persistence, transmission or complete JP PINT/Schematron validation is performed.
 *
 * @example
 * ```typescript
 * import { createPurchaseOrder } from '@alneas/appkit-core/japan/edi/factory';
 *
 * // The host provides the document's real parties, lines and any financial/reference inputs.
 * export function build(...inputs: Parameters<typeof createPurchaseOrder>) {
 *   return createPurchaseOrder(...inputs);
 * }
 * ```
 */
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

/**
 * Constructs a Quotation data record with overridable Japanese profile/currency defaults.
 *
 * @param id - Document identifier supplied by the host.
 * @param issueDate - Issue-date text supplied by the host; no date parsing is performed.
 * @param supplier - Supplier party record.
 * @param buyer - Buyer party record.
 * @param lines - Precomputed line records; the factory does not validate tax/profile compliance.
 * @param options - Optional document fields; Japanese context defaults are merged first and supplied values override them.
 * @returns A new Quotation data object with overridable Japanese document-context defaults.
 * @remarks This constructs data only; no persistence, transmission or complete JP PINT/Schematron validation is performed.
 *
 * @example
 * ```typescript
 * import { createQuotation } from '@alneas/appkit-core/japan/edi/factory';
 *
 * // The host provides the document's real parties, lines and any financial/reference inputs.
 * export function build(...inputs: Parameters<typeof createQuotation>) {
 *   return createQuotation(...inputs);
 * }
 * ```
 */
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

/**
 * Constructs a DespatchAdvice data record with overridable Japanese profile/currency defaults.
 *
 * @param id - Document identifier supplied by the host.
 * @param issueDate - Issue-date text supplied by the host; no date parsing is performed.
 * @param supplier - Supplier party record.
 * @param buyer - Buyer party record.
 * @param lines - Precomputed line records; the factory does not validate tax/profile compliance.
 * @param orderReference - Source order identifier for the despatch advice.
 * @param options - Optional document fields; Japanese context defaults are merged first and supplied values override them.
 * @returns A new DespatchAdvice data object with overridable Japanese document-context defaults.
 * @remarks This constructs data only; no persistence, transmission or complete JP PINT/Schematron validation is performed.
 *
 * @example
 * ```typescript
 * import { createDespatchAdvice } from '@alneas/appkit-core/japan/edi/factory';
 *
 * // The host provides the document's real parties, lines and any financial/reference inputs.
 * export function build(...inputs: Parameters<typeof createDespatchAdvice>) {
 *   return createDespatchAdvice(...inputs);
 * }
 * ```
 */
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

/**
 * Constructs a RemittanceAdvice data record with overridable Japanese profile/currency defaults.
 *
 * @param id - Document identifier supplied by the host.
 * @param issueDate - Issue-date text supplied by the host; no date parsing is performed.
 * @param supplier - Supplier party record.
 * @param buyer - Buyer party record.
 * @param allocations - Payment allocations to source documents.
 * @param payment - Explicit payment information for the remittance.
 * @param options - Optional document fields; Japanese context defaults are merged first and supplied values override them.
 * @returns A new RemittanceAdvice data object with overridable Japanese document-context defaults.
 * @remarks This constructs data only; no persistence, transmission or complete JP PINT/Schematron validation is performed.
 *
 * @example
 * ```typescript
 * import { createRemittanceAdvice } from '@alneas/appkit-core/japan/edi/factory';
 *
 * // The host provides the document's real parties, lines and any financial/reference inputs.
 * export function build(...inputs: Parameters<typeof createRemittanceAdvice>) {
 *   return createRemittanceAdvice(...inputs);
 * }
 * ```
 */
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
