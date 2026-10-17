import type {
  EdiInvoiceData,
  EdiCreditNoteData,
  EdiPurchaseOrderData,
  EdiDespatchAdviceData,
  EdiRemittanceAdviceData,
  EdiQuotationData,
  EdiParty,
  EdiLine,
  EdiFinancials,
  EdiAmount,
  EdiTaxSubtotal,
  EdiTaxCategory,
  EdiIdentifier,
  EdiAddress,
  EdiPayment,
  EdiAllocation,
  EdiReference,
  EdiExtensionEnvelope,
} from './types';


/** Creates an amount in the explicitly selected currency. */
export function createAmount(value: number, currency: string): EdiAmount {
  return { value, currency };
}

/** Create a party identifier with the caller-selected identification scheme and value. */
export function createIdentifier(scheme: string, value: string): EdiIdentifier {
  return { scheme, value };
}

/** Create a VATEX tax category with id, percent, and scheme. */
export function createTaxCategory(
  id: 'S' | 'AA' | 'E' | 'G' | 'O',
  percent: number,
  taxScheme = 'VAT',
): EdiTaxCategory {
  return { id, percent, tax_scheme: taxScheme };
}

/** Create a Peppol TaxSubtotal with taxable amount, tax amount, and category. */
export function createTaxSubtotal(
  taxableAmount: number,
  taxAmount: number,
  category: EdiTaxCategory,
  currency: string,
): EdiTaxSubtotal {
  return {
    taxable_amount: createAmount(taxableAmount, currency),
    tax_amount: createAmount(taxAmount, currency),
    tax_category: category,
  };
}

/** Create EdiFinancials from tax subtotals, computing totals automatically. */
export function createFinancials(
  subtotals: EdiTaxSubtotal[],
  prepaid = 0,
  currency: string,
): EdiFinancials {
  const taxAmount = subtotals.reduce((sum, s) => sum + s.tax_amount.value, 0);
  const taxableTotal = subtotals.reduce((sum, s) => sum + s.taxable_amount.value, 0);
  const taxInclusive = taxableTotal + taxAmount;

  return {
    tax_total: {
      tax_amount: createAmount(taxAmount, currency),
      tax_subtotals: subtotals,
    },
    tax_inclusive_amount: createAmount(taxInclusive, currency),
    payable_amount: createAmount(taxInclusive - prepaid, currency),
    prepaid_amount: prepaid > 0 ? createAmount(prepaid, currency) : undefined,
  };
}

/** Create a document line item. netAmount defaults to quantity * unitPrice if not specified. */
export function createLine(
  lineId: string,
  description: string,
  quantity: number,
  unitCode: string,
  unitPrice: number,
  options?: {
    productCode?: string;
    netAmount?: number;
    poLineRef?: string;
    taxCategory?: EdiTaxCategory;
  },
): EdiLine {
  return {
    line_id: lineId,
    product_code: options?.productCode,
    description,
    quantity,
    unit_code: unitCode,
    unit_price: unitPrice,
    net_amount: options?.netAmount ?? quantity * unitPrice,
    po_line_ref: options?.poLineRef,
    tax_category: options?.taxCategory,
  };
}

/** Create a party with Peppol ICD identifiers and optional address. */
export function createParty(
  id: EdiIdentifier,
  name: string,
  options?: {
    taxId?: EdiIdentifier;
    legalRegistration?: EdiIdentifier;
    endpointId?: EdiIdentifier;
    address?: EdiAddress;
  },
): EdiParty {
  return {
    id,
    name,
    tax_id: options?.taxId,
    legal_registration: options?.legalRegistration,
    endpoint_id: options?.endpointId,
    address: options?.address,
  };
}

/** Create an extension envelope for the extensions[] array. */
export function createExtension(
  namespace: string,
  extensionId: string,
  version: string,
  data: Record<string, unknown>,
): EdiExtensionEnvelope {
  return { namespace, extension_id: extensionId, version, data };
}

/** Caller-selected EDI context; no regional profile or currency is inferred. */
export interface EdiDocumentContext {
  currency: string;
  schemaVersion?: string;
  customizationId?: string;
  profileId?: string;
  profile?: string;
}
/** @internal */
function commonHeader(options: EdiDocumentContext) {
  if (!options.currency?.trim()) throw new Error('EDI currency must be explicit');
  return {
    customization_id: options.customizationId,
    profile_id: options.profileId,
    schema_version: options.schemaVersion ?? '2.1.0',
    profile: options.profile,
    currency: options.currency,
    extensions: [],
  };
}

