import type { Style } from 'excelize-wasm';
import type { ExcelAdapter, ExcelCellStyle, ExcelGenerateOptions, ExcelSheetData, ExcelWorkbookData } from './types';
import { resolveFilename, triggerBrowserDownload } from './utils';

/** Initialized Excelize runtime, also usable for advanced read/edit operations. */
export type ExcelizeRuntime = Awaited<ReturnType<typeof import('excelize-wasm')['init']>>;

interface RuntimeState { path: string; promise: Promise<ExcelizeRuntime> }
// Share initialization across instances and the ESM/CJS builds: upstream owns one global runtime.
const runtimeKey = Symbol.for('@alneas/appkit-core/data/excelize/runtime/0.1.3');
const runtimeGlobal = globalThis as typeof globalThis & { [runtimeKey]?: RuntimeState };

/**
 * Lazily imports the optional peer and initializes its Go runtime once per JS realm.
 * Use one canonical WASM path/URL. Do not call the upstream init separately in that realm.
 * Failed initialization can be retried; a different path after initialization is rejected.
 */
export function loadExcelize(wasmPath: string): Promise<ExcelizeRuntime> {
  if (!wasmPath?.trim()) return Promise.reject(new Error('wasmPath is required.'));
  const previous = runtimeGlobal[runtimeKey];
  if (previous) {
    if (previous.path !== wasmPath) return Promise.reject(new Error('Excelize is already initialized with a different wasmPath in this JS realm.'));
    return previous.promise;
  }
  const promise = (async () => {
    const { init } = await import('excelize-wasm').catch(cause => {
      if (cause?.code === 'ERR_MODULE_NOT_FOUND' || cause?.code === 'MODULE_NOT_FOUND') {
        throw new Error('Install the optional peer excelize-wasm@0.1.3 to use ExcelizeExcelAdapter.', { cause });
      }
      throw cause;
    });
    return init(wasmPath);
  })();
  const state = { path: wasmPath, promise };
  runtimeGlobal[runtimeKey] = state;
  void promise.catch(() => {
    if (runtimeGlobal[runtimeKey] === state) delete runtimeGlobal[runtimeKey];
  });
  return promise;
}

/** Configuration for the npm-distributed Excelize WASM adapter. */
export interface ExcelizeExcelAdapterConfig {
  /** Node filesystem path or browser URL to the installed peer's excelize.wasm.gz. */
  wasmPath: string;
}

function checked<T extends { error?: string | null }>(result: T, operation: string): T {
  if (result.error) throw new Error(`Excelize ${operation}: ${result.error}`);
  return result;
}

function columnName(index: number): string {
  let result = '';
  for (let n = index; n > 0; n = Math.floor((n - 1) / 26)) result = String.fromCharCode(65 + (n - 1) % 26) + result;
  return result;
}

