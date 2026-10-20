import type { EdiDocument, EdiLine, EdiParty, EdiAmount, EdiPayment } from './types';
import type { BusinessDocumentData, DocumentLineItem, DocumentPartyInfo, BankAccountInfo } from "../../data/pdf";

function partyToDocumentPartyInfo(party: EdiParty): DocumentPartyInfo {
  return {
    companyName: party.name,
    address: party.address
      ? [party.address.postal_zone, party.address.city, party.address.street_name]
          .filter(Boolean)
          .join(' ')
      : '',
    tel: undefined,
    fax: undefined,
    email: undefined,
  };
}

function lineToDocumentLineItem(line: EdiLine): DocumentLineItem {
  return {
    name: line.description,
    code: line.product_code,
    specification: line.po_line_ref ? `PO:${line.po_line_ref}` : undefined,
    quantity: line.quantity,
    unitCode: line.unit_code,
    unitPrice: line.unit_price,
    amount: line.net_amount,
    remarks: undefined,
  };
}

function buildBankAccounts(payment: EdiPayment | undefined): BankAccountInfo[] | undefined {
  if (!payment?.bank_accounts) return undefined;
  return payment.bank_accounts.map((ba) => ({
    bankName: ba.bank_name,
    branchName: ba.branch_name,
    accountType: ba.account_type,
    accountNumber: ba.account_number,
    accountHolder: ba.account_holder,
  }));
}

function formatAmount(a: EdiAmount | undefined, formatter: (n: number) => string): string {
  if (!a) return '';
  return formatter(a.value);
}

/**
 * Converts an EDI document into BusinessDocumentData (for pdfmake).
 * Maps JP PINT fields (tax breakdown by rate, Peppol ID, stamp seal, etc.) into a generic data structure.
 * @param doc - Source EDI document
 * @param currencyFormatter - Currency formatter (default: ¥ notation)
 * @returns BusinessDocumentData (pdfmake compatible)
 *
 * @example
 * ```typescript
 * import { ediToBusinessDocumentData } from '@alneas/appkit-core/japan/edi/to-business-document';
 *
 * export function convert(doc: Parameters<typeof ediToBusinessDocumentData>[0]) {
 *   return ediToBusinessDocumentData(doc);
 * }
 * ```
 * @throws Propagates currencyFormatter callback errors.
 * @remarks The synchronous currencyFormatter callback receives each monetary number selected for display and must return text; no PDF binary is generated.
 */
export function ediToBusinessDocumentData(
  doc: EdiDocument,
  currencyFormatter: (amount: number) => string = (n) => `¥${n.toLocaleString()}`,
): BusinessDocumentData & { [key: string]: unknown } {
  const base: BusinessDocumentData & { [key: string]: unknown } = {
    items: [],
  };

  base.supplier = partyToDocumentPartyInfo(doc.supplier);
  base.buyer = partyToDocumentPartyInfo(doc.buyer);

  if ('lines' in doc) {
    base.items = doc.lines.map(lineToDocumentLineItem);
  }

  base.id = doc.id;
  base.issueDate = doc.issue_date;
  base.note = doc.note;

  switch (doc.doc_type) {
    case 'Invoice': {
      const inv = doc;
      base.documentType = 'invoice';
      base.doc_type_code = inv.doc_type_code;
      base.invoiceDate = inv.issue_date;

      if (inv.financials) {
        base.taxInclusiveAmount = formatAmount(inv.financials.tax_inclusive_amount, currencyFormatter);
        base.payableAmount = formatAmount(inv.financials.payable_amount, currencyFormatter);
        base.taxAmount = formatAmount(inv.financials.tax_total.tax_amount, currencyFormatter);
        base.taxSubtotals = inv.financials.tax_total.tax_subtotals.map((ts) => ({
          rate: ts.tax_category.percent,
          taxable: ts.taxable_amount.value,
          amount: ts.tax_amount.value,
          category: ts.tax_category.id,
        }));
      }

      if (inv.references?.order_reference) {
        base.orderReference = inv.references.order_reference;
      }
      if (inv.payment?.due_date) {
        base.dueDate = inv.payment.due_date;
      } else if ('payment_terms' in inv && typeof inv.payment_terms === 'string') {
        base.dueDate = inv.payment_terms;
      }
      base.bankAccount = buildBankAccounts(inv.payment);
      base.paymentMethod = inv.payment?.means_code;

      base.peppolSupplierId = inv.supplier.id
        ? { scheme: inv.supplier.id.scheme, value: inv.supplier.id.value }
        : undefined;
      base.peppolBuyerId = inv.buyer.id
        ? { scheme: inv.buyer.id.scheme, value: inv.buyer.id.value }
        : undefined;
      base.qualifiedInvoiceNumber = inv.supplier.tax_id?.value;

      break;
    }

    case 'CreditNote': {
      const cn = doc;
      base.documentType = 'creditNote';
      base.doc_type_code = cn.doc_type_code;
      base.invoiceDate = cn.issue_date;

      if (cn.financials) {
        base.taxInclusiveAmount = formatAmount(cn.financials.tax_inclusive_amount, currencyFormatter);
        base.payableAmount = formatAmount(cn.financials.payable_amount, currencyFormatter);
        base.taxAmount = formatAmount(cn.financials.tax_total.tax_amount, currencyFormatter);
      }

      if (cn.references.billing_reference) {
        base.billingReference = {
          id: cn.references.billing_reference.id,
          date: cn.references.billing_reference.date,
        };
      }
      base.peppolSupplierId = cn.supplier.id
        ? { scheme: cn.supplier.id.scheme, value: cn.supplier.id.value }
        : undefined;

      break;
    }

    case 'PurchaseOrder': {
      const po = doc;
      base.documentType = 'order';
      base.issueDate = po.issue_date;
      if (po.shipment?.packages) {
        base.deliveryDate = undefined;
      }
      base.orderReference = po.id;
      break;
    }

    case 'Quotation': {
      const qt = doc;
      base.documentType = 'quote';
      base.quoteDate = qt.issue_date;
      base.validFrom = qt.valid_from;
      base.validUntil = qt.valid_until;
      if (qt.financials) {
        base.payableAmount = formatAmount(qt.financials.payable_amount, currencyFormatter);
        base.taxInclusiveAmount = formatAmount(qt.financials.tax_inclusive_amount, currencyFormatter);
      }
      break;
    }

    case 'DespatchAdvice': {
      const da = doc;
      base.documentType = 'delivery';
      base.deliveryDate = da.issue_date;
      if (da.references) {
        base.orderReference = da.references.order_reference;
      }
      break;
    }
  }

  if (doc.stamps && doc.stamps.length > 0) {
    base.stamps = doc.stamps.map((s) => ({ label: s.label, name: s.name }));
  }

  return base;
}
