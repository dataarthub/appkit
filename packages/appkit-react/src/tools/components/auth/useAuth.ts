import { createContext, useContext } from 'react';
import type { AuthAdapter, User } from './types';

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * 認証コンテキストの値
 *
 * AuthProvider 配下のコンポーネントで useAuth() を通じて取得できます。
 * アダプターが対応していないオプショナルメソッドは undefined になります。
 */
export interface AuthContextValue extends AuthState {
  /** セッションが裏で再検証され、確定した状態か。`optimisticSession` 無効時は常に true */
  isSessionVerified?: boolean;
  /** 再検証によって「未ログイン」が確定しているか。`optimisticSession` 無効時は false */
  isLoggedOutKnown?: boolean;
  /** 楽観セッションキャッシュを利用中か */
  optimisticSession?: boolean;
  /** メール/パスワードでログイン */
  login: AuthAdapter['login'];
  /** 新規ユーザー登録 */
  register: AuthAdapter['register'];
  /** ログアウト */
  logout: AuthAdapter['logout'];
  /** パスワードリセットメール送信 */
  resetPassword: AuthAdapter['resetPassword'];
  /** メールアドレス変更 */
  updateEmail: AuthAdapter['updateEmail'];
  /** パスワード変更 */
  updatePassword: AuthAdapter['updatePassword'];
  /** 再認証（パスワード/メール変更前に必要、アダプター対応時のみ） */
  reauthenticate?: AuthAdapter['reauthenticate'];
  /** メールアドレス確認メール送信（アダプター対応時のみ） */
  sendVerificationEmail?: AuthAdapter['sendVerificationEmail'];
  /** 認証トークン取得（API 連携用、アダプター対応時のみ） */
  getToken?: AuthAdapter['getToken'];
  /** OAuth プロバイダーでログイン（アダプター対応時のみ） */
  loginWithProvider?: AuthAdapter['loginWithProvider'];
}

export const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * 現在の認証状態およびログイン・ログアウト等の認証操作関数を提供するReactフック。
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
