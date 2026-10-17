/**
 * 全角文字（数字、記号）を半角に変換します。
 * @param str - 変換対象の文字列
 * @returns 半角変換後の文字列
 */
export function toHalfWidth(str: string): string {
  return str
    .replace(/[！-～]/g, (s) => {
      return String.fromCharCode(s.charCodeAt(0) - 0xfee0);
    })
    .replace(/\u3000/g, ' ');
}

/**
 * 数値入力フィールド用に、全角を半角に変換し、不正な文字を除去します。
 * 0-9, '.', '-' 以外の文字を除去します。
 * @param val - 正規化対象の文字列
 * @returns 正規化後の文字列
 */
export function normalizeNumericInput(val: string): string {
  if (!val) return '';
  const hw = toHalfWidth(val);
  return hw.replace(/[^0-9.-]/g, '');
}

/**
 * 上下キーによる数値増減の計算を行います。
 * 浮動小数点の計算誤差を考慮した結果を返します。
 * @param current - 現在の数値（文字列または数値）
 * @param direction - 増減の方向 ('up' | 'down')
 * @param step - 増減のステップ量
 * @returns 次の数値
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
