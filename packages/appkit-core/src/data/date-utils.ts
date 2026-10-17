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
 * All functions handle both Date objects and ISO date strings.
 *
 * @module lib/date-utils
 */


// =============================================================================
// Types
// =============================================================================

/**
 * Minutes elapsed from midnight
 * @typedef {number | undefined} MinFromMidnight
 */
export type MinFromMidnight = number | undefined;

/**
 * Duration in minutes
 * @typedef {number | undefined} Minutes
 */
export type Minutes = number | undefined;

// =============================================================================
// Constants
// =============================================================================

/** Host locale; pass a locale explicitly for deterministic output. */
export const DEFAULT_LOCALE = Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';

/** Target timezone (defaults to local) */
export const TIME_ZONE_LOCAL = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

/** Milliseconds in one day (86,400,000) */
export const ONE_DAY_MS = 86_400_000;

/** Milliseconds in one hour (3,600,000) */
export const ONE_HOUR_MS = 3_600_000;

/** Local timezone offset in hours */
export const OFFSET_HOURS_LOCAL = Math.round(-(new Date().getTimezoneOffset() / 60));


// =============================================================================
// Core Utilities
// =============================================================================

/**
 * Converts a Date or ISO string to a Date object.
 *
 * @param {Date | string} date - Date or ISO string to convert
 * @returns {Date} Date object
 *
 * @example
 * toDate('2024-01-15'); // Date object for 2024-01-15
 * toDate(new Date()); // Returns the same Date object
 */
export const toDate = (date: Date | string): Date => (date instanceof Date ? date : new Date(date));

/**
 * Gets date parts in the specified timezone (internal use).
 *
 * @param {Date} date - Date to parse
 * @param {string} [timeZone] - Timezone (defaults to TIME_ZONE_LOCAL)
 * @returns {{ year: number, month: number, day: number, hour: number, minute: number, second: number, weekday: string }}
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
    year: parseInt(get('year')),
    month: parseInt(get('month')) - 1,
    day: parseInt(get('day')),
    hour: parseInt(get('hour')),
    minute: parseInt(get('minute')),
    second: parseInt(get('second')),
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
 * Checks if a timezone string is valid.
 *
 * @param {string} timezone - Timezone string to validate
 * @param {string} [locale] - Locale (defaults to DEFAULT_LOCALE)
 * @returns {boolean} True if valid
 *
 * @example
 * isTimeZoneValid('Asia/Tokyo'); // true
 * isTimeZoneValid('Invalid/Zone'); // false
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
 * Gets weekday as number in target timezone.
 *
 * @param {Date | string} date - Date or ISO string
 * @param {string} [timeZone] - Timezone (defaults to TIME_ZONE_LOCAL)
 * @returns {number} Weekday number (0=Sunday, 6=Saturday)
 *
 * @example
 * getWeekdayNumber('2024-01-15'); // 1 (Monday)
 * getWeekdayNumber('2024-01-15', 'Asia/Tokyo');
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
 * Gets weekday string in target timezone.
 *
 * @param {Date | string} date - Date or ISO string
 * @param {string} [locale] - Locale (defaults to DEFAULT_LOCALE)
 * @param {string} [timeZone] - Timezone (defaults to TIME_ZONE_LOCAL)
 * @returns {string} Weekday string (e.g., "Mon")
 *
 * @example
 * getWeekday('2024-01-15', 'en-US'); // "Mon"
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
 * Checks if date is a weekend (Saturday or Sunday).
 *
 * @param {Date | string} date - Date or ISO string
 * @param {string} [timeZone] - Timezone (defaults to TIME_ZONE_LOCAL)
 * @returns {boolean} True if weekend
 *
 * @example
 * isWeekend('2024-01-13'); // true (Saturday)
 * isWeekend('2024-01-15'); // false (Monday)
 */
export const isWeekend = (date: Date | string, timeZone = TIME_ZONE_LOCAL): boolean => {
  const day = getWeekdayNumber(date, timeZone);
  return day === 0 || day === 6;
};

/** Caller-provided holiday calendar; month is zero-based, matching Date. No regional data is loaded. */
export type HolidayCalendar = (parts: { year: number; month: number; day: number }) => boolean;
/** Checks a caller-selected calendar in the selected timezone. */
export const isPublicHoliday = (date: Date | string, calendar: HolidayCalendar, timeZone = TIME_ZONE_LOCAL): boolean =>
  calendar(getDateParts(toDate(date), timeZone));
