import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthAdapter } from './types';
import { AuthContext } from './useAuth';
import { getAdapterCacheScope, getInstanceCacheScope } from '../../lib/data-access/cache-scope';
import { createAuthSession } from './auth-session';
import {
  createSessionCache,
  subscribeSessionCacheStorageEvent,
  type SessionCacheOptions,
} from './session-cache';

/** 楽観セッションキャッシュの設定。`true` はデフォルト TTL で有効化、`false`/省略は無効 */
export type OptimisticSessionOption = boolean | Omit<SessionCacheOptions, 'key'>;

interface AuthProviderProps {
  children: React.ReactNode;
  adapter: AuthAdapter;
  /**
   * 楽観セッションキャッシュ（stale-while-revalidate）を有効化します。
   *
   * 有効時は、前回のセッション検証結果を localStorage に保持し、リロード時に即座に
   * 最後の状態で描画します。裏で whoami 等を再検証し、クッキーが無効なら即座に
   * ログイン画面へフォールバックします。これにより「認証確認待ち」による画面ブロック
   * （特に初期ロード時のログイン画面遅延）を排除できます。
   *
   * 保存するのは表示用プロフィールのみで、トークン等の機密は含みません。未指定時は無効。
   *
   * @example
   * ```tsx
   * <AuthProvider adapter={adapter} optimisticSession />
   * // または TTL を指定
   * <AuthProvider adapter={adapter} optimisticSession={{ ttl: 1000 * 60 * 60 * 24 }} />
   * ```
   */
  optimisticSession?: OptimisticSessionOption;
}

/**
 * Authentication Provider Component
 *
 * Provides authentication context to child components with SSR support.
 *
 * Each provider/adapter has an isolated session key under `['session']`. On initial verification
 * and principal changes, application queries in the shared QueryClient are cancelled and removed,
 * and children remount to discard observer/component state. Same-user refreshes preserve them.
 * Use separate QueryClients for independent authentication domains. Data keys remain a cache
 * mechanism, not authorization; enforce access in the backend. Optimistic storage reuse across
 * reloads requires an explicit, non-secret `adapter.cacheScope`.
 *
 * **SSR Behavior:**
 * - During SSR and initial client render, auth state is `{ user: null, isLoading: true }`
 * - Auth listener is only activated after client-side mount
 * - This prevents hydration mismatches between server and client
 *
 * **Optimistic session:**
 * - `optimisticSession` が有効で、かつ直近のセッション状態が localStorage にあれば、
 *    `isLoading` は即 `false` となり `user` は最後の値（または null）で描画されます。
 *   その際 `isSessionVerified` は `false` となり、裏での再検証が完了するまで機微な
 *   画面をガードできます。
 *
 * @example
 * ```tsx
 * import { AuthProvider, BetterAuthAdapter } from '@alneas/appkit-react/tools/auth';
 *
 * const adapter = new BetterAuthAdapter(authClient);
 *
 * <AuthProvider adapter={adapter} optimisticSession>
 *   <App />
 * </AuthProvider>
 * ```
 */
export function AuthProvider({ children, adapter, optimisticSession }: AuthProviderProps) {
  const providerId = React.useId();
  const scope = `${getInstanceCacheScope(adapter)}:${getAdapterCacheScope(adapter)}`;
  return (
    <ScopedAuthProvider
      key={scope}
      adapter={adapter}
      optimisticSession={optimisticSession}
      providerId={providerId}
      scope={scope}
    >
      {children}
    </ScopedAuthProvider>
  );
}

