import { describe, expect, it } from 'bun:test';
import { addDays, dateKey } from './dates';
const format = (date: Date, _pattern: string) => dateKey(date);
import { planGanttTasks, analyzeGanttCriticalPath } from './planning';
import { getGanttWorkingDuration, isGanttWorkingDay } from './working-calendar';
import { scheduleGanttTasks } from './scheduling';
import type { GanttDependency, GanttPlanningTask, GanttSchedulingOptions } from './types';

const day = (n: number) => new Date(2026, 8, n);
const task = (
  id: string,
  start = 14,
  duration = 2,
): GanttPlanningTask & { title: string; status: string } => ({
  id,
  title: id,
  status: 'todo',
  created_at: day(start),
  start_date: day(start),
  due_date: day(start + duration),
  durationDays: duration,
});
const link = (
  sourceId: string,
  targetId: string,
  type: GanttDependency['type'] = 'FS',
  lagDays = 0,
): GanttDependency => ({ id: `${sourceId}-${targetId}`, sourceId, targetId, type, lagDays });
const calendar = { workingWeekdays: [1, 2, 3, 4, 5], holidays: ['2026-09-21'] };
const leveling: GanttSchedulingOptions = { calendar: {}, resourceLeveling: { enabled: true } };
const dates = (tasks: GanttPlanningTask[]) =>
  tasks.map((item) => [
    format(new Date(item.start_date!), 'yyyy-MM-dd'),
    format(new Date(item.due_date!), 'yyyy-MM-dd'),
  ]);

