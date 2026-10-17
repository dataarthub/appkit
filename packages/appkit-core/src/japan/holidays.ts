import holidays from '@holiday-jp/holiday_jp';
import { createCalculatedJapaneseHolidayCalendar } from './holidays-calculated';
import type { JapaneseEquinoxDays } from './holidays-calculated';

/** Civil date for the Japanese holiday dataset; month is zero-based, as in Date. */
export interface JapaneseCalendarDate { year: number; month: number; day: number }

/** Dataset lookup only; timezone-to-civil-date conversion belongs to the caller. */
export function japaneseHolidayCalendar({ year, month, day }: JapaneseCalendarDate): boolean {
  return holidays.isHoliday(new Date(year, month, day));
}

/** Select a Japanese holiday source. holiday-jp remains the recommended default. */
export interface JapaneseHolidayCalendarOptions {
  source?: 'holiday-jp' | 'calculated';
  /** Used only by calculated mode. Provide announced equinox dates when needed. */
  equinoxDays?: (year: number) => JapaneseEquinoxDays;
  /** Exact YYYY-MM-DD closures; no automatic substitute/sandwich calculation is applied to overrides. */
  additionalHolidays?: readonly string[];
  /** Exact dates removed after additions; exclusions always win. */
  excludedDates?: readonly string[];
}
function overrideDates(dates: readonly string[] = []): Set<string> {
  return new Set(dates.map(value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new RangeError('Expected YYYY-MM-DD');
    const date = new Date(value + 'T00:00:00Z');
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new RangeError('Invalid override date');
    return value;
  }));
}
/**
 * Selects a Japanese calendar provider and snapshots exact-date closure overrides.
 * holiday-jp is recommended and remains the default; calculated mode is a 2022–2099
 * planning calendar with approximate equinox defaults and no historical special moves.
 * Recreate a provider after updating its configuration; no announcements are fetched.
 * Dataset selection changes behavior, not installed dependencies. The pure calculated
 * subpath is available separately and does not load holiday-jp at runtime.
 * @param options Source selection, optional equinox resolver, and exact added/excluded dates.
 * @returns Civil-date predicate compatible with data-engine's HolidayCalendar.
 * @throws RangeError for invalid civil/override dates or unsupported calculated years.
 * @example
 * import { createJapaneseHolidayCalendar } from '@alneas/appkit-core/japan/holidays';
 * const recommended = createJapaneseHolidayCalendar(); // holiday-jp
 * const predicted = createJapaneseHolidayCalendar({ source: 'calculated' });
 * predicted({ year: 2026, month: 8, day: 22 }); // true
 */
export function createJapaneseHolidayCalendar(options: JapaneseHolidayCalendarOptions = {}): (parts: JapaneseCalendarDate) => boolean {
  const source = options.source ?? 'holiday-jp';
  if (source !== 'holiday-jp' && source !== 'calculated') throw new TypeError('Unknown Japanese holiday source');
  const provider = source === 'calculated' ? createCalculatedJapaneseHolidayCalendar(options.equinoxDays) : japaneseHolidayCalendar;
  const additions = overrideDates(options.additionalHolidays);
  const exclusions = overrideDates(options.excludedDates);
  return parts => {
    const { year, month, day } = parts;
    const time = Date.UTC(year, month, day);
    const date = new Date(time);
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day) || !Number.isFinite(time) || date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) throw new RangeError('Invalid Japanese civil date');
    // Validate the source's range before applying exceptions.
    const base = provider(parts);
    const key = date.toISOString().slice(0, 10);
    return !exclusions.has(key) && (additions.has(key) || base);
  };
}
