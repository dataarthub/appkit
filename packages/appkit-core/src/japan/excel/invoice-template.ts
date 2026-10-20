/**
 * @fileoverview Business document (invoice / quotation) Excel template builder.
 *
 * Helper to build elegant invoice and quotation Excel workbooks using the
 * custom layout API (direct cell placement, cell merging, and granular styling).
 *
 * @module lib/excel/invoice-template
 */

import type { ExcelCellData, ExcelCellStyle, ExcelWorkbookData } from "../../data/excel";

/**
 * Line item for invoices and quotations.
 *
 * @see {@link createInvoiceExcelWorkbook} for a complete invoice workbook model example.
 */
export interface InvoiceExcelLineItem {

  /** Item name / description */
  name: string;

  /** Specification / details / description */
  specification?: string;

  /** Number of units multiplied by unitPrice when amount is absent. */
  quantity: number;

  /** Unit (e.g., "式", "個", "人月") */
  unit?: string;

  /** Unit price (JPY) */
  unitPrice: number;

  /** Amount (JPY) (defaults to quantity * unitPrice when omitted) */
  amount?: number;

  /** Optional per-line explanatory text placed in the remarks column. */
  remarks?: string;
}

/**
 * Parameters for generating invoice/quotation Excel workbooks.
 *
 * @see {@link createInvoiceExcelWorkbook} for input and renderer-neutral workbook setup.
 */
export interface InvoiceExcelParams {

  /** Document title (e.g., "御 請 求 書", "御 見 積 書") */
  title?: string;

  /** Document number (e.g., "INV-2026-0042") */
  documentNo: string;

  /** Issue date (e.g., "2026年3月31日") */
  issueDate: string;

  /** Payment due date / expiration date (e.g., "2026年4月30日") */
  dueDate?: string;


  /** Recipient (client information) */
  client: {

    /** Company name displayed in this party block. */
    companyName: string;

    /** Optional recipient department text. */
    department?: string;

    /** Optional recipient contact name. */
    contactPerson?: string;

    /** Optional recipient honorific; omitted uses the standard Japanese organization honorific. */
    honorific?: string; // e.g. "御中", "様" (default: "御中")
  };


  /** Issuer (own company information) */
  issuer: {

    /** Company name displayed in this party block. */
    companyName: string;

    /** Optional issuer postal-code text. */
    postalCode?: string;

    /** Optional issuer address text. */
    address?: string;

    /** Optional issuer telephone contact text. */
    tel?: string;

    /** Optional issuer email contact text. */
    email?: string;

    /** Optional registration identifier printed verbatim; no registry lookup is performed. */
    registrationNumber?: string; // Qualified invoice issuer registration number (Invoice No. T...)

    /** Optional issuer representative display name. */
    representative?: string;
  };


  /** Line item list */
  items: InvoiceExcelLineItem[];


  /** Tax rate (default: 0.10) */
  taxRate?: number;


  /** Destination bank account information for payment transfers */
  bankInfo?: {

    /** Destination bank display name. */
    bankName: string;

    /** Destination bank branch display name. */
    branchName: string;

    /** Optional account-kind label; omitted uses the Japanese ordinary-deposit label. */
    accountType?: string; // e.g. "普通"

    /** Destination account number printed as text. */
    accountNumber: string;

    /** Destination account holder display name. */
    accountHolder: string;
  };


  /** Remarks / notes */
  notes?: string[];
}

/**
 * Builds an ExcelWorkbookData with custom layout from invoice/quotation parameters.
 *
 * @param params Invoice and quotation parameters
 * @returns ExcelWorkbookData containing full custom-placed cells, merges, and styles
 *
 * @example
 * ```typescript
 * import { createInvoiceExcelWorkbook } from '@alneas/appkit-core/japan/excel/invoice-template';
 *
 * const workbook = createInvoiceExcelWorkbook({
 *   documentNo: 'INV-001', issueDate: '2026-10-20',
 *   client: { companyName: 'Example Client' }, issuer: { companyName: 'Example Studio' },
 *   items: [{ name: 'Design', quantity: 2, unitPrice: 1000 }],
 * });
 * console.log(workbook); // Data model; the host chooses an XLSX exporter.
 * ```
 */
