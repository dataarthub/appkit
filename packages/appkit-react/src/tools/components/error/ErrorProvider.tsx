import React from 'react';
import { ErrorNotification, ErrorNotificationProps } from './ErrorNotification';
import { ErrorDialog } from './ErrorDialog';

export interface ErrorProviderProps {
  /** 子要素 */
  children: React.ReactNode;
  /** 通知の設定 */
  notificationProps?: Omit<ErrorNotificationProps, 'className'>;
  /** 通知を無効化 */
  disableNotifications?: boolean;
  /** ダイアログを無効化 */
  disableDialogs?: boolean;
}

/**
 * エラー表示プロバイダー
 * 通知とダイアログのグローバルレンダラーを提供します。
 *
 * @example
 * ```tsx
 * // AppProvider 内で自動的に使用されます
 * <ErrorProvider notificationProps={{ position: 'top-right', maxVisible: 3 }}>
 *     <App />
 * </ErrorProvider>
 * ```
 */
export function ErrorProvider({
  children,
  notificationProps,
  disableNotifications = false,
  disableDialogs = false,
}: ErrorProviderProps) {
  return (
    <>
      {children}
      {!disableNotifications && <ErrorNotification {...notificationProps} />}
      {!disableDialogs && <ErrorDialog />}
    </>
  );
}
