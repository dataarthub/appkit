import { describe, it, expect } from 'bun:test';
import { toCalendarEvent, toGoogleEvent } from './event-mapper';
import type { GoogleCalendarEvent } from './types';
import type { CalendarEvent } from './calendar-event';

describe('Google Calendar Event Mapper', () => {
  it('converts GoogleCalendarEvent to CalendarEvent with date/time parsing', () => {
    const gEvent: GoogleCalendarEvent = {
      id: 'g-event-1',
      summary: 'プロジェクト定例ミーティング',
      description: '進捗確認と課題整理',
      start: { dateTime: '2026-10-15T10:00:00+09:00' },
      end: { dateTime: '2026-10-15T11:00:00+09:00' },
      color: '#3b82f6',
    };

    const event = toCalendarEvent(gEvent);
    expect(event.id).toBe('g-event-1');
    expect(event.title).toBe('プロジェクト定例ミーティング');
    expect(event.allDay).toBe(false);
    expect(event.color).toBe('#3b82f6');
    expect(event.start.toISOString()).toBe('2026-10-15T01:00:00.000Z');
  });

  it('converts CalendarEvent to GoogleCalendarEvent', () => {
    const event: CalendarEvent = {
      id: 'cal-event-2',
      title: '終日イベント',
      start: new Date('2026-10-20T00:00:00Z'),
      end: new Date('2026-10-20T23:59:59Z'),
      allDay: true,
      description: '開発合宿',
    };

    const gEvent = toGoogleEvent(event);
    expect(gEvent.summary).toBe('終日イベント');
    expect(gEvent.description).toBe('開発合宿');
    expect(gEvent.start.date).toBeDefined();
    expect(gEvent.end.date).toBeDefined();
  });
});
