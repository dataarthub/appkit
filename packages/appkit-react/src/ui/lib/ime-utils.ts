/**
 * Converts full-width ASCII punctuation/letters/digits and ideographic spaces to ASCII.
 *
 * @param str - Input text; other Unicode characters are retained.
 *
 * @returns Converted text without mutating the input.
 *
 * @example
 * ```ts
 * import { toHalfWidth } from '@alneas/appkit-react/ui/utils';
 * const text = toHalfWidth('１２３　Ａ'); // '123 A'
 * ```
 */
export function toHalfWidth(str: string): string {
  return str
    .replace(/[！-～]/g, (s) => {
      return String.fromCharCode(s.charCodeAt(0) - 0xfee0);
    })
    .replace(/\u3000/g, ' ');
}

/**
 * Converts full-width ASCII and removes characters other than digits, dots and hyphens.
 *
 * @param val - Raw numeric input text; empty input remains empty.
 *
 * @returns Filtered text; repeated signs/dots are retained, so this is not numeric validation.
 *
 * @example
 * ```ts
 * import { normalizeNumericInput } from '@alneas/appkit-react/ui/utils';
 * const text = normalizeNumericInput('￥１２.３'); // '12.3'
 * ```
 */
export function normalizeNumericInput(val: string): string {
  if (!val) return '';
  const hw = toHalfWidth(val);
  return hw.replace(/[^0-9.-]/g, '');
}

/**
 * Adds or subtracts a step and rounds using the step's decimal spelling.
 *
 * @param current - Number or parseFloat-compatible text; missing, empty or NaN input uses zero.
 *
 * @param direction - Up adds step; down subtracts it.
 *
 * @param step - Delta magnitude, default 1; decimal precision is derived from String(step).
 *
 * @returns Next number rounded with toFixed; no min/max clamp is applied.
 *
 * @remarks Exponential step spellings have no decimal digits in this calculation; this
 * helper is not arbitrary-precision arithmetic.
 *
 * @example
 * ```ts
 * import { getNextNumericValue } from '@alneas/appkit-react/ui/utils';
 * const next = getNextNumericValue('1.2', 'up', 0.1); // 1.3
 * ```
 */
export function getNextNumericValue(
  current: string | number | null | undefined,
  direction: 'up' | 'down',
  step: number = 1,
): number {
  const base = typeof current === 'number' ? current : parseFloat(String(current || '0'));
  const validBase = isNaN(base) ? 0 : base;
  const delta = direction === 'up' ? step : -step;

  const result = validBase + delta;
  const precision = (String(step).split('.')[1] || '').length;
  return parseFloat(result.toFixed(precision));
}
