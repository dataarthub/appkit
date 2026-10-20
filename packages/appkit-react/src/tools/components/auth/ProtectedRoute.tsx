import React, { useEffect } from 'react';
import { useAuth } from './useAuth';
import { useUserProfile } from './useUserProfile';
import { useRoleCheck } from './useRoleCheck';
import { BaseProfile } from './types';

/**
 * Route display restrictions and client redirects.
 *
 * @typeParam T - Profile shape extending BaseProfile; defaults to BaseProfile.
 *
 * @see ProtectedRoute for provider setup and semantics.
 */
export interface ProtectedRouteProps<T extends BaseProfile = BaseProfile> {
  /**
   * Content rendered only after loading and successful display checks.
   */
  children: React.ReactNode;
    /**
     * Unauthenticated redirect destination; defaults to /login.
     */
  loginPath?: string;
    /**
     * Optional denied-access destination; omission renders unauthorizedFallback.
     */
  unauthorizedPath?: string;
    /**
     * Any one listed role must match; omission or an empty array skips role restriction.
     */
  roles?: string[];
    /**
     * Profile scalar/array role property; defaults to role.
     */
  roleField?: keyof T;
    /**
     * Additional synchronous predicate receiving the profile or null; must pass after role checks. Thrown errors propagate from render.
     */
  condition?: (profile: T | null) => boolean;
    /**
     * Loading content; defaults to null.
     */
  fallback?: React.ReactNode;
    /**
     * Denied-access content when unauthorizedPath is omitted; defaults to null.
     */
  unauthorizedFallback?: React.ReactNode;
    /**
     * Optional synchronous navigation callback receiving the destination; omission assigns window.location.href.
     */
  onRedirect?: (path: string) => void;
}

/**
 * Renders or redirects according to current auth, optional roles and an optional predicate.
 *
 * @typeParam T - Profile shape used by roleField and condition; defaults to BaseProfile.
 *
 * @param props - Children, access predicates, loading/denial content and navigation settings.
 *
 * @returns Loading fallback, permitted children, denied fallback or null while redirecting.
 *
 * @throws Error without AuthProvider; condition errors propagate during rendering.
 *
 * @remarks Requires AuthProvider inside QueryClientProvider. UserProfileProvider is optional
 * but needed for profile-based roles. Redirects run in effects; missing profiles fail a
 * nonempty role restriction. This uses display user state without isSessionVerified;
 * backend authorization is still required. No CSS is required.
 *
 * @example
 * ```tsx
 * import type { ReactNode } from 'react';
 * import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
 * import { AuthProvider, ProtectedRoute, type AuthAdapter } from '@alneas/appkit-react/tools/auth';
 *
 * function Content() { return <ProtectedRoute><span>Account</span></ProtectedRoute>; }
 * export function Example({ adapter, queryClient }: { adapter: AuthAdapter; queryClient: QueryClient }) {
 *   return <QueryClientProvider client={queryClient}><AuthProvider adapter={adapter}><Content /></AuthProvider></QueryClientProvider>;
 * }
 * ```
 */
