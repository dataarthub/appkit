import type { EdiDocument } from '../types';
import { mapToUbl, type UblFieldMap, type UblPartyMap, type UblLineMap } from './mapping';
import { UBL_NAMESPACES, ublDocTypeFor, ublNamespaceFor, type UblDocumentType } from './types';

function escape(value: string): string {
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f\ufffe\uffff]/u.test(value)) throw new Error('Invalid XML character');
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
/** Only internal, already escaped XML fragments may be passed as inner. */
function element(name: string, inner: string, attrs: Record<string, string> = {}): string {
  return `<${name}${Object.entries(attrs).map(([key, value]) => ` ${key}="${escape(value)}"`).join('')}>${inner}</${name}>`;
}
function text(name: string, value: string | number | boolean | undefined, attrs: Record<string, string> = {}): string {
  if (value === undefined || value === '') return '';
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('UBL numbers must be finite');
  return element(name, escape(String(value)), attrs);
}
function decimal(value: number): string {
  if (!Number.isFinite(value)) throw new Error('UBL amounts must be finite');
  return value.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 20 });
}
function amount(name: string, value: number, currency: string): string { return text(`cbc:${name}`, decimal(value), { currencyID: currency }); }
function party(p: UblPartyMap, role: string): string {
  const address = p.addressCountry ? element('cac:PostalAddress',
    text('cbc:StreetName', p.addressStreet) + text('cbc:CityName', p.addressCity) + text('cbc:PostalZone', p.addressPostalZone) + text('cbc:CountrySubentity', p.addressSubdivision) + element('cac:Country', text('cbc:IdentificationCode', p.addressCountry))) : '';
  const body = text('cbc:EndpointID', p.endpointId, p.endpointScheme ? { schemeID: p.endpointScheme } : {}) +
    (p.id ? element('cac:PartyIdentification', text('cbc:ID', p.id, p.idScheme ? { schemeID: p.idScheme } : {})) : '') +
    element('cac:PartyName', text('cbc:Name', p.name)) + address +
    (p.taxId ? element('cac:PartyTaxScheme', text('cbc:CompanyID', p.taxId) + element('cac:TaxScheme', text('cbc:ID', 'VAT'))) : '') +
    (p.legalRegistrationId ? element('cac:PartyLegalEntity', text('cbc:RegistrationName', p.name) + text('cbc:CompanyID', p.legalRegistrationId, p.legalRegistrationScheme ? { schemeID: p.legalRegistrationScheme } : {})) : '');
  return element(`cac:${role}`, element('cac:Party', body));
}
function item(line: UblLineMap): string {
  return element('cac:Item', text('cbc:Description', line.description) +
    (line.productCode ? element('cac:SellersItemIdentification', text('cbc:ID', line.productCode)) : '') +
    (line.taxCategoryId ? element('cac:ClassifiedTaxCategory', text('cbc:ID', line.taxCategoryId) + text('cbc:Percent', line.taxPercent) + element('cac:TaxScheme', text('cbc:ID', line.taxScheme ?? 'VAT'))) : ''));
}
function lineXml(line: UblLineMap, type: UblDocumentType, currency: string): string {
  const id = text('cbc:ID', line.id), reference = line.poLineRef ? element('cac:OrderLineReference', text('cbc:LineID', line.poLineRef)) : '';
  const price = element('cac:Price', amount('PriceAmount', line.unitPrice, currency));
  const quantity = (name: string) => text(`cbc:${name}`, decimal(line.quantity), { unitCode: line.unitCode });
  if (type === 'Order') return element('cac:OrderLine', element('cac:LineItem', id + quantity('Quantity') + amount('LineExtensionAmount', line.netAmount, currency) + price + item(line)));
  if (type === 'DespatchAdvice') {
    if (!line.poLineRef) throw new Error('DespatchAdvice requires poLineRef on every line');
    return element('cac:DespatchLine', id + quantity('DeliveredQuantity') + reference + item(line));
  }
  return element(type === 'CreditNote' ? 'cac:CreditNoteLine' : 'cac:InvoiceLine', id + quantity(type === 'CreditNote' ? 'CreditedQuantity' : 'InvoicedQuantity') + amount('LineExtensionAmount', line.netAmount, currency) + reference + item(line) + price);
}
function totals(m: UblFieldMap, type: UblDocumentType): string {
  const currency = m.currency;
  const tax = element('cac:TaxTotal', amount('TaxAmount', m.taxTotalAmount, currency) + m.taxSubtotals.map(st => element('cac:TaxSubtotal',
    amount('TaxableAmount', st.taxableAmount, currency) + amount('TaxAmount', st.taxAmount, currency) + element('cac:TaxCategory', text('cbc:ID', st.taxCategoryId) + text('cbc:Percent', st.taxPercent) + element('cac:TaxScheme', text('cbc:ID', st.taxScheme))))).join(''));
  const allowances = m.allowancesCharges.filter(a => !a.indicator).reduce((sum, a) => sum + a.amount, 0);
  const charges = m.allowancesCharges.filter(a => a.indicator).reduce((sum, a) => sum + a.amount, 0);
  const monetary = amount('LineExtensionAmount', m.lines.reduce((sum, l) => sum + l.netAmount, 0), currency) +
    amount('TaxExclusiveAmount', m.taxInclusiveAmount - m.taxTotalAmount, currency) + amount('TaxInclusiveAmount', m.taxInclusiveAmount, currency) +
    (allowances ? amount('AllowanceTotalAmount', allowances, currency) : '') + (charges ? amount('ChargeTotalAmount', charges, currency) : '') +
    (m.prepaidAmount !== undefined ? amount('PrepaidAmount', m.prepaidAmount, currency) : '') + amount('PayableAmount', m.payableAmount, currency);
  return tax + element(type === 'Order' ? 'cac:AnticipatedMonetaryTotal' : 'cac:LegalMonetaryTotal', monetary);
}

