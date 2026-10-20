import React, { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { ProfileAdapter, BaseProfile } from './types';
import { ProfileContext } from './useUserProfile';

/**
 * Configuration for UserProfileProvider; see its provider example.
 *
 * @typeParam T - Application profile extending BaseProfile with its persisted fields.
 *
 * @see UserProfileProvider for the canonical usage example.
 */
export interface UserProfileProviderProps<T extends BaseProfile> {
  /** Descendants that consume the profile context. */
  children: React.ReactNode;
  /** Host-supplied persistence operations and collection name. */
  adapter: ProfileAdapter<T>;
  /** Additional fields passed to adapter.create when a profile is missing. */
  defaultProfileData?: Partial<T>;
  /** Create a missing profile after authentication; defaults to true. */
  createIfNotExists?: boolean;
}

/**
 * Loads and manages the authenticated user's profile through a host adapter.
 *
 *
 * @typeParam T - Persisted profile shape extending BaseProfile.
 *
 * @param props - Children, host persistence adapter and optional creation settings.
 *
 * @returns Profile context around the children; query and mutation errors are exposed in context.
 *
 * @remarks Requires outer QueryClientProvider and AuthProvider. Queries use
 * [adapter.tableName, 'detail', user.id]. Creation defaults to enabled; adapter.create
 * receives defaultProfileData. Updates add updated_at and refresh the detail cache;
 * updates/deletes invalidate collection list queries. Mutations reject if no profile
 * exists or the adapter fails. Query errors remain in context. No CSS is required.
 * The host implements ProfileAdapter and enforces access in its backend.
 *
 * @example
 * ```tsx
 * import type { ReactNode } from 'react';
 * import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
 * import {
 *   AuthProvider, UserProfileProvider,
 *   type AuthAdapter, type BaseProfile, type ProfileAdapter,
 * } from '@alneas/appkit-react/tools/auth';
 * interface MyProfile extends BaseProfile { name: string; }
 * // Supply real host adapters; Appkit does not provide a Supabase profile factory.
 * export function ProfileRoot({ authAdapter, profileAdapter, queryClient, children }: {
 *   authAdapter: AuthAdapter;
 *   profileAdapter: ProfileAdapter<MyProfile>;
 *   queryClient: QueryClient;
 *   children: ReactNode;
 * }) {
 *   return (
 *     <QueryClientProvider client={queryClient}>
 *       <AuthProvider adapter={authAdapter}>
 *         <UserProfileProvider adapter={profileAdapter} createIfNotExists>
 *           {children}
 *         </UserProfileProvider>
 *       </AuthProvider>
 *     </QueryClientProvider>
 *   );
 * }
 * ```
 */
export function UserProfileProvider<T extends BaseProfile>({
  children,
  adapter,
  defaultProfileData,
  createIfNotExists = true,
}: UserProfileProviderProps<T>) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const queryClient = useQueryClient();

  // Cache key aligned with data-access: [tableName, 'detail', id]
  const queryKey = useMemo(
    () => [adapter.tableName, 'detail', user?.id],
    [adapter.tableName, user?.id],
  );

  // Query to fetch or create the profile
  const {
    data: profile = null,
    isLoading: isProfileLoading,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async (): Promise<T | null> => {
      if (!user) return null;

      // Try fetching the profile
      let profileData = await adapter.get(user.id);

      // If it doesn't exist, and createIfNotExists is true, create it
      if (!profileData && createIfNotExists) {
        profileData = await adapter.create(user.id, user, defaultProfileData);
      }

      return profileData;
    },
    enabled: !isAuthLoading && !!user,
  });

  const currentProfile = user ? (profile ?? null) : null;
  const isLoading = isAuthLoading || (!!user && isProfileLoading);

  // Mutation to update the profile
  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<T>): Promise<T> => {
      if (!currentProfile) {
        throw new Error('No profile to update');
      }
      const updatePayload: Partial<T> = {
        ...updates,
        updated_at: new Date().toISOString() as T['updated_at'],
      };
      return adapter.update(currentProfile.id, updatePayload);
    },
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(queryKey, updatedProfile);
      // Invalidate list queries for this collection to keep any list views fresh
      queryClient.invalidateQueries({ queryKey: [adapter.tableName, 'list'] });
    },
  });

  // Mutation to delete the profile
  const deleteMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      if (!currentProfile) {
        throw new Error('No profile to delete');
      }
      await adapter.delete(currentProfile.id);
    },
    onSuccess: () => {
      queryClient.setQueryData(queryKey, null);
      queryClient.invalidateQueries({ queryKey: [adapter.tableName, 'list'] });
    },
  });

  const updateProfile = useCallback(
    async (updates: Partial<T>): Promise<T> => {
      return updateMutation.mutateAsync(updates);
    },
    [updateMutation],
  );

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    await refetch();
  }, [user, refetch]);

  const deleteProfile = useCallback(async (): Promise<void> => {
    await deleteMutation.mutateAsync();
  }, [deleteMutation]);

  const contextValue = {
    profile: currentProfile,
    isLoading,
    error: (error || updateMutation.error || deleteMutation.error) as Error | null,
    updateProfile: updateProfile as unknown as (
      updates: Partial<BaseProfile>,
    ) => Promise<BaseProfile>,
    refreshProfile,
    deleteProfile,
  };

  return <ProfileContext.Provider value={contextValue}>{children}</ProfileContext.Provider>;
}