/** Create an Invoice using an explicit currency/profile context (doc_type_code defaults to 380). */
export function createInvoice(
  id: string,
  issueDate: string,
  supplier: EdiParty,
  buyer: EdiParty,
  lines: EdiLine[],
  financials: EdiFinancials,
  options: EdiDocumentContext & {
    docTypeCode?: '380' | '384' | '389';
    references?: EdiInvoiceData['references'];
    allowancesCharges?: EdiInvoiceData['allowances_charges'];
    payment?: EdiPayment;
    note?: string;
    extensions?: EdiExtensionEnvelope[];
  },
): EdiInvoiceData {
  return {
    ...commonHeader(options),
    doc_type: 'Invoice',
    doc_type_code: options?.docTypeCode ?? '380',
    id,
    issue_date: issueDate,
    supplier,
    buyer,
    lines,
    financials,
    references: options?.references,
    allowances_charges: options?.allowancesCharges,
    payment: options?.payment,
    note: options?.note,
    extensions: options?.extensions,
  };
}

/** Create a CreditNote with required billing_reference to the original invoice. */
export function createCreditNote(
  id: string,
  issueDate: string,
  supplier: EdiParty,
  buyer: EdiParty,
  lines: EdiLine[],
  financials: EdiFinancials,
  billingReference: EdiReference,
  options: EdiDocumentContext & {
    references?: Omit<EdiCreditNoteData['references'], 'billing_reference'>;
    allowancesCharges?: EdiCreditNoteData['allowances_charges'];
    payment?: EdiPayment;
    note?: string;
    extensions?: EdiExtensionEnvelope[];
  },
): EdiCreditNoteData {
  return {
    ...commonHeader(options),
    doc_type: 'CreditNote',
    doc_type_code: '381',
    id,
    issue_date: issueDate,
    supplier,
    buyer,
    lines,
    financials,
    references: { ...options?.references, billing_reference: billingReference },
    allowances_charges: options?.allowancesCharges,
    payment: options?.payment,
    note: options?.note,
    extensions: options?.extensions,
  };
}

/** Create a PurchaseOrder document. */
export function createPurchaseOrder(
  id: string,
  issueDate: string,
  supplier: EdiParty,
  buyer: EdiParty,
  lines: EdiLine[],
  options: EdiDocumentContext & {
    references?: EdiPurchaseOrderData['references'];
    financials?: EdiFinancials;
    shipment?: EdiPurchaseOrderData['shipment'];
    note?: string;
    extensions?: EdiExtensionEnvelope[];
  },
): EdiPurchaseOrderData {
  return {
    ...commonHeader(options),
    doc_type: 'PurchaseOrder',
    doc_type_code: null,
    id,
    issue_date: issueDate,
    supplier,
    buyer,
    lines,
    references: options?.references,
    financials: options?.financials,
    shipment: options?.shipment,
    note: options?.note,
    extensions: options?.extensions,
  };
}

/** Create a Quotation document with optional validity period. */
export function createQuotation(
  id: string,
  issueDate: string,
  supplier: EdiParty,
  buyer: EdiParty,
  lines: EdiLine[],
  options: EdiDocumentContext & {
    validFrom?: string;
    validUntil?: string;
    references?: EdiQuotationData['references'];
    financials?: EdiFinancials;
    allowancesCharges?: EdiQuotationData['allowances_charges'];
    note?: string;
    extensions?: EdiExtensionEnvelope[];
  },
): EdiQuotationData {
  return {
    ...commonHeader(options),
    doc_type: 'Quotation',
    doc_type_code: null,
    id,
    issue_date: issueDate,
    supplier,
    buyer,
    lines,
    valid_from: options?.validFrom,
    valid_until: options?.validUntil,
    references: options?.references,
    financials: options?.financials,
    allowances_charges: options?.allowancesCharges,
    note: options?.note,
    extensions: options?.extensions,
  };
}

/** Create a DespatchAdvice (delivery note) linked to a PurchaseOrder. */
export function createDespatchAdvice(
  id: string,
  issueDate: string,
  supplier: EdiParty,
  buyer: EdiParty,
  lines: EdiLine[],
  orderReference: string,
  options: EdiDocumentContext & {
    shipment?: EdiDespatchAdviceData['shipment'];
    note?: string;
    extensions?: EdiExtensionEnvelope[];
  },
): EdiDespatchAdviceData {
  return {
    ...commonHeader(options),
    doc_type: 'DespatchAdvice',
    doc_type_code: null,
    id,
    issue_date: issueDate,
    supplier,
    buyer,
    lines,
    references: { order_reference: orderReference },
    shipment: options?.shipment,
    note: options?.note,
    extensions: options?.extensions,
  };
}

/** Create a RemittanceAdvice (payment allocation notice) with invoice allocations. */
export function createRemittanceAdvice(
  id: string,
  issueDate: string,
  supplier: EdiParty,
  buyer: EdiParty,
  allocations: EdiAllocation[],
  payment: EdiPayment,
  options: EdiDocumentContext & {
    financials?: EdiRemittanceAdviceData['financials'];
    note?: string;
    extensions?: EdiExtensionEnvelope[];
  },
): EdiRemittanceAdviceData {
  return {
    ...commonHeader(options),
    doc_type: 'RemittanceAdvice',
    doc_type_code: null,
    id,
    issue_date: issueDate,
    supplier,
    buyer,
    allocations,
    payment,
    financials: options?.financials,
    note: options?.note,
    extensions: options?.extensions,
  };
}
