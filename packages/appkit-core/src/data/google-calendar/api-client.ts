/**
 * Google Calendar API Client
 *
 * Wrapper for Google Calendar API v3 REST endpoints.
 * Uses fetch with bearer token authentication.
 *
 * @see https://developers.google.com/calendar/api/v3/reference
 */

import {
  GoogleCalendarEvent,
  CalendarListEntry,
  EventsListResponse,
  CalendarListResponse,
  CALENDAR_API_BASE,
} from './types';
import { getAccessToken } from './gis-auth';

// ============================================================================
// API Client Class
// ============================================================================

/**
 * Google Calendar API Client
 *
 * @example
 * ```ts
 * const client = new GoogleCalendarClient();
 * const calendars = await client.listCalendars();
 * const events = await client.listEvents('primary', {
 *   timeMin: startOfMonth(new Date()),
 *   timeMax: endOfMonth(new Date())
 * });
 * ```
 */
export class GoogleCalendarClient {
  private baseUrl: string;

  /**
   * Creates a new instance of GoogleCalendarClient.
   * @param baseUrl Base URL for the API. Defaults to standard Google Calendar API v3 endpoint.
   */
  constructor(baseUrl: string = CALENDAR_API_BASE) {
    this.baseUrl = baseUrl;
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private getToken(): string {
    const token = getAccessToken();
    if (!token) {
      throw new Error('Not authenticated. Please sign in first.');
    }
    return token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `API request failed: ${response.status} ${response.statusText}`,
      );
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  // --------------------------------------------------------------------------
  // Calendar List API
  // --------------------------------------------------------------------------

  /**
   * List all calendars the user has access to
   */
  async listCalendars(): Promise<CalendarListEntry[]> {
    const response = await this.request<CalendarListResponse>('/users/me/calendarList');
    return response.items || [];
  }

  /**
   * Get a specific calendar by ID
   */
  async getCalendar(calendarId: string): Promise<CalendarListEntry> {
    return this.request<CalendarListEntry>(
      `/users/me/calendarList/${encodeURIComponent(calendarId)}`,
    );
  }

  // --------------------------------------------------------------------------
  // Events API
  // --------------------------------------------------------------------------

  /**
   * List events from a calendar
   *
   * @param calendarId - Calendar ID (use "primary" for primary calendar)
   * @param options - Query options
   */
  async listEvents(
    calendarId: string = 'primary',
    options?: {
      timeMin?: Date;
      timeMax?: Date;
      maxResults?: number;
      pageToken?: string;
      syncToken?: string;
      singleEvents?: boolean;
      orderBy?: 'startTime' | 'updated';
      showDeleted?: boolean;
      q?: string; // Free text search
    },
  ): Promise<EventsListResponse> {
    const params = new URLSearchParams();

    if (options?.timeMin) {
      params.set('timeMin', options.timeMin.toISOString());
    }
    if (options?.timeMax) {
      params.set('timeMax', options.timeMax.toISOString());
    }
    if (options?.maxResults) {
      params.set('maxResults', String(options.maxResults));
    }
    if (options?.pageToken) {
      params.set('pageToken', options.pageToken);
    }
    if (options?.syncToken) {
      params.set('syncToken', options.syncToken);
    }
    if (options?.singleEvents !== undefined) {
      params.set('singleEvents', String(options.singleEvents));
    }
    if (options?.orderBy) {
      params.set('orderBy', options.orderBy);
    }
    if (options?.showDeleted !== undefined) {
      params.set('showDeleted', String(options.showDeleted));
    }
    if (options?.q) {
      params.set('q', options.q);
    }

    const queryString = params.toString();
    const endpoint = `/calendars/${encodeURIComponent(calendarId)}/events${
      queryString ? `?${queryString}` : ''
    }`;

    return this.request<EventsListResponse>(endpoint);
  }

  /**
   * Fetch all events (handling pagination)
   */
  async listAllEvents(
    calendarId: string = 'primary',
    options?: {
      timeMin?: Date;
      timeMax?: Date;
      maxResults?: number;
      singleEvents?: boolean;
      orderBy?: 'startTime' | 'updated';
    },
  ): Promise<GoogleCalendarEvent[]> {
    const allEvents: GoogleCalendarEvent[] = [];
    let pageToken: string | undefined;

    do {
      const response = await this.listEvents(calendarId, {
        ...options,
        pageToken,
        maxResults: options?.maxResults || 250,
      });

      allEvents.push(...response.items);
      pageToken = response.nextPageToken;
    } while (pageToken);

    return allEvents;
  }

  /**
   * Get a single event by ID
   */
  async getEvent(calendarId: string, eventId: string): Promise<GoogleCalendarEvent> {
    return this.request<GoogleCalendarEvent>(
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    );
  }

  /**
   * Create a new event
   */
  async createEvent(
    calendarId: string,
    event: Partial<GoogleCalendarEvent>,
  ): Promise<GoogleCalendarEvent> {
    // Remove local-only fields before sending to Google
    const {
      id: _id,
      googleEventId: _googleEventId,
      uid: _uid,
      resourceId: _resourceId,
      customFields: _customFields,
      syncedAt: _syncedAt,
      source: _source,
      ...googleEvent
    } = event;

    return this.request<GoogleCalendarEvent>(
      `/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        body: JSON.stringify(googleEvent),
      },
    );
  }

  /**
   * Update an existing event
   */
  async updateEvent(
    calendarId: string,
    eventId: string,
    event: Partial<GoogleCalendarEvent>,
  ): Promise<GoogleCalendarEvent> {
    // Remove local-only fields before sending to Google
    const {
      id: _id,
      googleEventId: _googleEventId,
      uid: _uid,
      resourceId: _resourceId,
      customFields: _customFields,
      syncedAt: _syncedAt,
      source: _source,
      ...googleEvent
    } = event;

    return this.request<GoogleCalendarEvent>(
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'PUT',
        body: JSON.stringify(googleEvent),
      },
    );
  }

  /**
   * Patch an existing event (partial update)
   */
  async patchEvent(
    calendarId: string,
    eventId: string,
    event: Partial<GoogleCalendarEvent>,
  ): Promise<GoogleCalendarEvent> {
    // Remove local-only fields before sending to Google
    const {
      id: _id,
      googleEventId: _googleEventId,
      uid: _uid,
      resourceId: _resourceId,
      customFields: _customFields,
      syncedAt: _syncedAt,
      source: _source,
      ...googleEvent
    } = event;

    return this.request<GoogleCalendarEvent>(
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(googleEvent),
      },
    );
  }

  /**
   * Delete an event
   */
  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    await this.request<void>(
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'DELETE',
      },
    );
  }

  /**
   * Move an event to a different calendar
   */
  async moveEvent(
    sourceCalendarId: string,
    eventId: string,
    destinationCalendarId: string,
  ): Promise<GoogleCalendarEvent> {
    const params = new URLSearchParams({
      destination: destinationCalendarId,
    });

    return this.request<GoogleCalendarEvent>(
      `/calendars/${encodeURIComponent(
        sourceCalendarId,
      )}/events/${encodeURIComponent(eventId)}/move?${params}`,
      {
        method: 'POST',
      },
    );
  }

  /**
   * Quick add event from natural language text
   *
   * @example
   * ```ts
   * const event = await client.quickAddEvent('primary', 'Meeting with Bob tomorrow at 3pm');
   * ```
   */
  async quickAddEvent(calendarId: string, text: string): Promise<GoogleCalendarEvent> {
    const params = new URLSearchParams({ text });

    return this.request<GoogleCalendarEvent>(
      `/calendars/${encodeURIComponent(calendarId)}/events/quickAdd?${params}`,
      {
        method: 'POST',
      },
    );
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/** Default client instance */
let defaultClient: GoogleCalendarClient | null = null;

/**
 * Get the default client instance
 */
export function getCalendarClient(): GoogleCalendarClient {
  if (!defaultClient) {
    defaultClient = new GoogleCalendarClient();
  }
  return defaultClient;
}

/**
 * Create a new client instance with custom base URL
 */
export function createCalendarClient(baseUrl?: string): GoogleCalendarClient {
  return new GoogleCalendarClient(baseUrl);
}
