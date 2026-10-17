import { addDays, dateKey, parseLocalDate } from './dates';
import type { GanttPlanningTask, GanttWorkingCalendar } from './types';

/** Day planning intentionally rejects sub-day timestamps instead of silently truncating them. */
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

/** Compile and validate the shared calendar once for repeated day checks. */
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

/** Test a local date against explicit weekdays, holidays and working-date overrides. No country holiday lookup. */
export function isGanttWorkingDay(date: Date, calendar?: GanttWorkingCalendar): boolean {
  if (!Number.isFinite(+date)) throw new Error('Invalid calendar date.');
  return workingDayPredicate(calendar)(date);
}

/** Count occupied working days in [start,end). Positive non-working-only spans become one workday. */
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
