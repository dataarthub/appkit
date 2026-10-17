import React, { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { ProfileAdapter, BaseProfile } from './types';
import { ProfileContext } from './useUserProfile';

export interface UserProfileProviderProps<T extends BaseProfile> {
  children: React.ReactNode;
  /** プロファイルアダプター */
  adapter: ProfileAdapter<T>;
  /** 新規ユーザー作成時の追加データ */
  defaultProfileData?: Partial<T>;
  /** プロファイルが見つからない場合に自動作成 */
  createIfNotExists?: boolean;
}

/**
 * ユーザープロファイルプロバイダー
 *
 * 認証ユーザーに紐づくプロファイルデータを管理します。
 * AuthProvider の内側で使用してください。
 *
 * @example
 * ```tsx
 * interface MyProfile extends BaseProfile {
 *   name: string;
 *   role: 'admin' | 'user';
 *   organizationId?: string;
 * }
 *
 * const profileAdapter = createSupabaseProfileAdapter<MyProfile>(supabase, {
 *   tableName: 'profiles',
 * });
 *
 * <AuthProvider adapter={authAdapter}>
 *   <UserProfileProvider adapter={profileAdapter} createIfNotExists>
 *     <App />
 *   </UserProfileProvider>
 * </AuthProvider>
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