function ScopedAuthProvider({
  children,
  adapter,
  optimisticSession,
  providerId,
  scope,
}: AuthProviderProps & { providerId: string; scope: string }) {
  const queryClient = useQueryClient();
  // A fresh mounted boundary must verify again even when returning to a previously used adapter.
  const sessionId = React.useId();
  const session = useMemo(
    () =>
      createAuthSession(queryClient, adapter, [
        'session',
        'react-tools.auth',
        providerId,
        scope,
        sessionId,
      ]),
    [queryClient, adapter, providerId, scope, sessionId],
  );
  const epoch = React.useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getServerSnapshot,
  );
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionError, setActionError] = useState<Error | null>(null);

  const sessionCache = useMemo(() => {
    if (!optimisticSession) return null;
    const opts: SessionCacheOptions = optimisticSession === true ? {} : optimisticSession;
    return createSessionCache({
      ...opts,
      key: `dataarthub.auth.last-session:${providerId}:${getAdapterCacheScope(adapter)}`,
    });
  }, [optimisticSession, providerId, adapter]);

  // Mark component as mounted (client-side only)
  // useSyncExternalStore ensures we have a consistent value during hydration
  const mounted = React.useSyncExternalStore(
    React.useCallback(() => () => {}, []),
    () => true,
    () => false,
  );

  // 楽観表示用の placeholder を読み込む（mounted 以降、かつ有効期限内のみ）
  const placeholderData = React.useMemo(() => {
    if (!sessionCache || !mounted) return undefined;
    const hit = sessionCache.read();
    // eslint-disable-next-line react-hooks/purity
    if (!hit || hit.exp <= Date.now()) return undefined;
    return hit.user; // User | null（null は「最後に未ログイン」
  }, [sessionCache, mounted]);

  // Session query using TanStack Query
  const {
    data: user = null,
    isLoading: isQueryLoading,
    error: queryError,
    isPlaceholderData,
    isFetched,
  } = useQuery({
    queryKey: session.queryKey,
    queryFn: ({ signal }) => session.read(signal),
    enabled: mounted,
    placeholderData,
    staleTime: sessionCache ? 1000 * 60 * 5 : 0,
  });

  // 楽観表示中かどうか（placeholder データで描画中＝裏で再検証中）
  const isSessionVerified = isFetched && !isPlaceholderData;
  // ログアウト確定など、明示的に未ログインが分かっている状態か
  const isLoggedOutKnown = isSessionVerified && user === null;

  const isLoading = !mounted || isQueryLoading || isActionLoading;
  const error = actionError || (queryError as Error | null);

  // 確定したセッション状態を localStorage に永続化（楽観キャッシュの更新）
  useEffect(() => {
    if (!sessionCache || !isFetched || isPlaceholderData) return;
    sessionCache.write(user);
  }, [sessionCache, isFetched, isPlaceholderData, user]);

  // 他タブでのログイン/ログアウトを検知して再検証
  useEffect(() => {
    if (!sessionCache || !mounted) return;
    return subscribeSessionCacheStorageEvent(sessionCache.key, () => {
      void queryClient.invalidateQueries({ queryKey: session.queryKey, exact: true });
    });
  }, [sessionCache, mounted, queryClient, session]);

  // Setup auth state listener only on client-side
  useEffect(() => {
    if (!mounted) return;

    session.activate();
    const unsubscribe = adapter.onAuthStateChanged(session.publish);
    return () => {
      unsubscribe();
      session.deactivate();
    };
  }, [adapter, mounted, session]);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        setIsActionLoading(true);
        setActionError(null);
        const userResult = await session.run(() => adapter.login(email, password));
        return userResult;
      } catch (err) {
        setActionError(err as Error);
        throw err;
      } finally {
        setIsActionLoading(false);
      }
    },
    [adapter, session],
  );

  const register = useCallback(
    async (email: string, password: string, data?: { name?: string }) => {
      try {
        setIsActionLoading(true);
        setActionError(null);
        const userResult = await session.run(() => adapter.register(email, password, data));
        return userResult;
      } catch (err) {
        setActionError(err as Error);
        throw err;
      } finally {
        setIsActionLoading(false);
      }
    },
    [adapter, session],
  );

  const logout = useCallback(async () => {
    try {
      setIsActionLoading(true);
      setActionError(null);
      await session.run(() => adapter.logout(), true);
    } catch (err) {
      setActionError(err as Error);
      throw err;
    } finally {
      setIsActionLoading(false);
    }
  }, [adapter, session]);

  const resetPassword = useCallback(
    async (email: string) => {
      return adapter.resetPassword(email);
    },
    [adapter],
  );

  const updateEmail = useCallback(
    async (email: string) => {
      return adapter.updateEmail(email);
    },
    [adapter],
  );

  const updatePassword = useCallback(
    async (password: string) => {
      return adapter.updatePassword(password);
    },
    [adapter],
  );

  const reauthenticate = useMemo(() => {
    return adapter.reauthenticate
      ? async (password: string) => adapter.reauthenticate!(password)
      : undefined;
  }, [adapter]);

  const sendVerificationEmail = useMemo(() => {
    return adapter.sendVerificationEmail ? async () => adapter.sendVerificationEmail!() : undefined;
  }, [adapter]);

  const getToken = useMemo(() => {
    return adapter.getToken ? async () => adapter.getToken!() : undefined;
  }, [adapter]);

  const loginWithProvider = useCallback(
    async (...args: Parameters<NonNullable<AuthAdapter['loginWithProvider']>>) => {
      if (!adapter.loginWithProvider) {
        throw new Error('OAuth login is not supported by this adapter.');
      }
      try {
        setIsActionLoading(true);
        setActionError(null);
        const userResult = await session.run(() => adapter.loginWithProvider!(...args));
        return userResult;
      } catch (err) {
        setActionError(err as Error);
        throw err;
      } finally {
        setIsActionLoading(false);
      }
    },
    [adapter, session],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        /** セッションが裏で再検証され、確定した状態か。楽観表示中は false */
        isSessionVerified,
        /** 再検証によって「未ログイン」が確定しているか */
        isLoggedOutKnown,
        /** 楽観キャッシュを利用中か */
        optimisticSession: !!sessionCache,
        login,
        register,
        logout,
        resetPassword,
        updateEmail,
        updatePassword,
        reauthenticate,
        sendVerificationEmail,
        getToken,
        loginWithProvider: adapter.loginWithProvider ? loginWithProvider : undefined,
      }}
    >
      <React.Fragment key={epoch}>{children}</React.Fragment>
    </AuthContext.Provider>
  );
}
