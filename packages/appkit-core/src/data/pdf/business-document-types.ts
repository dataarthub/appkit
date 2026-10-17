/**
 * Generic record type
 */
export type GenericRecord = Record<string, unknown>;

/**
 * Party information (common for client and supplier)
 */
export interface DocumentPartyInfo {
  companyName: string;
  contactPerson?: string;
  address: string;
  zip?: string;
  tel?: string;
  fax?: string;
  email?: string;
}

/**
 * Generic line item
 */
export interface DocumentLineItem {
  name: string;
  code?: string;
  specification?: string;
  quantity: number;
  unitCode: string;
  unitPrice: number;
  amount: number;
  remarks?: string;
}

/**
 * Bank account information
 */
export interface BankAccountInfo {
  bankName: string;
  branchName: string;
  accountType: string;
  accountNumber: string;
  accountHolder: string;
}

/**
 * Table column definition
 */
export interface DocumentTableColumn {
  key: string;
  header: string;
  width: number | 'auto' | '*';
  alignment?: 'left' | 'center' | 'right';
}

/**
 * Template definition
 */
export interface BusinessDocumentTemplate {
  documentType: 'quote' | 'invoice' | 'creditNote' | 'order' | 'delivery' | 'orderConfirmation';
  title: string;
  leadText: string;
  documentNoLabel: string;
  dateLabel: string;
  dateValueKey: string;
  dueLabel?: string;
  dueValueKey?: string;
  partyRole: 'client' | 'supplier';
  showStaffSeal?: boolean;
  showApproverSeal?: boolean;
  largeTotalLabel?: string;
  summaryFields?: Array<{
    label: string;
    valueKey: string;
    formatterType?: 'date' | 'string' | 'paymentTerms' | 'expirationDate';
  }>;
  useLegacyInvoiceSummaryTable?: boolean;
  tableConfig: {
    columns?: DocumentTableColumn[];
    itemLabel: string;
    includeCodeInItem?: boolean;
    remarksHeader?: string;
    useLegacyInvoiceTableFormat?: boolean;
  };
  bankAccountsKey?: string;
  showPaymentMethod?: boolean;
  footerNote?: string;
  showFooterText?: string;
}

/**
 * Document generation configuration (DI)
 */
export interface BusinessDocumentConfig {
  companyInfo: DocumentPartyInfo & { logo?: string };
  taxRate?: number;
  currencyFormatter?: (amount: number) => string;
  dateFormatter?: (date: string, isKanji?: boolean) => string;
  defaultBankAccounts?: BankAccountInfo[];
  sealGenerator?: (name: string) => string | null;
  styling?: {
    primaryColor?: string;
    pageMargins?: [number, number, number, number];
  };
}

/**
 * Document data (permitting dynamic fields)
 */
export interface EdiStampData {
  label: string;
  name?: string;
}

export interface BusinessDocumentData extends GenericRecord {
  items: DocumentLineItem[];
  client?: DocumentPartyInfo;
  supplier?: DocumentPartyInfo;
  bankAccount?: BankAccountInfo[];
  paymentMethod?: string;
  remarks?: string;
  remark?: string;
  workDetail?: string;
  userName?: string;
  secondarySeal?: string;
  /** Stamp list (name and role). Takes precedence over showStaffSeal/showApproverSeal */
  stamps?: EdiStampData[];
}
