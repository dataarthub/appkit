import { addDays, dateKey, parseLocalDate } from './dates';
import type { GanttPlanningTask, GanttWorkingCalendar } from './types';

/**
 * Day planning intentionally rejects sub-day timestamps instead of silently truncating them.
 *
 * @param value - Local-midnight Date or valid YYYY-MM-DD date string.
 * @returns A new Date representing the same local planning day.
 * @throws Throws invalid dates or sub-day timestamps.
 *
 * @example
 * ```typescript
 * import { planningDate } from '@alneas/appkit-core/graph';
 *
 * console.log(planningDate('2026-10-20'));
 * ```
 */
export function planningDate(value: string | Date): Date {
  const date = typeof value === 'string' ? parseLocalDate(value) : new Date(value);
  if (
    !Number.isFinite(+date) ||
    date.getHours() !== 0 ||
    date.getMinutes() !== 0 ||
    date.getSeconds() !== 0 ||
    date.getMilliseconds() !== 0
  )
    throw new Error('Day planning requires valid local-midnight dates or YYYY-MM-DD strings.');
  return date;
}

/**
 * Compile and validate the shared calendar once for repeated day checks.
 *
 * @param calendar - Optional weekday/holiday overrides; omission permits every day, while {} selects Monday–Friday.
 * @returns A reusable callback accepting a local Date and returning whether its date is a working day; explicit workingDates override holidays/weekdays. The callback performs no validity check on its Date input.
 * @throws Throws invalid weekdays/exception dates or calendars without any working day.
 *
 * @example
 * ```typescript
 * import { workingDayPredicate, planningDate } from '@alneas/appkit-core/graph';
 *
 * const isWorking = workingDayPredicate({});
 * console.log(isWorking(planningDate('2026-10-20')));
 * ```
 */
export function workingDayPredicate(calendar?: GanttWorkingCalendar) {
  const weekdays =
    calendar?.workingWeekdays ?? (calendar ? [1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6]);
  if (weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6))
    throw new Error('Working weekdays must be integers from 0 to 6.');
  const dates = (values: string[] = []) =>
    new Set(
      values.map((value) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || dateKey(planningDate(value)) !== value)
          throw new Error('Calendar exceptions must be valid YYYY-MM-DD dates.');
        return value;
      }),
    );
  const holidays = dates(calendar?.holidays);
  const overrides = dates(calendar?.workingDates);
  const working = new Set(weekdays);
  if (!working.size && !overrides.size) throw new Error('The calendar has no working days.');
  return (date: Date) => {
    const key = dateKey(date);
    return overrides.has(key) || (working.has(date.getDay()) && !holidays.has(key));
  };
}

/**
 * Test a local date against explicit weekdays, holidays and working-date overrides. No country holiday lookup.
 *
 * @param date - Valid Date whose local calendar day is tested.
 * @param calendar - Optional weekday/holiday overrides; omission permits every day, {} means Monday–Friday.
 * @returns Whether the local date passes the configured calendar.
 * @throws Throws invalid date/calendar settings.
 *
 * @example
 * ```typescript
 * import { isGanttWorkingDay, planningDate } from '@alneas/appkit-core/graph';
 *
 * console.log(isGanttWorkingDay(planningDate('2026-10-20'), {}));
 * ```
 */
export function isGanttWorkingDay(date: Date, calendar?: GanttWorkingCalendar): boolean {
  if (!Number.isFinite(+date)) throw new Error('Invalid calendar date.');
  return workingDayPredicate(calendar)(date);
}

/**
 * Count occupied working days in [start,end). Positive non-working-only spans become one workday.
 *
 * @param task - Task dates or an explicit nonnegative integer durationDays; explicit duration takes precedence.
 * @param calendar - Optional working-day policy; omitted permits every day.
 * @returns Occupied working days in [start,end); zero for equal endpoints, at least one for any positive span.
 * @throws Throws invalid duration/dates/calendar, reversed dates or an inferred scan exceeding 36600 days.
 *
 * @example
 * ```typescript
 * import { getGanttWorkingDuration } from '@alneas/appkit-core/graph';
 *
 * console.log(getGanttWorkingDuration({ id: 'a', created_at: '2026-10-20', durationDays: 2 }));
 * ```
 */
export function getGanttWorkingDuration(
  task: GanttPlanningTask,
  calendar?: GanttWorkingCalendar,
): number {
  if (task.durationDays !== undefined) {
    if (!Number.isSafeInteger(task.durationDays) || task.durationDays < 0)
      throw new Error(`Duration must be a non-negative integer: ${task.id}`);
    return task.durationDays;
  }
  const start = planningDate(task.start_date ?? task.created_at);
  const end = task.due_date == null ? addDays(start, 1) : planningDate(task.due_date);
  if (+end < +start) throw new Error(`Invalid task dates: ${task.id}`);
  const isWorking = workingDayPredicate(calendar);
  let count = 0;
  let scanned = 0;
  for (let day = start; +day < +end; day = addDays(day, 1)) {
    if (++scanned > 36600) throw new Error('Duration exceeds the supported date range.');
    if (isWorking(day)) count++;
  }
  return +start === +end ? 0 : Math.max(1, count);
}