/**
 * Serializes the represented UBL 2.1 Invoice, CreditNote, Order and DespatchAdvice fields.
 * All text/attributes are escaped. Despatch lines require explicit poLineRef.
 * Amount currencies must agree with the document. This is not JP PINT certification
 * or a complete mapping of every optional UBL field. Validate the target profile separately.
 */
export function toUblXml(doc: EdiDocument): string {
  const type = ublDocTypeFor(doc.doc_type), m = mapToUbl(doc);
  if (!m.id || !m.issueDate || m.lines.length === 0) throw new Error('UBL requires an ID, issue date and at least one line');
  if ('financials' in doc && doc.financials && 'tax_total' in doc.financials) {
    const f = doc.financials;
    const amounts = [f.tax_total.tax_amount, f.tax_inclusive_amount, f.payable_amount, f.prepaid_amount, ...f.tax_total.tax_subtotals.flatMap(st => [st.tax_amount, st.taxable_amount])];
    if (amounts.some(a => a && (a.currency !== doc.currency || !Number.isFinite(a.value)))) throw new Error('UBL requires finite amounts in the document currency');
  }
  if (m.allowancesCharges.some(a => a.currency !== m.currency)) throw new Error('UBL allowance currency mismatch');
  let body = text('cbc:UBLVersionID', '2.1') + text('cbc:CustomizationID', doc.customization_id) + text('cbc:ProfileID', doc.profile_id) + text('cbc:ID', m.id) + text('cbc:IssueDate', m.issueDate);
  if (type === 'CreditNote') body += text('cbc:TaxPointDate', m.taxPointDate);
  if (type === 'Invoice' || type === 'CreditNote') body += text(type === 'CreditNote' ? 'cbc:CreditNoteTypeCode' : 'cbc:InvoiceTypeCode', doc.doc_type_code ?? undefined);
  body += text('cbc:Note', m.note);
  if (type === 'Invoice') body += text('cbc:TaxPointDate', m.taxPointDate);
  if (type !== 'DespatchAdvice') body += text('cbc:DocumentCurrencyCode', m.currency);
  if ((type === 'Invoice' || type === 'CreditNote') && doc.buyer_reference) body += text('cbc:BuyerReference', doc.buyer_reference);
  if (type !== 'Order' && m.orderReference) body += element('cac:OrderReference', text('cbc:ID', m.orderReference));
  if ((type === 'Invoice' || type === 'CreditNote') && m.billingReferenceId) body += element('cac:BillingReference', element('cac:InvoiceDocumentReference', text('cbc:ID', m.billingReferenceId) + text('cbc:IssueDate', m.billingReferenceDate)));
  if ((type === 'Invoice' || type === 'CreditNote') && m.despatchDocumentReference) body += element('cac:DespatchDocumentReference', text('cbc:ID', m.despatchDocumentReference));
  body += type === 'Order' ? party(m.buyer, 'BuyerCustomerParty') + party(m.supplier, 'SellerSupplierParty') : type === 'DespatchAdvice' ? party(m.supplier, 'DespatchSupplierParty') + party(m.buyer, 'DeliveryCustomerParty') : party(m.supplier, 'AccountingSupplierParty') + party(m.buyer, 'AccountingCustomerParty');
  if (type !== 'DespatchAdvice') {
    if (m.paymentMeansCode) body += element('cac:PaymentMeans', text('cbc:PaymentMeansCode', m.paymentMeansCode) + text('cbc:PaymentID', m.paymentId));
    body += m.allowancesCharges.map(a => element('cac:AllowanceCharge', text('cbc:ChargeIndicator', a.indicator) + text('cbc:AllowanceChargeReasonCode', a.reasonCode) + text('cbc:AllowanceChargeReason', a.reason) + amount('Amount', a.amount, m.currency))).join('');
    if ('financials' in doc && doc.financials) body += totals(m, type);
  }
  body += m.lines.map(l => lineXml(l, type, m.currency)).join('');
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + element(type, body, { xmlns: ublNamespaceFor(type), 'xmlns:cbc': UBL_NAMESPACES.CBC, 'xmlns:cac': UBL_NAMESPACES.CAC });
}
