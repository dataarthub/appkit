import { expect, it } from 'bun:test';
import { GanttCapacityIndex, exceedsCapacity } from './capacity-index';

it('treats overflowing accumulated demand as over capacity', () => {
  expect(exceedsCapacity(1e308 + 1e308, 1e308)).toBe(true);
  const index = new GanttCapacityIndex(10, () => {});
  index.reserve(0, 1, 1e308);
  expect(index.first(0, 10, 1e308, 1e308, false)).toBe(1);
});

it('matches a daily array for fractional overlapping reservations and bounded searches', () => {
  const usage = Array<number>(129).fill(0);
  const index = new GanttCapacityIndex(usage.length, () => {});
  let seed = 311;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed;
  };
  for (let i = 0; i < 300; i++) {
    const from = random() % usage.length;
    const to = Math.min(usage.length, from + (random() % 15));
    const units = ((random() % 4) + 1) / 10;
    index.reserve(from, to, units);
    for (let d = from; d < to; d++) usage[d] += units;
    for (const conflict of [false, true]) {
      const start = random() % usage.length;
      const end = Math.min(usage.length, start + (random() % 40));
      const capacity = ((random() % 100) + 1) / 10;
      const expected = usage.findIndex(
        (value, d) =>
          d >= start && d < end && exceedsCapacity(value + units, capacity) === conflict,
      );
      expect(index.first(start, end, units, capacity, conflict)).toBe(expected);
    }
  }
});
it('skips large uniform ranges and keeps search/update work bounded', () => {
  let checks = 0;
  const index = new GanttCapacityIndex(36601, () => {
    checks++;
  });
  index.reserve(0, 30000, 1);
  expect(index.first(0, 36601, 1, 1, false)).toBe(30000);
  expect(index.first(0, 30000, 1, 1, false)).toBe(-1);
  expect(checks).toBeLessThan(150);
  const bounded = new GanttCapacityIndex(20, () => {
    throw new Error('budget');
  });
  expect(() => bounded.reserve(0, 1, 1)).toThrow('budget');
});
