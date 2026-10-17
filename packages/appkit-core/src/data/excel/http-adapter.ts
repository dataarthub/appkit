/**
 * @fileoverview HTTP server Excel adapter
 *
 * Calls a Go server (or any compatible HTTP API) to generate and download Excel (.xlsx) files.
 *
 * @module lib/excel/http-adapter
 */

import type { ExcelAdapter, ExcelGenerateOptions, ExcelWorkbookData } from './types';
import { resolveFilename, triggerBrowserDownload } from './utils';

/**
 * Configuration options for HttpServerExcelAdapter
 */
export interface HttpServerExcelAdapterConfig {
  /** API endpoint URL (e.g., "http://localhost:8080/api/export-excel") */
  endpointUrl: string;
  /** Default request headers (e.g., authentication tokens) */
  headers?: Record<string, string>;
  /** Custom fetch function (for testing or SSR) */
  customFetch?: typeof fetch;
}

/**
 * Adapter that generates Excel via an HTTP server API
 *
 * @example
 * ```typescript
 * const adapter = new HttpServerExcelAdapter({
 *   endpointUrl: 'https://api.example.com/api/export-excel',
 *   headers: { Authorization: 'Bearer xxx' }
 * });
 *
 * await adapter.download(data, 'sales_report.xlsx');
 * ```
 */
export class HttpServerExcelAdapter implements ExcelAdapter {
  readonly name = 'http-server';

  private endpointUrl: string;
  private defaultHeaders: Record<string, string>;
  private fetchFn: typeof fetch;

  /** Initializes with an API URL or connection settings including headers and fetch implementation. */
  constructor(config: string | HttpServerExcelAdapterConfig) {
    if (typeof config === 'string') {
      this.endpointUrl = config;
      this.defaultHeaders = {};
      this.fetchFn = typeof fetch !== 'undefined' ? fetch.bind(globalThis) : (undefined as any);
    } else {
      this.endpointUrl = config.endpointUrl;
      this.defaultHeaders = config.headers || {};
      this.fetchFn =
        config.customFetch ||
        (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : (undefined as any));
    }
  }

  /**
   * Sends a request to the server API and returns the generated Excel binary.
   */
  async generate(data: ExcelWorkbookData, options?: ExcelGenerateOptions): Promise<Uint8Array> {
    if (!this.fetchFn) {
      throw new Error('Fetch API is not available in the current environment.');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.defaultHeaders,
      ...(options?.headers || {}),
    };

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId =
      options?.timeoutMs && controller
        ? setTimeout(() => controller.abort(), options.timeoutMs)
        : null;

    try {
      const response = await this.fetchFn(this.endpointUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
        signal: controller ? controller.signal : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Excel generation failed with status ${response.status}: ${errorText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  /**
   * Generates Excel and triggers direct download in the browser.
   */
  async download(
    data: ExcelWorkbookData,
    filename?: string,
    options?: ExcelGenerateOptions,
  ): Promise<void> {
    const bytes = await this.generate(data, options);
    const targetFilename = resolveFilename(
      filename || options?.filename,
      data.metadata?.title,
      'export.xlsx',
    );
    triggerBrowserDownload(bytes, targetFilename);
  }
}