export function ProtectedRoute<T extends BaseProfile = BaseProfile>({
  children,
  loginPath = '/login',
  unauthorizedPath,
  roles,
  roleField = 'role' as keyof T,
  condition,
  fallback = null,
  unauthorizedFallback = null,
  onRedirect,
}: ProtectedRouteProps<T>) {
  const { user, isLoading: isAuthLoading } = useAuth();

  // UserProfileProvider はオプショナル
  let profile: T | null = null;
  let isProfileLoading = false;

  try {
    const profileContext = useUserProfile<T>();
    profile = profileContext.profile;
    isProfileLoading = profileContext.isLoading;
  } catch {
    // UserProfileProvider が存在しない場合は無視
  }

  const isLoading = isAuthLoading || isProfileLoading;

  // 認証チェック
  const isAuthenticated = !!user;

  // ロールチェック
  const hasRequiredRole = (): boolean => {
    if (!roles || roles.length === 0) return true;
    if (!profile) return false;

    const userRole = profile[roleField];
    if (Array.isArray(userRole)) {
      // ユーザーが複数ロールを持つ場合
      return roles.some((role) => userRole.includes(role));
    }
    return roles.includes(userRole as string);
  };

  // カスタム条件チェック
  const meetsCondition = (): boolean => {
    if (!condition) return true;
    return condition(profile);
  };

  // 認可チェック (ロール + 条件)
  const isAuthorized = hasRequiredRole() && meetsCondition();

  // リダイレクト処理 (useEffect内でのみwindow操作)
  useEffect(() => {
    if (isLoading) return;

    const performRedirect = (path: string) => {
      if (onRedirect) {
        onRedirect(path);
      } else {
        window.location.href = path;
      }
    };

    if (!isAuthenticated) {
      performRedirect(loginPath);
      return;
    }

    if (!isAuthorized && unauthorizedPath) {
      performRedirect(unauthorizedPath);
    }
  }, [isLoading, isAuthenticated, isAuthorized, loginPath, unauthorizedPath, onRedirect]);

  // ローディング中
  if (isLoading) {
    return <>{fallback}</>;
  }

  // 未認証
  if (!isAuthenticated) {
    return null; // リダイレクト処理中
  }

  // 認可エラー
  if (!isAuthorized) {
    if (unauthorizedPath) {
      return null; // リダイレクト処理中
    }
    return <>{unauthorizedFallback}</>;
  }

  // 認証・認可OK
  return <>{children}</>;
}

/**
 * Conditional display settings; see ShowFor for usage.
 *
 * @typeParam T - Profile shape extending BaseProfile; defaults to BaseProfile.
 *
 * @see ShowFor for the canonical usage example.
 */
export interface ShowForProps<T extends BaseProfile = BaseProfile> {
  /**
   * Content to render when all supplied checks pass.
   */
  children: React.ReactNode;
  /**
   * Any one role must match; omission or empty array imposes no restriction.
   */
  roles?: string[];
  /**
   * Profile role property; defaults to role.
   */
  roleField?: keyof T;
  /**
   * Optional synchronous predicate receiving the current profile or null.
   */
  condition?: (profile: T | null) => boolean;
  /**
   * Content when a check fails; defaults to null.
   */
  fallback?: React.ReactNode;
}

/**
 * Conditionally displays children using profile roles and an optional predicate.
 *
 * @typeParam T - Profile shape extending BaseProfile; defaults to BaseProfile.
 *
 * @param props - Role checks, profile predicate, children and optional fallback.
 *
 * @returns Children when checks pass; otherwise fallback, defaulting to null.
 *
 * @throws Predicate errors propagate from render.
 *
 * @remarks UserProfileProvider supplies profile data but is optional; without it profile
 * is null. With no restrictions children render even without a profile. Does not redirect,
 * wait for loading, verify authentication or enforce backend access. No CSS is required.
 *
 * @example
 * ```tsx
 * import { ShowFor } from '@alneas/appkit-react/tools/auth';
 * export function RoleLabel() { return <ShowFor roles={['admin']}><span>Admin controls</span></ShowFor>; }
 * ```
 */
export function ShowFor<T extends BaseProfile = BaseProfile>({
  children,
  roles,
  roleField = 'role' as keyof T,
  condition,
  fallback = null,
}: ShowForProps<T>) {
  const { hasAnyRole, profile } = useRoleCheck<T>(roleField);

  const shouldShow = (): boolean => {
    if (roles && roles.length > 0) {
      if (!hasAnyRole(roles)) return false;
    }
    if (condition) {
      if (!condition(profile)) return false;
    }
    return true;
  };

  return shouldShow() ? <>{children}</> : <>{fallback}</>;
}
