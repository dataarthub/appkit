import React from 'react';
import { AlertCircle, XCircle, AlertTriangle, Info, Home, ArrowLeft } from 'lucide-react';
import * as m from '../../paraglide/messages.js';
import { cn } from "../../lib/utils";
import { Button } from '../ui/button';
import { AppError, ErrorSeverity } from "../../lib/error";

/**
 * ErrorPageProps
 * エラーページのプロップス
 *
 * ## AI/Automation Features
 * - `testId`: Container and action buttons
 * - Pattern: `{testId}`, `{testId}-back`, `{testId}-home`
 * - `data-severity`: error, warning, info, critical
 */
export interface ErrorPageProps {
  /** AI/E2E Test用の安定ID / Stable test identifier */
  testId?: string;
  /** 表示するエラー */
  error?: AppError | Error | null;
  /** またはエラーコード */
  code?: string;
  /** エラーメッセージ (直接指定) */
  message?: string;
  /** タイトル (直接指定) */
  title?: string;
  /** 重要度 */
  severity?: ErrorSeverity;
  /** 「戻る」ボタンのラベル */
  backLabel?: string;
  /** 「戻る」ボタンのコールバック */
  onBack?: () => void;
  /** 「ホームへ」ボタンのラベル */
  homeLabel?: string;
  /** 「ホームへ」ボタンのコールバック (指定しなければ非表示) */
  onHome?: () => void;
  /** 追加の CSS クラス */
  className?: string;
  /** 子要素 (追加コンテンツ) */
  children?: React.ReactNode;
}

const severityConfig: Record<
  ErrorSeverity,
  {
    icon: React.ElementType;
    iconClass: string;
    bgClass: string;
  }
> = {
  info: {
    icon: Info,
    iconClass: 'text-blue-600 dark:text-blue-400',
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-amber-600 dark:text-amber-400',
    bgClass: 'bg-amber-100 dark:bg-amber-900/30',
  },
  error: {
    icon: XCircle,
    iconClass: 'text-destructive',
    bgClass: 'bg-red-100 dark:bg-red-900/30',
  },
  critical: {
    icon: AlertCircle,
    iconClass: 'text-destructive',
    bgClass: 'bg-red-100 dark:bg-red-900/30',
  },
};

/**
 * ErrorPage Component
 * 全画面エラーページコンポーネント
 *
 * Full-page error display for critical errors or 404.
 * 致命的なエラーや 404 などを表示します。
 *
 * ## AI/Automation Features
 * - `data-testid`: Container and action buttons
 * - `data-severity`: Error severity level
 *
 * @example With testId
 * ```tsx
 * <ErrorPage
 *     testId="not-found"
 *     code="error/not-found"
 *     onBack={() => navigate(-1)}
 *     onHome={() => navigate('/')}
 * />
 * // Container: data-testid="not-found"
 * // Back button: data-testid="not-found-back"
 * // Home button: data-testid="not-found-home"
 * ```
 */
export function ErrorPage({
  testId,
  error,
  code,
  message,
  title,
  severity = 'error',
  backLabel,
  onBack,
  homeLabel,
  onHome,
  className,
  children,
}: ErrorPageProps) {
  // 表示する情報を決定
  let displayTitle = title;
  let displayMessage = message;
  let displaySeverity = severity;

  if (error) {
    if (error instanceof AppError) {
      displayMessage = displayMessage ?? error.message;
      displaySeverity = error.severity;
      if (!displayTitle) {
        // Use generic title - Paraglide doesn't support dynamic key lookup
        displayTitle = m.errors_genericTitle();
      }
    } else {
      displayMessage = displayMessage ?? error.message;
    }
  } else if (code) {
    // Use the code directly - Paraglide doesn't support dynamic key lookup
    displayMessage = displayMessage ?? code;
    displayTitle = displayTitle ?? m.errors_genericTitle();
  }

  displayTitle = displayTitle ?? m.errors_genericTitle({ defaultValue: 'エラーが発生しました' });
  displayMessage =
    displayMessage ?? m.errors_generic({ defaultValue: '予期しないエラーが発生しました。' });

  const config = severityConfig[displaySeverity];
  const Icon = config.icon;

  return (
    <div
      data-testid={testId}
      data-severity={displaySeverity}
      className={cn(
        'flex min-h-[400px] w-full flex-col items-center justify-center p-8',
        className,
      )}
    >
      <div className='flex max-w-md flex-col items-center text-center'>
        <div className={cn('rounded-full p-4 mb-6', config.bgClass)}>
          <Icon className={cn('h-12 w-12', config.iconClass)} aria-hidden='true' />
        </div>

        <h1 className='text-2xl font-bold text-foreground mb-3'>{displayTitle}</h1>

        <p className='text-muted-foreground mb-6'>{displayMessage}</p>

        {children}

        <div className='flex gap-3 mt-4'>
          {onBack && (
            <Button
              testId={testId ? `${testId}-back` : undefined}
              variant='outline'
              onClick={onBack}
            >
              <ArrowLeft className='mr-2 h-4 w-4' aria-hidden='true' />
              {backLabel ?? m.common_actions_back({ defaultValue: '戻る' })}
            </Button>
          )}
          {onHome && (
            <Button testId={testId ? `${testId}-home` : undefined} onClick={onHome}>
              <Home className='mr-2 h-4 w-4' aria-hidden='true' />
              {homeLabel ?? m.common_actions_home({ defaultValue: 'ホームへ' })}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
