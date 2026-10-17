export type EdiDocType =
  | 'Invoice'
  | 'CreditNote'
  | 'PurchaseOrder'
  | 'DespatchAdvice'
  | 'RemittanceAdvice'
  | 'Quotation';

export type EdiDocTypeCode = '380' | '381' | '384' | '389' | null;

export type VatexCategoryId = 'S' | 'AA' | 'E' | 'G' | 'O';

export interface EdiIdentifier {
  scheme: string;
  value: string;
}

export interface EdiAmount {
  value: number;
  currency: string;
}

export interface EdiAddress {
  country: string;
  subdivision?: string;
  city?: string;
  street_name?: string;
  postal_zone?: string;
}

export interface EdiParty {
  id: EdiIdentifier;
  name: string;
  tax_id?: EdiIdentifier;
  legal_registration?: EdiIdentifier;
  endpoint_id?: EdiIdentifier;
  address?: EdiAddress;
}

export interface EdiTaxCategory {
  id: VatexCategoryId;
  percent: number;
  tax_scheme: string;
}

export interface EdiTaxSubtotal {
  taxable_amount: EdiAmount;
  tax_amount: EdiAmount;
  tax_category: EdiTaxCategory;
}

export interface EdiTaxTotal {
  tax_amount: EdiAmount;
  tax_subtotals: EdiTaxSubtotal[];
}

export interface EdiFinancials {
  tax_total: EdiTaxTotal;
  tax_inclusive_amount: EdiAmount;
  payable_amount: EdiAmount;
  prepaid_amount?: EdiAmount;
}

export interface EdiLine {
  line_id: string;
  product_code?: string;
  description: string;
  quantity: number;
  unit_code: string;
  unit_price: number;
  net_amount: number;
  po_line_ref?: string;
  tax_category?: EdiTaxCategory;
}

export interface EdiAllowanceCharge {
  indicator: boolean;
  reason_code?: string;
  reason?: string;
  amount: EdiAmount;
}

export interface EdiReference {
  id: string;
  date?: string;
}

export interface EdiReferences {
  order_reference?: string;
  despatch_document_reference?: string;
  billing_reference?: EdiReference;
  quotation_reference?: string;
}

export interface EdiPayment {
  means_code?: string;
  payment_id?: string;
  due_date?: string;
  bank_accounts?: EdiBankAccount[];
}

export interface EdiBankAccount {
  bank_name: string;
  branch_name: string;
  account_type: string;
  account_number: string;
  account_holder: string;
}

export interface EdiAllocation {
  invoice: { id: string };
  allocated_amount: EdiAmount;
}

export interface EdiShipment {
  packages?: EdiPackage[];
}

export interface EdiPackage {
  id: string;
  level?: string;
  sscc?: string;
  gross_weight_kg?: number;
  children?: EdiPackage[];
}

export interface EdiExtensionEnvelope {
  namespace: string;
  extension_id: string;
  version: string;
  data: Record<string, unknown>;
}

export interface EdiStamp {
  label: string;
  name?: string;
  sealImageDataUrl?: string;
}

export interface EdiDocumentCommon {
  customization_id?: string;
  profile_id?: string;
  schema_version: string;
  profile?: string;
  doc_type: EdiDocType;
  doc_type_code: EdiDocTypeCode;
  id: string;
  issue_date: string;
  currency: string;
  note?: string;
  tax_point_date?: string;
  buyer_reference?: string;
  extensions?: EdiExtensionEnvelope[];
  /** Stamp list (name and role). Non-standard Peppol extension, used for PDF rendering. */
  stamps?: EdiStamp[];
}

export interface EdiDocumentParties {
  supplier: EdiParty;
  buyer: EdiParty;
}

export interface EdiDocumentLines {
  lines: EdiLine[];
}

export interface EdiInvoiceData extends EdiDocumentCommon, EdiDocumentParties, EdiDocumentLines {
  doc_type: 'Invoice';
  doc_type_code: '380' | '384' | '389';
  references?: EdiReferences;
  allowances_charges?: EdiAllowanceCharge[];
  financials: EdiFinancials;
  payment?: EdiPayment;
  shipment?: EdiShipment;
}

export interface EdiCreditNoteData extends EdiDocumentCommon, EdiDocumentParties, EdiDocumentLines {
  doc_type: 'CreditNote';
  doc_type_code: '381';
  references: EdiReferences & { billing_reference: EdiReference };
  allowances_charges?: EdiAllowanceCharge[];
  financials: EdiFinancials;
  payment?: EdiPayment;
}

export interface EdiPurchaseOrderData extends EdiDocumentCommon, EdiDocumentParties, EdiDocumentLines {
  doc_type: 'PurchaseOrder';
  doc_type_code: null;
  references?: EdiReferences;
  allowances_charges?: EdiAllowanceCharge[];
  financials?: EdiFinancials;
  shipment?: EdiShipment;
  quotation_reference?: string;
}

export interface EdiDespatchAdviceData extends EdiDocumentCommon, EdiDocumentParties, EdiDocumentLines {
  doc_type: 'DespatchAdvice';
  doc_type_code: null;
  references: EdiReferences & { order_reference: string };
  shipment?: EdiShipment;
}

export interface EdiRemittanceAdviceData extends EdiDocumentCommon, EdiDocumentParties {
  doc_type: 'RemittanceAdvice';
  doc_type_code: null;
  allocations: EdiAllocation[];
  payment: EdiPayment;
  financials?: {
    paid_amount: EdiAmount;
    difference_amount?: EdiAmount;
  };
}

export interface EdiQuotationData extends EdiDocumentCommon, EdiDocumentParties, EdiDocumentLines {
  doc_type: 'Quotation';
  doc_type_code: null;
  references?: EdiReferences;
  allowances_charges?: EdiAllowanceCharge[];
  financials?: EdiFinancials;
  valid_from?: string;
  valid_until?: string;
}

export type EdiDocument =
  | EdiInvoiceData
  | EdiCreditNoteData
  | EdiPurchaseOrderData
  | EdiDespatchAdviceData
  | EdiRemittanceAdviceData
  | EdiQuotationData;

/**
 * Constant map of EDI document type codes.
 * Holds UNCL1001 codes for Invoice / CreditNote.
 */
export const DOC_TYPE_CODES: Record<string, EdiDocTypeCode> = {
  Invoice_380: '380',
  Invoice_384: '384',
  Invoice_389: '389',
  CreditNote_381: '381',
} as const;

