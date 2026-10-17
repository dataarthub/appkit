/**
 * @fileoverview WebAssembly (WASM) Excel adapter
 *
 * Runs Go-compiled `excel.wasm` in the browser to generate and download
 * Excel (.xlsx) files entirely client-side.
 *
 * @module lib/excel/wasm-adapter
 */

import type { ExcelAdapter, ExcelGenerateOptions, ExcelWorkbookData } from './types';
import { resolveFilename, triggerBrowserDownload } from './utils';

/**
 * Configuration options for WasmExcelAdapter
 */
export interface WasmExcelAdapterConfig {
  /** URL to the WASM file (e.g., "/wasm/excel.wasm") */
  wasmUrl?: string;
  /** Custom pre-initialized WASM executor function */
  customExecutor?: (dataJson: string) => Promise<Uint8Array> | Uint8Array;
}

/**
 * Adapter that generates Excel via WebAssembly
 *
 * @example
 * ```typescript
 * const adapter = new WasmExcelAdapter({ wasmUrl: '/wasm/excel.wasm' });
 * await adapter.download(data, 'offline_report.xlsx');
 * ```
 */
export class WasmExcelAdapter implements ExcelAdapter {
  readonly name = 'wasm';

  private wasmUrl?: string;
  private customExecutor?: (dataJson: string) => Promise<Uint8Array> | Uint8Array;
  private isLoaded = false;
  private loadPromise: Promise<void> | null = null;

  /** Configures the WASM URL or pre-initialized execution function. Loaded on demand during generation. */
  constructor(config?: string | WasmExcelAdapterConfig) {
    if (typeof config === 'string') {
      this.wasmUrl = config;
    } else if (config) {
      this.wasmUrl = config.wasmUrl;
      this.customExecutor = config.customExecutor;
    }
  }

  /**
   * Loads and initializes the WASM runtime.
   */
  async load(): Promise<void> {
    if (this.isLoaded || this.customExecutor) {
      return;
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = (async () => {
      if (typeof window === 'undefined') {
        throw new Error('WasmExcelAdapter is only supported in browser environments.');
      }

      // Check if global generateExcel is already defined
      const globalObj = window as unknown as { generateExcel?: (json: string) => Uint8Array };
      if (typeof globalObj.generateExcel === 'function') {
        this.isLoaded = true;
        return;
      }

      if (!this.wasmUrl) {
        throw new Error('wasmUrl is required to load WasmExcelAdapter.');
      }

      // If Go wasm_exec runtime is available
      const goRuntime = (
        window as unknown as {
          Go?: new () => {
            importObject: WebAssembly.Imports;
            run: (instance: WebAssembly.Instance) => Promise<void>;
          };
        }
      ).Go;

      if (!goRuntime) {
        throw new Error(
          'Go WASM runtime (wasm_exec.js) not found in global scope. Please include wasm_exec.js before loading excel.wasm.',
        );
      }

      const go = new goRuntime();
      const response = await fetch(this.wasmUrl);
      const buffer = await response.arrayBuffer();
      const result = await WebAssembly.instantiate(buffer, go.importObject);

      // Run WASM instance in background (it will register global generateExcel)
      void go.run(result.instance);
      this.isLoaded = true;
    })();

    return this.loadPromise;
  }

  /**
   * Executes WASM to generate the Excel binary.
   */
  async generate(data: ExcelWorkbookData, _options?: ExcelGenerateOptions): Promise<Uint8Array> {
    if (this.customExecutor) {
      const result = await this.customExecutor(JSON.stringify(data));
      return result;
    }

    await this.load();

    const globalObj = (typeof window !== 'undefined' ? window : globalThis) as unknown as {
      generateExcel?: (json: string) => Uint8Array | { error?: string };
    };

    if (typeof globalObj.generateExcel !== 'function') {
      throw new Error('generateExcel function is not available on global scope.');
    }

    const output = globalObj.generateExcel(JSON.stringify(data));

    if (!output) {
      throw new Error('Empty response received from WASM Excel generator.');
    }

    if (!(output instanceof Uint8Array)) {
      if (typeof output === 'object' && 'error' in output && output.error) {
        throw new Error(`WASM Excel generation error: ${output.error}`);
      }
      throw new Error('Invalid return type from WASM Excel generator (expected Uint8Array).');
    }

    return output;
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
