import { useUserProfile } from './useUserProfile';
import type { BaseProfile } from './types';

/**
 * Builds display predicates for a scalar or array role field on the current profile.
 *
 * @typeParam T - Profile shape extending BaseProfile; defaults to BaseProfile.
 *
 * @param roleField - Property containing role strings; defaults to role.
 *
 * @returns Profile plus hasRole, hasAnyRole and hasAllRoles predicates. Missing profile
 * returns false for individual roles; hasAllRoles([]) is true by Array.every semantics.
 *
 * @remarks A missing UserProfileProvider is tolerated and treated as no profile. Use
 * UserProfileProvider to supply roles. These checks control display only; the backend
 * must enforce authorization. No CSS is required.
 *
 * @example
 * ```tsx
 * import { useRoleCheck } from '@alneas/appkit-react/tools/auth';
 * export function AdminHint() { const { hasRole } = useRoleCheck(); return hasRole('admin') ? <span>Admin</span> : null; }
 * ```
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

/**
 * Tests one role against the current scalar/array profile field.
 *
 * @param role - Requested role string.
 *
 * @returns True when the profile role equals or includes the requested string.
 *
 * @example
 * ```tsx
 * import { useRoleCheck } from '@alneas/appkit-react/tools/auth';
 * // Render under UserProfileProvider to supply profile roles.
 * export function AccessHint() { const { hasRole } = useRoleCheck(); return <output>{hasRole('admin') ? 'Allowed' : 'Unavailable'}</output>; }
 * ```
 */
  const hasRole = (role: string): boolean => {
    if (!profile) return false;
    const userRole = profile[roleField];
    if (Array.isArray(userRole)) {
      return userRole.includes(role);
    }
    return userRole === role;
  };

/**
 * Tests whether at least one supplied role matches.
 *
 * @param roles - Requested role strings.
 *
 * @returns True when any role matches; false for an empty array.
 *
 * @example
 * ```tsx
 * import { useRoleCheck } from '@alneas/appkit-react/tools/auth';
 * // Render under UserProfileProvider to supply profile roles.
 * export function AccessHint() { const { hasAnyRole } = useRoleCheck(); return <output>{hasAnyRole(['admin', 'manager']) ? 'Allowed' : 'Unavailable'}</output>; }
 * ```
 */
  const hasAnyRole = (roles: string[]): boolean => {
    return roles.some((role) => hasRole(role));
  };

/**
 * Tests whether every supplied role matches.
 *
 * @param roles - Requested role strings.
 *
 * @returns True when all roles match; true for an empty array even without a profile.
 *
 * @example
 * ```tsx
 * import { useRoleCheck } from '@alneas/appkit-react/tools/auth';
 * // Render under UserProfileProvider to supply profile roles.
 * export function AccessHint() { const { hasAllRoles } = useRoleCheck(); return <output>{hasAllRoles(['admin', 'reviewer']) ? 'Allowed' : 'Unavailable'}</output>; }
 * ```
 */
  const hasAllRoles = (roles: string[]): boolean => {
    return roles.every((role) => hasRole(role));
  };

  return {
/**
 * Current profile used by every predicate; null when the profile provider is absent.
 */
    profile,
/**
 * Tests one role against the current scalar/array profile field.
 *
 * @param role - Requested role string.
 *
 * @returns True when the profile role equals or includes the requested string.
 *
 * @see useRoleCheck for profile setup; see the predicate declaration for its example.
 */
    hasRole,
/**
 * Tests whether at least one supplied role matches.
 *
 * @param roles - Requested role strings.
 *
 * @returns True when any role matches; false for an empty array.
 *
 * @see useRoleCheck for profile setup; see the predicate declaration for its example.
 */
    hasAnyRole,
/**
 * Tests whether every supplied role matches.
 *
 * @param roles - Requested role strings.
 *
 * @returns True when all roles match; true for an empty array even without a profile.
 *
 * @see useRoleCheck for profile setup; see the predicate declaration for its example.
 */
    hasAllRoles,
  };
}