function styleOptions(style: ExcelCellStyle): Style {
  const rgb = (color?: string) => {
    if (color === undefined) return undefined;
    if (!/^#?[0-9a-f]{6}$/i.test(color)) throw new Error(`Invalid Excel RGB color: ${color}`);
    return color.replace(/^#/, '');
  };
  const sides = style.border === 'top' || style.border === 'bottom' ? [style.border] : ['left', 'right', 'top', 'bottom'];
  const borderStyle = style.border === 'none' ? 0 : style.border === 'thick' ? 5 : style.border === 'double' ? 6 : 1;
  return {
    Font: { Bold: style.bold, Italic: style.italic, Underline: style.underline ? 'single' : undefined, Size: style.fontSize, Color: rgb(style.fontColor) },
    Alignment: { Horizontal: style.horizontalAlign, Vertical: style.verticalAlign, WrapText: style.wrapText },
    ...(style.backgroundColor ? { Fill: { Type: 'pattern', Pattern: 1, Color: [rgb(style.backgroundColor)!] } } : {}),
    ...(style.border ? { Border: sides.map(Type => ({ Type, Color: rgb(style.borderColor) ?? '000000', Style: borderStyle })) } : {}),
    ...(style.numberFormat !== undefined ? { CustomNumFmt: style.numberFormat } : {}),
  };
}

function cellValue(value: unknown, dateHint = false): string | number | boolean | undefined {
  if (value == null) return undefined;
  if (value instanceof Date || dateHint) {
    // Date-only strings are UTC. Other strings must contain an explicit timezone.
    if (!(value instanceof Date) && (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:$|T.*(?:Z|[+-]\d{2}:\d{2})$)/.test(value))) {
      throw new Error('Excel dates must be Date objects or ISO strings with a date only or an explicit timezone.');
    }
    if (typeof value === 'string') {
      const [year, month, day] = value.slice(0, 10).split('-').map(Number);
      const calendar = new Date(Date.UTC(year, month - 1, day));
      if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day) throw new Error('Excel dates must contain a valid calendar date.');
    }
    const milliseconds = value instanceof Date ? value.getTime() : Date.parse(value as string);
    if (!Number.isFinite(milliseconds) || milliseconds < Date.UTC(1900, 0, 1) || milliseconds >= Date.UTC(10000, 0, 1)) {
      throw new Error('Excel dates must be valid dates in the range 1900–9999.');
    }
    const serial = (milliseconds - Date.UTC(1899, 11, 30)) / 86400000;
    return serial < 61 ? serial - 1 : serial;
  }
  if (typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return value;
  throw new Error('Excel cells accept only strings, finite numbers, booleans, Date objects, null or undefined.');
}

/**
 * Generates genuine XLSX bytes using the optional excelize-wasm peer.
 * Import from `@alneas/appkit-core/data/excel/excelize`; ordinary Excel/core imports stay peer-free.
 * Formulas are stored for spreadsheet applications to recalculate, not evaluated here.
 * WASM operations are synchronous after loading; timeoutMs/headers and CSV are unsupported.
 */
export class ExcelizeExcelAdapter implements ExcelAdapter {
  readonly name = 'excelize';
  private readonly wasmPath: string;

  constructor(config: ExcelizeExcelAdapterConfig) {
    if (!config?.wasmPath?.trim()) throw new Error('wasmPath is required.');
    this.wasmPath = config.wasmPath;
  }

  /** Preloads the shared runtime. The adapter also calls this lazily on generation. */
  load(): Promise<ExcelizeRuntime> { return loadExcelize(this.wasmPath); }

  /** Converts the common workbook definition into an XLSX archive, propagating upstream errors. */
  async generate(data: ExcelWorkbookData, options?: ExcelGenerateOptions): Promise<Uint8Array> {
    if (options?.format && options.format !== 'xlsx') throw new Error('ExcelizeExcelAdapter supports only xlsx; use CsvExcelAdapter for CSV.');
    if (options?.timeoutMs !== undefined || options?.headers !== undefined) throw new Error('ExcelizeExcelAdapter does not support timeoutMs or HTTP headers.');
    if (!data.sheets.length) throw new Error('At least one worksheet is required.');
    const names = data.sheets.map(sheet => sheet.name.toLowerCase());
    if (new Set(names).size !== names.length) throw new Error('Worksheet names must be unique (case-insensitive).');
    const runtime = await this.load();
    const file = checked(runtime.NewFile(), 'NewFile');
    // Create every sheet before formulas are written, avoiding subsequent reference rewrites.
    data.sheets.forEach((sheet, index) => {
      if (index === 0) checked(file.SetSheetName('Sheet1', sheet.name), 'SetSheetName');
      else checked(file.NewSheet(sheet.name), 'NewSheet');
    });
    if (data.metadata) {
      const m = data.metadata;
      checked(file.SetDocProps({ Title: m.title, Subject: m.subject, Creator: m.creator, Description: m.description }), 'SetDocProps');
    }
    const styles = new Map<string, number>();
    const applyStyle = (sheet: string, cell: string, style?: ExcelCellStyle) => {
      if (!style) return;
      const converted = styleOptions(style);
      const key = JSON.stringify(converted);
      let id = styles.get(key);
      if (id === undefined) {
        id = checked(file.NewStyle(converted), 'NewStyle').style;
        styles.set(key, id);
      }
      checked(file.SetCellStyle(sheet, cell, cell, id), `SetCellStyle ${sheet}!${cell}`);
    };
    const writeValue = (sheet: string, cell: string, value: unknown, dateHint = false) => {
      const converted = cellValue(value, dateHint);
      if (converted !== undefined) checked(file.SetCellValue(sheet, cell, converted), `SetCellValue ${sheet}!${cell}`);
    };
    for (const sheet of data.sheets) {
      if (sheet.hideGridlines !== undefined) checked(file.SetSheetView(sheet.name, 0, { ShowGridLines: !sheet.hideGridlines, TopLeftCell: 'A1', View: 'normal' }), 'SetSheetView');
      this.writeTable(sheet, writeValue, applyStyle, (column, width) => checked(file.SetColWidth(sheet.name, column, column, width), 'SetColWidth'));
      for (const cell of sheet.cells ?? []) {
        writeValue(sheet.name, cell.cell, cell.value);
        if (cell.formula !== undefined) checked(file.SetCellFormula(sheet.name, cell.cell, cell.formula.replace(/^=/, '')), `SetCellFormula ${sheet.name}!${cell.cell}`);
        applyStyle(sheet.name, cell.cell, cell.value instanceof Date ? { numberFormat: 'yyyy-mm-dd', ...cell.style } : cell.style);
      }
      for (const merge of sheet.merges ?? []) {
        const [start, end, ...extra] = merge.split(':');
        if (!start || !end || extra.length) throw new Error(`Invalid merge range: ${merge}`);
        checked(file.MergeCell(sheet.name, start, end), 'MergeCell');
      }
      for (const [column, width] of Object.entries(sheet.colWidths ?? {})) checked(file.SetColWidth(sheet.name, column, column, width), 'SetColWidth');
      for (const [row, height] of Object.entries(sheet.rowHeights ?? {})) checked(file.SetRowHeight(sheet.name, Number(row), height), 'SetRowHeight');
    }
    checked(file.SetActiveSheet(0), 'SetActiveSheet');
    checked(file.SetCalcProps({ CalcMode: 'auto', FullCalcOnLoad: true, ForceFullCalc: true }), 'SetCalcProps');
    const { buffer } = checked(file.WriteToBuffer(), 'WriteToBuffer');
    // Upstream declares BlobPart; normalize and detach the actual result before returning.
    return new Uint8Array(await new Blob([buffer]).arrayBuffer());
  }

  private writeTable(
    sheet: ExcelSheetData,
    write: (sheet: string, cell: string, value: unknown, dateHint?: boolean) => void,
    style: (sheet: string, cell: string, value?: ExcelCellStyle) => void,
    width: (column: string, width: number) => void,
  ): void {
    if (!sheet.columns?.length) return;
    const lastCellRow = (sheet.cells ?? []).reduce((max, cell) => Math.max(max, Number(/\d+$/.exec(cell.cell)?.[0] ?? 0)), 0);
    const start = sheet.startRow ?? lastCellRow + 1;
    if (!Number.isInteger(start) || start < 1) throw new Error('startRow must be a positive integer.');
    sheet.columns.forEach((column, index) => {
      const col = columnName(index + 1);
      write(sheet.name, col + start, column.header);
      style(sheet.name, col + start, column.style);
      if (column.width !== undefined) width(col, column.width);
      (sheet.rows ?? []).forEach((row, rowIndex) => {
        const cell = col + (start + rowIndex + 1);
        const value = row[column.key];
        write(sheet.name, cell, value, column.type === 'date');
        const format = column.format ?? (column.type === 'date' || value instanceof Date ? 'yyyy-mm-dd' : undefined);
        if (format !== undefined) style(sheet.name, cell, { numberFormat: format });
      });
    });
  }

  /** Generates XLSX and downloads it in browsers; in Node use generate() and write the bytes. */
  async download(data: ExcelWorkbookData, filename?: string, options?: ExcelGenerateOptions): Promise<void> {
    const bytes = await this.generate(data, options);
    triggerBrowserDownload(bytes, resolveFilename(filename || options?.filename, data.metadata?.title));
  }
}
