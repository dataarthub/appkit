/** Civil date for the rule-based Japanese calendar; month is zero-based. */
export interface CalculatedJapaneseCalendarDate { year: number; month: number; day: number }
/** Optional announced equinox days; defaults are approximate planning predictions. */
export interface JapaneseEquinoxDays { vernal: number; autumnal: number }
/** A date in the current-rule planning calendar, not a declaration of an official future holiday. */
export interface CalculatedJapaneseHoliday { date: string; name: string; kind: 'national' | 'substitute' | 'citizens' }
const DAY = 86400000;
const iso = (time: number): string => new Date(time).toISOString().slice(0, 10);
function checkYear(year: number): void {
  if (!Number.isInteger(year) || year < 2022 || year > 2099) throw new RangeError('Calculated Japanese calendar supports 2022–2099 only');
}
/**
 * Calculates Japanese holidays under the ordinary rules in effect from 2022.
 * Includes fixed dates, Happy Monday rules, Sunday substitutes and citizens' holidays.
 * Equinox defaults use a linear/leap-year approximation, not an astronomical ephemeris
 * or official announcement. Supply announced days when official dates are required.
 * Excludes historical special moves (including 2020/2021) and future one-off laws.
 * @param year Integer, 2022–2099; unsupported years throw RangeError.
 * @param equinoxDays Optional announced March/September days, each 19–24.
 * @returns Fresh sorted holiday records. Predicted dates require official verification.
 * @example
 * import { getCalculatedJapaneseHolidays } from '@alneas/appkit-core/japan/holidays/calculated';
 * getCalculatedJapaneseHolidays(2026).some(day => day.date === '2026-09-22'); // true
 */
export function getCalculatedJapaneseHolidays(year: number, equinoxDays?: JapaneseEquinoxDays): CalculatedJapaneseHoliday[] {
  checkYear(year);
  const offset = year - 1980;
  const equinox = equinoxDays ?? {
    vernal: Math.floor(20.8431 + 0.242194 * offset) - Math.floor(offset / 4),
    autumnal: Math.floor(23.2488 + 0.242194 * offset) - Math.floor(offset / 4),
  };
  if (![equinox.vernal, equinox.autumnal].every(day => Number.isInteger(day) && day >= 19 && day <= 24)) throw new RangeError('Equinox days must be integers from 19 to 24');
  const national = new Map<string, CalculatedJapaneseHoliday>();
  const add = (month: number, day: number, name: string) => {
    const date = iso(Date.UTC(year, month, day));
    national.set(date, { date, name, kind: 'national' });
  };
  const monday = (month: number, occurrence: number, name: string) => {
    const first = new Date(Date.UTC(year, month, 1)).getUTCDay();
    add(month, 1 + (1 - first + 7) % 7 + (occurrence - 1) * 7, name);
  };
  add(0, 1, '元日'); monday(0, 2, '成人の日');
  add(1, 11, '建国記念の日'); add(1, 23, '天皇誕生日');
  add(2, equinox.vernal, '春分の日'); add(3, 29, '昭和の日');
  add(4, 3, '憲法記念日'); add(4, 4, 'みどりの日'); add(4, 5, 'こどもの日');
  monday(6, 3, '海の日'); add(7, 11, '山の日'); monday(8, 3, '敬老の日');
  add(8, equinox.autumnal, '秋分の日'); monday(9, 2, 'スポーツの日');
  add(10, 3, '文化の日'); add(10, 23, '勤労感謝の日');
  const result = new Map(national);
  // Article 3(3): only the original national holidays form the sandwich.
  for (const date of national.keys()) {
    const time = Date.parse(date + 'T00:00:00Z');
    const middle = iso(time + DAY);
    if (!national.has(middle) && national.has(iso(time + 2 * DAY))) result.set(middle, { date: middle, name: '国民の休日', kind: 'citizens' });
  }
  // Article 3(2): nearest subsequent date which is not a national holiday.
  for (const date of national.keys()) {
    const time = Date.parse(date + 'T00:00:00Z');
    if (new Date(time).getUTCDay() !== 0) continue;
    let next = time + DAY;
    while (national.has(iso(next))) next += DAY;
    const substitute = iso(next);
    result.set(substitute, { date: substitute, name: '振替休日', kind: 'substitute' });
  }
  return [...result.values()].sort((a, b) => a.date.localeCompare(b.date));
}
/**
 * Creates a rule-based provider without loading holiday-jp at runtime.
 * @param equinoxDays Optional per-year resolver of announced equinox dates; otherwise approximate.
 * @returns Civil-date predicate, zero-based months; unsupported years/invalid dates throw RangeError.
 * @example
 * import { createCalculatedJapaneseHolidayCalendar } from '@alneas/appkit-core/japan/holidays/calculated';
 * const calendar = createCalculatedJapaneseHolidayCalendar();
 * calendar({ year: 2026, month: 8, day: 22 }); // true
 */
export function createCalculatedJapaneseHolidayCalendar(equinoxDays?: (year: number) => JapaneseEquinoxDays): (parts: CalculatedJapaneseCalendarDate) => boolean {
  const cache = new Map<number, Set<string>>();
  return ({ year, month, day }) => {
    checkYear(year);
    const time = Date.UTC(year, month, day);
    const date = new Date(time);
    if (!Number.isInteger(month) || !Number.isInteger(day) || date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) throw new RangeError('Invalid Japanese civil date');
    if (!cache.has(year)) cache.set(year, new Set(getCalculatedJapaneseHolidays(year, equinoxDays?.(year)).map(holiday => holiday.date)));
    return cache.get(year)!.has(iso(time));
  };
}
