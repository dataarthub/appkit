import { useEffect, useCallback, useRef, useState } from 'react';
import { useAuth } from './useAuth';

/**
 * Display-session checks and client navigation settings for useAuthGuard.
 *
 * @see useAuthGuard for behavior and setup.
 */
export interface AuthGuardOptions {
    /**
     * Callback used instead of navigation when a check finds no user; omitted by default. Callback errors propagate.
     */
  onAuthExpired?: () => void;
    /**
     * Destination assigned to window.location.href when no callback is supplied; defaults to /login.
     */
  loginPath?: string;
    /**
     * Check the current context on visible/focus events; defaults to true.
     */
  checkOnVisibility?: boolean;
    /**
     * Periodic timer interval in milliseconds; defaults to 60000 and is used only when periodic checks are enabled.
     */
  checkInterval?: number;
    /**
     * Start a repeating current-context check; defaults to false.
     */
  enablePeriodicCheck?: boolean;
}

/**
 * Display-session state and explicit check/navigation actions; see useAuthGuard.
 *
 * @see useAuthGuard for the canonical usage example.
 */
export interface AuthGuardResult {
    /**
     * Whether the context currently has a user; does not require isSessionVerified.
     */
  isAuthenticated: boolean;
    /**
     * Current AuthProvider loading flag.
     */
  isLoading: boolean;
    /**
     * Inspect current context, without a backend request.
     *
     * @returns No value; invokes expiry handling only when no user and not loading.
     */
  checkAuth: () => Promise<void>;
    /**
     * Attempt logout, swallow logout failure, then handle expiry.
     *
     * @returns No value after logout attempt and expiry callback or navigation scheduling.
     *
     * @throws Rejects if the supplied expiry callback throws.
     */
  logoutAndRedirect: () => Promise<void>;
}

/**
 * Checks current authentication context on explicit calls, focus or optional timers.
 *
 * @param options - Expiry callback/navigation and check scheduling; defaults to focus checks only.
 *
 * @returns Current display authentication/loading flags and explicit check/logout actions.
 *
 * @throws Error when no AuthProvider exists.
 *
 * @remarks Requires AuthProvider within QueryClientProvider. Checks do not call a backend
 * or refetch a session; they inspect useAuth state. Mounting alone does not redirect:
 * checkAuth must run via an event, timer or caller. onAuthExpired overrides navigation;
 * otherwise navigation is performed by an effect. Cleanup removes listeners/timers.
 * No CSS is required. Optimistic display state can report authenticated before verification.
 *
 * @example
 * ```tsx
 * import type { ReactNode } from 'react';
 * import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
 * import { AuthProvider, useAuthGuard, type AuthAdapter } from '@alneas/appkit-react/tools/auth';
 *
 * function Content() { const { isAuthenticated } = useAuthGuard(); return <span>{isAuthenticated ? 'Signed in' : 'Signed out'}</span>; }
 * export function Example({ adapter, queryClient }: { adapter: AuthAdapter; queryClient: QueryClient }) {
 *   return <QueryClientProvider client={queryClient}><AuthProvider adapter={adapter}><Content /></AuthProvider></QueryClientProvider>;
 * }
 * ```
 */
export function useAuthGuard(options: AuthGuardOptions = {}): AuthGuardResult {
  const {
    onAuthExpired,
    loginPath = '/login',
    checkOnVisibility = true,
    checkInterval = 60000,
    enablePeriodicCheck = false,
  } = options;

  const { user, isLoading, logout } = useAuth();
  const lastCheckRef = useRef<number>(0);
  // SSR-safe: Track pending redirect in state, perform in useEffect
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);

  // Perform actual redirect in useEffect (client-only)
  useEffect(() => {
    lastCheckRef.current = Date.now();
    if (pendingRedirect) {
      window.location.href = pendingRedirect;
    }
  }, [pendingRedirect]);

  const handleAuthExpired = useCallback(() => {
    if (onAuthExpired) {
      onAuthExpired();
    } else {
      // Set state instead of directly accessing window
      setPendingRedirect(loginPath);
    }
  }, [onAuthExpired, loginPath]);

  const logoutAndRedirect = useCallback(async () => {
    try {
      await logout();
    } catch {
      // Ignore logout errors
    }
    handleAuthExpired();
  }, [logout, handleAuthExpired]);

  const checkAuth = useCallback(async () => {
    lastCheckRef.current = Date.now();
    // 認証状態は onAuthStateChanged で自動更新されるため、
    // ここでは現在のユーザー状態をチェック
    if (!user && !isLoading) {
      handleAuthExpired();
    }
  }, [user, isLoading, handleAuthExpired]);

  // タブがフォーカスされた時のチェック
  useEffect(() => {
    if (!checkOnVisibility) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // タブがアクティブになった時、認証状態をチェック
        checkAuth();
      }
    };

    const handleFocus = () => {
      // window.focus イベントでもチェック
      checkAuth();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkOnVisibility, checkAuth]);

  // 定期チェック
  useEffect(() => {
    if (!enablePeriodicCheck) return;

    const interval = setInterval(() => {
      checkAuth();
    }, checkInterval);

    return () => clearInterval(interval);
  }, [enablePeriodicCheck, checkInterval, checkAuth]);

  // ユーザーが null になった時の処理 (セッション切れ)
  useEffect(() => {
    if (!isLoading && !user) {
      // 初回ロード後にユーザーがいない場合
      // onAuthExpired は呼ばず、コンポーネント側で判断させる
    }
  }, [user, isLoading]);

  return {
    isAuthenticated: !!user,
    isLoading,
    checkAuth,
    logoutAndRedirect,
  };
}
