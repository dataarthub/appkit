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

/**
 * Optimistic display-cache setting: true uses seven days; false/omission disables it.
 * @see AuthProvider for the canonical usage example.
 */
export type OptimisticSessionOption = boolean | Omit<SessionCacheOptions, 'key'>;

/**
 * Inputs to AuthProvider; see the component for provider setup.
 * @see AuthProvider for the canonical usage example.
 */
interface AuthProviderProps {
  /** Descendants that consume authentication context. */
  children: React.ReactNode;
  /** Stable host-owned authentication backend adapter. */
  adapter: AuthAdapter;
  /** Enable browser display snapshots with an optional TTL in milliseconds; defaults to disabled. */
  optimisticSession?: OptimisticSessionOption;
}

/**
 * Provides adapter-backed authentication state and actions to descendants.
 *
 * @param props - Children, stable host adapter and optional optimistic display caching.
 *
 * @returns Authentication context around children, remounted on principal transitions.
 *
 * @throws When rendered without an outer TanStack QueryClientProvider.
 *
 * @remarks Requires React and @tanstack/react-query; no CSS is required. Each mounted
 * provider scopes its session query. Initial verification and principal changes cancel
 * and remove application queries in the shared QueryClient and remount children;
 * same-user refreshes preserve them. Use separate QueryClients for independent auth domains.
 * SSR and hydration begin with user null and isLoading true. Subscriptions start after
 * mount and are disposed on cleanup. With optimisticSession, an unexpired localStorage
 * snapshot can appear while isSessionVerified remains false; gate sensitive UI on backend
 * verification. Storage contains the adapter's User display fields, so exclude secrets.
 * Cross-reload reuse requires an explicit non-secret adapter.cacheScope. Cache separation
 * is not authorization; the backend must enforce access. Login/register/logout/OAuth
 * failures reject and are exposed as context errors. Other adapter actions forward
 * their failures to the caller; session reads use TanStack Query error handling.
 *
 * @example
 * ```tsx
 * import type { ReactNode } from 'react';
 * import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
 * import { AuthProvider, type AuthAdapter } from '@alneas/appkit-react/tools/auth';
 * export function AuthRoot({ adapter, queryClient, children }: {
 *   adapter: AuthAdapter; queryClient: QueryClient; children: ReactNode;
 * }) {
 *   return (
 *     <QueryClientProvider client={queryClient}>
 *       <AuthProvider adapter={adapter} optimisticSession>{children}</AuthProvider>
 *     </QueryClientProvider>
 *   );
 * }
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
        /** Whether backend verification completed; false during optimistic display. */
        isSessionVerified,
        /** Whether verification confirmed a logged-out state. */
        isLoggedOutKnown,
        /** Whether optimistic display caching is enabled. */
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
