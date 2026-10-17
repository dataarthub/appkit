import React from 'react';
import { useAuthGuard, type AuthGuardOptions } from './useAuthGuard';

/**
 * 認証必須のラッパーコンポーネント
 *
 * 認証されていない場合は自動的にログインページへリダイレクトします。
 */
export interface AuthGuardProps extends AuthGuardOptions {
  children: React.ReactNode;
  /** ロード中に表示するコンポーネント */
  fallback?: React.ReactNode;
}

/**
 * 認証状態を監視し、未認証の場合はログインページなどへ自動リダイレクトするガードコンポーネント。
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
