export const UBL_NAMESPACES = {
  CBC: 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
  CAC: 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
  INVOICE: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
  CREDIT_NOTE: 'urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2',
  ORDER: 'urn:oasis:names:specification:ubl:schema:xsd:Order-2',
  DESPATCH_ADVICE: 'urn:oasis:names:specification:ubl:schema:xsd:DespatchAdvice-2',
  XSI: 'http://www.w3.org/2001/XMLSchema-instance',
} as const;

export type UblDocumentType =
  | 'Invoice'
  | 'CreditNote'
  | 'Order'
  | 'DespatchAdvice';

/** Map EDI doc_type to UBL document type. */
export function ublDocTypeFor(docType: string): UblDocumentType {
  switch (docType) {
    case 'Invoice': return 'Invoice';
    case 'CreditNote': return 'CreditNote';
    case 'PurchaseOrder': return 'Order';
    case 'DespatchAdvice': return 'DespatchAdvice';
    default: throw new Error(`No UBL mapping for doc_type: ${docType}`);
  }
}

/** Get UBL namespace URI for the given document type. */
export function ublNamespaceFor(docType: UblDocumentType): string {
  switch (docType) {
    case 'Invoice': return UBL_NAMESPACES.INVOICE;
    case 'CreditNote': return UBL_NAMESPACES.CREDIT_NOTE;
    case 'Order': return UBL_NAMESPACES.ORDER;
    case 'DespatchAdvice': return UBL_NAMESPACES.DESPATCH_ADVICE;
  }
}
