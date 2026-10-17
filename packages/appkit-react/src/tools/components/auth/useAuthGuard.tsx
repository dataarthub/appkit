import { useEffect, useCallback, useRef, useState } from 'react';
import { useAuth } from './useAuth';

export interface AuthGuardOptions {
  /**
   * 認証切れ時のコールバック
   * @default undefined
   */
  onAuthExpired?: () => void;
  /**
   * ログインページへのリダイレクトパス
   * @default '/login'
   */
  loginPath?: string;
  /**
   * タブフォーカス時に認証状態をチェック
   * @default true
   */
  checkOnVisibility?: boolean;
  /**
   * 定期チェックの間隔 (ms)
   * @default 60000 (1分)
   */
  checkInterval?: number;
  /**
   * 定期チェックを有効にする
   * @default false
   */
  enablePeriodicCheck?: boolean;
}

export interface AuthGuardResult {
  /** 認証済みかどうか */
  isAuthenticated: boolean;
  /** 認証をチェック中かどうか */
  isLoading: boolean;
  /** 手動で認証状態をチェック */
  checkAuth: () => Promise<void>;
  /** ログアウトして指定パスへリダイレクト */
  logoutAndRedirect: () => Promise<void>;
}

/**
 * 認証ガードフック
 *
 * Firebase と Supabase の両方で動作し、以下の機能を提供:
 * - onAuthStateChanged によるリアルタイム監視
 * - タブフォーカス時の認証チェック
 * - オプションの定期チェック
 * - 認証切れ時の自動リダイレクト
 *
 * @example
 * ```tsx
 * function App() {
 *   useAuthGuard({
 *     onAuthExpired: () => navigate('/login'),
 *     checkOnVisibility: true,
 *   });
 *
 *   return <MainContent />;
 * }
 * ```
 *
 * @example
 * ```tsx
 * // ルートコンポーネントで使用
 * function ProtectedRoute({ children }) {
 *   const { isAuthenticated, isLoading } = useAuthGuard({
 *     loginPath: '/login',
 *   });
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (!isAuthenticated) return null; // リダイレクト処理中
 *   return children;
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
