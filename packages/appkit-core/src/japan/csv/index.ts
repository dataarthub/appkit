import { CSVGenerator as GenericCSVGenerator, DEFAULT_CSV_CONFIG as base } from "../../data/csv";
import type { CSVConfig } from "../../data/csv";
export * from "../../data/csv";
/**
 * Japanese Date-cell formatting preset; custom formatters and locales still take precedence.
 *
 * @see {@link CSVGenerator} for regional CSV generation setup.
 */
export const DEFAULT_CSV_CONFIG: CSVConfig = { ...base,
  /** Japanese locale for Date-cell formatting; this does not change the configured timezone. */
  dateLocale: 'ja-JP' };
/**
 * Generates CSV using the generic engine with Japanese Date-cell locale defaults.
 *
 * @example
 * ```typescript
 * import { CSVGenerator } from '@alneas/appkit-core/japan/csv';
 *
 * const generator = new CSVGenerator();
 * console.log(generator.generate(
 *   [{ name: 'Example' }], [{ accessorKey: 'name' }],
 *   [{ columnId: 'name', columnLabel: 'Name', include: true, order: 0 }],
 * ));
 * ```
 */
export class CSVGenerator extends GenericCSVGenerator {

  /**
   * Merges host CSV settings over the Japanese formatting preset.
   *
   * @param config - CSV configuration, default DEFAULT_CSV_CONFIG; explicitly supplied fields override the Japanese preset.
   * @throws Throws invalid delimiter/quote/escape settings rejected by the generic CSV constructor.
   * @example
   * ```typescript
   * import { CSVGenerator } from '@alneas/appkit-core/japan/csv';
   *
   * const generator = new CSVGenerator();
   * console.log(generator.generate(
   *   [{ name: 'Example' }], [{ accessorKey: 'name' }],
   *   [{ columnId: 'name', columnLabel: 'Name', include: true, order: 0 }],
   * ));
   * ```
   */
  constructor(config: CSVConfig = DEFAULT_CSV_CONFIG) { super({ ...DEFAULT_CSV_CONFIG, ...config }); }
}
