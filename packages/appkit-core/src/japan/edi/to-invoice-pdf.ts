import type { EdiInvoiceData, EdiCreditNoteData, EdiLine } from './types';
import type { InvoiceData } from "../../data/edi";

/**
 * @internal
 */
function lineToInvoiceItem(line: EdiLine): { description: string; quantity: number; price: number } {
  return {
    description: [line.product_code, line.description].filter(Boolean).join(' - '),
    quantity: line.quantity,
    price: line.unit_price,
  };
}

/**
 * Converts an EDI invoice into renderer-agnostic compatible data. Use EdiPdfService for PDF generation.
 * @param doc - Source EDI invoice document
 * @returns InvoiceData in existing format (rendering logic not included)
 *
 * @example
 * ```typescript
 * import { ediInvoiceToInvoiceData } from '@alneas/appkit-core/japan/edi';
 *
 * export function convert(doc: Parameters<typeof ediInvoiceToInvoiceData>[0]) {
 *   return ediInvoiceToInvoiceData(doc);
 * }
 * ```
 */
export function ediInvoiceToInvoiceData(doc: EdiInvoiceData): InvoiceData {
  return {
    invoiceNumber: doc.id,
    date: doc.issue_date,
    dueDate: doc.payment?.due_date ?? '',
    seller: {
      name: doc.supplier.name,
      address: doc.supplier.address
        ? [doc.supplier.address.postal_zone, doc.supplier.address.city, doc.supplier.address.street_name]
            .filter(Boolean)
            .join(' ')
        : '',
      email: '',
    },
    buyer: {
      name: doc.buyer.name,
      address: doc.buyer.address
        ? [doc.buyer.address.postal_zone, doc.buyer.address.city, doc.buyer.address.street_name]
            .filter(Boolean)
            .join(' ')
        : '',
      email: '',
    },
    items: doc.lines.map(lineToInvoiceItem),
  };
}

/**
 * Converts an EDI credit note into renderer-agnostic compatible data.
 * @param doc - Source EDI credit note document
 * @returns InvoiceData in existing format (rendering logic not included)
 *
 * @example
 * ```typescript
 * import { ediCreditNoteToInvoiceData } from '@alneas/appkit-core/japan/edi';
 *
 * export function convert(doc: Parameters<typeof ediCreditNoteToInvoiceData>[0]) {
 *   return ediCreditNoteToInvoiceData(doc);
 * }
 * ```
 */
export function ediCreditNoteToInvoiceData(doc: EdiCreditNoteData): InvoiceData {
  return {
    invoiceNumber: doc.id,
    date: doc.issue_date,
    dueDate: '',
    seller: {
      name: doc.supplier.name,
      address: doc.supplier.address
        ? [doc.supplier.address.postal_zone, doc.supplier.address.city, doc.supplier.address.street_name]
            .filter(Boolean)
            .join(' ')
        : '',
      email: '',
    },
    buyer: {
      name: doc.buyer.name,
      address: doc.buyer.address
        ? [doc.buyer.address.postal_zone, doc.buyer.address.city, doc.buyer.address.street_name]
            .filter(Boolean)
            .join(' ')
        : '',
      email: '',
    },
    items: doc.lines.map(lineToInvoiceItem),
  };
}
