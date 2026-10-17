/** Native local-calendar arithmetic: elapsed milliseconds are not calendar days across DST. */
export function addDays(value: Date, amount: number): Date {
  const result = new Date(value);
  if (amount !== 0) result.setDate(result.getDate() + Math.trunc(amount));
  return result;
}
function ordinal(value: Date): number {
  const utc = new Date(0);
  utc.setUTCFullYear(value.getFullYear(), value.getMonth(), value.getDate());
  utc.setUTCHours(0, 0, 0, 0);
  return +utc / 86_400_000;
}
export function differenceInCalendarDays(left: Date, right: Date): number {
  return Math.round(ordinal(left) - ordinal(right));
}
export function dateKey(date: Date): string {
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
/** Date-only values are local, never parsed as UTC. Datetimes must be ISO and resolve to local midnight. */
export function parseLocalDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})(.*)$/.exec(value);
  if (!match) return new Date(NaN);
  const [, y, m, d, suffix] = match;
  const check = new Date(0);
  check.setUTCFullYear(+y, +m - 1, +d);
  check.setUTCHours(0, 0, 0, 0);
  if (check.getUTCFullYear() !== +y || check.getUTCMonth() !== +m - 1 || check.getUTCDate() !== +d)
    return new Date(NaN);
  if (suffix)
    return /^T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/.test(suffix)
      ? new Date(value)
      : new Date(NaN);
  const local = new Date(0);
  local.setFullYear(+y, +m - 1, +d);
  local.setHours(0, 0, 0, 0);
  return local.getFullYear() === +y && local.getMonth() === +m - 1 && local.getDate() === +d
    ? local
    : new Date(NaN);
}
