import { addDays, addMonths, startOfDay, startOfMonth, startOfWeek } from 'date-fns';
import { MinHeap } from '../../lib/min-heap';
import type {
  CalendarEvent,
  CalendarResource,
  CalendarViewMode,
  ResourceCalendarProps,
} from './types';

/** Internal half-open intervals. Invalid and empty events are not rendered. */
export function clipEvent(event: CalendarEvent, start: Date, end: Date) {
  const from = Math.max(+event.start, +start);
  const to = Math.min(+event.end, +end);
  return Number.isFinite(from) && Number.isFinite(to) && to > from
    ? { event, start: new Date(from), end: new Date(to) }
    : null;
}

/** Select every event intersecting this local calendar day. */
export function eventsForDay(events: CalendarEvent[], date: Date) {
  const start = startOfDay(date);
  return events
    .filter((event) => clipEvent(event, start, addDays(start, 1)) !== null)
    .sort((a, b) => Number(Boolean(b.allDay)) - Number(Boolean(a.allDay)) || +a.start - +b.start);
}

/** Stable O(n log n) interval partitioning; reuse the lowest free lane, including adjacent events. */
export function layoutEvents(events: CalendarEvent[], start: Date, end: Date) {
  const segments = events
    .flatMap((event) => {
      const segment = clipEvent(event, start, end);
      return segment ? [segment] : [];
    })
    .sort((a, b) => +a.start - +b.start || +b.end - +a.end || a.event.id.localeCompare(b.event.id));
  const result: ((typeof segments)[number] & { lane: number; lanes: number })[] = [];
  let active = new MinHeap<{ end: number; lane: number }>(
    (a, b) => a.end - b.end || a.lane - b.lane,
  );
  let free = new MinHeap<number>((a, b) => a - b);
  let laneCount = 0;
  let groupStart = 0;
  let groupEnd = -Infinity;
  const finishGroup = () => {
    for (let i = groupStart; i < result.length; i++) result[i].lanes = laneCount;
  };
  for (const segment of segments) {
    if (+segment.start >= groupEnd) {
      finishGroup();
      groupStart = result.length;
      active = new MinHeap((a, b) => a.end - b.end || a.lane - b.lane);
      free = new MinHeap((a, b) => a - b);
      laneCount = 0;
    }
    while (active.peek() && active.peek()!.end <= +segment.start) free.push(active.pop()!.lane);
    const lane = free.pop() ?? laneCount++;
    active.push({ end: +segment.end, lane });
    groupEnd = Math.max(groupEnd, +segment.end);
    result.push({ ...segment, lane, lanes: 1 });
  }
  finishGroup();
  return result;
}

/** Visible date interval, including month padding cells, with an exclusive end. */
export function calendarRange(
  date: Date,
  view: CalendarViewMode,
  duration: 'day' | 'week' | 'month',
) {
  const mode = view === 'timeline' ? duration : view;
  let start = startOfDay(date);
  if (mode === 'month') {
    start = startOfMonth(start);
    const end = addMonths(start, 1);
    if (view === 'timeline') return { start, end };
    return { start: startOfWeek(start), end: addDays(startOfWeek(addDays(end, -1)), 7) };
  }
  if (mode === 'week') start = startOfWeek(start);
  return { start, end: addDays(start, mode === 'week' ? 7 : mode === 'agenda' ? 30 : 1) };
}

/** Opening-hours shading only; booking authorization belongs to the application. */
export function isBusinessTime(
  date: Date,
  hours?: ResourceCalendarProps['businessHours'],
  resource?: CalendarResource,
) {
  const minute = date.getHours() * 60 + date.getMinutes();
  if (resource?.businessHours !== undefined) {
    return resource.businessHours.some(
      ({ start, end }) => minute >= start * 60 && minute < end * 60,
    );
  }
  if (hours === undefined) return true;
  const parse = (value: string) => {
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/.test(value)) return NaN;
    const [h, m] = value.split(':').map(Number);
    return h * 60 + m;
  };
  return hours.some(({ daysOfWeek, startTime, endTime }) => {
    const start = parse(startTime);
    const end = parse(endTime);
    if (start < end) return daysOfWeek.includes(date.getDay()) && minute >= start && minute < end;
    if (start > end)
      return (
        (daysOfWeek.includes(date.getDay()) && minute >= start) ||
        (daysOfWeek.includes((date.getDay() + 6) % 7) && minute < end)
      );
    return false;
  });
}

/** Activate div-based event content without nesting buttons around consumer renderers. */
export function activateOnKey(
  event: {
    key: string;
    target: EventTarget | null;
    currentTarget: EventTarget | null;
    preventDefault(): void;
    stopPropagation(): void;
  },
  activate: () => void,
) {
  if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
    event.stopPropagation();
    activate();
  }
}