describe('working-day planning', () => {
  it('skips weekends/holidays for duration and lag and uses exclusive workday boundaries', () => {
    const result = planGanttTasks([task('a', 18, 1), task('b', 18, 2)], [link('a', 'b', 'FS', 1)], {
      calendar,
    });
    expect(dates(result.tasks)).toEqual([
      ['2026-09-18', '2026-09-22'],
      ['2026-09-23', '2026-09-25'],
    ]);
  });
  it('lets explicit working dates override both holiday and weekend rules', () => {
    const custom = { ...calendar, holidays: ['2026-09-19'], workingDates: ['2026-09-19'] };
    expect(isGanttWorkingDay(day(19), custom)).toBe(true);
    expect(planGanttTasks([task('a', 18, 2)], [], { calendar: custom }).tasks[0].due_date).toEqual(
      day(21),
    );
  });
  it('distinguishes no calendar (seven days) from an empty calendar (weekdays)', () => {
    expect(planGanttTasks([task('a', 18, 1)], []).tasks[0].due_date).toEqual(day(19));
    expect(planGanttTasks([task('a', 18, 1)], [], { calendar: {} }).tasks[0].due_date).toEqual(
      day(21),
    );
  });
  it('infers workday effort, advances non-working-only spans, and supports zero-day milestones', () => {
    const weekend = { ...task('a', 19, 1), durationDays: undefined };
    expect(getGanttWorkingDuration(weekend, {})).toBe(1);
    expect(dates(planGanttTasks([weekend, task('m', 19, 0)], [], { calendar: {} }).tasks)).toEqual([
      ['2026-09-21', '2026-09-22'],
      ['2026-09-21', '2026-09-21'],
    ]);
    const span = { ...task('span', 18, 5), durationDays: undefined };
    expect(getGanttWorkingDuration(span, calendar)).toBe(2);
  });
  it('parses date-only strings locally and survives DST and leap days', () => {
    const a = { ...task('a'), start_date: '2026-03-06', due_date: '2026-03-07', durationDays: 2 };
    const result = planGanttTasks([a], [], { calendar: {} });
    expect(result.tasks[0].start_date).toEqual(new Date(2026, 2, 6));
    expect(result.tasks[0].due_date).toEqual(new Date(2026, 2, 10));
    expect(isGanttWorkingDay(new Date(2028, 1, 29), { holidays: ['2028-02-29'] })).toBe(false);
  });
  it('rejects malformed calendars, non-midnight timestamps, invalid durations and exhausted horizons', () => {
    for (const options of [
      { calendar: { workingWeekdays: [7] } },
      { calendar: { workingWeekdays: [] } },
      { calendar: { holidays: ['2026-02-30'] } },
      { maxCalendarDays: 0 },
      { maxCalendarDays: 36601 },
      { maxCalendarDays: 1 },
    ])
      expect(() => planGanttTasks([task('a')], [], options)).toThrow();
    expect(() =>
      planGanttTasks([{ ...task('a'), start_date: new Date(2026, 8, 14, 9) }], []),
    ).toThrow(/midnight/);
    for (const durationDays of [-1, 0.5, Infinity])
      expect(() => planGanttTasks([{ ...task('a'), durationDays }], [])).toThrow(/Duration/);
    expect(() =>
      planGanttTasks([task('a')], [], {
        calendar: { workingWeekdays: [], workingDates: ['2020-01-01'] },
      }),
    ).toThrow(/working days/);
  });
  it('keeps the legacy two-argument scheduler unchanged and supports opt-in options', () => {
    const tasks = [task('a', 18, 1), task('b', 18, 1)];
    expect(scheduleGanttTasks(tasks, [link('a', 'b')])[1].start_date).toEqual(day(19));
    expect(scheduleGanttTasks(tasks, [link('a', 'b')], { calendar })[1].start_date).toEqual(
      day(22),
    );
  });
  it('does not mutate dates or nested input and excludes summaries from work and CPM', () => {
    const a = task('a');
    const summary = { ...task('summary'), start_date: 'invalid' };
    const inputs = [summary, { ...a, parent_id: 'summary' }];
    const snapshot = JSON.stringify(inputs);
    const result = planGanttTasks(inputs, [], leveling);
    expect(result.tasks[0]).toBe(summary);
    expect(result.criticalPath.taskIds).toEqual(['a']);
    (result.tasks[1].start_date as Date).setDate(30);
    expect(JSON.stringify(inputs)).toBe(snapshot);
  });
  it('rejects cycles, missing endpoints, invalid summary dependencies and out-of-range lag', () => {
    const tasks = [task('a'), task('b')];
    for (const links of [
      [link('a', 'b'), link('b', 'a')],
      [link('missing', 'a')],
      [link('a', 'b', 'FS', Number.MAX_SAFE_INTEGER)],
    ])
      expect(() => planGanttTasks(tasks, links)).toThrow();
    expect(() =>
      planGanttTasks([task('a'), { ...task('b'), parent_id: 'a' }], [link('a', 'b')]),
    ).toThrow(/leaf/);
    expect(planGanttTasks([], []).projectFinish).toBeNull();
  });
});

describe('dependency-only critical path', () => {
  it('computes a diamond with a short branch and identifies only tight critical links', () => {
    const result = analyzeGanttCriticalPath(
      [task('a', 14, 2), task('b', 14, 4), task('c', 14, 1), task('d', 14, 1)],
      [link('a', 'b'), link('a', 'c'), link('b', 'd'), link('c', 'd')],
    );
    expect(result.taskIds).toEqual(['a', 'b', 'd']);
    expect(result.dependencyIds).toEqual(['a-b', 'b-d']);
    expect(result.tasks.map((t) => t.totalFloatDays)).toEqual([0, 0, 3, 0]);
    expect(result.projectFinish).toEqual(day(21));
  });
  it('supports multiple critical branches and honors explicit release dates', () => {
    const result = analyzeGanttCriticalPath(
      [task('a', 14, 2), task('b', 14, 2), task('later', 19, 1)],
      [],
    );
    expect(result.tasks.map((t) => t.totalFloatDays)).toEqual([4, 4, 0]);
    expect(analyzeGanttCriticalPath([task('a'), task('b')], []).taskIds).toEqual(['a', 'b']);
  });
  for (const type of ['FS', 'SS', 'FF', 'SF'] as const) {
    it(`matches enumerated feasible schedules for ${type}, including negative lag`, () => {
      for (const lag of [-1, 0, 2]) {
        const result = analyzeGanttCriticalPath(
          [task('a', 14, 3), task('b', 14, 2)],
          [link('a', 'b', type, lag)],
        );
        const weight = (type[0] === 'F' ? 3 : 0) + lag - (type[1] === 'F' ? 2 : 0);
        const finish = Math.max(3, Math.max(0, weight) + 2);
        const feasible: number[][] = [];
        for (let a = 0; a <= finish - 3; a++)
          for (let b = 0; b <= finish - 2; b++) if (b >= a + weight) feasible.push([a, b]);
        result.tasks.forEach((item, index) => {
          expect(item.lateStart).toEqual(
            addDays(day(14), Math.max(...feasible.map((p) => p[index]))),
          );
          expect(item.earlyStart).toEqual(
            addDays(day(14), Math.min(...feasible.map((p) => p[index]))),
          );
        });
      }
    });
  }
});