/** Saturday/Sunday or a holiday from the explicitly supplied calendar. */
export const isWeekendOrHoliday = (date: Date | string, timeZone = TIME_ZONE_LOCAL, calendar?: HolidayCalendar): boolean =>
  isWeekend(date, timeZone) || (calendar ? isPublicHoliday(date, calendar, timeZone) : false);
/** Formats the weekday with a caller-selected holiday suffix/calendar. */
export const getWeekdayWithHoliday = (
  date: Date | string, locale = DEFAULT_LOCALE, timeZone = TIME_ZONE_LOCAL,
  calendar?: HolidayCalendar, holidaySuffix = '',
): string => getWeekday(date, locale, timeZone) + (calendar && isPublicHoliday(date, calendar, timeZone) ? holidaySuffix : '');

// =============================================================================
// Formatting Functions
// =============================================================================

/**
 * Formats date as localized date string.
 *
 * @param {Date | string} date - Date or ISO string
 * @param {Intl.DateTimeFormatOptions} [options] - Format options
 * @param {string} [locale] - Locale (defaults to DEFAULT_LOCALE)
 * @returns {string} Formatted date string
 *
 * @example
 * formatDate('2024-01-15', {}, 'en-US'); // "1/15/2024"
 * formatDate('2024-01-15', { year: 'numeric', month: 'long', day: 'numeric' }, 'en-US'); // "January 15, 2024"
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
 * Formats time as localized time string.
 *
 * @param {Date | string} date - Date or ISO string
 * @param {'numeric' | '2-digit'} [style='numeric'] - Digit style
 * @param {boolean} [includeSeconds=false] - Include seconds
 * @param {string} [locale] - Locale (defaults to DEFAULT_LOCALE)
 * @returns {string} Formatted time string (e.g., "14:30")
 *
 * @example
 * formatTime(new Date()); // "14:30"
 * formatTime(new Date(), '2-digit', true); // "14:30:45"
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
 * Formats both date and time.
 *
 * @param {Date | string} date - Date or ISO string
 * @param {Intl.DateTimeFormatOptions} [options] - Format options
 * @param {string} [locale] - Locale (defaults to DEFAULT_LOCALE)
 * @returns {string} Formatted date-time string
 *
 * @example
 * formatDateTime(new Date()); // "2024/1/15 14:30:00"
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
 * Formats date with a localized weekday (without a regional holiday calendar).
 *
 * @param {Date | string} date - Date or ISO string
 * @param {string} [locale] - Locale (defaults to DEFAULT_LOCALE)
 * @returns {string} Date string with weekday (e.g., "Jan 15, 2024(Mon)")
 *
 * @example
 * formatDateWithWeekday('2024-01-15', 'en-US'); // "Jan 15, 2024(Mon)"
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
 * Sets the time of a date in the target timezone.
 *
 * @param {Date | string} date - Date or ISO string
 * @param {number} hour - Hour (0-23)
 * @param {number} [minute=0] - Minute (0-59)
 * @param {number} [second=0] - Second (0-59)
 * @param {string} [timeZone] - Timezone (defaults to TIME_ZONE_LOCAL)
 * @returns {Date} New Date with time set
 *
 * @example
 * setTime('2024-01-15', 14, 30); // 2024-01-15 14:30:00 (local timezone)
 * setTime('2024-01-15', 0, 0, 0, 'Asia/Tokyo'); // 2024-01-15 00:00:00 JST
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
 * Gets today at the specified time.
 *
 * @param {number} [hour=0] - Hour (0-23)
 * @param {number} [minute=0] - Minute (0-59)
 * @param {number} [second=0] - Second (0-59)
 * @param {string} [timeZone] - Timezone (defaults to TIME_ZONE_LOCAL)
 * @returns {Date} Date for today at specified time
 *
 * @example
 * getTodayAt(9, 0); // Today at 9:00 AM
 */
export const getTodayAt = (hour = 0, minute = 0, second = 0, timeZone = TIME_ZONE_LOCAL): Date =>
  setTime(new Date(), hour, minute, second, timeZone);

/**
 * Adds days to a date.
 *
 * @param {Date | string} date - Date or ISO string
 * @param {number} days - Days to add (negative to subtract)
 * @returns {Date} New Date with days added
 *
 * @example
 * addDays('2024-01-15', 7); // 2024-01-22
 * addDays('2024-01-15', -1); // 2024-01-14
 */
export const addDays = (date: Date | string, days: number): Date =>
  new Date(toDate(date).getTime() + ONE_DAY_MS * days);

