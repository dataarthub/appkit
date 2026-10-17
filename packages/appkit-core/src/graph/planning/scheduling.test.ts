import { describe, expect, it } from 'bun:test';
import { dependencyError, scheduleGanttTasks } from './scheduling';
import type { GanttDependency, GanttPlanningTask } from './types';

const date = (day: number, hour = 0) => new Date(2026, 8, day, hour);
const task = (id: string, start: number, end: number): GanttPlanningTask => ({
  id,
  created_at: date(start),
  start_date: date(start),
  due_date: date(end),
});
const link = (
  sourceId: string,
  targetId: string,
  type: GanttDependency['type'] = 'FS',
  lagDays = 0,
): GanttDependency => ({ id: `${sourceId}-${targetId}`, sourceId, targetId, type, lagDays });

describe('native forward Gantt scheduling', () => {
  for (const [type, expected] of [
    ['FS', 20],
    ['SS', 18],
    ['FF', 19],
    ['SF', 17],
  ] as const) {
    it(`enforces ${type} endpoints while preserving duration`, () => {
      const tasks = [task('source', 18, 20), task('target', 10, 11)];
      const result = scheduleGanttTasks(tasks, [link('source', 'target', type)]);
      expect(result[1].start_date).toEqual(date(expected));
      expect(result[1].due_date).toEqual(date(expected + 1));
      expect(result[0]).toBe(tasks[0]);
      expect(tasks[1].start_date).toEqual(date(10));
    });
  }
  it('cascades in topological order, not input order, taking the strongest predecessor', () => {
    const tasks = [task('c', 1, 2), task('b', 1, 3), task('a', 15, 17), task('other', 18, 20)];
    const result = scheduleGanttTasks(tasks, [link('a', 'b'), link('b', 'c'), link('other', 'c')]);
    expect(result[1].start_date).toEqual(date(17));
    expect(result[0].start_date).toEqual(date(20));
  });
  it('supports positive lag and negative lead without pulling already-late tasks earlier', () => {
    const tasks = [task('a', 10, 12), task('b', 1, 3)];
    expect(scheduleGanttTasks(tasks, [link('a', 'b', 'FS', 2)])[1].start_date).toEqual(date(14));
    expect(scheduleGanttTasks(tasks, [link('a', 'b', 'FS', -1)])[1].start_date).toEqual(date(11));
    const later = task('b', 20, 22);
    expect(scheduleGanttTasks([tasks[0], later], [link('a', 'b')])[1]).toBe(later);
  });
  it('rounds forward to a safe calendar-day shift when endpoints have different times', () => {
    const a = { ...task('a', 10, 12), due_date: date(12, 18) };
    const b = { ...task('b', 12, 13), start_date: date(12, 9), due_date: date(13, 9) };
    expect(scheduleGanttTasks([a, b], [link('a', 'b')])[1].start_date).toEqual(date(13, 9));
  });
  it('rejects cycles including self-loops, missing tasks and duplicate IDs', () => {
    const tasks = [task('a', 1, 2), task('b', 1, 2)];
    for (const links of [
      [link('a', 'a')],
      [link('a', 'b'), link('b', 'a')],
      [link('missing', 'b')],
      [link('a', 'b'), link('a', 'b')],
    ]) {
      expect(dependencyError(tasks, links)).not.toBeNull();
      expect(() => scheduleGanttTasks(tasks, links)).toThrow();
    }
    expect(() => scheduleGanttTasks([tasks[0], tasks[0]], [])).toThrow(/unique/);
  });
  it('rejects summary dependencies, fractional/overflow lag and invalid dates', () => {
    const a = task('a', 1, 2);
    const b = task('b', 1, 2);
    expect(() => scheduleGanttTasks([a, { ...b, parent_id: 'a' }], [link('a', 'b')])).toThrow(
      /leaf/,
    );
    expect(() => scheduleGanttTasks([a, b], [link('a', 'b', 'FS', 0.5)])).toThrow(/integer/);
    expect(() =>
      scheduleGanttTasks([a, b], [link('a', 'b', 'FS', Number.MAX_SAFE_INTEGER)]),
    ).toThrow(/range/);
    expect(() => scheduleGanttTasks([{ ...a, due_date: 'bad' }, b], [link('a', 'b')])).toThrow(
      /dates/,
    );
    expect(() => scheduleGanttTasks([{ ...a, due_date: date(-1) }, b], [link('a', 'b')])).toThrow(
      /dates/,
    );
  });
  it('supports long chains iteratively', () => {
    const tasks = Array.from({ length: 3000 }, (_, i) => task(`${i}`, 1, 2));
    const links = tasks.slice(1).map((item, i) => link(`${i}`, item.id));
    expect(scheduleGanttTasks(tasks, links)[tasks.length - 1].start_date).toEqual(date(3000));
  });
  it('uses calendar-day shifts across DST', () => {
    const a = {
      ...task('a', 1, 2),
      start_date: new Date(2026, 2, 7, 9),
      due_date: new Date(2026, 2, 8, 9),
    };
    const b = { ...a, id: 'b' };
    const result = scheduleGanttTasks([a, b], [link('a', 'b')]);
    expect(result[1].start_date).toEqual(new Date(2026, 2, 8, 9));
    expect(result[1].due_date).toEqual(new Date(2026, 2, 9, 9));
  });
});

