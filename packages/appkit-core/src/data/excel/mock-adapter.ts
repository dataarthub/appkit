/**
 * @fileoverview Mock Excel adapter
 *
 * Mock adapter for development, unit testing, and Storybook.
 * Allows safe verification of behavior even in environments without an actual backend or WASM.
 *
 * @module lib/excel/mock-adapter
 */

import type { ExcelAdapter, ExcelGenerateOptions, ExcelWorkbookData } from './types';
import { resolveFilename, triggerBrowserDownload } from './utils';

/**
 * Configuration options for MockExcelAdapter
 */
export interface MockExcelAdapterConfig {
  /** Simulated processing delay in milliseconds (default: 300) */
  delayMs?: number;
  /** Flag to simulate an error */
  shouldFail?: boolean;
  /** Hook invoked when the download function is called */
  onDownload?: (data: ExcelWorkbookData, filename: string) => void;
}

/**
 * Mock Excel adapter
 */
export class MockExcelAdapter implements ExcelAdapter {
  readonly name = 'mock';

  private delayMs: number;
  private shouldFail: boolean;
  private onDownloadHook?: (data: ExcelWorkbookData, filename: string) => void;

  /** Initializes the mock adapter with simulated delay, error simulation, and download notification settings. */
  constructor(config?: MockExcelAdapterConfig) {
    this.delayMs = config?.delayMs ?? 300;
    this.shouldFail = config?.shouldFail ?? false;
    this.onDownloadHook = config?.onDownload;
  }

  /** Returns a test byte array containing a ZIP header and the input JSON. Not a valid XLSX file. */
  async generate(data: ExcelWorkbookData, _options?: ExcelGenerateOptions): Promise<Uint8Array> {
    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }

    if (this.shouldFail) {
      throw new Error('MockExcelAdapter: simulated failure');
    }

    // Return dummy zip/xlsx header bytes (PK header)
    const dummyBytes = new Uint8Array([
      0x50,
      0x4b,
      0x03,
      0x04,
      ...new TextEncoder().encode(JSON.stringify(data)),
    ]);
    return dummyBytes;
  }

  /** Generates mock data, invokes notification hooks, and triggers browser download. */
  async download(
    data: ExcelWorkbookData,
    filename?: string,
    options?: ExcelGenerateOptions,
  ): Promise<void> {
    const bytes = await this.generate(data, options);
    const targetFilename = resolveFilename(
      filename || options?.filename,
      data.metadata?.title,
      'mock_export.xlsx',
    );

    if (this.onDownloadHook) {
      this.onDownloadHook(data, targetFilename);
    }

    triggerBrowserDownload(bytes, targetFilename);
  }
}
