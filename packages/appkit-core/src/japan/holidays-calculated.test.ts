import { expect, test } from 'bun:test';
import holidays from '@holiday-jp/holiday_jp';
import { getCalculatedJapaneseHolidays, createCalculatedJapaneseHolidayCalendar } from './holidays-calculated';
import { createJapaneseHolidayCalendar, japaneseHolidayCalendar } from './holidays';

test('2026 calculated dates match the Cabinet Office schedule including substitute and citizens holidays', () => {
  expect(getCalculatedJapaneseHolidays(2026).map(h => h.date)).toEqual([
    '2026-01-01','2026-01-12','2026-02-11','2026-02-23','2026-03-20','2026-04-29',
    '2026-05-03','2026-05-04','2026-05-05','2026-05-06','2026-07-20','2026-08-11',
    '2026-09-21','2026-09-22','2026-09-23','2026-10-12','2026-11-03','2026-11-23',
  ]);
  expect(getCalculatedJapaneseHolidays(2027).some(h => h.date === '2027-03-22' && h.kind === 'substitute')).toBe(true);
});
test('ordinary calculated calendar matches installed holiday-jp across 2022–2050', () => {
  for (let year = 2022; year <= 2050; year++) {
    const expected = holidays.between(new Date(year, 0, 1), new Date(year, 11, 31)).map(h => `${h.date.getFullYear()}-${String(h.date.getMonth()+1).padStart(2,'0')}-${String(h.date.getDate()).padStart(2,'0')}`);
    expect(getCalculatedJapaneseHolidays(year).map(h => h.date)).toEqual(expected);
  }
});
test('dataset remains default and retains historical special holiday moves', () => {
  const dataset = createJapaneseHolidayCalendar();
  expect(dataset({ year: 2021, month: 6, day: 22 })).toBe(true);
  expect(dataset({ year: 2019, month: 4, day: 1 })).toBe(true);
  expect(dataset({ year: 2026, month: 0, day: 1 })).toBe(japaneseHolidayCalendar({ year: 2026, month: 0, day: 1 }));
  expect(() => createJapaneseHolidayCalendar({ source: 'calculated' })({ year: 2021, month: 6, day: 22 })).toThrow(RangeError);
});
test('mode selection, announced equinox days, explicit overrides and input validation', () => {
  const added = ['2026-12-24'];
  const calendar = createJapaneseHolidayCalendar({ source: 'calculated', additionalHolidays: added, excludedDates: ['2026-01-01'] });
  added.push('2026-12-25');
  expect(calendar({ year: 2026, month: 11, day: 24 })).toBe(true);
  expect(calendar({ year: 2026, month: 11, day: 25 })).toBe(false);
  expect(calendar({ year: 2026, month: 0, day: 1 })).toBe(false);
  const official = createCalculatedJapaneseHolidayCalendar(() => ({ vernal: 20, autumnal: 23 }));
  expect(official({ year: 2026, month: 2, day: 20 })).toBe(true);
  expect(createJapaneseHolidayCalendar({ additionalHolidays: ['2026-12-24'], excludedDates: ['2026-12-24'] })({ year: 2026, month: 11, day: 24 })).toBe(false);
  for (const year of [2021, 2100, NaN, 2026.5]) expect(() => getCalculatedJapaneseHolidays(year)).toThrow(RangeError);
  expect(() => calendar({ year: 2026, month: 1, day: 30 })).toThrow(RangeError);
  expect(() => createJapaneseHolidayCalendar({ excludedDates: ['2026-02-30'] })).toThrow(RangeError);
  expect(() => getCalculatedJapaneseHolidays(2026, { vernal: 1, autumnal: 23 })).toThrow(RangeError);
  expect(getCalculatedJapaneseHolidays(2099).length).toBeGreaterThanOrEqual(16);
});
