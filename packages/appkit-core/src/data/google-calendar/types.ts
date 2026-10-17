/**
 * Google Calendar Integration Types
 *
 * Based on Google Calendar API v3 event format with custom extensions.
 * @see https://developers.google.com/calendar/api/v3/reference/events
 */

// ============================================================================
// Event Types
// ============================================================================

/**
 * Date/time specification for events.
 * Either dateTime (for timed events) or date (for all-day events) should be set.
 */
export interface EventDateTime {
  /** ISO 8601 datetime for timed events (e.g., "2024-12-26T09:00:00+09:00") */
  dateTime?: string;
  /** Date string for all-day events (e.g., "2024-12-26") */
  date?: string;
  /** IANA timezone (e.g., "Asia/Tokyo") */
  timeZone?: string;
}

/**
 * Event attendee information
 */
export interface EventAttendee {
  email: string;
  displayName?: string;
  responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  organizer?: boolean;
  self?: boolean;
  optional?: boolean;
}

/**
 * Event reminder configuration
 */
export interface EventReminder {
  useDefault: boolean;
  overrides?: {
    method: 'email' | 'popup';
    minutes: number;
  }[];
}

/**
 * Google Calendar Event - Primary event schema
 *
 * This is the canonical event format used for local storage.
 * Compatible with Google Calendar API v3 event structure.
 */
export interface GoogleCalendarEvent {
  // ---- Core Identifiers ----
  /** Local event ID (UUID) */
  id: string;
  /** Google Calendar event ID (if synced from Google) */
  googleEventId?: string;
  /** Source calendar ID (e.g., "primary", email address) */
  calendarId?: string;

  // ---- Basic Info ----
  /** Event title */
  summary: string;
  /** Event description (HTML supported) */
  description?: string;
  /** Location string */
  location?: string;

  // ---- Timing ----
  /** Event start time */
  start: EventDateTime;
  /** Event end time */
  end: EventDateTime;
  /** Whether this is an all-day event */
  allDay?: boolean;

  // ---- Status & Visibility ----
  /** Event status */
  status?: 'confirmed' | 'tentative' | 'cancelled';
  /** Event visibility */
  visibility?: 'default' | 'public' | 'private' | 'confidential';

  // ---- Recurrence ----
  /** RRULE strings for recurring events */
  recurrence?: string[];
  /** Parent event ID for recurring event instances */
  recurringEventId?: string;

  // ---- Participants ----
  /** Event attendees */
  attendees?: EventAttendee[];
  /** Event organizer */
  organizer?: {
    email: string;
    displayName?: string;
    self?: boolean;
  };
  /** Event creator */
  creator?: {
    email: string;
    displayName?: string;
    self?: boolean;
  };

  // ---- Reminders ----
  /** Reminder settings */
  reminders?: EventReminder;

  // ---- User Ownership ----
  /** User ID - owner of this event in the local system */
  uid?: string;

  // ---- Custom Extension Fields ----
  /** Resource ID for resource calendar integration */
  resourceId?: string;
  /** Custom color override (hex or color key) */
  color?: string;
  /** Project-specific custom data */
  customFields?: Record<string, unknown>;

  // ---- Sync Metadata ----
  /** Last sync timestamp (ISO 8601) */
  syncedAt?: string;
  /** Origin of event */
  source?: 'local' | 'google';
  /** Google's version tag for conflict detection */
  etag?: string;
  /** Event creation time (ISO 8601) */
  created?: string;
  /** Event last update time (ISO 8601) */
  updated?: string;

  // ---- Links ----
  /** HTML link to event in Google Calendar */
  htmlLink?: string;
}

// ============================================================================
// Calendar Types
// ============================================================================

/**
 * Calendar list entry from Google Calendar API
 */
export interface CalendarListEntry {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  accessRole?: 'freeBusyReader' | 'reader' | 'writer' | 'owner';
  backgroundColor?: string;
  foregroundColor?: string;
  selected?: boolean;
  timeZone?: string;
}

// ============================================================================
// Auth Types
// ============================================================================

/**
 * Token response from Google Identity Services
 */
export interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  error?: string;
  error_description?: string;
}

/**
 * Google Auth state
 */
export interface GoogleAuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  expiresAt: number | null;
  userEmail?: string;
  error?: string;
}

/**
 * Google Auth configuration
 */
export interface GoogleAuthConfig {
  clientId: string;
  scopes?: string[];
  /** Auto-select account if only one available */
  autoSelect?: boolean;
}

// ============================================================================
// Sync Types
// ============================================================================

/**
 * Sync operation options
 */
export interface SyncOptions {
  /** Calendar ID to sync (default: "primary") */
  calendarId?: string;
  /** Minimum time for events */
  timeMin?: Date;
  /** Maximum time for events */
  timeMax?: Date;
  /** Maximum number of events to fetch */
  maxResults?: number;
  /** User ID to associate with imported events */
  uid?: string;
  /** Whether to include deleted events */
  showDeleted?: boolean;
}

/**
 * Sync operation result
 */
export interface SyncResult {
  success: boolean;
  eventsImported?: number;
  eventsExported?: number;
  eventsUpdated?: number;
  eventsDeleted?: number;
  errors?: string[];
  syncToken?: string;
}

/**
 * Sync status
 */
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Events list response from Google Calendar API
 */
export interface EventsListResponse {
  kind: string;
  etag: string;
  summary: string;
  updated: string;
  timeZone: string;
  accessRole: string;
  nextPageToken?: string;
  nextSyncToken?: string;
  items: GoogleCalendarEvent[];
}

/**
 * Calendar list response from Google Calendar API
 */
export interface CalendarListResponse {
  kind: string;
  etag: string;
  nextPageToken?: string;
  nextSyncToken?: string;
  items: CalendarListEntry[];
}

// ============================================================================
// Constants
// ============================================================================

/** Google Calendar API base URL */
export const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

/** Default scopes for read-only access */
export const SCOPES_READONLY = ['https://www.googleapis.com/auth/calendar.readonly'];

/** Default scopes for read/write access */
export const SCOPES_READWRITE = ['https://www.googleapis.com/auth/calendar.events'];

/** Full calendar access scope */
export const SCOPES_FULL = ['https://www.googleapis.com/auth/calendar'];
