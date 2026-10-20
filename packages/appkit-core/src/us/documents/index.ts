import { calculateInvoiceAmounts } from "../../data/finance";
import type { InvoiceAmountsResult, InvoiceCalculationOptions } from "../../data/finance";
import type { BusinessDocumentData, BusinessDocumentTemplate, DocumentLineItem, DocumentPartyInfo } from "../../data/pdf";
import { formatUSD, formatUSDate } from '../format';
/**
 * Supported US business document presets; no tax or electronic-invoice profile is inferred.
 *
 * @see {@link createUSBusinessDocument} for a complete renderer-neutral USD document example.
 */
export type USDocumentType = 'quote' | 'invoice' | 'creditNote';
/**
 * US Letter portrait dimensions in PDF points (72 points per inch), with half-inch margins.
 *
 * @see {@link createUSBusinessDocument} for a complete renderer-neutral USD document example.
 */
export const US_LETTER_PAGE = Object.freeze({
  /** US Letter portrait width in PDF points (612, or 8.5 inches). */
  width: 612,
  /** US Letter portrait height in PDF points (792, or 11 inches). */
  height: 792,
  /** Suggested uniform page margin in PDF points (36, or half an inch). */
  margin: 36 } as const);
/**
 * Explicit inputs for a renderer-neutral USD document. Line amounts are precomputed dollars.
 *
 * @see {@link createUSBusinessDocument} for a complete renderer-neutral USD document example.
 */
export interface USBusinessDocumentInput {

  /** Selects the quote, invoice or credit-note presentation preset. */
  documentType: USDocumentType;

  /** Required nonblank document reference printed in the model. */
  documentNo: string;

  /** Civil date, YYYY-MM-DD; rendered without converting it to a business timezone. */
  issueDate: string;

  /** Issuer party details; companyName and address must be nonblank. */
  issuer: DocumentPartyInfo;

  /** Recipient party details; companyName and address must be nonblank. */
  client: DocumentPartyInfo;

  /** Nonnegative precomputed amounts. Discounts must already be reflected in each amount. */
  items: readonly DocumentLineItem[];

  /** Explicit rate in percentage points and explicit dollar tax rounder. No default sales tax. */
  taxPolicy: InvoiceCalculationOptions;

  /** Optional YYYY-MM-DD civil payment due date; no holiday shifting. */
  dueDate?: string;

  /** Optional YYYY-MM-DD quote validity date; no holiday shifting. */
  expirationDate?: string;

  /** Required for credit notes: the original invoice reference. Credits use positive magnitudes. */
  billingReference?: string;

  /** Optional host-supplied payment terms displayed verbatim. */
  paymentTerms?: string;

  /** Optional host-supplied payment instructions displayed verbatim. */
  paymentInstructions?: string;

  /** Optional host-supplied explanatory text. */
  notes?: string;
}
/**
 * Portable document model for a host renderer. This value is not a PDF binary.
 *
 * @see {@link createUSBusinessDocument} for a complete renderer-neutral USD document example.
 */
export interface USBusinessDocumentModel {

  /** USD currency code attached to the document model; no conversion occurs. */
  currency: 'USD';

  /** en-US presentation locale used by built-in formatters. */
  locale: 'en-US';

  /** Shared US Letter page geometry; the host renderer applies these dimensions. */
  page: typeof US_LETTER_PAGE;

  /** Fresh customizable English engine template selected for this document type. */
  template: BusinessDocumentTemplate;

  /** Issuer party details; companyName and address must be nonblank. */
  issuer: DocumentPartyInfo;

  /** Renderer-neutral business-document data, including numeric totals and input civil dates. */
  data: BusinessDocumentData;

  /** Calculated numeric subtotal, tax rate, tax amount and total in dollars/percentage points. */
  amounts: InvoiceAmountsResult;

