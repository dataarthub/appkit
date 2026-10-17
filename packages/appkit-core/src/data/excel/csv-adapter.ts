/**
 * @fileoverview CSV Excel adapter
 *
 * Implements the `ExcelAdapter` interface to output and download CSV format (.csv)
 * instead of Excel format.
 *
 * @module lib/excel/csv-adapter
 */

import type { ExcelAdapter, ExcelGenerateOptions, ExcelWorkbookData } from './types';
import { triggerBrowserDownload } from './utils';

/**
 * Configuration options for CsvExcelAdapter
 */
export interface CsvExcelAdapterConfig {
  /** Delimiter character (default: ',') */
  delimiter?: string;
  /** Target sheet index (default: 0) */
  sheetIndex?: number;
  /** Whether to include BOM (to prevent character encoding issues in Excel, default: true) */
  includeBom?: boolean;
}

/**
 * Adapter that outputs CSV via the ExcelAdapter interface
 */
export class CsvExcelAdapter implements ExcelAdapter {
  readonly name = 'csv';

  private delimiter: string;
  private sheetIndex: number;
  private includeBom: boolean;

  /** Initializes the Excel CSV adapter with delimiter, target sheet, and BOM settings. */
  constructor(config?: CsvExcelAdapterConfig) {
    this.delimiter = config?.delimiter ?? ',';
    this.sheetIndex = config?.sheetIndex ?? 0;
    this.includeBom = config?.includeBom ?? true;
  }

  /**
   * Generates a Uint8Array of CSV from the specified sheet in the workbook.
   */
  async generate(data: ExcelWorkbookData, _options?: ExcelGenerateOptions): Promise<Uint8Array> {
    if (!data.sheets || data.sheets.length === 0) {
      return new Uint8Array(0);
    }

    const sheet = data.sheets[this.sheetIndex] || data.sheets[0];
    const lines: string[] = [];

    // 1. Columns & Rows format
    if (sheet.columns && sheet.columns.length > 0) {
      const headers = sheet.columns.map((c) => this.escapeCsv(c.header));
      lines.push(headers.join(this.delimiter));

      if (sheet.rows) {
        for (const row of sheet.rows) {
          const rowValues = sheet.columns.map((col) => {
            const val = row[col.key];
            if (val === null || val === undefined) return '';
            return this.escapeCsv(String(val));
          });
          lines.push(rowValues.join(this.delimiter));
        }
      }
    } else if (sheet.cells && sheet.cells.length > 0) {
      // Simple fallback for cells-only layout: dump cells in order
      for (const cell of sheet.cells) {
        if (cell.value !== undefined && cell.value !== null) {
          lines.push(
            `${this.escapeCsv(cell.cell)}${this.delimiter}${this.escapeCsv(String(cell.value))}`,
          );
        }
      }
    }

    const csvText = lines.join('\r\n');
    const encoder = new TextEncoder();
    const encodedBytes = encoder.encode(csvText);

    if (this.includeBom) {
      // UTF-8 BOM: 0xEF, 0xBB, 0xBF
      const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
      const combined = new Uint8Array(bom.length + encodedBytes.length);
      combined.set(bom, 0);
      combined.set(encodedBytes, bom.length);
      return combined;
    }

    return encodedBytes;
  }

  /**
   * Generates CSV and triggers direct download in the browser.
   */
  async download(
    data: ExcelWorkbookData,
    filename?: string,
    options?: ExcelGenerateOptions,
  ): Promise<void> {
    const bytes = await this.generate(data, options);
    const rawName = filename || options?.filename || data.metadata?.title || 'export.csv';
    const targetFilename = rawName.endsWith('.csv')
      ? rawName
      : rawName.replace(/\.xlsx$/, '') + '.csv';

    triggerBrowserDownload(bytes, targetFilename, 'text/csv;charset=utf-8;');
  }

  private escapeCsv(value: string): string {
    if (
      value.includes(this.delimiter) ||
      value.includes('"') ||
      value.includes('\n') ||
      value.includes('\r')
    ) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
