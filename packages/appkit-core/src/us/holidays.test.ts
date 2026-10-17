import { test, expect } from 'bun:test';
import { getUSFederalHolidays, usFederalHolidayCalendar, createUSFederalHolidayCalendar } from './holidays';
test('2026 observed dates match the OPM recurring holiday schedule', () => {
  expect(getUSFederalHolidays(2026).map(h => h.date)).toEqual([
    '2026-01-01', '2026-01-19', '2026-02-16', '2026-05-25', '2026-06-19', '2026-07-03',
    '2026-09-07', '2026-10-12', '2026-11-11', '2026-11-26', '2026-12-25',
  ]);
  expect(getUSFederalHolidays(2026, { observed: false }).find(h => h.name === 'Independence Day')?.date).toBe('2026-07-04');
});
test('observed holidays cross year boundaries without losing New Year', () => {
  const dates = getUSFederalHolidays(2021);
  expect(dates.find(h => h.date === '2021-12-31')?.actualDate).toBe('2022-01-01');
  expect(dates.find(h => h.actualDate === '2021-06-19')?.date).toBe('2021-06-18');
  expect(getUSFederalHolidays(2022).some(h => h.actualDate === '2022-01-01')).toBe(false);
  expect(getUSFederalHolidays(2022, { observed: false })).toHaveLength(11);
  expect(getUSFederalHolidays(2023)[0]?.date).toBe('2023-01-02');
  expect(getUSFederalHolidays(2028).find(h => h.name === 'Memorial Day')?.date).toBe('2028-05-29');
  expect(getUSFederalHolidays(2099).every(h => h.date.startsWith('2099-'))).toBe(true);
});
test('provider accepts zero-based civil dates and validates input independently of host timezone', () => {
  expect(usFederalHolidayCalendar({ year: 2026, month: 6, day: 3 })).toBe(true);
  expect(usFederalHolidayCalendar({ year: 2026, month: 6, day: 4 })).toBe(false);
  for (const parts of [{ year: 2026, month: 1, day: 30 }, { year: 2026, month: 12, day: 1 }, { year: 2026, month: 0, day: 0 }, { year: 2026, month: NaN, day: 1 }]) expect(() => usFederalHolidayCalendar(parts)).toThrow(RangeError);
  for (const year of [2020, 2100, 2026.5, NaN]) expect(() => getUSFederalHolidays(year)).toThrow(RangeError);
  const mutable = getUSFederalHolidays(2026); mutable[0]!.date = 'changed';
  expect(getUSFederalHolidays(2026)[0]?.date).toBe('2026-01-01');
});

test('one-off and company overrides use exact dates, exclusion priority and stable snapshots', () => {
  const additions = [{ date: '2026-12-24', name: 'Company closure' }, { date: '2026-07-04', name: 'Saturday closure' }];
  const exclusions = ['2026-07-03'];
  const calendar = createUSFederalHolidayCalendar({ additionalHolidays: additions, excludedDates: exclusions });
  additions[0]!.date = '2026-12-23'; exclusions.push('2026-12-24');
  expect(calendar({ year: 2026, month: 11, day: 24 })).toBe(true);
  expect(calendar({ year: 2026, month: 6, day: 3 })).toBe(false);
  expect(calendar({ year: 2026, month: 6, day: 4 })).toBe(true);
  expect(getUSFederalHolidays(2026, { additionalHolidays: [{ date: '2026-12-25', name: 'Custom label' }] }).find(h => h.date === '2026-12-25')?.name).toBe('Custom label');
  expect(getUSFederalHolidays(2026, { additionalHolidays: [{ date: '2026-12-24', name: 'Closure' }], excludedDates: ['2026-12-24'] }).some(h => h.date === '2026-12-24')).toBe(false);
  expect(() => createUSFederalHolidayCalendar({ excludedDates: ['2026-02-30'] })).toThrow(RangeError);
  expect(() => getUSFederalHolidays(2026, { additionalHolidays: [{ date: '2026-12-24', name: '' }] })).toThrow(TypeError);
  expect(() => calendar({ year: 2026, month: 1, day: 30 })).toThrow(RangeError);
});