describe('capacity-constrained serial leveling', () => {
  it('schedules 5,000 contending one-day tasks without raising the work budget', () => {
    const inputs = Array.from({ length: 5000 }, (_, i) => ({
      ...task(String(i), 14, 1),
      assignee_id: 'one',
    }));
    const result = planGanttTasks(inputs, [], {
      maxCalendarDays: 10000,
      resourceLeveling: { enabled: true },
    });
    expect(result.tasks[4999].start_date).toEqual(addDays(day(14), 4999));
    expect(result.projectFinish).toEqual(addDays(day(14), 5000));
    expect(result.resourceDelays).toHaveLength(4999);
  });
  it('matches serial daily first-fit with holes, fractional and multiple assignments', () => {
    let seed = 17;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed;
    };
    for (let run = 0; run < 20; run++) {
      const inputs = Array.from({ length: 60 }, (_, i) => ({
        ...task(String(i), 14 + (random() % 25), random() % 7),
        resourceAssignments: [
          { resourceId: 'a', units: ((random() % 4) + 1) / 4 },
          { resourceId: 'b', units: 0.5 },
        ],
      }));
      const occupied = [Array<number>(1000).fill(0), Array<number>(1000).fill(0)];
      const expected = inputs.map((input) => {
        let start = Math.round((+new Date(input.start_date!) - +day(14)) / 86400000);
        const duration = input.durationDays!;
        while (
          occupied.some((usage, r) =>
            usage
              .slice(start, start + duration)
              .some((u) => u + input.resourceAssignments[r].units > 1),
          )
        )
          start++;
        occupied.forEach((usage, r) => {
          for (let d = start; d < start + duration; d++)
            usage[d] += input.resourceAssignments[r].units;
        });
        return addDays(day(14), start);
      });
      const result = planGanttTasks(inputs, [], {
        maxCalendarDays: 1000,
        resourceLeveling: { enabled: true },
      });
      expect(result.tasks.map((t) => t.start_date)).toEqual(expected);
    }
  });
  it('fails atomically when leveling exhausts the horizon', () => {
    const tasks = ['a', 'b', 'c'].map((id) => ({ ...task(id), assignee_id: 'team' }));
    const snapshot = JSON.stringify(tasks);
    expect(() => planGanttTasks(tasks, [], { ...leveling, maxCalendarDays: 4 })).toThrow(
      /maxCalendarDays/,
    );
    expect(JSON.stringify(tasks)).toBe(snapshot);
  });
  it('delays shared assignees and separately reports propagated dependency delays', () => {
    const inputs = [
      { ...task('a'), assignee_id: 'team' },
      { ...task('b'), assignee_id: 'team' },
      task('c'),
    ];
    const result = planGanttTasks(inputs, [link('b', 'c')], leveling);
    expect(dates(result.tasks)).toEqual([
      ['2026-09-14', '2026-09-16'],
      ['2026-09-16', '2026-09-18'],
      ['2026-09-18', '2026-09-22'],
    ]);
    expect(result.resourceDelays).toEqual([
      { taskId: 'b', directDays: 2, propagatedDays: 0 },
      { taskId: 'c', directDays: 0, propagatedDays: 2 },
    ]);
    expect(result.criticalPath.projectFinish).toEqual(day(18));
    expect(result.projectFinish).toEqual(day(22));
  });
  it('honors simultaneous resources, fractional demands, capacity and explicit unassignment', () => {
    const inputs = ['a', 'b', 'c'].map((id) => ({
      ...task(id),
      resourceAssignments: [{ resourceId: 'team', units: 0.5 }, { resourceId: 'room' }],
    }));
    const options = {
      ...leveling,
      resourceLeveling: {
        enabled: true,
        resources: [
          { id: 'team', capacity: 1 },
          { id: 'room', capacity: 2 },
        ],
      },
    };
    const result = planGanttTasks(
      [...inputs, { ...task('free'), assignee_id: 'room', resourceAssignments: [] }],
      [],
      options,
    );
    expect(result.tasks.map((t) => t.start_date)).toEqual([day(14), day(14), day(16), day(14)]);
  });
  it('validates capacity, unknown resources and aggregated duplicate assignments', () => {
    const a = {
      ...task('a'),
      resourceAssignments: [
        { resourceId: 'team', units: 0.7 },
        { resourceId: 'team', units: 0.7 },
      ],
    };
    expect(() => planGanttTasks([a], [], leveling)).toThrow(/capacity/);
    expect(() =>
      planGanttTasks([{ ...task('a'), assignee_id: 'missing' }], [], {
        resourceLeveling: { enabled: true, resources: [] },
      }),
    ).toThrow(/Unknown/);
    for (const capacity of [0, -1, Infinity, NaN, 1e-12])
      expect(() =>
        planGanttTasks([{ ...task('a'), assignee_id: 'team' }], [], {
          resourceLeveling: { enabled: true, resources: [{ id: 'team', capacity }] },
        }),
      ).toThrow();
  });
  it('does not split tasks to fit holes and lets milestones consume no days', () => {
    const inputs = [
      { ...task('reserved', 15, 1), assignee_id: 'team' },
      { ...task('long', 14, 2), assignee_id: 'team' },
      { ...task('milestone', 14, 0), assignee_id: 'team' },
    ];
    expect(planGanttTasks(inputs, [], leveling).tasks.map((t) => t.start_date)).toEqual([
      day(15),
      day(16),
      day(14),
    ]);
  });
  it('is deterministic, idempotent on scheduled tasks, and leveling is opt-in', () => {
    const inputs = [
      { ...task('a'), assignee_id: 'team' },
      { ...task('b'), assignee_id: 'team' },
    ];
    const first = planGanttTasks(inputs, [], leveling);
    expect(planGanttTasks(inputs, [], leveling)).toEqual(first);
    expect(planGanttTasks(first.tasks, [], leveling).tasks).toEqual(first.tasks);
    expect(planGanttTasks(inputs, []).resourceDelays).toEqual([]);
    expect(analyzeGanttCriticalPath(inputs, [], leveling).projectFinish).toEqual(day(16));
  });
  it('respects all links and never exceeds daily resource capacity on a larger DAG', () => {
    const inputs = Array.from({ length: 40 }, (_, i) => ({
      ...task(String(i), 14, (i % 3) + 1),
      assignee_id: `r${i % 3}`,
    }));
    const links = inputs.slice(3).map((t, i) => link(String(i), t.id));
    const result = planGanttTasks(inputs, links, leveling);
    const byId = new Map(result.tasks.map((t) => [t.id, t]));
    for (const edge of links)
      expect(+(byId.get(edge.targetId)!.start_date as Date)).toBeGreaterThanOrEqual(
        +(byId.get(edge.sourceId)!.due_date as Date),
      );
    const usage = new Map<string, number>();
    for (const item of result.tasks)
      for (let d = item.start_date as Date; +d < +(item.due_date as Date); d = addDays(d, 1)) {
        if (!isGanttWorkingDay(d, {})) continue;
        const key = `${item.assignee_id}:${format(d, 'yyyy-MM-dd')}`;
        usage.set(key, (usage.get(key) ?? 0) + 1);
        expect(usage.get(key)).toBeLessThanOrEqual(1);
      }
  });
});
