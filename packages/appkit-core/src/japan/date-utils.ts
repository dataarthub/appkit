import * as core from "../data/date-utils";
import { japaneseHolidayCalendar } from './holidays';
export { japaneseHolidayCalendar } from './holidays';
export * from "../data/date-utils";
/** Japanese presentation defaults; pass a timezone explicitly for cross-host determinism. */
export const DEFAULT_LOCALE = 'ja-JP';
export const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土'] as const;
export const OFFSET_HOURS_JST = 9;
export const TIME_ZONE_JP = 'Asia/Tokyo';
export const isTimeZoneValid = (timezone: string, locale = DEFAULT_LOCALE): boolean => core.isTimeZoneValid(timezone, locale);
export const getWeekday = (date: Date | string, locale = DEFAULT_LOCALE, timeZone = core.TIME_ZONE_LOCAL): string => core.getWeekday(date, locale, timeZone);
export const isPublicHoliday = (date: Date | string, timeZone = core.TIME_ZONE_LOCAL): boolean => core.isPublicHoliday(date, japaneseHolidayCalendar, timeZone);
export const isWeekendOrHoliday = (date: Date | string, timeZone = core.TIME_ZONE_LOCAL): boolean => core.isWeekendOrHoliday(date, timeZone, japaneseHolidayCalendar);
export const getWeekdayWithHoliday = (date: Date | string, locale = DEFAULT_LOCALE, timeZone = core.TIME_ZONE_LOCAL): string =>
  core.getWeekdayWithHoliday(date, locale, timeZone, japaneseHolidayCalendar, locale.startsWith('ja') ? '祝' : '');
export const formatDate = (date: Date | string, options?: Intl.DateTimeFormatOptions, locale = DEFAULT_LOCALE): string => core.formatDate(date, options, locale);
export const formatTime = (date: Date | string, style: 'numeric' | '2-digit' = 'numeric', includeSeconds = false, locale = DEFAULT_LOCALE): string => core.formatTime(date, style, includeSeconds, locale);
export const formatDateTime = (date: Date | string, options?: Intl.DateTimeFormatOptions, locale = DEFAULT_LOCALE): string => core.formatDateTime(date, options, locale);
export const formatDateWithWeekday = (date: Date | string, locale = DEFAULT_LOCALE): string =>
  `${core.formatDate(date, { year: 'numeric', month: 'short', day: 'numeric' }, locale)}(${getWeekdayWithHoliday(date, locale)})`;
