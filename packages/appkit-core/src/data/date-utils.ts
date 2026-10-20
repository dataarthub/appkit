/**
 * @fileoverview Date utility functions for timezone-aware date handling
 *
 * Provides:
 * - Timezone-aware formatting (formatDate, formatTime, formatDateTime)
 * - Date manipulation (addDays, addMonths, addHours, setTime)
 * - Date comparison (isSameDay, compareDates, compareTimes)
 * - Weekday and holiday functions (getWeekday, isPublicHoliday, isWeekend)
 * - Age calculation from birth date
 *
 * Inputs and validation differ by function. Defaults reflect the host locale/timezone
 * at module evaluation; explicit timezone arguments are preferred for reproducibility.
 *
 * @module lib/date-utils
 */


// =============================================================================
// Types
// =============================================================================

/**
 * Carries a minute-of-day value or an absent value; the type does not enforce a range.
 * @see {@link getMinutesFromMidnight} for extraction from a valid instant.
 */
export type MinFromMidnight = number | undefined;

/**
 * Carries a duration in minutes or an absent value; fractions and negative values are not excluded.
 * @see {@link addMinutes} for elapsed-time arithmetic.
 */
export type Minutes = number | undefined;

// =============================================================================
// Constants
// =============================================================================

/** Host locale resolved at module evaluation, with en-US as the fallback; explicit locales make formatting reproducible.
 * @see {@link formatDate} */
export const DEFAULT_LOCALE = Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';

/** Host timezone resolved at module evaluation, with UTC as the fallback; it does not track subsequent host configuration changes.
 * @see {@link getDateParts} */
export const TIME_ZONE_LOCAL = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

/** Fixed 24-hour duration in milliseconds, not the elapsed length of every local civil day.
 * @see {@link addDays} */
export const ONE_DAY_MS = 86_400_000;

/** Fixed one-hour duration in milliseconds.
 * @see {@link addHours} */
export const ONE_HOUR_MS = 3_600_000;

/** Rounded whole-hour host offset measured at module evaluation; fractional-hour zones lose precision and later DST changes are not reflected.
 * @see {@link getDateParts} for timezone-specific fields at an actual instant. */
export const OFFSET_HOURS_LOCAL = Math.round(-(new Date().getTimezoneOffset() / 60));


// =============================================================================
// Core Utilities
// =============================================================================

/**
 * Returns an existing Date by reference or parses a string with the JavaScript Date constructor.
 * @param date - Date to retain by reference, or a string interpreted by the runtime Date parser.
 * @returns The same Date instance for Date inputs, otherwise a new Date. Invalid strings produce an invalid Date rather than an exception.
 * @remarks No validation, timezone normalization or cloning of Date inputs is performed.
 * @example
 * ```ts
 * import { toDate } from '@alneas/appkit-core/data/date-utils';
 * const original = new Date('2024-01-15T00:00:00Z');
 * console.log(toDate(original) === original); // true
 * console.log(Number.isNaN(toDate('invalid').getTime())); // true
 * ```
 */
export const toDate = (date: Date | string): Date => (date instanceof Date ? date : new Date(date));

/**
 * Extracts calendar fields for an instant in a selected timezone using Intl.
 * @param date - Instant to format; must be a valid Date.
 * @param timeZone - Timezone accepted by Intl.DateTimeFormat; defaults to the module-load TIME_ZONE_LOCAL.
 * @returns A new object with numeric year, zero-based month, day, 24-hour clock fields and an English short weekday.
 * @throws Propagates Intl errors for an invalid instant or unsupported timezone.
 * @example
 * ```ts
 * import { getDateParts } from '@alneas/appkit-core/data/date-utils';
 * console.log(getDateParts(new Date('2024-01-15T23:30:00Z'), 'Asia/Tokyo').day); // 16
 * ```
 */
export const getDateParts = (date: Date, timeZone = TIME_ZONE_LOCAL) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    weekday: 'short',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '0';

  return {
    /** Calendar year in the requested timezone. */
    year: parseInt(get('year')),
    /** Zero-based month in the requested timezone. */
    month: parseInt(get('month')) - 1,
    /** Day of the month in the requested timezone. */
    day: parseInt(get('day')),
    /** Hour in the requested timezone using the h23 hour cycle. */
    hour: parseInt(get('hour')),
    /** Minute field in the requested timezone. */
    minute: parseInt(get('minute')),
    /** Second field in the requested timezone. */
    second: parseInt(get('second')),
    /** English short weekday produced by Intl. */
    weekday: get('weekday'),
  };
};

/**
 * Calculates the offset in minutes for the target timezone.
 *
 * @param {Date} date - Date
 * @param {string} [timeZone] - Timezone
 * @returns {number} Offset in minutes
 */
const getTimezoneOffset = (date: Date, timeZone = TIME_ZONE_LOCAL): number => {
  const p = getDateParts(date, timeZone);
  return Math.round((Date.UTC(p.year, p.month, p.day, p.hour, p.minute, p.second) - Math.floor(date.getTime() / 1000) * 1000) / 60000);
};

// =============================================================================
// Validation
// =============================================================================

