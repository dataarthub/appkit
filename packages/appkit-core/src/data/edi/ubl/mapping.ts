import type { EdiDocument, EdiParty, EdiLine, EdiTaxSubtotal, EdiAllowanceCharge } from '../types';

/**
 * Intermediate flat structure for converting EDI documents to UBL XML.
 * This structure is passed to the XML serializer as an intermediate representation.
 */
export interface UblFieldMap {
  documentType: string;
  documentTypeCode: string | null;
  id: string;
  issueDate: string;
  note?: string;
  taxPointDate?: string;
  orderReference?: string;
  despatchDocumentReference?: string;
  billingReferenceId?: string;
  billingReferenceDate?: string;
  currency: string;
  supplier: UblPartyMap;
  buyer: UblPartyMap;
  lines: UblLineMap[];
  taxSubtotals: UblTaxSubtotalMap[];
  taxTotalAmount: number;
  taxInclusiveAmount: number;
  payableAmount: number;
  prepaidAmount?: number;
  allowancesCharges: UblAllowanceChargeMap[];
  paymentMeansCode?: string;
  paymentId?: string;
}

export interface UblPartyMap {
  endpointId?: string;
  endpointScheme?: string;
  id?: string;
  idScheme?: string;
  name: string;
  taxId?: string;
  taxIdScheme?: string;
  legalRegistrationId?: string;
  legalRegistrationScheme?: string;
  addressCountry?: string;
  addressSubdivision?: string;
  addressCity?: string;
  addressStreet?: string;
  addressPostalZone?: string;
}

export interface UblLineMap {
  id: string;
  productCode?: string;
  description: string;
  quantity: number;
  unitCode: string;
  unitPrice: number;
  netAmount: number;
  poLineRef?: string;
  taxCategoryId?: string;
  taxPercent?: number;
  taxScheme?: string;
}

export interface UblTaxSubtotalMap {
  taxableAmount: number;
  taxAmount: number;
  taxCategoryId: string;
  taxPercent: number;
  taxScheme: string;
}

export interface UblAllowanceChargeMap {
  indicator: boolean;
  reasonCode?: string;
  reason?: string;
  amount: number;
  currency: string;
}

/**
 * Converts EDI party information into a flat structure for UBL.
 * @internal
 */
function mapParty(party: EdiParty): UblPartyMap {
  return {
    endpointId: party.endpoint_id?.value,
    endpointScheme: party.endpoint_id?.scheme,
    id: party.id.value,
    idScheme: party.id.scheme,
    name: party.name,
    taxId: party.tax_id?.value,
    taxIdScheme: party.tax_id?.scheme,
    legalRegistrationId: party.legal_registration?.value,
    legalRegistrationScheme: party.legal_registration?.scheme,
    addressCountry: party.address?.country,
    addressSubdivision: party.address?.subdivision,
    addressCity: party.address?.city,
    addressStreet: party.address?.street_name,
    addressPostalZone: party.address?.postal_zone,
  };
}

function mapLine(line: EdiLine): UblLineMap {
  return {
    id: line.line_id,
    productCode: line.product_code,
    description: line.description,
    quantity: line.quantity,
    unitCode: line.unit_code,
    unitPrice: line.unit_price,
    netAmount: line.net_amount,
    poLineRef: line.po_line_ref,
    taxCategoryId: line.tax_category?.id,
    taxPercent: line.tax_category?.percent,
    taxScheme: line.tax_category?.tax_scheme,
  };
}

function mapTaxSubtotal(ts: EdiTaxSubtotal): UblTaxSubtotalMap {
  return {
    taxableAmount: ts.taxable_amount.value,
    taxAmount: ts.tax_amount.value,
    taxCategoryId: ts.tax_category.id,
    taxPercent: ts.tax_category.percent,
    taxScheme: ts.tax_category.tax_scheme,
  };
}

function mapAllowanceCharge(ac: EdiAllowanceCharge): UblAllowanceChargeMap {
  return {
    indicator: ac.indicator,
    reasonCode: ac.reason_code,
    reason: ac.reason,
    amount: ac.amount.value,
    currency: ac.amount.currency,
  };
}

/** Map an EDI document to a flat UBL field structure for XML serialization. */
export function mapToUbl(doc: EdiDocument): UblFieldMap {
  const base: UblFieldMap = {
    documentType: doc.doc_type,
    documentTypeCode: doc.doc_type_code,
    id: doc.id,
    issueDate: doc.issue_date,
    note: doc.note,
    taxPointDate: doc.tax_point_date,
    currency: doc.currency,
    supplier: mapParty(doc.supplier),
    buyer: mapParty(doc.buyer),
    lines: [],
    taxSubtotals: [],
    taxTotalAmount: 0,
    taxInclusiveAmount: 0,
    payableAmount: 0,
    allowancesCharges: [],
  };

  if ('lines' in doc) {
    base.lines = doc.lines.map(mapLine);
  }

  if ('financials' in doc && doc.financials) {
    const f = doc.financials as {
      tax_total?: { tax_amount: { value: number }; tax_subtotals: EdiTaxSubtotal[] };
      tax_inclusive_amount?: { value: number };
      payable_amount?: { value: number };
      prepaid_amount?: { value: number };
    };
    if (f.tax_total) {
      base.taxTotalAmount = f.tax_total.tax_amount.value;
      base.taxSubtotals = f.tax_total.tax_subtotals.map(mapTaxSubtotal);
    }
    if (f.tax_inclusive_amount) base.taxInclusiveAmount = f.tax_inclusive_amount.value;
    if (f.payable_amount) base.payableAmount = f.payable_amount.value;
    if (f.prepaid_amount) base.prepaidAmount = f.prepaid_amount.value;
  }

  if ('references' in doc && doc.references) {
    const r = doc.references as {
      order_reference?: string;
      billing_reference?: { id: string; date?: string };
      despatch_document_reference?: string;
    };
    base.orderReference = r.order_reference;
    base.despatchDocumentReference = r.despatch_document_reference;
    if (r.billing_reference) {
      base.billingReferenceId = r.billing_reference.id;
      base.billingReferenceDate = r.billing_reference.date;
    }
  }

  if ('allowances_charges' in doc && doc.allowances_charges) {
    base.allowancesCharges = doc.allowances_charges.map(mapAllowanceCharge);
  }

  if ('payment' in doc && doc.payment) {
    const p = doc.payment as { means_code?: string; payment_id?: string };
    base.paymentMeansCode = p.means_code;
    base.paymentId = p.payment_id;
  }

  return base;
}