  /** English labels and final formatted values for rendering without Japanese fallbacks. */
  presentation: {

    /** English document title selected by the template. */
    title: string;

    /** Document reference copied into the final presentation values. */
    documentNo: string;

    /** Issue date formatted as an en-US civil date in UTC to preserve the input day. */
    issueDate: string;

    /** Optional civil date formatted as en-US date text without shifting its calendar day. */
    dueDate?: string;

    /** Optional civil date formatted as en-US date text without shifting its calendar day. */
    expirationDate?: string;

    /** English label From for the issuer block. */
    issuerLabel: string;

    /** Prepared For on quotes, otherwise Bill To. */
    clientLabel: string;

    /** English Subtotal label. */
    subtotalLabel: string;

    /** English Sales Tax label including the explicit percentage-point rate. */
    taxLabel: string;

    /** English total/credit-total label identifying USD. */
    totalLabel: string;

    /** Subtotal formatted as en-US USD currency text. */
    subtotal: string;

    /** Calculated tax formatted as en-US USD currency text. */
    tax: string;

    /** Final total formatted as en-US USD currency text. */
    total: string;

    /** Input-order line values formatted as English-facing text for the host renderer. */
    lines: Array<{
      /** Line name used as the display description. */
      description: string;
      /** Quantity formatted with en-US number presentation. */
      quantity: string;
      /** Unit price formatted as USD text. */
      unitPrice: string;
      /** Precomputed line amount formatted as USD text. */
      amount: string }>;

    /** Optional host-supplied payment terms displayed verbatim. */
    paymentTerms?: string;

    /** Optional host-supplied payment instructions displayed verbatim. */
    paymentInstructions?: string;

    /** Optional host-supplied explanatory text. */
    notes?: string;

    /** Original invoice identifier displayed for credit notes. */
    billingReference?: string;
  };
}
/**
 * Creates a fresh, customizable English quote/invoice/credit-note engine template.
 * No Japanese seals, legacy summary tables, font assumptions or tax defaults are enabled.
 * @param documentType quote, invoice or creditNote; unknown values throw TypeError.
 * @returns Independent BusinessDocumentTemplate with English line columns and labels.
 * @example
 * import { createUSDocumentTemplate } from '@alneas/appkit-core/us/documents';
 * const template = createUSDocumentTemplate('invoice');
 * template.title = 'Commercial Invoice';
 *
 * @throws TypeError when documentType is not quote, invoice or creditNote.
 */
export function createUSDocumentTemplate(documentType: USDocumentType): BusinessDocumentTemplate {
  if (!['quote', 'invoice', 'creditNote'].includes(documentType)) throw new TypeError('Unknown US document type');
  const titles = { quote: 'Quote', invoice: 'Invoice', creditNote: 'Credit Note' };
  return {
    documentType, title: titles[documentType], leadText: '',
    documentNoLabel: `${titles[documentType]} Number`, dateLabel: 'Issue Date',
    dateValueKey: documentType === 'quote' ? 'quoteDate' : 'invoiceDate',
    ...(documentType === 'invoice' ? { dueLabel: 'Due Date', dueValueKey: 'dueDate' } : {}),
    partyRole: 'client', showStaffSeal: false, showApproverSeal: false,
    largeTotalLabel: documentType === 'creditNote' ? 'Credit Total' : 'Total (USD)',
    summaryFields: [
      { label: 'Payment Terms', valueKey: 'paymentTerms', formatterType: 'string' },
      ...(documentType === 'quote' ? [{ label: 'Valid Until', valueKey: 'expirationDate', formatterType: 'date' as const }] : []),
      ...(documentType === 'creditNote' ? [{ label: 'Original Invoice', valueKey: 'billingReference', formatterType: 'string' as const }] : []),
    ],
    tableConfig: { itemLabel: 'Description', remarksHeader: 'Notes', columns: [
      { key: 'name', header: 'Description', width: '*' },
      { key: 'quantity', header: 'Quantity', width: 'auto', alignment: 'right' },
      { key: 'unitPrice', header: 'Unit Price (USD)', width: 'auto', alignment: 'right' },
      { key: 'amount', header: 'Amount (USD)', width: 'auto', alignment: 'right' },
    ] },
  };
}
function civilDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new RangeError('Document dates must use YYYY-MM-DD');
  const date = new Date(value + 'T00:00:00Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new RangeError('Invalid document civil date');
  return formatUSDate(date, 'UTC');
}
function party(value: DocumentPartyInfo): DocumentPartyInfo {
  if (!value.companyName?.trim() || !value.address?.trim()) throw new TypeError('Issuer and client require companyName and address');
  return { ...value };
}
/**
 * Assembles a USD quote, invoice or credit-note model using generic engine calculation.
 * A host owns rendering/export, fonts and safe text handling; no PDF library is loaded.
 * Supply precomputed line amounts and explicit tax/rounding policy. Uses JavaScript
 * numbers, not exact decimal accounting or automatic tax determination. Credit notes
 * use positive magnitudes and require an original invoice reference; ledger signs
 * remain caller-owned. Civil due dates are never shifted by a holiday calendar.
 * @param input Document fields, precomputed dollar line amounts and explicit tax policy.
 * @returns English template, US Letter geometry, engine data, amounts and formatted values.
 * @throws TypeError for missing required text/credit reference; RangeError for invalid dates,
 * negative/nonfinite amounts, invalid rate or invalid output from the supplied rounder.
 * @example
 * import { createUSBusinessDocument } from '@alneas/appkit-core/us/documents';
 * const invoice = createUSBusinessDocument({
 *   documentType: 'invoice', documentNo: 'INV-100', issueDate: '2026-10-19',
 *   issuer: { companyName: 'Example Studio', address: '100 Example Street' },
 *   client: { companyName: 'Example Client', address: '200 Example Avenue' },
 *   items: [{ name: 'Design', quantity: 2, unitCode: 'hour', unitPrice: 50, amount: 100 }],
 *   taxPolicy: { defaultTaxRate: 0, roundTax: amount => Math.round(amount * 100) / 100 },
 * });
 * invoice.presentation.total; // '$100.00'
 */
