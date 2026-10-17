/**
 * @fileoverview Common type definitions for Excel adapters
 *
 * Defines common interfaces and data structures for Excel (.xlsx) generation and download.
 * Supports tabular, free-layout, and business document layouts.
 *
 * @module lib/excel/types
 */

// =============================================================================
// Cell styles and free-layout cell definitions
// =============================================================================

/**
 * Excel cell data type hint
 */
export type ExcelCellType = 'string' | 'number' | 'boolean' | 'date';

/**
 * Style definition for an Excel cell or column
 */
export interface ExcelCellStyle {
  /** Bold */
  bold?: boolean;
  /** Italic */
  italic?: boolean;
  /** Underline */
  underline?: boolean;
  /** Font size (pt) */
  fontSize?: number;
  /** Font color (e.g., "#1E3A8A") */
  fontColor?: string;
  /** Background color (e.g., "#F1F5F9") */
  backgroundColor?: string;
  /** Horizontal alignment */
  horizontalAlign?: 'left' | 'center' | 'right';
  /** Vertical alignment */
  verticalAlign?: 'top' | 'center' | 'bottom';
  /** Wrap text */
  wrapText?: boolean;
  /** Border style (thin, thick, double, none, all, top, bottom) */
  border?: 'thin' | 'thick' | 'double' | 'none' | 'all' | 'top' | 'bottom';
  /** Border color (e.g., "#CBD5E1") */
  borderColor?: string;
  /** Number or date format string (e.g., "#,##0", "¥#,##0", "yyyy-mm-dd", "0.0%") */
  numberFormat?: string;
}

/**
 * Cell data placed directly at arbitrary coordinates (for free layout)
 */
export interface ExcelCellData {
  /** Cell coordinate (e.g., "A1", "C5") */
  cell: string;
  /** Cell value (string, number, boolean, etc.) */
  value?: unknown;
  /** Formula (e.g., "=SUM(D5:D10)") */
  formula?: string;
  /** Custom cell style */
  style?: ExcelCellStyle;
}

/**
 * Table column definition (for tabular data)
 */
export interface ExcelColumnDefinition {
  /** Header display name */
  header: string;
  /** Key name in row data object */
  key: string;
  /** Column width in characters (adapter default when omitted; Excelize does not auto-fit) */
  width?: number;
  /** Data type hint */
  type?: ExcelCellType;
  /** Custom format string for number/date */
  format?: string;
  /** Custom style for column header */
  style?: ExcelCellStyle;
}

/**
 * Data for a single Excel worksheet
 */
export interface ExcelSheetData {
  /** Sheet name */
  name: string;
  /** Tabular column definitions list (specified when outputting tabular data) */
  columns?: ExcelColumnDefinition[];
  /** Tabular row data list */
  rows?: Record<string, unknown>[];
  /** Directly placed cells list (for free-layout, titles, notes, summary rows) */
  cells?: ExcelCellData[];
  /** Cell merge specifications (e.g., ["A1:D1", "B3:C3"]) */
  merges?: string[];
  /** Width specifications per column (e.g., { A: 12, B: 30 }) */
  colWidths?: Record<string, number>;
  /** Height specifications per row (e.g., { 1: 35, 2: 20 }) */
  rowHeights?: Record<number, number>;
  /** Starting row number for tabular data (default: 1 or following cells) */
  startRow?: number;
  /** Whether to hide grid lines */
  hideGridlines?: boolean;
}

/**
 * Workbook metadata (document properties)
 */
export interface ExcelWorkbookMetadata {
  /** Document title */
  title?: string;
  /** Subject */
  subject?: string;
  /** Creator / Author */
  creator?: string;
  /** Description */
  description?: string;
}

/**
 * Overall data structure for an Excel generation request
 */
export interface ExcelWorkbookData {
  /** Metadata */
  metadata?: ExcelWorkbookMetadata;
  /** Worksheet array */
  sheets: ExcelSheetData[];
}

/**
 * Options for Excel generation and download
 */
export interface ExcelGenerateOptions {
  /** Output format ('xlsx' | 'csv') */
  format?: 'xlsx' | 'csv';
  /** Timeout in milliseconds */
  timeoutMs?: number;
  /** Default filename for download */
  filename?: string;
  /** Additional headers or configuration parameters */
  headers?: Record<string, string>;
}

// =============================================================================
// Common adapter interface
// =============================================================================

/**
 * Common Excel adapter interface
 */
export interface ExcelAdapter {
  /** Adapter identifier name */
  readonly name: string;

  /**
   * Generates Excel or CSV binary data (Uint8Array).
   * @param data Workbook data definition
   * @param options Options
   */
  generate(data: ExcelWorkbookData, options?: ExcelGenerateOptions): Promise<Uint8Array>;

  /**
   * Generates file and triggers direct download in the browser.
   * @param data Workbook data definition
   * @param filename File name to save
   * @param options Options
   */
  download(
    data: ExcelWorkbookData,
    filename?: string,
    options?: ExcelGenerateOptions
  ): Promise<void>;
}
