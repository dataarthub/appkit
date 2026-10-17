import { CSVGenerator as GenericCSVGenerator, DEFAULT_CSV_CONFIG as base } from "../../data/csv";
import type { CSVConfig } from "../../data/csv";
export * from "../../data/csv";
/** Japanese Date-cell formatting preset; custom formatters and locales still take precedence. */
export const DEFAULT_CSV_CONFIG: CSVConfig = { ...base, dateLocale: 'ja-JP' };
export class CSVGenerator extends GenericCSVGenerator {
  constructor(config: CSVConfig = DEFAULT_CSV_CONFIG) { super({ ...DEFAULT_CSV_CONFIG, ...config }); }
}
