import * as core from "../data/date-utils";
import { japaneseHolidayCalendar } from './holidays';
export { japaneseHolidayCalendar } from './holidays';
export * from "../data/date-utils";
/**
 * Japanese locale used by these regional formatting wrappers (ja-JP).
 *
 * @see {@link getWeekday} for explicit timezone and locale usage.
 */
export const DEFAULT_LOCALE = 'ja-JP';
/**
 * Sunday-first Japanese short weekday labels indexed by Date.getDay().
 *
 * @see {@link getWeekday} for explicit timezone and locale usage.
 */
export const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土'] as const;
/**
 * Japan Standard Time offset from UTC, in hours (9); a constant, not timezone conversion.
 *
 * @see {@link getWeekday} for explicit timezone and locale usage.
 */
export const OFFSET_HOURS_JST = 9;
/**
 * IANA timezone identifier for explicit Japan-time formatting (Asia/Tokyo).
 *
 * @see {@link getWeekday} for explicit timezone and locale usage.
 */
export const TIME_ZONE_JP = 'Asia/Tokyo';
/**
 * Tests whether Intl accepts a timezone under the requested locale.
 *
 * @param timezone - IANA timezone identifier to test.
 * @param locale - Formatting locale, default ja-JP.
 * @returns True when Intl construction succeeds, otherwise false (including invalid locales).
 * @example
 * ```typescript
 * import { isTimeZoneValid } from '@alneas/appkit-core/japan/date-utils';
 *
 * console.log(isTimeZoneValid('Asia/Tokyo'));
 * ```
 */
export const isTimeZoneValid = (timezone: string, locale = DEFAULT_LOCALE): boolean => core.isTimeZoneValid(timezone, locale);
/**
 * Formats a short weekday name using Japanese presentation defaults.
 *
 * @param date - Date or runtime-parseable string representing an instant.
 * @param locale - Weekday locale, default ja-JP.
 * @param timeZone - Calendar-day timezone, default the module-load host-local TIME_ZONE_LOCAL.
 * @returns Localized short weekday text.
 * @throws Propagates invalid Intl locale/options/timezone errors; civil-date extraction can reject invalid dates.
 * @example
 * ```typescript
 * import { getWeekday } from '@alneas/appkit-core/japan/date-utils';
 *
 * console.log(getWeekday('2026-10-20T00:00:00Z', 'ja-JP', 'Asia/Tokyo'));
 * ```
 */
export const getWeekday = (date: Date | string, locale = DEFAULT_LOCALE, timeZone = core.TIME_ZONE_LOCAL): string => core.getWeekday(date, locale, timeZone);
/**
 * Tests the Japanese holiday dataset for the instant in the selected timezone.
 *
 * @param date - Date or runtime-parseable string representing an instant.
 * @param timeZone - Calendar-day timezone, default the module-load host-local TIME_ZONE_LOCAL.
 * @returns Whether the converted civil date is in the installed Japanese holiday dataset.
 * @throws Propagates invalid Intl locale/options/timezone errors; civil-date extraction can reject invalid dates.
 * @example
 * ```typescript
 * import { isPublicHoliday } from '@alneas/appkit-core/japan/date-utils';
 *
 * console.log(isPublicHoliday('2026-01-01T03:00:00Z', 'Asia/Tokyo'));
 * ```
 */
export const isPublicHoliday = (date: Date | string, timeZone = core.TIME_ZONE_LOCAL): boolean => core.isPublicHoliday(date, japaneseHolidayCalendar, timeZone);
/**
 * Tests Saturday/Sunday or the Japanese holiday dataset.
 *
 * @param date - Date or runtime-parseable string representing an instant.
 * @param timeZone - Calendar-day timezone, default the module-load host-local TIME_ZONE_LOCAL.
 * @returns True for a weekend or Japanese dataset holiday.
 * @throws Propagates invalid Intl locale/options/timezone errors; civil-date extraction can reject invalid dates.
 * @example
 * ```typescript
 * import { isWeekendOrHoliday } from '@alneas/appkit-core/japan/date-utils';
 *
 * console.log(isWeekendOrHoliday('2026-01-01T03:00:00Z', 'Asia/Tokyo'));
 * ```
 */
