import { createContext, useContext } from 'react';
import type { BaseProfile } from './types';

/**
 * Profile data and query/mutation status from UserProfileProvider.
 *
 * @typeParam T - Persisted profile extending BaseProfile; must match the supplied adapter.
 *
 * @see useUserProfile for usage.
 */
export interface ProfileState<T extends BaseProfile> {
  /**
   * Current authenticated profile, or null before retrieval or after logout/deletion.
   */
  profile: T | null;
  /**
   * Authentication or enabled profile-query loading state.
   */
  isLoading: boolean;
  /**
   * Query, update or deletion error; null when no such error is present.
   */
  error: Error | null;
}

/**
 * Profile state plus persistence actions from UserProfileProvider.
 *
 * @typeParam T - Persisted profile extending BaseProfile; must match the supplied adapter.
 *
 * @see useUserProfile for usage.
 */
export interface ProfileContextValue<T extends BaseProfile> extends ProfileState<T> {
  /**
   * Persist partial updates and add an updated_at ISO timestamp.
   *
   * @param updates - Partial persisted fields.
   *
   * @returns Updated profile from the adapter.
   *
   * @throws Rejects when no profile exists or the adapter rejects.
   */
  updateProfile: (updates: Partial<T>) => Promise<T>;
  /**
   * Refetch the current profile when authenticated.
   *
   * @returns No value after refetch completes; unauthenticated calls do nothing.
   */
  refreshProfile: () => Promise<void>;
  /**
   * Delete the current profile and clear its detail cache.
   *
   * @returns No value after deletion.
   *
   * @throws Rejects when no profile exists or the adapter rejects.
   */
  deleteProfile: () => Promise<void>;
}

/**
 * Nullable base-profile React context populated by UserProfileProvider.
 *
 * @see useUserProfile for typed consumption.
 */
export const ProfileContext = createContext<ProfileContextValue<BaseProfile> | null>(null);

/**
 * Reads the current profile and persistence actions from UserProfileProvider.
 *
 * @typeParam T - Expected persisted profile shape; defaults to BaseProfile and must match the host adapter.
 *
 * @returns Provider state and actions; the generic is a cast, not runtime validation.
 *
 * @throws Error when used outside UserProfileProvider.
 *
 * @remarks Requires QueryClientProvider, AuthProvider and UserProfileProvider in that order;
 * see UserProfileProvider for a complete host-adapter setup. No CSS is required.
 *
 * @example
 * ```tsx
 * import { useUserProfile } from '@alneas/appkit-react/tools/auth';
 * // Render under the providers shown in UserProfileProvider's example.
 * export function ProfileEmail() { return <span>{useUserProfile().profile?.email ?? 'No profile'}</span>; }
 * ```
 */
export function useUserProfile<T extends BaseProfile = BaseProfile>(): ProfileContextValue<T> {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context as unknown as ProfileContextValue<T>;
}
