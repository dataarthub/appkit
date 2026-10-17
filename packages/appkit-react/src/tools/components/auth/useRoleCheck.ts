import { useUserProfile } from './useUserProfile';
import type { BaseProfile } from './types';

/**
 * ロールベースの表示制御フック
 */
export function useRoleCheck<T extends BaseProfile = BaseProfile>(
  roleField: keyof T = 'role' as keyof T,
) {
  let profile: T | null = null;

  try {
    const profileContext = useUserProfile<T>();
    profile = profileContext.profile;
  } catch {
    // UserProfileProvider が存在しない場合
  }

  const hasRole = (role: string): boolean => {
    if (!profile) return false;
    const userRole = profile[roleField];
    if (Array.isArray(userRole)) {
      return userRole.includes(role);
    }
    return userRole === role;
  };

  const hasAnyRole = (roles: string[]): boolean => {
    return roles.some((role) => hasRole(role));
  };

  const hasAllRoles = (roles: string[]): boolean => {
    return roles.every((role) => hasRole(role));
  };

  return {
    profile,
    hasRole,
    hasAnyRole,
    hasAllRoles,
  };
}
