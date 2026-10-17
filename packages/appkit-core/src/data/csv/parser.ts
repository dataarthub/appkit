import Papa from 'papaparse';

/**
 * Configuration options for CSV parsing
 */
export interface CSVParseConfig {
  /** Delimiter character (default: ,) */
  delimiter: string;
  /** Quotation character (default: ") */
  quoteChar: string;
  /** Escape character (default: ") */
  escapeChar: string;
  /** Whether the CSV includes a header row (for compatibility, header row is still included in result even if true) */
  hasHeader: boolean;
  /** Whether to skip empty lines */
  skipEmptyLines: boolean;
  /** Whether to trim leading and trailing whitespace from values */
  trimWhitespace: boolean;
}

export const DEFAULT_CSV_PARSE_CONFIG: CSVParseConfig = {
  delimiter: ',',
  quoteChar: '"',
  escapeChar: '"',
  hasHeader: true,
  skipEmptyLines: true,
  trimWhitespace: true,
};

/**
 * Class for parsing CSV data.
 * Supports RFC 4180 compliant parsing (quotation marks and escape handling).
 */
export class CSVParser {
  private config: CSVParseConfig;

  /**
   * Creates a new instance of CSVParser.
   * @param config Configuration options for CSV parsing
   */
  constructor(config: CSVParseConfig = DEFAULT_CSV_PARSE_CONFIG) {
    this.config = config;
  }

  /**
   * Parses a CSV string and converts it into a 2D array of string values per row.
   * @param csvContent CSV text content to parse
   * @returns List of parsed row records (each row is an array of strings)
   * @throws {Error} When the CSV format is invalid, such as unclosed quotes
   */
  parse(csvContent: string): string[][] {
    const content = csvContent.replace(/^\uFEFF/, '');
    const rows: string[][] = [];
    let cursor = 0;
    let rowNumber = 0;

    // Keep returning arrays including the header, regardless of hasHeader.
    Papa.parse<string[]>(content, {
      delimiter: this.config.delimiter,
      quoteChar: this.config.quoteChar,
      escapeChar: this.config.escapeChar,
      header: false,
      dynamicTyping: false,
      skipEmptyLines: false,
      fastMode: this.config.quoteChar === '' ? true : undefined,
      transform: (value) => (this.config.trimWhitespace ? value.trim() : value),
      step: (result) => {
        rowNumber++;
        if (result.errors.length > 0) {
          throw new Error(`Invalid CSV at row ${rowNumber}: ${result.errors[0].message}`);
        }

        // Use Papa's record boundaries: skip blank source records while keeping
        // quoted empty fields and delimiter-only rows, as the original API did.
        const empty = content.slice(cursor, result.meta.cursor).trim() === '';
        cursor = result.meta.cursor;
        if (!this.config.skipEmptyLines || !empty) rows.push(result.data);
      },
    });

    return rows.length === 0 && !this.config.skipEmptyLines ? [['']] : rows;
  }
}

/**
 * Convenient helper function to parse a CSV string.
 */
export function parseCsv(csvContent: string, config?: CSVParseConfig): string[][] {
  return new CSVParser(config).parse(csvContent);
}
