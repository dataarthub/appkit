import type { User } from './types';

/**
 * A stored display snapshot, not proof of a valid authenticated session.
 * See createSessionCache for writes, expiration checks and host verification.
 *
 * @see createSessionCache for the canonical usage example.
 */
export interface SessionCacheEntry {
  /** Last confirmed display user; null records an explicitly logged-out state. */
  user: User | null;
  /** Expiration timestamp in milliseconds since the Unix epoch. */
  exp: number;
}

/**
 * Storage settings for createSessionCache; no providers or CSS are required.
 * @see createSessionCache for the canonical usage example.
 */
export interface SessionCacheOptions {
  /** localStorage key; defaults to dataarthub.auth.last-session. */
  key?: string;
  /** Snapshot lifetime in milliseconds; defaults to seven days. */
  ttl?: number;
}

const DEFAULT_KEY = 'dataarthub.auth.last-session';
const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000;

/**
 * Best-effort browser snapshot storage; see createSessionCache for usage.
 * @see createSessionCache for the canonical usage example.
 */
export interface SessionCache {
  /** Resolved storage key shared with storage-event subscribers. */
  readonly key: string;
  /**
   * Read the stored snapshot without enforcing expiration.
   *
   * @returns Parsed entry (possibly expired), or null on server, missing data or parse/storage failure.
   *
   * @remarks See createSessionCache for the write/read usage pattern.
   */
  read(): SessionCacheEntry | null;
  /**
   * Store display state with a fresh expiration.
   *
   * @param user - Display user or null for confirmed logout; exclude secrets.
   *
   * @returns No value; storage failures and server writes are ignored.
   *
   * @remarks See createSessionCache for the write/read usage pattern.
   */
  write(user: User | null): void;
  /**
   * Remove the snapshot for this key.
   *
   * @returns No value; server calls and storage failures are ignored.
   *
   * @remarks Obtain this helper from createSessionCache, then call cache.clear().
   */
  clear(): void;
  /**
   * Check whether the stored expiration is still in the future.
   *
   * @returns True for a readable snapshot with exp greater than Date.now(), including a logged-out snapshot.
   *
   * @remarks See createSessionCache for a guarded read example.
   */
  hasValid(): boolean;
}

/**
 * Creates best-effort localStorage helpers for optimistic session display.
 *
 * @param options - Optional storage key and lifetime; defaults to the shared key and seven days.
 *
 * @returns Helpers that read, write, clear and check expiration without authenticating a user.
 *
 * @remarks read() validates only the numeric exp field and does not reject expired data;
 * hasValid() checks expiration. Server reads return null and writes/clears do nothing.
 * Browser storage/JSON failures are swallowed. Store display fields only, never tokens
 * or secrets; verify the actual session with the backend before allowing protected work.
 *
 * @example
 * ```ts
 * import { createSessionCache, type User } from '@alneas/appkit-react/tools/auth';
 * export function rememberSession(user: User | null) {
 *   const cache = createSessionCache({ ttl: 24 * 60 * 60 * 1000 });
 *   cache.write(user); // null records confirmed logout.
 *   const snapshot = cache.hasValid() ? cache.read() : null;
 *   return snapshot;
 * }
 * ```
 */
export function createSessionCache(options: SessionCacheOptions = {}): SessionCache {
  const key = options.key ?? DEFAULT_KEY;
  const ttl = options.ttl ?? DEFAULT_TTL;

  const read = (): SessionCacheEntry | null => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as SessionCacheEntry;
      if (typeof parsed?.exp !== 'number') return null;
      return parsed;
    } catch {
      return null;
    }
  };

  const write = (user: User | null): void => {
    if (typeof window === 'undefined') return;
    try {
      const entry: SessionCacheEntry = { user, exp: Date.now() + ttl };
      window.localStorage.setItem(key, JSON.stringify(entry));
    } catch {
      /* storage が無効 (private mode 等) でも致命的ではない */
    }
  };

  const clear = (): void => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* noop */
    }
  };

  return {
    key,
    read,
    write,
    clear,
    hasValid: () => {
      const hit = read();
      return hit != null && hit.exp > Date.now();
    },
  };
}

/**
 * Subscribes to browser storage events for one session-cache key.
 *
 * @param key - Exact localStorage key to observe.
 *
 * @param onChanged - Synchronous callback invoked when a storage event has this exact key.
 *
 * @returns Cleanup that removes the listener; a no-op function on the server.
 *
 * @remarks Browser storage events generally come from other documents, not the writing
 * window. Events with key null (including storage.clear()) do not match. The callback
 * should reverify the session; its errors are not caught by this listener.
 *
 * @example
 * ```ts
 * import {
 *   createSessionCache, subscribeSessionCacheStorageEvent,
 * } from '@alneas/appkit-react/tools/auth';
 * export function watchSession(reverify: () => void) {
 *   const cache = createSessionCache();
 *   return subscribeSessionCacheStorageEvent(cache.key, reverify);
 * }
 * // Call the returned cleanup when the host subscription is disposed.
 * ```
 */
export function subscribeSessionCacheStorageEvent(
  key: string,
  onChanged: () => void,
): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: StorageEvent) => {
    if (e.key === key) onChanged();
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}
