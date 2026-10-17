import { test, expect } from 'bun:test';
import { formatUSD, formatUSDate, US_BUSINESS_DEFAULTS } from './format';
test('USD presentation uses dollars, cents, grouping and negative credits', () => {
  expect(formatUSD(1234.5)).toBe('$1,234.50');
  expect(formatUSD(0)).toBe('$0.00');
  expect(formatUSD(-1.25)).toBe('-$1.25');
  for (const value of [NaN, Infinity, -Infinity]) expect(() => formatUSD(value)).toThrow(RangeError);
  expect(Object.isFrozen(US_BUSINESS_DEFAULTS)).toBe(true);
});
test('date presentation requires a timezone and respects different US dates for one instant', () => {
  const instant = new Date('2026-07-04T02:00:00Z');
  expect(formatUSDate(instant, 'UTC')).toBe('7/4/2026');
  expect(formatUSDate(instant, 'America/New_York')).toBe('7/3/2026');
  expect(() => formatUSDate(new Date(NaN), 'UTC')).toThrow(RangeError);
  expect(() => formatUSDate(instant, '')).toThrow(TypeError);
  expect(() => formatUSDate(instant, 'invalid/timezone')).toThrow(RangeError);
});
