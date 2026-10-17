import React, { useEffect } from 'react';
import { useAuth } from './useAuth';
import { useUserProfile } from './useUserProfile';
import { useRoleCheck } from './useRoleCheck';
import { BaseProfile } from './types';

export interface ProtectedRouteProps<T extends BaseProfile = BaseProfile> {
  children: React.ReactNode;
  /**
   * ログインページへのパス
   * @default '/login'
   */
  loginPath?: string;
  /**
   * 認可エラー時のリダイレクトパス (403)
   * @default undefined (リダイレクトしない)
   */
  unauthorizedPath?: string;
  /**
   * 許可されるロールの配列
   * @example ['admin', 'manager']
   */
  roles?: string[];
  /**
   * プロファイル内のロールフィールド名
   * @default 'role'
   */
  roleField?: keyof T;
  /**
   * カスタムアクセス条件
   * @example (profile) => profile?.subscription === 'premium'
   */
  condition?: (profile: T | null) => boolean;
  /**
   * ロード中に表示するコンポーネント
   */
  fallback?: React.ReactNode;
  /**
   * 認可エラー時に表示するコンポーネント (unauthorizedPath が未設定の場合)
   */
  unauthorizedFallback?: React.ReactNode;
  /**
   * リダイレクト処理をカスタマイズ
   * @example (path) => navigate(path)
   */
  onRedirect?: (path: string) => void;
}

/**
 * ルート保護コンポーネント
 *
 * 認証状態とロール/条件に基づいてページアクセスを制御します。
 *
 * @example
 * ```tsx
 * // 認証ユーザーのみ
 * <ProtectedRoute>
 *   <DashboardPage />
 * </ProtectedRoute>
 *
 * // 特定ロールのみ
 * <ProtectedRoute roles={['admin']} unauthorizedPath="/403">
 *   <AdminPage />
 * </ProtectedRoute>
 *
 * // カスタム条件
 * <ProtectedRoute
 *   condition={(profile) => profile?.plan === 'premium'}
 *   unauthorizedPath="/upgrade"
 * >
 *   <PremiumPage />
 * </ProtectedRoute>
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
 * ロールベースの表示制御フック
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { hasRole, hasAnyRole } = useRoleCheck();
 *
 *   return (
 *     <div>
 *       {hasRole('admin') && <AdminPanel />}
 *       {hasAnyRole(['admin', 'manager']) && <ManageButton />}
 *     </div>
 *   );
 * }
 * ```
 */
/**
 * 条件付き表示コンポーネント
 *
 * @example
 * ```tsx
 * <ShowFor roles={['admin']}>
 *   <AdminOnlyContent />
 * </ShowFor>
 *
 * <ShowFor condition={(profile) => profile?.plan === 'premium'}>
 *   <PremiumContent />
 * </ShowFor>
 * ```
 */
export interface ShowForProps<T extends BaseProfile = BaseProfile> {
  children: React.ReactNode;
  roles?: string[];
  roleField?: keyof T;
  condition?: (profile: T | null) => boolean;
  fallback?: React.ReactNode;
}

/**
 * ユーザーのロールやカスタム条件に基づいて、子要素の表示・非表示を切り替える条件付き表示コンポーネント。
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
