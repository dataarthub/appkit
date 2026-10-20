import { createContext, useContext } from 'react';
import type { AuthAdapter, User } from './types';

/**
 * Current display authentication state; see useAuth for provider setup.
 *
 * @see useAuth for the canonical usage example.
 */
export interface AuthState {
  /**
   * Current display user or null; optimistic display is not proof of a verified session.
   */
  user: User | null;
  /**
   * True during initial hydration/query loading or tracked login/register/logout/OAuth work.
   */
  isLoading: boolean;
  /**
   * Last tracked action error or session-query error; null when none is present.
   */
  error: Error | null;
}

/**
 * Authentication state and adapter-backed actions exposed by AuthProvider.
 *
 * @remarks Optional adapter capabilities are undefined when unsupported.
 *
 * @see useAuth for consumption; see AuthAdapter for argument/result contracts.
 */
export interface AuthContextValue extends AuthState {
    /**
     * Whether a session query has fetched without placeholder data; false before verification even when optimistic caching is disabled.
     */
  isSessionVerified?: boolean;
    /**
     * Whether backend verification completed with user null; independent of whether optimistic caching is enabled.
     */
  isLoggedOutKnown?: boolean;
    /**
     * Whether the provider enabled optimistic display caching.
     */
  optimisticSession?: boolean;
    /**
     * Sign in through the adapter; see AuthAdapter.login.
     *
     * @param email - Account email.
     *
     * @param password - Account password.
     *
     * @returns Signed-in user; adapter failures reject.
     */
  login: AuthAdapter['login'];
    /**
     * Register through the adapter; see AuthAdapter.register.
     *
     * @param email - New account email.
     *
     * @param password - New account password.
     *
     * @param data - Optional display name.
     *
     * @returns Registered user; adapter failures reject.
     */
  register: AuthAdapter['register'];
    /**
     * Sign out through the adapter; see AuthAdapter.logout.
     *
     * @returns No value after adapter sign-out; adapter failures reject.
     */
  logout: AuthAdapter['logout'];
    /**
     * Request a reset through the adapter; see AuthAdapter.resetPassword.
     *
     * @param email - Account email.
     *
     * @returns No value after the adapter accepts the reset request; failures reject.
     */
  resetPassword: AuthAdapter['resetPassword'];
    /**
     * Change email through the adapter; see AuthAdapter.updateEmail.
     *
     * @param email - Replacement email.
     *
     * @returns No value after adapter completion; failures reject.
     */
  updateEmail: AuthAdapter['updateEmail'];
    /**
     * Change password through the adapter; see AuthAdapter.updatePassword.
     *
     * @param password - Replacement password.
     *
     * @returns No value after adapter completion; failures reject.
     */
  updatePassword: AuthAdapter['updatePassword'];
    /**
     * Optional adapter reauthentication capability; see AuthAdapter.reauthenticate.
     */
  reauthenticate?: AuthAdapter['reauthenticate'];
    /**
     * Optional verification-email capability; see AuthAdapter.sendVerificationEmail.
     */
  sendVerificationEmail?: AuthAdapter['sendVerificationEmail'];
    /**
     * Optional token capability; see AuthAdapter.getToken.
     */
  getToken?: AuthAdapter['getToken'];
    /**
     * Optional OAuth capability; see AuthAdapter.loginWithProvider.
     */
  loginWithProvider?: AuthAdapter['loginWithProvider'];
}

/**
 * Nullable React authentication context; AuthProvider owns its populated value.
 *
 * @see useAuth for supported consumption and missing-provider checks.
 */
export const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Reads authentication state and adapter actions from the nearest AuthProvider.
 *
 * @returns Current display state and provider actions; optional capabilities can be undefined.
 *
 * @throws Error when used outside AuthProvider.
 *
 * @remarks Requires AuthProvider inside QueryClientProvider; no CSS is required by the hook.
 * Actions can reject with adapter errors. Backend authorization remains host-owned.
 *
 * @example
 * ```tsx
 * import type { ReactNode } from 'react';
 * import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
 * import { AuthProvider, useAuth, type AuthAdapter } from '@alneas/appkit-react/tools/auth';
 *
 * function Content() { const { user } = useAuth(); return <span>{user?.email ?? 'Signed out'}</span>; }
 * export function Example({ adapter, queryClient }: { adapter: AuthAdapter; queryClient: QueryClient }) {
 *   return <QueryClientProvider client={queryClient}><AuthProvider adapter={adapter}><Content /></AuthProvider></QueryClientProvider>;
 * }
 * ```
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