export const isWeekendOrHoliday = (date: Date | string, timeZone = core.TIME_ZONE_LOCAL): boolean => core.isWeekendOrHoliday(date, timeZone, japaneseHolidayCalendar);
/**
 * Formats a short weekday and appends a holiday marker for Japanese-locale holidays.
 *
 * @param date - Date or runtime-parseable string representing an instant.
 * @param locale - Weekday locale, default ja-JP; only locales beginning ja receive the holiday suffix.
 * @param timeZone - Calendar-day timezone, default the module-load host-local TIME_ZONE_LOCAL.
 * @returns Weekday text with an optional Japanese holiday marker.
 * @throws Propagates invalid Intl locale/options/timezone errors; civil-date extraction can reject invalid dates.
 * @example
 * ```typescript
 * import { getWeekdayWithHoliday } from '@alneas/appkit-core/japan/date-utils';
 *
 * console.log(getWeekdayWithHoliday('2026-01-01T03:00:00Z', 'ja-JP', 'Asia/Tokyo'));
 * ```
 */
export const getWeekdayWithHoliday = (date: Date | string, locale = DEFAULT_LOCALE, timeZone = core.TIME_ZONE_LOCAL): string =>
  core.getWeekdayWithHoliday(date, locale, timeZone, japaneseHolidayCalendar, locale.startsWith('ja') ? '祝' : '');
/**
 * Formats date text with Japanese locale defaults and optional Intl overrides.
 *
 * @param date - Date or runtime-parseable string representing an instant.
 * @param options - Optional Intl options; timeZone overrides the host-local default.
 * @param locale - Formatting locale, default ja-JP.
 * @returns Intl date text; invalid Date inputs can produce the runtime invalid-date text.
 * @throws Propagates invalid Intl locale/options/timezone errors; civil-date extraction can reject invalid dates.
 * @example
 * ```typescript
 * import { formatDate } from '@alneas/appkit-core/japan/date-utils';
 *
 * console.log(formatDate('2026-10-20T00:00:00Z', { timeZone: 'Asia/Tokyo' }));
 * ```
 */
export const formatDate = (date: Date | string, options?: Intl.DateTimeFormatOptions, locale = DEFAULT_LOCALE): string => core.formatDate(date, options, locale);
/**
 * Formats clock time in the host-local timezone with Japanese locale defaults.
 *
 * @param date - Date or runtime-parseable string representing an instant.
 * @param style - Hour/minute digit style, default numeric.
 * @param includeSeconds - Whether to include seconds with the same digit style; default false.
 * @param locale - Formatting locale, default ja-JP.
 * @returns Localized time text; this API has no timezone override.
 * @throws Propagates invalid Intl locale/options/timezone errors; civil-date extraction can reject invalid dates.
 * @example
 * ```typescript
 * import { formatTime } from '@alneas/appkit-core/japan/date-utils';
 *
 * console.log(formatTime('2026-10-20T00:00:00Z', '2-digit', true));
 * ```
 */
export const formatTime = (date: Date | string, style: 'numeric' | '2-digit' = 'numeric', includeSeconds = false, locale = DEFAULT_LOCALE): string => core.formatTime(date, style, includeSeconds, locale);
/**
 * Formats date and time with Japanese locale defaults and Intl overrides.
 *
 * @param date - Date or runtime-parseable string representing an instant.
 * @param options - Optional Intl options; timeZone overrides the host-local default.
 * @param locale - Formatting locale, default ja-JP.
 * @returns Localized date/time text determined by Intl options and runtime locale data.
 * @throws Propagates invalid Intl locale/options/timezone errors; civil-date extraction can reject invalid dates.
 * @example
 * ```typescript
 * import { formatDateTime } from '@alneas/appkit-core/japan/date-utils';
 *
 * console.log(formatDateTime('2026-10-20T00:00:00Z', { timeZone: 'Asia/Tokyo' }));
 * ```
 */
export const formatDateTime = (date: Date | string, options?: Intl.DateTimeFormatOptions, locale = DEFAULT_LOCALE): string => core.formatDateTime(date, options, locale);
/**
 * Formats a short-month date followed by a parenthesized weekday/holiday label.
 *
 * @param date - Date or runtime-parseable string representing an instant.
 * @param locale - Date/weekday locale, default ja-JP.
 * @returns Localized date and weekday using the host-local timezone, with 祝 for Japanese-locale holidays.
 * @throws Propagates invalid Intl locale/options/timezone errors; civil-date extraction can reject invalid dates.
 * @example
 * ```typescript
 * import { formatDateWithWeekday } from '@alneas/appkit-core/japan/date-utils';
 *
 * console.log(formatDateWithWeekday('2026-10-20T00:00:00Z'));
 * ```
 */
export const formatDateWithWeekday = (date: Date | string, locale = DEFAULT_LOCALE): string =>
  `${core.formatDate(date, { year: 'numeric', month: 'short', day: 'numeric' }, locale)}(${getWeekdayWithHoliday(date, locale)})`;