export function createUSBusinessDocument(input: USBusinessDocumentInput): USBusinessDocumentModel {
  const template = createUSDocumentTemplate(input.documentType);
  if (!input.documentNo?.trim()) throw new TypeError('Document number is required');
  if (input.documentType === 'creditNote' && !input.billingReference?.trim()) throw new TypeError('Credit notes require an original invoice reference');
  const issued = civilDate(input.issueDate);
  const due = input.dueDate === undefined ? undefined : civilDate(input.dueDate);
  const expiration = input.expirationDate === undefined ? undefined : civilDate(input.expirationDate);
  const issuer = party(input.issuer), client = party(input.client);
  const items = input.items.map(item => {
    if (!item.name?.trim() || !item.unitCode?.trim()) throw new TypeError('Line description and unitCode are required');
    if (![item.quantity, item.unitPrice, item.amount].every(value => Number.isFinite(value) && value >= 0)) throw new RangeError('Line quantities and amounts must be finite and nonnegative');
    return { ...item };
  });
  if (!Number.isFinite(input.taxPolicy.defaultTaxRate) || input.taxPolicy.defaultTaxRate < 0) throw new RangeError('An explicit nonnegative tax rate is required');
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const amounts = calculateInvoiceAmounts({ subtotal }, input.taxPolicy);
  if (amounts.taxAmount < 0 || amounts.totalAmount < 0) throw new RangeError('Tax rounder must return a nonnegative amount');
  return {
    currency: 'USD', locale: 'en-US', page: US_LETTER_PAGE, template, issuer, amounts,
    data: {
      items, client, documentNo: input.documentNo, issueDate: input.issueDate,
      [template.dateValueKey]: input.issueDate,
      dueDate: input.dueDate, expirationDate: input.expirationDate,
      billingReference: input.billingReference, paymentTerms: input.paymentTerms,
      paymentInstructions: input.paymentInstructions, remarks: input.notes,
      subtotal: amounts.subtotal, taxRate: amounts.taxRate, taxAmount: amounts.taxAmount, totalAmount: amounts.totalAmount,
    },
    presentation: {
      title: template.title, documentNo: input.documentNo, issueDate: issued,
      dueDate: due, expirationDate: expiration,
      issuerLabel: 'From', clientLabel: input.documentType === 'quote' ? 'Prepared For' : 'Bill To',
      subtotalLabel: 'Subtotal', taxLabel: `Sales Tax (${amounts.taxRate}%)`,
      totalLabel: input.documentType === 'creditNote' ? 'Credit Total (USD)' : 'Total (USD)',
      subtotal: formatUSD(amounts.subtotal), tax: formatUSD(amounts.taxAmount), total: formatUSD(amounts.totalAmount),
      lines: items.map(item => ({ description: item.name, quantity: new Intl.NumberFormat('en-US').format(item.quantity), unitPrice: formatUSD(item.unitPrice), amount: formatUSD(item.amount) })),
      paymentTerms: input.paymentTerms, paymentInstructions: input.paymentInstructions,
      notes: input.notes, billingReference: input.billingReference,
    },
  };
}
