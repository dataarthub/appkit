/**
 * Google Identity Services (GIS) Authentication
 *
 * Client-side OAuth2 authentication using Google's new GIS library.
 * No backend required - tokens are managed in browser memory.
 *
 * @see https://developers.google.com/identity/oauth2/web/guides/overview
 */

import { TokenResponse, GoogleAuthConfig, SCOPES_READWRITE } from './types';

// ============================================================================
// Global State
// ============================================================================

let tokenClient: GoogleOAuth2TokenClient | null = null;
let accessToken: string | null = null;
let tokenExpiresAt: number | null = null;
let currentConfig: GoogleAuthConfig | null = null;
let initPromise: Promise<void> | null = null;
let tokenResolve: ((response: TokenResponse) => void) | null = null;
let tokenReject: ((error: Error) => void) | null = null;
let tokenPromise: Promise<TokenResponse> | null = null;
let generation = 0;
let configurationKey = '';
function resetPending(error: Error): void {
  const reject = tokenReject;
  tokenResolve = null; tokenReject = null; tokenPromise = null;
  reject?.(error);
}

// ============================================================================
// GIS Script Loading
// ============================================================================

/**
 * Load Google Identity Services script
 */
function loadGisScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof google !== 'undefined' && google.accounts?.oauth2) {
      resolve();
      return;
    }

    const existingScript = document.getElementById('google-gis-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () =>
        reject(new Error('Failed to load GIS script')),
      );
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gis-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => { script.remove(); reject(new Error('Failed to load Google Identity Services script')); };
    document.head.appendChild(script);
  });
}

// ============================================================================
// Authentication Functions
// ============================================================================

/**
 * Initialize Google Auth with the given configuration
 *
 * @param config - Auth configuration including clientId
 * @returns Promise that resolves when initialization is complete
 *
 * @example
 * ```ts
 * await initGoogleAuth({ clientId: 'YOUR_CLIENT_ID.apps.googleusercontent.com' });
 * ```
 */
export async function initGoogleAuth(config: GoogleAuthConfig): Promise<void> {
  const scopes = [...new Set(config.scopes ?? SCOPES_READWRITE)].sort();
  const key = JSON.stringify([config.clientId, scopes]);
  if (initPromise && configurationKey === key) return initPromise;
  resetPending(new Error('Google auth configuration changed'));
  accessToken = null; tokenExpiresAt = null; tokenClient = null;
  currentConfig = { ...config, scopes: [...scopes] }; configurationKey = key;
  const epoch = ++generation;
  const promise = (async () => {
    await loadGisScript();
    if (epoch !== generation) throw new Error('Google auth initialization was superseded');
    if (typeof google === 'undefined' || !google.accounts?.oauth2) throw new Error('Google Identity Services not loaded');
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: config.clientId, scope: scopes.join(' '),
      callback: (response: TokenResponse) => {
        if (epoch !== generation || !tokenResolve) return;
        if (response.error || !response.access_token || !Number.isFinite(response.expires_in) || response.expires_in <= 0) {
          resetPending(new Error(response.error_description || response.error || 'Invalid Google token response')); return;
        }
        accessToken = response.access_token; tokenExpiresAt = Date.now() + response.expires_in * 1000;
        const resolve = tokenResolve; tokenResolve = null; tokenReject = null; tokenPromise = null;
        resolve(response);
      },
      error_callback: (error: { type: string; message?: string }) => {
        if (epoch === generation) resetPending(new Error(error.message || `Auth error: ${error.type}`));
      },
    });
  })();
  initPromise = promise;
  try { await promise; } catch (error) { if (epoch === generation) { initPromise = null; tokenClient = null; } throw error; }

}

/**
 * Request an access token (opens consent popup if needed)
 *
 * @returns Promise with token response
 * @throws Error if auth is not initialized or user denies access
 *
 * @example
 * ```ts
 * const token = await requestAccessToken();
 * console.log('Access token:', token.access_token);
 * ```
 */
export function requestAccessToken(): Promise<TokenResponse> {
  if (!tokenClient) {
    if (currentConfig) return initGoogleAuth(currentConfig).then(() => requestAccessToken());
    return Promise.reject(new Error('Google Auth not initialized. Call initGoogleAuth first.'));
  }
  if (accessToken && tokenExpiresAt && Date.now() < tokenExpiresAt - 60000) return Promise.resolve({
    access_token: accessToken, expires_in: Math.floor((tokenExpiresAt - Date.now()) / 1000),
    token_type: 'Bearer', scope: currentConfig?.scopes?.join(' ') || SCOPES_READWRITE.join(' '),
  });
  if (tokenPromise) return tokenPromise;
  const promise = new Promise<TokenResponse>((resolve, reject) => { tokenResolve = resolve; tokenReject = reject; });
  tokenPromise = promise;
  try { tokenClient.requestAccessToken({ prompt: accessToken ? '' : 'consent' }); }
  catch (error) { resetPending(error instanceof Error ? error : new Error('Google token request failed')); }
  return promise;
}

/**
 * Check if user is currently authenticated with a valid token
 */
export function isAuthenticated(): boolean {
  return !!(accessToken && tokenExpiresAt && Date.now() < tokenExpiresAt);
}

/**
 * Get the current access token (null if not authenticated)
 */
export function getAccessToken(): string | null {
  if (isAuthenticated()) {
    return accessToken;
  }
  return null;
}

/**
 * Get token expiration time
 */
export function getTokenExpiresAt(): number | null {
  return tokenExpiresAt;
}

/**
 * Sign out and revoke the current token
 */
export function signOut(): void {
  if (accessToken && typeof google !== 'undefined' && google.accounts?.oauth2) {
    google.accounts.oauth2.revoke(accessToken, () => {
      console.log('Token revoked');
    });
  }

  clearToken();
}

/**
 * Clear local token state without revoking
 */
export function clearToken(): void {
  resetPending(new Error('Google token request was cancelled'));
  accessToken = null; tokenExpiresAt = null; tokenClient = null; initPromise = null; generation++;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if GIS is loaded and ready
 */
export function isGisLoaded(): boolean {
  return typeof google !== 'undefined' && !!google.accounts?.oauth2;
}

/**
 * Get current auth configuration
 */
export function getAuthConfig(): GoogleAuthConfig | null {
  return currentConfig ? { ...currentConfig, scopes: currentConfig.scopes ? [...currentConfig.scopes] : undefined } : null;
}

// ============================================================================
// Type Declaration for GIS
// ============================================================================

type GoogleOAuth2TokenClient = {
  requestAccessToken(options?: { prompt?: string }): void;
};

type GoogleOAuth2 = {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    callback: (response: TokenResponse) => void;
    error_callback?: (error: { type: string; message?: string }) => void;
  }) => GoogleOAuth2TokenClient;
  revoke: (token: string, callback: () => void) => void;
  TokenClient: unknown;
};

type GoogleAccounts = {
  oauth2?: GoogleOAuth2;
};

type GoogleGlobal = {
  accounts?: GoogleAccounts;
};

declare const google: GoogleGlobal;