/**
 * Checks whether Intl accepts a timezone and locale combination.
 * @param timezone - Timezone identifier to test.
 * @param locale - Locale passed to Intl; defaults to the module-load DEFAULT_LOCALE.
 * @returns True when Intl.DateTimeFormat construction succeeds, otherwise false; an invalid locale also yields false.
 * @example
 * ```ts
 * import { isTimeZoneValid } from '@alneas/appkit-core/data/date-utils';
 * console.log(isTimeZoneValid('Asia/Tokyo', 'en-US')); // true
 * console.log(isTimeZoneValid('Invalid/Zone', 'en-US')); // false
 * ```
 */
export const isTimeZoneValid = (timezone: string, locale = DEFAULT_LOCALE): boolean => {
  try {
    Intl.DateTimeFormat(locale, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
};

// =============================================================================
// Weekday Functions
// =============================================================================

/**
 * Returns the weekday number for an instant in a selected timezone.
 * @param date - Date or runtime-parseable string identifying the instant.
 * @param timeZone - Timezone for the calendar day; defaults to TIME_ZONE_LOCAL.
 * @returns Sunday as zero through Saturday as six, based on English short weekday parts.
 * @throws Propagates Intl errors for invalid dates or unsupported timezones.
 * @example
 * ```ts
 * import { getWeekdayNumber } from '@alneas/appkit-core/data/date-utils';
 * console.log(getWeekdayNumber('2024-01-15T12:00:00Z', 'UTC')); // 1
 * ```
 */
export const getWeekdayNumber = (date: Date | string, timeZone = TIME_ZONE_LOCAL): number => {
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const { weekday } = getDateParts(toDate(date), timeZone);
  return weekdayMap[weekday] ?? 0;
};

/**
 * Formats a short weekday name in a selected locale and timezone.
 * @param date - Date or runtime-parseable string identifying the instant.
 * @param locale - Locale for the weekday text; defaults to DEFAULT_LOCALE.
 * @param timeZone - Timezone for the calendar day; defaults to TIME_ZONE_LOCAL.
 * @returns The locale's short weekday representation; invalid dates follow Date.toLocaleDateString behavior.
 * @throws Propagates invalid locale/timezone option errors from Intl.
 * @example
 * ```ts
 * import { getWeekday } from '@alneas/appkit-core/data/date-utils';
 * console.log(getWeekday('2024-01-15T12:00:00Z', 'en-US', 'UTC')); // 'Mon'
 * ```
 */
export const getWeekday = (
  date: Date | string,
  locale = DEFAULT_LOCALE,
  timeZone = TIME_ZONE_LOCAL,
): string => {
  return toDate(date).toLocaleDateString(locale, {
    timeZone,
    weekday: 'short',
  });
};

/**
 * Checks whether the selected timezone places an instant on Saturday or Sunday.
 * @param date - Date or runtime-parseable string to inspect.
 * @param timeZone - Timezone for the calendar day; defaults to TIME_ZONE_LOCAL.
 * @returns True for weekday numbers zero or six; public holidays are not considered.
 * @throws Propagates Intl errors for invalid dates or unsupported timezones.
 * @example
 * ```ts
 * import { isWeekend } from '@alneas/appkit-core/data/date-utils';
 * console.log(isWeekend('2024-01-13T12:00:00Z', 'UTC')); // true
 * ```
 */
export const isWeekend = (date: Date | string, timeZone = TIME_ZONE_LOCAL): boolean => {
  const day = getWeekdayNumber(date, timeZone);
  return day === 0 || day === 6;
};

/**
 * Decides whether extracted calendar fields represent a host-defined holiday.
 * @param parts - Date/time parts from getDateParts; month is zero-based. Callers may supply additional fields.
 * @returns True when the host calendar marks the supplied day as a holiday.
 * @remarks No regional data, network lookup or legal holiday determination is provided by this type.
 * @example
 * ```ts
 * import type { HolidayCalendar } from '@alneas/appkit-core/data/date-utils';
 * const newYear: HolidayCalendar = ({ month, day }) => month === 0 && day === 1;
 * console.log(newYear({ year: 2024, month: 0, day: 1 })); // true
 * ```
 */
export type HolidayCalendar = (parts: {
  /** Calendar year. */
  year: number;
  /** Month from zero through eleven. */
  month: number;
  /** Day of the month from one through thirty-one. */
  day: number;
}) => boolean;
/**
 * Asks the supplied calendar whether an instant falls on a holiday in the selected timezone.
 * @param date - Date or runtime-parseable string identifying the instant.
 * @param calendar - Synchronous host calendar receiving local parts, including a zero-based month; no regional holiday data is loaded.
 * @param timeZone - Timezone for extracting date parts; defaults to TIME_ZONE_LOCAL.
 * @returns The callback's boolean result; this helper does not cache or independently verify a holiday designation.
 * @throws Propagates date/timezone errors and exceptions raised by calendar.
 * @example
 * ```ts
 * import { isPublicHoliday, HolidayCalendar } from '@alneas/appkit-core/data/date-utils';
 * const calendar: HolidayCalendar = ({ month, day }) => month === 0 && day === 1;
 * console.log(isPublicHoliday('2024-01-01T12:00:00Z', calendar, 'UTC')); // true
 * ```
 */
export const isPublicHoliday = (date: Date | string, calendar: HolidayCalendar, timeZone = TIME_ZONE_LOCAL): boolean =>
  calendar(getDateParts(toDate(date), timeZone));
/**
 * Checks weekends first, then an optional host-supplied holiday calendar.
 * @param date - Date or runtime-parseable string identifying the instant.
 * @param timeZone - Timezone for date extraction; defaults to TIME_ZONE_LOCAL.
 * @param calendar - Optional synchronous calendar; absence limits the result to weekends.
 * @returns True on a weekend or calendar holiday. The callback is not invoked for weekends because evaluation short-circuits.
 * @throws Propagates date/timezone errors and any invoked calendar exception.
 * @example
 * ```ts
 * import { isWeekendOrHoliday } from '@alneas/appkit-core/data/date-utils';
 * console.log(isWeekendOrHoliday('2024-01-13T12:00:00Z', 'UTC')); // true
 * ```
 */
export const isWeekendOrHoliday = (date: Date | string, timeZone = TIME_ZONE_LOCAL, calendar?: HolidayCalendar): boolean =>
  isWeekend(date, timeZone) || (calendar ? isPublicHoliday(date, calendar, timeZone) : false);
/**
 * Appends a caller-selected suffix when the supplied calendar marks the date as a holiday.
 * @param date - Date or runtime-parseable string identifying the instant.
 * @param locale - Locale for the short weekday; defaults to DEFAULT_LOCALE.
 * @param timeZone - Timezone for the weekday and calendar lookup; defaults to TIME_ZONE_LOCAL.
 * @param calendar - Optional synchronous calendar; no calendar means no suffix.
 * @param holidaySuffix - Text appended verbatim for a holiday; defaults to an empty string.
 * @returns The localized short weekday followed by the suffix only when the callback returns true.
 * @throws Propagates Intl option errors and calendar exceptions; a calendar lookup also rejects invalid dates.
 * @example
 * ```ts
 * import { getWeekdayWithHoliday } from '@alneas/appkit-core/data/date-utils';
 * console.log(getWeekdayWithHoliday('2024-01-01T12:00:00Z', 'en-US', 'UTC', () => true, ' (holiday)')); // 'Mon (holiday)'
 * ```
 */
export const getWeekdayWithHoliday = (
  date: Date | string, locale = DEFAULT_LOCALE, timeZone = TIME_ZONE_LOCAL,
  calendar?: HolidayCalendar, holidaySuffix = '',
): string => getWeekday(date, locale, timeZone) + (calendar && isPublicHoliday(date, calendar, timeZone) ? holidaySuffix : '');

// =============================================================================
// Formatting Functions
// =============================================================================

/**
 * Formats an instant as a localized date with optional Intl formatting overrides.
 * @param date - Date or runtime-parseable string to format.
 * @param options - Optional Intl options; an explicit timeZone overrides TIME_ZONE_LOCAL.
 * @param locale - Locale for formatting; defaults to DEFAULT_LOCALE.
 * @returns The runtime's localized date text, or its invalid-date representation for an invalid Date.
 * @throws Propagates invalid locale or Intl option errors.
 * @example
 * ```ts
 * import { formatDate } from '@alneas/appkit-core/data/date-utils';
 * console.log(formatDate('2024-01-15T12:00:00Z', { timeZone: 'UTC' }, 'en-US')); // '1/15/2024'
 * ```
 */
export const formatDate = (
  date: Date | string,
  options?: Intl.DateTimeFormatOptions,
  locale = DEFAULT_LOCALE,
): string => {
  return toDate(date).toLocaleDateString(locale, {
    timeZone: TIME_ZONE_LOCAL,
    ...options,
  });
};

/**
 * Formats an instant's clock time in the module-load local timezone.
 * @param date - Date or runtime-parseable string to format.
 * @param style - Intl hour/minute digit style; defaults to 'numeric'. The locale determines hour-cycle presentation.
 * @param includeSeconds - Whether to request seconds using the same digit style; defaults to false.
 * @param locale - Locale for formatting; defaults to DEFAULT_LOCALE.
 * @returns Localized time text, including locale-dependent hour-cycle and day-period markers. It is not guaranteed to be HH:mm.
 * @throws Propagates invalid locale/Intl option errors.
 * @example
 * ```ts
 * import { formatTime } from '@alneas/appkit-core/data/date-utils';
 * const text = formatTime('2024-01-15T12:30:45Z', '2-digit', true, 'en-US');
 * console.log(text); // Exact clock text depends on TIME_ZONE_LOCAL.
 * ```
 */
export const formatTime = (
  date: Date | string,
  style: 'numeric' | '2-digit' = 'numeric',
  includeSeconds = false,
  locale = DEFAULT_LOCALE,
): string => {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: TIME_ZONE_LOCAL,
    hour: style,
    minute: style,
    ...(includeSeconds && { second: style }),
  };
  return toDate(date).toLocaleTimeString(locale, options);
};

/**
 * Formats an instant as localized date and time with optional Intl overrides.
 * @param date - Date or runtime-parseable string to format.
 * @param options - Optional Intl options; an explicit timeZone overrides TIME_ZONE_LOCAL.
 * @param locale - Locale for formatting; defaults to DEFAULT_LOCALE.
 * @returns Localized date/time text; punctuation and selected fields follow Intl options and runtime locale data.
 * @throws Propagates invalid locale/Intl option errors.
 * @example
 * ```ts
 * import { formatDateTime } from '@alneas/appkit-core/data/date-utils';
 * console.log(formatDateTime('2024-01-15T12:30:00Z', { timeZone: 'UTC' }, 'en-US'));
 * ```
 */
export const formatDateTime = (
  date: Date | string,
  options?: Intl.DateTimeFormatOptions,
  locale = DEFAULT_LOCALE,
): string => {
  return toDate(date).toLocaleString(locale, {
    timeZone: TIME_ZONE_LOCAL,
    ...options,
  });
};

/**
 * Formats a short-month date followed by a parenthesized localized weekday.
 * @param date - Date or runtime-parseable string to format.
 * @param locale - Locale for both date and weekday; defaults to DEFAULT_LOCALE.
 * @returns Date text and weekday joined without an intervening space; both use TIME_ZONE_LOCAL.
 * @throws Propagates invalid locale/Intl option errors.
 * @example
 * ```ts
 * import { formatDateWithWeekday } from '@alneas/appkit-core/data/date-utils';
 * console.log(formatDateWithWeekday('2024-01-15T12:00:00Z', 'en-US')); // Host timezone controls the day.
 * ```
 */
export const formatDateWithWeekday = (date: Date | string, locale = DEFAULT_LOCALE): string => {
  const d = toDate(date);
  const dateStr = d.toLocaleDateString(locale, {
    timeZone: TIME_ZONE_LOCAL,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  return `${dateStr}(${getWeekday(d, locale, TIME_ZONE_LOCAL)})`;
};

// =============================================================================
// Date Manipulation
// =============================================================================

/**
 * Selects an instant with the requested wall-clock time on the date observed in a selected timezone.
 * @param date - Date or runtime-parseable string providing the calendar day in the target timezone.
 * @param hour - Integer hour from zero through 23.
 * @param minute - Integer minute from zero through 59; defaults to zero.
 * @param second - Integer second from zero through 59; defaults to zero.
 * @param timeZone - Timezone for calendar extraction and wall-clock resolution; absent/empty values use TIME_ZONE_LOCAL.
 * @returns A new Date with millisecond zero. If the wall time occurs twice, the earlier matching instant is returned.
 * @throws For non-integer/out-of-range clock values, a timezone gap with no matching instant, or invalid Date/Intl timezone input.
 * @remarks Offsets are sampled around the requested wall date; this is not a general historical timezone-disambiguation API. Input Date objects are not mutated.
 * @example
 * ```ts
 * import { setTime } from '@alneas/appkit-core/data/date-utils';
 * console.log(setTime('2024-01-15T12:00:00Z', 0, 0, 0, 'Asia/Tokyo').toISOString()); // '2024-01-14T15:00:00.000Z'
 * ```
 */
export const setTime = (
  date: Date | string,
  hour: number,
  minute = 0,
  second = 0,
  timeZone?: string,
): Date => {
  const d = toDate(date);
  const tz = timeZone || TIME_ZONE_LOCAL;
  const parts = getDateParts(d, tz);
  if (![hour, minute, second].every(Number.isInteger) || hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) throw new Error('Invalid wall-clock time');
  const wall = Date.UTC(parts.year, parts.month, parts.day, hour, minute, second);
  const offsets = new Set<number>();
  for (let delta = -48; delta <= 48; delta += 6) offsets.add(getTimezoneOffset(new Date(wall + delta * 3600000), tz));
  const candidates = [...offsets].map(offset => new Date(wall - offset * 60000)).filter(candidate => {
    const p = getDateParts(candidate, tz);
    return p.year === parts.year && p.month === parts.month && p.day === parts.day && p.hour === hour && p.minute === minute && p.second === second;
  }).sort((a, b) => a.getTime() - b.getTime());
  if (!candidates.length) throw new Error('The requested wall-clock time does not exist in this timezone');
  return candidates[0];
};

/**
 * Resolves the requested wall-clock time on the current calendar day in a selected timezone.
 * @param hour - Integer hour from zero through 23; defaults to zero.
 * @param minute - Integer minute from zero through 59; defaults to zero.
 * @param second - Integer second from zero through 59; defaults to zero.
 * @param timeZone - Timezone defining today; defaults to TIME_ZONE_LOCAL.
 * @returns A new Date resolved by setTime using the current system clock; overlap selection follows setTime.
 * @throws Propagates setTime clock-range, missing wall-time and Intl errors.
 * @example
 * ```ts
 * import { getTodayAt } from '@alneas/appkit-core/data/date-utils';
 * console.log(getTodayAt(9, 0, 0, 'UTC').toISOString()); // Today's 09:00 UTC.
 * ```
 */
export const getTodayAt = (hour = 0, minute = 0, second = 0, timeZone = TIME_ZONE_LOCAL): Date =>
  setTime(new Date(), hour, minute, second, timeZone);

/**
 * Adds multiples of a fixed 24-hour duration to an instant.
 * @param date - Date or runtime-parseable string providing the starting instant.
 * @param days - Number of 86,400,000-millisecond periods to add; negative and fractional values are accepted.
 * @returns A new Date from elapsed-millisecond arithmetic; invalid/non-finite inputs produce an invalid Date.
 * @remarks This does not preserve wall-clock time across daylight-saving transitions and is not a civil-calendar day operation.
 * @example
 * ```ts
 * import { addDays } from '@alneas/appkit-core/data/date-utils';
 * console.log(addDays('2024-01-15T00:00:00Z', 7).toISOString()); // '2024-01-22T00:00:00.000Z'
 * ```
 */
export const addDays = (date: Date | string, days: number): Date =>
  new Date(toDate(date).getTime() + ONE_DAY_MS * days);

/**
 * Adds months using the host timezone and JavaScript Date.setMonth overflow rules.
 * @param date - Date or runtime-parseable string copied before modification.
 * @param months - Month count passed through Date.setMonth arithmetic; negative values subtract months.
 * @returns A new Date; month-end overflow and daylight-saving behavior follow the host Date implementation.
 * @remarks This does not clamp to the last day of the target month, accept a target timezone or mutate an input Date.
 * @example
 * ```ts
 * import { addMonths } from '@alneas/appkit-core/data/date-utils';
 * const start = new Date(2024, 0, 15, 12);
 * console.log(addMonths(start, 2).getMonth()); // 2 (March in the host timezone)
 * ```
 */
export const addMonths = (date: Date | string, months: number): Date => {
  const d = new Date(toDate(date));
  d.setMonth(d.getMonth() + months);
  return d;
};

/**
 * Adds fixed one-hour durations to an instant.
 * @param date - Date or runtime-parseable string providing the starting instant.
 * @param hours - Number of 3,600,000-millisecond periods; negative/fractional values are accepted.
 * @returns A new Date; invalid/non-finite inputs produce an invalid Date.
 * @example
 * ```ts
 * import { addHours } from '@alneas/appkit-core/data/date-utils';
 * console.log(addHours('2024-01-15T00:00:00Z', 3).toISOString()); // '2024-01-15T03:00:00.000Z'
 * ```
 */
export const addHours = (date: Date | string, hours: number): Date =>
  new Date(toDate(date).getTime() + ONE_HOUR_MS * hours);

/**
 * Adds fixed one-minute durations to an instant.
 * @param date - Date or runtime-parseable string providing the starting instant.
 * @param minutes - Number of 60,000-millisecond periods; negative/fractional values are accepted.
 * @returns A new Date; invalid/non-finite inputs produce an invalid Date.
 * @example
 * ```ts
 * import { addMinutes } from '@alneas/appkit-core/data/date-utils';
 * console.log(addMinutes('2024-01-15T00:00:00Z', 30).toISOString()); // '2024-01-15T00:30:00.000Z'
 * ```
 */
export const addMinutes = (date: Date | string, minutes: number): Date =>
  new Date(toDate(date).getTime() + minutes * 60_000);

// =============================================================================
// Date Calculation
// =============================================================================

/**
 * Calculates whole elapsed birthday years using the current host-local calendar date.
 * @param birthDate - Date or runtime-parseable string; its host-local year/month/day define the birthday.
 * @returns A non-negative age, or null for an invalid input or a future birthday. Leap-day handling follows month/day comparison.
 * @remarks The function reads the system clock and offers no explicit timezone or as-of date. It is not a legal age-eligibility determination.
 * @example
 * ```ts
 * import { getAge } from '@alneas/appkit-core/data/date-utils';
 * console.log(getAge('invalid')); // null
 * console.log(getAge('1990-05-15T12:00:00Z')); // Depends on today's host-local date.
 * ```
 */
export const getAge = (birthDate: Date | string): number | null => {
  const birth = toDate(birthDate);
  if (isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age >= 0 ? age : null;
};

/**
 * Extracts the hour/minute fields of an instant in a selected timezone and converts them to a minute count.
 * @param date - Date or runtime-parseable string to inspect.
 * @param timeZone - Timezone used for clock extraction; defaults to TIME_ZONE_LOCAL.
 * @returns Hour times 60 plus minute, from zero through 1439 for valid inputs; seconds are discarded.
 * @throws Propagates invalid-date or timezone errors from Intl.
 * @example
 * ```ts
 * import { getMinutesFromMidnight } from '@alneas/appkit-core/data/date-utils';
 * console.log(getMinutesFromMidnight('2024-01-15T14:30:00Z', 'UTC')); // 870
 * ```
 */
export const getMinutesFromMidnight = (date: Date | string, timeZone = TIME_ZONE_LOCAL): number => {
  const { hour, minute } = getDateParts(toDate(date), timeZone);
  return hour * 60 + minute;
};

// =============================================================================
// Date Comparison
// =============================================================================

/**
 * Compares the calendar year, month and day of two instants in a selected timezone.
 * @param date1 - First Date or runtime-parseable instant string.
 * @param date2 - Second Date or runtime-parseable instant string.
 * @param timeZone - Timezone defining both calendar days; defaults to TIME_ZONE_LOCAL.
 * @returns True when all three date fields match; time-of-day fields do not affect the result.
 * @throws Propagates invalid-date or timezone errors from Intl.
 * @example
 * ```ts
 * import { isSameDay } from '@alneas/appkit-core/data/date-utils';
 * console.log(isSameDay('2024-01-15T10:00:00Z', '2024-01-15T22:00:00Z', 'UTC')); // true
 * ```
 */
export const isSameDay = (
  date1: Date | string,
  date2: Date | string,
  timeZone = TIME_ZONE_LOCAL,
): boolean => {
  const p1 = getDateParts(toDate(date1), timeZone);
  const p2 = getDateParts(toDate(date2), timeZone);
  return p1.year === p2.year && p1.month === p2.month && p1.day === p2.day;
};

/**
 * Compares two colon-separated clock strings after converting their first two fields to numbers.
 * @param time1 - First clock string, conventionally HH:mm.
 * @param time2 - Second clock string, conventionally HH:mm.
 * @returns Minus one, one or zero for lower, higher or equal computed minute totals. Malformed fields can yield NaN and therefore compare as zero.
 * @remarks This is not a range/format validator. Seconds and additional fields are ignored; negative or out-of-range numeric fields are not rejected.
 * @example
 * ```ts
 * import { compareTimes } from '@alneas/appkit-core/data/date-utils';
 * console.log(compareTimes('09:00', '14:30')); // -1
 * console.log(compareTimes('invalid', '14:30')); // 0; validate before comparing.
 * ```
 */
export const compareTimes = (time1: string, time2: string): -1 | 0 | 1 => {
  const [h1, m1] = time1.split(':').map(Number);
  const [h2, m2] = time2.split(':').map(Number);

  const mins1 = h1 * 60 + m1;
  const mins2 = h2 * 60 + m2;

  if (mins1 < mins2) return -1;
  if (mins1 > mins2) return 1;
  return 0;
};

/**
 * Orders two instants by their calendar date in a selected timezone.
 * @param date1 - First Date or runtime-parseable instant string.
 * @param date2 - Second Date or runtime-parseable instant string.
 * @param timeZone - Timezone defining both calendar dates; defaults to TIME_ZONE_LOCAL.
 * @returns Minus one, one or zero when the first calendar date is earlier, later or equal; clock time is ignored.
 * @throws Propagates invalid-date or timezone errors from Intl.
 * @example
 * ```ts
 * import { compareDates } from '@alneas/appkit-core/data/date-utils';
 * console.log(compareDates('2024-01-15T12:00:00Z', '2024-01-20T12:00:00Z', 'UTC')); // -1
 * ```
 */
export const compareDates = (
  date1: Date | string,
  date2: Date | string,
  timeZone = TIME_ZONE_LOCAL,
): -1 | 0 | 1 => {
  const p1 = getDateParts(toDate(date1), timeZone);
  const p2 = getDateParts(toDate(date2), timeZone);

  const d1 = p1.year * 10000 + p1.month * 100 + p1.day;
  const d2 = p2.year * 10000 + p2.month * 100 + p2.day;

  if (d1 < d2) return -1;
  if (d1 > d2) return 1;
  return 0;
};

/**
 * Checks whether an instant lies between two inclusive timestamp bounds.
 * @param date - Date or runtime-parseable instant string to test.
 * @param start - Inclusive lower timestamp bound.
 * @param end - Inclusive upper timestamp bound.
 * @returns True when start <= date <= end in epoch milliseconds; invalid dates or reversed bounds produce false.
 * @remarks This compares instants rather than calendar days; an end date parsed at midnight does not include the remainder of that day.
 * @example
 * ```ts
 * import { isDateInRange } from '@alneas/appkit-core/data/date-utils';
 * console.log(isDateInRange('2024-01-15T12:00:00Z', '2024-01-01T00:00:00Z', '2024-01-31T23:59:59Z')); // true
 * ```
 */
export const isDateInRange = (
  date: Date | string,
  start: Date | string,
  end: Date | string,
): boolean => {
  const d = toDate(date).getTime();
  return d >= toDate(start).getTime() && d <= toDate(end).getTime();
};

/**
 * Checks whether an instant's selected-zone calendar date is before today's date.
 * @param date - Date or runtime-parseable instant string to test.
 * @param timeZone - Timezone defining today and the input's day; defaults to TIME_ZONE_LOCAL.
 * @returns True only for earlier calendar days; an earlier time today still returns false.
 * @throws Propagates date/timezone errors from compareDates.
 * @example
 * ```ts
 * import { isPast } from '@alneas/appkit-core/data/date-utils';
 * console.log(isPast(new Date(), 'UTC')); // false
 * ```
 */
export const isPast = (date: Date | string, timeZone = TIME_ZONE_LOCAL): boolean =>
  compareDates(date, new Date(), timeZone) < 0;

/**
 * Checks whether an instant's selected-zone calendar date is after today's date.
 * @param date - Date or runtime-parseable instant string to test.
 * @param timeZone - Timezone defining today and the input's day; defaults to TIME_ZONE_LOCAL.
 * @returns True only for later calendar days; a later time today still returns false.
 * @throws Propagates date/timezone errors from compareDates.
 * @example
 * ```ts
 * import { isFuture } from '@alneas/appkit-core/data/date-utils';
 * console.log(isFuture(new Date(), 'UTC')); // false
 * ```
 */
export const isFuture = (date: Date | string, timeZone = TIME_ZONE_LOCAL): boolean =>
  compareDates(date, new Date(), timeZone) > 0;

/**
 * Checks whether an instant shares today's calendar date in a selected timezone.
 * @param date - Date or runtime-parseable instant string to test.
 * @param timeZone - Timezone defining today and the input's day; defaults to TIME_ZONE_LOCAL.
 * @returns True when the calendar year, month and day match those of the current system clock.
 * @throws Propagates date/timezone errors from isSameDay.
 * @example
 * ```ts
 * import { isToday } from '@alneas/appkit-core/data/date-utils';
 * console.log(isToday(new Date(), 'UTC')); // true
 * ```
 */
export const isToday = (date: Date | string, timeZone = TIME_ZONE_LOCAL): boolean =>
  isSameDay(date, new Date(), timeZone);

// =============================================================================
// HTML Input Formatting
// =============================================================================

/**
 * Formats a value as a host-local HTML date-input string with a lexical fallback for unparseable date-shaped strings.
 * @param val - Date, Date-constructor-compatible value or other input. Falsy values, including numeric zero, yield an empty string.
 * @returns YYYY-MM-DD from host-local date parts, the first ten characters of an unparseable string starting with that pattern, or an empty string on other invalid/coercion failures.
 * @remarks This is not date validation: the lexical fallback can preserve impossible dates. A UTC string can display a different host-local day.
 * @example
 * ```ts
 * import { toInputDate } from '@alneas/appkit-core/data/date-utils';
 * console.log(toInputDate(new Date(2024, 0, 15))); // '2024-01-15'
 * console.log(toInputDate(null)); // ''
 * ```
 */
export function toInputDate(val: unknown): string {
  try {
    if (!val) return '';
    const d = val instanceof Date ? val : new Date(val as string | number);
    if (Number.isNaN(d.getTime())) {
      // Fallback: if already a formatted string, extract the date part
      if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
        return val.substring(0, 10);
      }
      return '';
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
}

/**
 * Formats a value as a host-local HTML datetime-local string with a lexical fallback.
 * @param val - Date, Date-constructor-compatible value or other input. Falsy values, including numeric zero, yield an empty string.
 * @returns YYYY-MM-DDTHH:mm from host-local fields, the first sixteen characters of an unparseable string matching that prefix, or an empty string on other failures.
 * @remarks Seconds and timezone offsets are omitted. The prefix fallback does not validate actual calendar or clock ranges.
 * @example
 * ```ts
 * import { toInputDateTime } from '@alneas/appkit-core/data/date-utils';
 * console.log(toInputDateTime(new Date(2024, 0, 15, 14, 30))); // '2024-01-15T14:30'
 * console.log(toInputDateTime(null)); // ''
 * ```
 */
export function toInputDateTime(val: unknown): string {
  try {
    if (!val) return '';
    const d = val instanceof Date ? val : new Date(val as string | number);
    if (Number.isNaN(d.getTime())) {
      // Fallback: if already a formatted datetime string
      if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) {
        return val.substring(0, 16);
      }
      return '';
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return '';
  }
}

// =============================================================================
// Extended Period Utilities (Added for Consolidation)
// =============================================================================

/**
 * Formats the current system instant as a date string in a selected timezone.
 * @param timeZone - Timezone defining the current calendar day; defaults to TIME_ZONE_LOCAL.
 * @returns The selected-zone year, padded month and day joined as YYYY-MM-DD.
 * @throws Propagates unsupported timezone errors from Intl.
 * @example
 * ```ts
 * import { getTodayDateString } from '@alneas/appkit-core/data/date-utils';
 * console.log(getTodayDateString('UTC')); // The current UTC calendar date.
 * ```
 */
export const getTodayDateString = (timeZone = TIME_ZONE_LOCAL): string => {
  const p = getDateParts(new Date(), timeZone);
  return `${p.year}-${String(p.month + 1).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
};

/**
 * Serializes the current system instant as a UTC ISO timestamp.
 * @returns A fresh Date's ISO timestamp including milliseconds and the UTC Z suffix.
 * @example
 * ```ts
 * import { getNowISOString } from '@alneas/appkit-core/data/date-utils';
 * console.log(getNowISOString()); // For example, a UTC timestamp ending in Z.
 * ```
 */
export const getNowISOString = (): string => new Date().toISOString();

/**
 * Parses a string with Date and resets the observed target-zone calendar day to midnight.
 * @param dateStr - Date-constructor input, conventionally YYYY-MM-DD. Date-only ISO input is initially parsed as UTC, not as a target-zone civil date.
 * @param timeZone - Timezone for observed-day extraction and midnight resolution; defaults to TIME_ZONE_LOCAL.
 * @returns A new Date at the observed day's target-zone midnight, using setTime's overlap rules.
 * @throws Propagates invalid-date, timezone or nonexistent-midnight errors from setTime.
 * @remarks For zones behind UTC, a YYYY-MM-DD input can resolve to the previous civil day. This implementation must not be used as a general timezone-independent civil-date parser.
 * @example
 * ```ts
 * import { parseLocalDate } from '@alneas/appkit-core/data/date-utils';
 * console.log(parseLocalDate('2024-01-15', 'UTC').toISOString()); // '2024-01-15T00:00:00.000Z'
 * ```
 */
export const parseLocalDate = (dateStr: string, timeZone = TIME_ZONE_LOCAL): Date => {
  return setTime(dateStr, 0, 0, 0, timeZone);
};

/**
 * Serializes a Date as a UTC ISO timestamp using Date.toISOString.
 * @param date - Valid Date to serialize; it is not mutated.
 * @returns A UTC ISO timestamp including milliseconds.
 * @throws RangeError when date is invalid, as thrown by Date.toISOString.
 * @example
 * ```ts
 * import { formatToISOString } from '@alneas/appkit-core/data/date-utils';
 * console.log(formatToISOString(new Date('2024-01-15T00:00:00Z'))); // '2024-01-15T00:00:00.000Z'
 * ```
 */
export const formatToISOString = (date: Date): string => date.toISOString();

/**
 * Builds a first-of-month string from selected-zone parts, then resolves the observed day to midnight.
 * @param date - Date or runtime-parseable instant string supplying selected-zone year/month.
 * @param timeZone - Timezone for extraction and midnight resolution; defaults to TIME_ZONE_LOCAL.
 * @returns The Date produced by setTime for that generated date-only string.
 * @throws Propagates invalid-date, timezone or nonexistent-midnight errors from Intl/setTime.
 * @remarks The intermediate ISO date-only string is parsed as UTC. In zones behind UTC the result can be the preceding civil day rather than the intended month's first day.
 * @example
 * ```ts
 * import { getStartOfMonth } from '@alneas/appkit-core/data/date-utils';
 * console.log(getStartOfMonth('2024-01-15T12:00:00Z', 'UTC').toISOString()); // '2024-01-01T00:00:00.000Z'
 * ```
 */
export const getStartOfMonth = (date: Date | string, timeZone = TIME_ZONE_LOCAL): Date => {
  const d = toDate(date);
  const parts = getDateParts(d, timeZone);
  const monthStr = String(parts.month + 1).padStart(2, '0');
  return setTime(`${parts.year}-${monthStr}-01`, 0, 0, 0, timeZone);
};

/**
 * Builds the selected calendar quarter's first date and resolves its observed target-zone day to midnight.
 * @param date - Date or runtime-parseable instant string supplying the selected-zone year/month.
 * @param timeZone - Timezone for extraction and midnight resolution; defaults to TIME_ZONE_LOCAL.
 * @returns The Date produced from the generated January/April/July/October first date through setTime.
 * @throws Propagates invalid-date, timezone or nonexistent-midnight errors.
 * @remarks The date-only intermediate is parsed as UTC. In zones behind UTC the result can be the preceding civil day, so this is not a general civil-quarter boundary API.
 * @example
 * ```ts
 * import { getStartOfQuarter } from '@alneas/appkit-core/data/date-utils';
 * console.log(getStartOfQuarter('2024-05-15T12:00:00Z', 'UTC').toISOString()); // '2024-04-01T00:00:00.000Z'
 * ```
 */
export const getStartOfQuarter = (date: Date | string, timeZone = TIME_ZONE_LOCAL): Date => {
  const d = toDate(date);
  const parts = getDateParts(d, timeZone);
  const quarterMonth = Math.floor(parts.month / 3) * 3 + 1;
  const monthStr = String(quarterMonth).padStart(2, '0');
  return setTime(`${parts.year}-${monthStr}-01`, 0, 0, 0, timeZone);
};

/**
 * Builds January first for the selected-zone year and resolves its observed day to midnight.
 * @param date - Date or runtime-parseable instant string supplying the selected-zone calendar year.
 * @param timeZone - Timezone for extraction and midnight resolution; defaults to TIME_ZONE_LOCAL.
 * @returns The Date produced by passing the generated date-only string to setTime.
 * @throws Propagates invalid-date, timezone or nonexistent-midnight errors.
 * @remarks The intermediate string is parsed as UTC. For zones behind UTC the observed day can be December 31 of the previous year.
 * @example
 * ```ts
 * import { getStartOfYear } from '@alneas/appkit-core/data/date-utils';
 * console.log(getStartOfYear('2024-05-15T12:00:00Z', 'UTC').toISOString()); // '2024-01-01T00:00:00.000Z'
 * ```
 */
export const getStartOfYear = (date: Date | string, timeZone = TIME_ZONE_LOCAL): Date => {
  const d = toDate(date);
  const parts = getDateParts(d, timeZone);
  return setTime(`${parts.year}-01-01`, 0, 0, 0, timeZone);
};

/**
 * Adds one host-local month to getStartOfMonth's result, then subtracts a fixed 24-hour duration.
 * @param date - Date or runtime-parseable instant string supplying the starting month.
 * @param timeZone - Timezone passed to getStartOfMonth; defaults to TIME_ZONE_LOCAL. Subsequent addMonths uses the host timezone.
 * @returns A new Date from the composed month/day arithmetic; it is not set to 23:59:59.999.
 * @throws Propagates invalid-date, timezone or nonexistent-midnight errors from getStartOfMonth.
 * @remarks Target-zone date-only parsing, host-local month overflow and elapsed-day subtraction can interact across timezone/DST boundaries. Verify the result before treating it as a civil month-end boundary.
 * @example
 * ```ts
 * import { getEndOfMonth } from '@alneas/appkit-core/data/date-utils';
 * console.log(getEndOfMonth('2024-01-15T12:00:00Z', 'UTC').toISOString()); // Exact result also depends on the host timezone.
 * ```
 */
export const getEndOfMonth = (date: Date | string, timeZone = TIME_ZONE_LOCAL): Date => {
  const startOfNextMonth = addMonths(getStartOfMonth(date, timeZone), 1);
  return addDays(startOfNextMonth, -1);
};
