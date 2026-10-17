/**
 * Event Mapper
 *
 * Transform between GoogleCalendarEvent and the simpler CalendarEvent
 * format used by ResourceCalendar component.
 */

import { GoogleCalendarEvent } from './types';

// Import the CalendarEvent type from the calendar component
import type { CalendarEvent } from './calendar-event';

// ============================================================================
// Google → CalendarEvent (for display)
// ============================================================================

/**
 * Convert GoogleCalendarEvent to CalendarEvent for ResourceCalendar display
 *
 * @param event - Google Calendar event
 * @returns CalendarEvent suitable for ResourceCalendar
 */
export function toCalendarEvent(event: GoogleCalendarEvent): CalendarEvent {
  // Parse start/end times
  const start = parseEventDateTime(event.start);
  const end = parseEventDateTime(event.end);

  return {
    id: event.id,
    resourceId: event.resourceId,
    title: event.summary || '(No title)',
    start,
    end,
    description: event.description,
    color: event.color,
    allDay: event.allDay ?? isAllDayEvent(event),
    // Preserve full Google event for reference
    googleEvent: event,
  };
}

/**
 * Convert array of GoogleCalendarEvents to CalendarEvents
 */
export function toCalendarEvents(events: GoogleCalendarEvent[]): CalendarEvent[] {
  return events.map(toCalendarEvent);
}

// ============================================================================
// CalendarEvent → Google (for export)
// ============================================================================

/**
 * Convert CalendarEvent to GoogleCalendarEvent for export to Google
 *
 * @param event - Calendar event from ResourceCalendar
 * @param options - Additional options like uid, calendarId
 * @returns GoogleCalendarEvent suitable for API
 */
export function toGoogleEvent(
  event: CalendarEvent,
  options?: {
    uid?: string;
    calendarId?: string;
    timeZone?: string;
  },
): GoogleCalendarEvent {
  const timeZone = options?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const allDay = event.allDay ?? false;

  return {
    id: event.id,
    summary: event.title,
    description: event.description,
    start: allDay
      ? { date: formatDateOnly(event.start) }
      : { dateTime: event.start.toISOString(), timeZone },
    end: allDay
      ? { date: formatDateOnly(event.end) }
      : { dateTime: event.end.toISOString(), timeZone },
    allDay,
    uid: options?.uid,
    calendarId: options?.calendarId,
    resourceId: event.resourceId,
    color: event.color,
    source: 'local',
    // Preserve existing Google event data if available
    ...(event.googleEvent && {
      googleEventId: event.googleEvent.googleEventId || event.googleEvent.id,
      etag: event.googleEvent.etag,
    }),
  };
}

/**
 * Convert array of CalendarEvents to GoogleCalendarEvents
 */
export function toGoogleEvents(
  events: CalendarEvent[],
  options?: { uid?: string; calendarId?: string; timeZone?: string },
): GoogleCalendarEvent[] {
  return events.map((event) => toGoogleEvent(event, options));
}

// ============================================================================
// Merge & Update
// ============================================================================

/**
 * Merge local custom fields with Google event data
 * Used when importing to preserve local extensions
 *
 * @param googleEvent - Event from Google Calendar API
 * @param localData - Local custom data to merge
 * @returns Merged event
 */
export function mergeEventData(
  googleEvent: GoogleCalendarEvent,
  localData?: Partial<GoogleCalendarEvent>,
): GoogleCalendarEvent {
  if (!localData) return googleEvent;

  return {
    ...googleEvent,
    // Preserve local-only fields
    uid: localData.uid ?? googleEvent.uid,
    resourceId: localData.resourceId ?? googleEvent.resourceId,
    color: localData.color ?? googleEvent.color,
    customFields: {
      ...localData.customFields,
      ...googleEvent.customFields,
    },
    // Mark as synced
    source: 'google',
    syncedAt: new Date().toISOString(),
    // Keep Google's ID for reference
    googleEventId: googleEvent.id,
  };
}

/**
 * Prepare event for import (incoming from Google)
 * Generates local ID and sets sync metadata
 */
export function prepareForImport(
  googleEvent: GoogleCalendarEvent,
  options?: {
    uid?: string;
    resourceId?: string;
  },
): GoogleCalendarEvent {
  return {
    ...googleEvent,
    id: generateLocalId(),
    googleEventId: googleEvent.id,
    uid: options?.uid,
    resourceId: options?.resourceId,
    source: 'google',
    syncedAt: new Date().toISOString(),
    allDay: isAllDayEvent(googleEvent),
  };
}

/**
 * Prepare event for export (outgoing to Google)
 * Strips local-only fields
 */
export function prepareForExport(
  event: GoogleCalendarEvent,
): Omit<GoogleCalendarEvent, 'id' | 'uid' | 'resourceId' | 'customFields' | 'syncedAt' | 'source'> {
  const {
    id: _id,
    uid: _uid,
    resourceId: _resourceId,
    customFields: _customFields,
    syncedAt: _syncedAt,
    source: _source,
    googleEventId: _googleEventId,
    ...exportEvent
  } = event;
  return exportEvent;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Parse EventDateTime to JavaScript Date
 */
export function parseEventDateTime(
  dt: GoogleCalendarEvent['start'] | GoogleCalendarEvent['end'],
): Date {
  if (!dt) return new Date();

  if (dt.dateTime) {
    return new Date(dt.dateTime);
  }

  if (dt.date) {
    // All-day events: parse as local date
    return new Date(dt.date + 'T00:00:00');
  }

  return new Date();
}

/**
 * Check if event is an all-day event
 */
export function isAllDayEvent(event: GoogleCalendarEvent): boolean {
  // Explicit allDay flag
  if (event.allDay !== undefined) return event.allDay;

  // Has date (not dateTime) = all-day
  return !!(event.start?.date && !event.start?.dateTime);
}

/**
 * Format Date as YYYY-MM-DD for all-day events
 */
export function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generate a local UUID for events
 */
export function generateLocalId(): string {
  return (
    crypto.randomUUID?.() ||
    'local-' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
  );
}

/**
 * Compare two events for equality (by ID)
 */
export function isSameEvent(a: GoogleCalendarEvent, b: GoogleCalendarEvent): boolean {
  // Same googleEventId = same event from Google
  if (a.googleEventId && b.googleEventId) {
    return a.googleEventId === b.googleEventId;
  }
  // Fallback to local ID
  return a.id === b.id;
}

/**
 * Find matching event by Google ID or local ID
 */
export function findMatchingEvent(
  event: GoogleCalendarEvent,
  events: GoogleCalendarEvent[],
): GoogleCalendarEvent | undefined {
  return events.find((e) => isSameEvent(e, event));
}

/**
 * Get event duration in milliseconds
 */
export function getEventDuration(event: GoogleCalendarEvent): number {
  const start = parseEventDateTime(event.start);
  const end = parseEventDateTime(event.end);
  return end.getTime() - start.getTime();
}

/**
 * Sort events by start time
 */
export function sortEventsByStartTime(events: GoogleCalendarEvent[]): GoogleCalendarEvent[] {
  return [...events].sort((a, b) => {
    const startA = parseEventDateTime(a.start);
    const startB = parseEventDateTime(b.start);
    return startA.getTime() - startB.getTime();
  });
}
