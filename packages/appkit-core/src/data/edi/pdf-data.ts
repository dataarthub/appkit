/** Renderer-independent legacy EDI conversion result. Use EdiPdfService for PDF output. */
export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  seller: { name: string; address: string; email: string };
  buyer: { name: string; address: string; email: string };
  items: { description: string; quantity: number; price: number }[];
}

/** Renderer-independent legacy EDI quotation result. Not QuotePdfDocument props. */
export interface QuoteData {
  quoteNumber: string;
  quoteDate: string;
  quoteExpiryMonths: number;
  subject: string;
  place: string;
  constructionPeriod: string;
  paymentTerms: string;
  workDetail: string;
  remark?: string;
  client: { name: string; honorific?: string };
  issuer: {
    companyName: string;
    address: string;
    tel: string;
    fax?: string;
    representative?: string;
    department?: string;
    inChargeName?: string;
    inChargeTel?: string;
  };
  items: QuoteItem[];
  adjustments?: { title: string; amount: number }[];
  taxRate?: number;
}

export interface QuoteItem {
  description: string;
  unitPrice: number;
  quantity: number;
  unit: string;
}
