/** Civil date; month is zero-based, matching the data-engine HolidayCalendar contract. */
export interface USCalendarDate { year: number; month: number; day: number }
/** A federal holiday occurrence. Both dates use YYYY-MM-DD without a timezone. */
export interface USFederalHoliday {
  name: string;
  /** Date selected by the requested calendar mode, contained in the requested year. */
  date: string;
  /** Statutory holiday date; may belong to the following year in observed mode. */
  actualDate: string;
}
/** An application-selected closure date; used exactly as supplied without automatic shifting. */
export interface USHolidayAddition { name: string; date: string }
/** Configure federal observance and explicit application closures; exclusions take precedence. */
export interface USFederalHolidayOptions {
  observed?: boolean;
  /** Additional YYYY-MM-DD closures, such as one-off announcements or company holidays. */
  additionalHolidays?: readonly USHolidayAddition[];
  /** Selected YYYY-MM-DD dates to remove, including observed rather than actual dates. */
  excludedDates?: readonly string[];
}
const DAY = 86400000;
function checkYear(year: number): void {
  if (!Number.isInteger(year) || year < 2021 || year > 2099) throw new RangeError('Supported calendar years are 2021–2099');
}
const iso = (date: Date): string => date.toISOString().slice(0, 10);
function validateDate(value: string): void {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new RangeError('Expected YYYY-MM-DD');
  const date = new Date(value + 'T00:00:00Z');
  if (!Number.isFinite(date.getTime()) || iso(date) !== value) throw new RangeError('Invalid calendar date');
  checkYear(date.getUTCFullYear());
}
function snapshot(options: USFederalHolidayOptions): USFederalHolidayOptions {
  const additionalHolidays = (options.additionalHolidays ?? []).map(holiday => {
    validateDate(holiday.date);
    if (typeof holiday.name !== 'string' || !holiday.name.trim()) throw new TypeError('Additional holidays require a name');
    return { name: holiday.name, date: holiday.date };
  });
  const excludedDates = [...(options.excludedDates ?? [])];
  excludedDates.forEach(validateDate);
  return { observed: options.observed ?? true, additionalHolidays, excludedDates };
}
function occurrences(year: number): USFederalHoliday[] {
  const result: USFederalHoliday[] = [];
  const add = (name: string, month: number, day: number) => {
    const date = iso(new Date(Date.UTC(year, month, day)));
    result.push({ name, date, actualDate: date });
  };
  const nth = (name: string, month: number, weekday: number, occurrence: number) => {
    const first = new Date(Date.UTC(year, month, 1)).getUTCDay();
    add(name, month, 1 + (weekday - first + 7) % 7 + (occurrence - 1) * 7);
  };
  add("New Year's Day", 0, 1);
  nth('Birthday of Martin Luther King, Jr.', 0, 1, 3);
  nth("Washington's Birthday", 1, 1, 3);
  const lastMay = new Date(Date.UTC(year, 5, 0));
  add('Memorial Day', 4, lastMay.getUTCDate() - (lastMay.getUTCDay() + 6) % 7);
  add('Juneteenth National Independence Day', 5, 19);
  add('Independence Day', 6, 4);
  nth('Labor Day', 8, 1, 1);
  nth('Columbus Day', 9, 1, 2);
  add('Veterans Day', 10, 11);
  nth('Thanksgiving Day', 10, 4, 4);
  add('Christmas Day', 11, 25);
  return result;
}
/**
 * Lists the eleven recurring nationwide federal holidays under the current rules.
 * Observed mode (default) moves Saturday to Friday and Sunday to Monday for a
 * standard Monday–Friday schedule. Results are filtered by selected date, including
 * next January's New Year's Day when observed in December of the requested year.
 * Excludes state/local holidays, Inauguration Day and one-off executive closures.
 * Additional dates are used exactly as supplied and replace labels on matching
 * selected dates. Exclusions run last. No remote data is fetched.
 * This is a planning policy, not a private-employer working-day determination.
 * Source: https://www.opm.gov/policy-data-oversight/pay-leave/federal-holidays/
 * @param year Calendar year from 2021 through 2099. Future rules can change.
 * @param options Observance mode plus explicit additional or excluded closure dates.
 * @returns Fresh date-sorted records whose selected date falls within year.
 * @throws RangeError for unsupported years or invalid override dates; TypeError for unnamed additions.
 * @example
 * import { getUSFederalHolidays } from '@alneas/appkit-core/us/holidays';
 * getUSFederalHolidays(2026).find(day => day.actualDate === '2026-07-04')?.date; // '2026-07-03'
 */
