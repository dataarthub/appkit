import type { EdiQuotationData } from './types';
import type { QuoteData } from "../../data/edi";

/**
 * Converts an EDI quotation into renderer-agnostic compatible data. Use EdiPdfService for PDF generation.
 * @param doc - Source EDI quotation document
 * @returns QuoteData in existing format (rendering logic not included)
 */
export function ediQuotationToQuoteData(doc: EdiQuotationData): QuoteData {
  return {
    quoteNumber: doc.id,
    quoteDate: doc.issue_date,
    quoteExpiryMonths: 1,
    subject: doc.note ?? '',
    place: '',
    constructionPeriod: '',
    paymentTerms: '',
    workDetail: '',
    client: {
      name: doc.buyer.name,
    },
    issuer: {
      companyName: doc.supplier.name,
      address: doc.supplier.address
        ? [doc.supplier.address.postal_zone, doc.supplier.address.city, doc.supplier.address.street_name]
            .filter(Boolean)
            .join(' ')
        : '',
      tel: '',
    },
    items: doc.lines.map((line) => ({
      description: line.description,
      unitPrice: line.unit_price,
      quantity: line.quantity,
      unit: line.unit_code,
    })),
  };
}
