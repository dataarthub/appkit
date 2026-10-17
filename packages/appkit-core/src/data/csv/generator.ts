import Papa from 'papaparse';

/** CSV generation settings. Preserves raw values for machine interchange, or enables escapeFormulae for spreadsheets. */
export interface CSVConfig {
  /** Delimiter character (default: ,) */
  delimiter: string;
  /** Quotation character (1 character, default: ") */
  quoteChar: string;
  /** Character used to escape quote characters (1 character, default: ") */
  escapeChar: string;
  /** Whether to include the header row in output */
  includeHeader: boolean;
  /** 'never' throws an exception on values that require quoting. Quoting for formula safety takes precedence. */
  stringWrapping: 'auto' | 'always' | 'never';
  /** Prepends an apostrophe to formula-like strings (including headers). Defaults to false. Modifies the raw value. */
  escapeFormulae?: boolean;
  /** Locale for Date cells; undefined uses the host locale. */
  dateLocale?: string;
  /** Intl date options, including an explicit timezone when reproducibility matters. */
  dateOptions?: Intl.DateTimeFormatOptions;
  /** Overrides Date cell formatting (e.g. ISO strings for machine interchange). */
  dateFormatter?: (value: Date) => string;
}

export const DEFAULT_CSV_CONFIG: CSVConfig = {
  delimiter: ',',
  quoteChar: '"',
  escapeChar: '"',
  includeHeader: true,
  stringWrapping: 'auto',
  escapeFormulae: false,
};

export interface ColumnMapping {
  columnId: string;
  columnLabel: string;
  include: boolean;
  order: number;
  customLabel?: string;
}

// Also cover whitespace-prefixed formulae and full-width operator variants.
// CSV escaping is not a universal guarantee across spreadsheet import/re-save settings.
const FORMULA_PREFIX = /^(?:[\s\uFEFF]*[=+\-@＝＋－＠]|[\t\r\n])/u;

/**
 * Selects columns, applies ordering and date formatting, and serializes to CSV using Papa Parse.
 * Preserves negative numeric values as numbers while protecting formula-like strings.
 */
export class CSVGenerator {
  private config: CSVConfig;

  /**
   * @param config Configuration for CSV generation
   */
  constructor(config: CSVConfig = DEFAULT_CSV_CONFIG) {
    this.config = { ...config };
    if (
      !config.delimiter ||
      /[\r\n\uFEFF]/u.test(config.delimiter) ||
      config.delimiter.includes(config.quoteChar) ||
      config.quoteChar.length !== 1 ||
      config.escapeChar.length !== 1 ||
      /[\r\n]/u.test(config.quoteChar + config.escapeChar)
    ) {
      throw new Error('Invalid CSV delimiter, quoteChar or escapeChar');
    }
  }

  /**
   * @param data Data records to export
   * @param columns Column definitions (id/accessorKey)
   * @param columnMappings Export targets, labels, and order
   * @returns CSV string. Newlines are LF for compatibility, without BOM.
   * @throws If quoting is forbidden but a field requires quotation
   */
  generate<TData>(
    data: TData[],
    columns: Array<Record<string, unknown>>,
    columnMappings: ColumnMapping[],
  ): string {
    if (data.length === 0) return '';
    const mappings = columnMappings.filter((m) => m.include).sort((a, b) => a.order - b.order);
    if (mappings.length === 0) return '';
    const accessors = mappings.map((mapping) => {
      const column = columns.find((col) => (col.id || col.accessorKey) === mapping.columnId);
      return column ? String(column.accessorKey || column.id) : null;
    });
    const rows: (string | number)[][] = data.map((item) =>
      accessors.map((key) => {
        const value = key === null ? null : (item as Record<string, unknown>)[key];
        if (value == null) return '';
        if (value instanceof Date) return this.config.dateFormatter?.(value) ?? value.toLocaleDateString(this.config.dateLocale, this.config.dateOptions);
        return typeof value === 'number' ? value : String(value);
      }),
    );
    if (this.config.includeHeader)
      rows.unshift(mappings.map((m) => m.customLabel || m.columnLabel));
    if (this.config.stringWrapping === 'never') {
      for (const row of rows)
        for (const value of row) {
          const text = String(value);
          if (
            text.includes(this.config.delimiter) ||
            text.includes(this.config.quoteChar) ||
            /[\r\n]/u.test(text) ||
            text.startsWith(' ') ||
            text.endsWith(' ')
          ) {
            throw new Error('CSV field requires quoting; use stringWrapping: auto or always');
          }
        }
    }
    return Papa.unparse(rows, {
      delimiter: this.config.delimiter,
      quoteChar: this.config.quoteChar,
      escapeChar: this.config.escapeChar,
      quotes: this.config.stringWrapping === 'always',
      newline: '\n',
      escapeFormulae: this.config.escapeFormulae ? FORMULA_PREFIX : false,
    });
  }
}
