import { createContext, useContext } from 'react';
import type { BaseProfile } from './types';

export interface ProfileState<T extends BaseProfile> {
  profile: T | null;
  isLoading: boolean;
  error: Error | null;
}

export interface ProfileContextValue<T extends BaseProfile> extends ProfileState<T> {
  updateProfile: (updates: Partial<T>) => Promise<T>;
  refreshProfile: () => Promise<void>;
  deleteProfile: () => Promise<void>;
}

export const ProfileContext = createContext<ProfileContextValue<BaseProfile> | null>(null);

/**
 * ログイン中ユーザーのプロファイル詳細情報およびその更新操作関数を取得するためのReactフック。
 */
export function useUserProfile<T extends BaseProfile = BaseProfile>(): ProfileContextValue<T> {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context as unknown as ProfileContextValue<T>;
}