/**
 * Adds months to a date.
 *
 * @param {Date | string} date - Date or ISO string
 * @param {number} months - Months to add (negative to subtract)
 * @returns {Date} New Date with months added
 *
 * @example
 * addMonths('2024-01-15', 2); // 2024-03-15
 */
export const addMonths = (date: Date | string, months: number): Date => {
  const d = new Date(toDate(date));
  d.setMonth(d.getMonth() + months);
  return d;
};

/**
 * Adds hours to a date.
 *
 * @param {Date | string} date - Date or ISO string
 * @param {number} hours - Hours to add (negative to subtract)
 * @returns {Date} New Date with hours added
 *
 * @example
 * addHours('2024-01-15T14:00:00', 3); // 2024-01-15T17:00:00
 */
export const addHours = (date: Date | string, hours: number): Date =>
  new Date(toDate(date).getTime() + ONE_HOUR_MS * hours);

/**
 * Adds minutes to a date.
 *
 * @param {Date | string} date - Date or ISO string
 * @param {number} minutes - Minutes to add (negative to subtract)
 * @returns {Date} New Date with minutes added
 *
 * @example
 * addMinutes('2024-01-15T14:00:00', 30); // 2024-01-15T14:30:00
 */
export const addMinutes = (date: Date | string, minutes: number): Date =>
  new Date(toDate(date).getTime() + minutes * 60_000);

// =============================================================================
// Date Calculation
// =============================================================================

/**
 * Calculates age from birth date.
 *
 * @param {Date | string} birthDate - Birth date
 * @returns {number | null} Age or null if invalid
 *
 * @example
 * getAge('1990-05-15'); // 34 (as of 2024)
 * getAge('invalid'); // null
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
 * Gets minutes elapsed since midnight in target timezone.
 *
 * @param {Date | string} date - Date or ISO string
 * @param {string} [timeZone] - Timezone (defaults to TIME_ZONE_LOCAL)
 * @returns {number} Minutes since midnight (0-1439)
 *
 * @example
 * getMinutesFromMidnight('2024-01-15T14:30:00'); // 870 (14*60 + 30)
 */
export const getMinutesFromMidnight = (date: Date | string, timeZone = TIME_ZONE_LOCAL): number => {
  const { hour, minute } = getDateParts(toDate(date), timeZone);
  return hour * 60 + minute;
};

// =============================================================================
// Date Comparison
// =============================================================================

/**
 * Checks if two dates are on the same day in target timezone.
 *
 * @param {Date | string} date1 - First date
 * @param {Date | string} date2 - Second date
 * @param {string} [timeZone] - Timezone (defaults to TIME_ZONE_LOCAL)
 * @returns {boolean} True if same day
 *
 * @example
 * isSameDay('2024-01-15T10:00', '2024-01-15T22:00'); // true
 * isSameDay('2024-01-15', '2024-01-16'); // false
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
 * Compares two time strings in HH:mm format.
 *
 * @param {string} time1 - First time string (HH:mm)
 * @param {string} time2 - Second time string (HH:mm)
 * @returns {-1 | 0 | 1} Comparison result: -1 if time1 < time2, 1 if time1 > time2, 0 if equal
 *
 * @example
 * compareTimes('09:00', '14:30'); // -1
 * compareTimes('14:30', '09:00'); // 1
 * compareTimes('12:00', '12:00'); // 0
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
 * Compares the date parts of two dates in target timezone.
 *
 * @param {Date | string} date1 - First date
 * @param {Date | string} date2 - Second date
 * @param {string} [timeZone] - Timezone (defaults to TIME_ZONE_LOCAL)
 * @returns {-1 | 0 | 1} Comparison result: -1 if date1 < date2, 1 if date1 > date2, 0 if same day
 *
 * @example
 * compareDates('2024-01-15', '2024-01-20'); // -1
 * compareDates('2024-01-20', '2024-01-15'); // 1
 * compareDates('2024-01-15', '2024-01-15'); // 0
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
 * Checks if date is within the specified range (inclusive).
 *
 * @param {Date | string} date - Date to check
 * @param {Date | string} start - Range start date
 * @param {Date | string} end - Range end date
 * @returns {boolean} True if within range
 *
 * @example
 * isDateInRange('2024-01-15', '2024-01-01', '2024-01-31'); // true
 * isDateInRange('2024-02-15', '2024-01-01', '2024-01-31'); // false
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
 * Checks if date is before today.
 *
 * @param {Date | string} date - Date to check
 * @param {string} [timeZone] - Timezone (defaults to TIME_ZONE_LOCAL)
 * @returns {boolean} True if in the past
 *
 * @example
 * isPast('2020-01-01'); // true
 */