export function createInvoiceExcelWorkbook(params: InvoiceExcelParams): ExcelWorkbookData {
  const title = params.title || '御 請 求 書';
  const taxRate = params.taxRate ?? 0.1;
  const honorific = params.client.honorific ?? '御中';

  const cells: ExcelCellData[] = [];
  const merges: string[] = [];

  // Style definitions
  const titleStyle: ExcelCellStyle = {
    bold: true,
    fontSize: 18,
    fontColor: '#1E3A8A',
    horizontalAlign: 'center',
    verticalAlign: 'center',
  };

  const itemHeaderStyle: ExcelCellStyle = {
    bold: true,
    fontSize: 10,
    fontColor: '#FFFFFF',
    backgroundColor: '#1E3A8A',
    horizontalAlign: 'center',
    verticalAlign: 'center',
    border: 'all',
  };

  const clientNameStyle: ExcelCellStyle = {
    bold: true,
    fontSize: 13,
    border: 'bottom',
    borderColor: '#1E3A8A',
  };

  const totalCardLabelStyle: ExcelCellStyle = {
    bold: true,
    fontSize: 11,
    backgroundColor: '#F1F5F9',
    horizontalAlign: 'center',
    verticalAlign: 'center',
    border: 'all',
    borderColor: '#CBD5E1',
  };

  const totalCardAmountStyle: ExcelCellStyle = {
    bold: true,
    fontSize: 14,
    fontColor: '#1E3A8A',
    horizontalAlign: 'right',
    verticalAlign: 'center',
    border: 'all',
    borderColor: '#CBD5E1',
    numberFormat: '¥#,##0',
  };

  const tableDataLeft: ExcelCellStyle = {
    fontSize: 10,
    border: 'all',
    borderColor: '#E2E8F0',
    verticalAlign: 'center',
  };

  const tableDataCenter: ExcelCellStyle = {
    fontSize: 10,
    horizontalAlign: 'center',
    verticalAlign: 'center',
    border: 'all',
    borderColor: '#E2E8F0',
  };

  const tableDataCurrency: ExcelCellStyle = {
    fontSize: 10,
    horizontalAlign: 'right',
    verticalAlign: 'center',
    border: 'all',
    borderColor: '#E2E8F0',
    numberFormat: '#,##0',
  };

  const summaryLabelStyle: ExcelCellStyle = {
    bold: true,
    fontSize: 10,
    backgroundColor: '#F8FAFC',
    horizontalAlign: 'right',
    verticalAlign: 'center',
    border: 'all',
    borderColor: '#CBD5E1',
  };

  const summaryValueStyle: ExcelCellStyle = {
    bold: true,
    fontSize: 10,
    horizontalAlign: 'right',
    verticalAlign: 'center',
    border: 'all',
    borderColor: '#CBD5E1',
    numberFormat: '¥#,##0',
  };

  // 1. Title (Row 1)
  merges.push('A1:F1');
  cells.push({ cell: 'A1', value: title, style: titleStyle });

  // 2. Client info (Left: Rows 3-6)
  const clientText = `${params.client.companyName} ${honorific}`;
  merges.push('A3:C3');
  cells.push({ cell: 'A3', value: clientText, style: clientNameStyle });

  if (params.client.department || params.client.contactPerson) {
    const contactText = [params.client.department, params.client.contactPerson]
      .filter(Boolean)
      .join(' ');
    merges.push('A4:C4');
    cells.push({ cell: 'A4', value: `${contactText} 様` });
  }

  // 3. Document info and issuer info (Right: Rows 3-7)
  cells.push({ cell: 'E3', value: '請求番号:' }, { cell: 'F3', value: params.documentNo });
  cells.push({ cell: 'E4', value: '発行日:' }, { cell: 'F4', value: params.issueDate });
  if (params.dueDate) {
    cells.push({ cell: 'E5', value: 'お支払期日:' }, { cell: 'F5', value: params.dueDate });
  }

  cells.push({ cell: 'E6', value: params.issuer.companyName, style: { bold: true } });
  if (params.issuer.registrationNumber) {
    cells.push({ cell: 'E7', value: `登録番号: ${params.issuer.registrationNumber}`, style: { fontSize: 9 } });
  }

  // 4. Billing amount summary (Row 8-9)
  merges.push('A9:B9');
  merges.push('C9:D9');
  cells.push({ cell: 'A9', value: 'ご請求金額 (税込)', style: totalCardLabelStyle });

  // Calculation of starting line item row
  const itemsStartRow = 13;
  const itemCount = params.items.length;
  const itemsEndRow = itemsStartRow + Math.max(itemCount - 1, 0);

  // Totals using formulas
  const subtotalFormula = `=SUM(E${itemsStartRow}:E${itemsEndRow})`;
  const taxFormula = `=ROUNDDOWN(E${itemsEndRow + 1}*${taxRate},0)`;
  const grandTotalFormula = `=E${itemsEndRow + 1}+E${itemsEndRow + 2}`;

  // Reference to total in summary card
  cells.push({ cell: 'C9', formula: `=E${itemsEndRow + 3}`, style: totalCardAmountStyle });

  // 5. Line item table header (Row 12)
  cells.push(
    { cell: 'A12', value: 'No.', style: itemHeaderStyle },
    { cell: 'B12', value: '品名・項目', style: itemHeaderStyle },
    { cell: 'C12', value: '数量', style: itemHeaderStyle },
    { cell: 'D12', value: '単価 (円)', style: itemHeaderStyle },
    { cell: 'E12', value: '金額 (円)', style: itemHeaderStyle },
    { cell: 'F12', value: '備考', style: itemHeaderStyle }
  );

  // 6. Line item rows (Row 13+)
  params.items.forEach((item, idx) => {
    const row = itemsStartRow + idx;
    const amountVal = item.amount ?? item.quantity * item.unitPrice;

    cells.push(
      { cell: `A${row}`, value: idx + 1, style: tableDataCenter },
      { cell: `B${row}`, value: item.name, style: tableDataLeft },
      { cell: `C${row}`, value: `${item.quantity} ${item.unit || ''}`.trim(), style: tableDataCenter },
      { cell: `D${row}`, value: item.unitPrice, style: tableDataCurrency },
      { cell: `E${row}`, value: amountVal, style: tableDataCurrency },
      { cell: `F${row}`, value: item.remarks || '', style: tableDataLeft }
    );
  });

  // 7. Summary rows (subtotal, consumption tax, grand total)
  const subtotalRow = itemsEndRow + 1;
  const taxRow = itemsEndRow + 2;
  const totalRow = itemsEndRow + 3;

  // Subtotal
  cells.push(
    { cell: `D${subtotalRow}`, value: '小計', style: summaryLabelStyle },
    { cell: `E${subtotalRow}`, formula: subtotalFormula, style: summaryValueStyle }
  );

  // Consumption tax
  cells.push(
    { cell: `D${taxRow}`, value: `消費税 (${taxRate * 100}%)`, style: summaryLabelStyle },
    { cell: `E${taxRow}`, formula: taxFormula, style: summaryValueStyle }
  );

  // Grand total
  cells.push(
    { cell: `D${totalRow}`, value: '合計金額', style: summaryLabelStyle },
    { cell: `E${totalRow}`, formula: grandTotalFormula, style: summaryValueStyle }
  );

  // 8. Bank account & remarks (below item table)
  let footerRow = totalRow + 2;

  if (params.bankInfo) {
    merges.push(`A${footerRow}:B${footerRow}`);
    cells.push({ cell: `A${footerRow}`, value: '【お振込先】', style: { bold: true } });
    footerRow++;

    const bankText = `${params.bankInfo.bankName} ${params.bankInfo.branchName} ${params.bankInfo.accountType || '普通'} ${params.bankInfo.accountNumber}`;
    merges.push(`A${footerRow}:E${footerRow}`);
    cells.push({ cell: `A${footerRow}`, value: `口座: ${bankText}  口座名義: ${params.bankInfo.accountHolder}` });
    footerRow += 2;
  }

  if (params.notes && params.notes.length > 0) {
    merges.push(`A${footerRow}:B${footerRow}`);
    cells.push({ cell: `A${footerRow}`, value: '【備考】', style: { bold: true } });
    footerRow++;

    params.notes.forEach((note) => {
      merges.push(`A${footerRow}:F${footerRow}`);
      cells.push({ cell: `A${footerRow}`, value: note });
      footerRow++;
    });
  }

  return {
    metadata: {
      title: `${title.replace(/\s+/g, '')}_${params.documentNo}`,
      creator: params.issuer.companyName,
    },
    sheets: [
      {
        name: '請求書',
        hideGridlines: false,
        colWidths: {
          A: 8,
          B: 32,
          C: 12,
          D: 16,
          E: 18,
          F: 20,
        },
        rowHeights: {
          1: 36,
          9: 28,
          12: 24,
        },
        merges,
        cells,
      },
    ],
  };
}