export function getUSFederalHolidays(year: number, options: USFederalHolidayOptions = {}): USFederalHoliday[] {
  checkYear(year);
  const policy = snapshot(options);
  const observed = policy.observed;
  const candidates = observed ? [...occurrences(year), ...occurrences(year + 1)] : occurrences(year);
  const base = candidates.map(holiday => {
    const date = new Date(holiday.actualDate + 'T00:00:00Z');
    const weekday = date.getUTCDay();
    const shift = observed ? weekday === 6 ? -1 : weekday === 0 ? 1 : 0 : 0;
    return { ...holiday, date: iso(new Date(date.getTime() + shift * DAY)) };
  });
  const selected = new Map(base.map(holiday => [holiday.date, holiday]));
  for (const holiday of policy.additionalHolidays ?? []) selected.set(holiday.date, { ...holiday, actualDate: holiday.date });
  for (const date of policy.excludedDates ?? []) selected.delete(date);
  return [...selected.values()].filter(holiday => holiday.date.startsWith(`${year}-`)).sort((a, b) => a.date.localeCompare(b.date));
}
/**
 * Tests a civil date against the standard observed federal holiday calendar.
 * Structurally compatible with data-engine's HolidayCalendar; no engine dependency.
 * @param parts Civil date with zero-based month; the caller converts instants to its timezone.
 * @returns Whether the civil date is an observed federal holiday.
 * @throws RangeError for an invalid civil date or year outside 2021–2099.
 * @example
 * import { usFederalHolidayCalendar } from '@alneas/appkit-core/us';
 * usFederalHolidayCalendar({ year: 2026, month: 6, day: 3 }); // true
 */
export function usFederalHolidayCalendar({ year, month, day }: USCalendarDate): boolean {
  checkYear(year);
  const date = new Date(Date.UTC(year, month, day));
  if (!Number.isInteger(month) || !Number.isInteger(day) || date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) throw new RangeError('Invalid civil date');
  return getUSFederalHolidays(year).some(holiday => holiday.date === iso(date));
}

/**
 * Creates a civil-date provider using a snapshot of application calendar overrides.
 * Use this for announced one-off closures or company policy without changing the
 * built-in federal rules. No external service is polled and no announcement is inferred.
 * @param options Observance mode, added closures and excluded dates; exclusions win.
 * @returns A structurally compatible data-engine HolidayCalendar; months are zero-based.
 * @throws RangeError for invalid override dates; TypeError for unnamed additions.
 * @example
 * import { createUSFederalHolidayCalendar } from '@alneas/appkit-core/us/holidays';
 * const calendar = createUSFederalHolidayCalendar({
 *   additionalHolidays: [{ date: '2026-12-24', name: 'Company closure' }],
 * });
 * calendar({ year: 2026, month: 11, day: 24 }); // true
 */
export function createUSFederalHolidayCalendar(options: USFederalHolidayOptions = {}): (parts: USCalendarDate) => boolean {
  const policy = snapshot(options);
  return parts => {
    // Validate civil components with the same boundary as the default provider.
    usFederalHolidayCalendar(parts);
    const date = iso(new Date(Date.UTC(parts.year, parts.month, parts.day)));
    return getUSFederalHolidays(parts.year, policy).some(holiday => holiday.date === date);
  };
}
