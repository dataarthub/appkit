import React from 'react';
import { useAuthGuard, type AuthGuardOptions } from './useAuthGuard';

/**
 * Children and loading fallback with useAuthGuard scheduling options.
 *
 * @see AuthGuard for rendering behavior.
 */
export interface AuthGuardProps extends AuthGuardOptions {
  /**
   * Content displayed while the current context contains a user.
   */
  children: React.ReactNode;
    /**
     * Content during loading; defaults to null.
     */
  fallback?: React.ReactNode;
}

/**
 * Renders authenticated children and delegates scheduled expiry checks to useAuthGuard.
 *
 * @param props - Children, loading fallback and inherited check/navigation settings.
 *
 * @returns Fallback while loading, children for a current user, otherwise null.
 *
 * @throws Error when no AuthProvider exists.
 *
 * @remarks Requires AuthProvider inside QueryClientProvider; no CSS is required. There is
 * no immediate mount-only redirect: focus, visibility, optional timer or manual checks
 * trigger expiry handling. Current user state can be optimistic; enforce backend access.
 *
 * @example
 * ```tsx
 * import type { ReactNode } from 'react';
 * import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
 * import { AuthProvider, AuthGuard, type AuthAdapter } from '@alneas/appkit-react/tools/auth';
 *
 * function Content() { return <AuthGuard><span>Account</span></AuthGuard>; }
 * export function Example({ adapter, queryClient }: { adapter: AuthAdapter; queryClient: QueryClient }) {
 *   return <QueryClientProvider client={queryClient}><AuthProvider adapter={adapter}><Content /></AuthProvider></QueryClientProvider>;
 * }
 * ```
 */
export function AuthGuard({ children, fallback = null, ...options }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuthGuard(options);

  if (isLoading) {
    return <>{fallback}</>;
  }

  if (!isAuthenticated) {
    // リダイレクト処理は useAuthGuard 内で行われる
    return null;
  }

  return <>{children}</>;
}