export const isPast = (date: Date | string, timeZone = TIME_ZONE_LOCAL): boolean =>
  compareDates(date, new Date(), timeZone) < 0;

/**
 * Checks if date is after today.
 *
 * @param {Date | string} date - Date to check
 * @param {string} [timeZone] - Timezone (defaults to TIME_ZONE_LOCAL)
 * @returns {boolean} True if in the future
 *
 * @example
 * isFuture('2030-01-01'); // true
 */
export const isFuture = (date: Date | string, timeZone = TIME_ZONE_LOCAL): boolean =>
  compareDates(date, new Date(), timeZone) > 0;

/**
 * Checks if date is today.
 *
 * @param {Date | string} date - Date to check
 * @param {string} [timeZone] - Timezone (defaults to TIME_ZONE_LOCAL)
 * @returns {boolean} True if today
 *
 * @example
 * isToday(new Date()); // true
 */
export const isToday = (date: Date | string, timeZone = TIME_ZONE_LOCAL): boolean =>
  isSameDay(date, new Date(), timeZone);

// =============================================================================
// HTML Input Formatting
// =============================================================================

/**
 * Converts a Date or ISO string to YYYY-MM-DD format for HTML date inputs.
 *
 * @param {any} val - Date, ISO string, or any value
 * @returns {string} Formatted date string or empty string
 *
 * @example
 * toInputDate(new Date(2024, 0, 15)); // "2024-01-15"
 * toInputDate('2024-01-15T10:30:00Z'); // "2024-01-15"
 * toInputDate(null); // ""
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
 * Converts a Date or ISO string to YYYY-MM-DDThh:mm format for HTML datetime-local inputs.
 *
 * @param {any} val - Date, ISO string, or any value
 * @returns {string} Formatted datetime string or empty string
 *
 * @example
 * toInputDateTime(new Date(2024, 0, 15, 14, 30)); // "2024-01-15T14:30"
 * toInputDateTime('2024-01-15T14:30:00Z'); // "2024-01-15T14:30" (local time)
 * toInputDateTime(null); // ""
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
 * Gets today's date string in YYYY-MM-DD format for target timezone.
 */
export const getTodayDateString = (timeZone = TIME_ZONE_LOCAL): string => {
  const p = getDateParts(new Date(), timeZone);
  return `${p.year}-${String(p.month + 1).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
};

/**
 * Gets current timestamp in ISO 8601 format.
 */
export const getNowISOString = (): string => new Date().toISOString();

/**
 * Parses YYYY-MM-DD string as the start of the day in target timezone.
 */
export const parseLocalDate = (dateStr: string, timeZone = TIME_ZONE_LOCAL): Date => {
  return setTime(dateStr, 0, 0, 0, timeZone);
};

/**
 * Converts Date object to ISO 8601 string.
 */
export const formatToISOString = (date: Date): string => date.toISOString();

/**
 * Gets the start of the month for the given date.
 */
export const getStartOfMonth = (date: Date | string, timeZone = TIME_ZONE_LOCAL): Date => {
  const d = toDate(date);
  const parts = getDateParts(d, timeZone);
  const monthStr = String(parts.month + 1).padStart(2, '0');
  return setTime(`${parts.year}-${monthStr}-01`, 0, 0, 0, timeZone);
};

/**
 * Gets the start of the quarter for the given date.
 */
export const getStartOfQuarter = (date: Date | string, timeZone = TIME_ZONE_LOCAL): Date => {
  const d = toDate(date);
  const parts = getDateParts(d, timeZone);
  const quarterMonth = Math.floor(parts.month / 3) * 3 + 1;
  const monthStr = String(quarterMonth).padStart(2, '0');
  return setTime(`${parts.year}-${monthStr}-01`, 0, 0, 0, timeZone);
};

/**
 * Gets the start of the year for the given date.
 */
export const getStartOfYear = (date: Date | string, timeZone = TIME_ZONE_LOCAL): Date => {
  const d = toDate(date);
  const parts = getDateParts(d, timeZone);
  return setTime(`${parts.year}-01-01`, 0, 0, 0, timeZone);
};

/**
 * Gets the end of the month for the given date.
 */
export const getEndOfMonth = (date: Date | string, timeZone = TIME_ZONE_LOCAL): Date => {
  const startOfNextMonth = addMonths(getStartOfMonth(date, timeZone), 1);
  return addDays(startOfNextMonth, -1);
};
