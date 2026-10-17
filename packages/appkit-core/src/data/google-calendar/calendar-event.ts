import type { GoogleCalendarEvent } from './types';
/**
 * Calendar event
 *
 * @example
 * ```ts
 * const event: CalendarEvent = {
 *   id: '1',
 *   title: 'Meeting',
 *   start: new Date('2024-01-15 10:00'),
 *   end: new Date('2024-01-15 11:00'),
 *   resourceId: 'room-a',
 * };
 * ```
 */
export interface CalendarEvent {
  /** Unique identifier */
  id: string;
  /** Associated resource ID */
  resourceId?: string;
  /** Event title */
  title: string;
  /** Start date and time */
  start: Date;
  /** End date and time (exclusive). Must be strictly after start. */
  end: Date;
  /** Description */
  description?: string;
  /** Color override */
  color?: string;
  /** Custom CSS class */
  className?: string;
  /** Whether the event is all-day */
  allDay?: boolean;
  /** Associated Google Calendar data */
  googleEvent?: GoogleCalendarEvent;
  [key: string]: unknown;
}
