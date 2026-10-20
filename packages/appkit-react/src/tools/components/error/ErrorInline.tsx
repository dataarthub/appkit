import React from 'react';
import { AlertCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from "../../lib/utils";
import { AppError, ErrorSeverity } from "../../lib/error";

/**
 * ErrorInlineProps
 * インラインエラーのプロップス
 *
 * ## AI/Automation Features
 * - `testId`: Stable selector on container
 * - `data-severity`: error, warning, info, critical
 */
export interface ErrorInlineProps {
  /** AI/E2E Test用の安定ID / Stable test identifier */
  testId?: string;
  /** 表示するエラー */
  error?: AppError | Error | null;
  /** またはエラーコード (i18n から取得) */
  code?: string;
  /** エラーメッセージ (直接指定する場合) */
  message?: string;
  /** 追加の CSS クラス */
  className?: string;
  /** 重要度 (アイコンと色を決定) */
  severity?: ErrorSeverity;
  /** アイコンを非表示にする */
  hideIcon?: boolean;
}

const severityConfig: Record<ErrorSeverity, { icon: React.ElementType; className: string }> = {
  info: { icon: Info, className: 'text-blue-600 dark:text-blue-400' },
  warning: { icon: AlertTriangle, className: 'text-amber-800 dark:text-amber-400' },
  error: { icon: XCircle, className: 'text-destructive' },
  critical: { icon: AlertCircle, className: 'text-destructive' },
};

/**
 * ErrorInline Component
 * インラインエラー表示コンポーネント
 *
 * Inline error display near form fields or submit buttons.
 * フォームのフィールド近くや送信ボタン周辺に表示します。
 *
 * ## AI/Automation Features
 * - `data-testid`: Container element
 * - `data-severity`: Error severity level
 *
 * @example With testId
 * ```tsx
 * <ErrorInline testId="form-error" error={formError} />
 * ```
 */
export function ErrorInline({
  testId,
  error,
  code,
  message,
  className,
  severity = 'error',
  hideIcon = false,
}: ErrorInlineProps) {
  // 表示するメッセージを決定
  let displayMessage: string | null = null;
  let displaySeverity = severity;

  if (error) {
    if (error instanceof AppError) {
      displayMessage = error.message;
      displaySeverity = error.severity;
    } else {
      displayMessage = error.message;
    }
  } else if (code) {
    // Use the code directly as message - dynamic i18n key lookup not supported in Paraglide
    displayMessage = code;
  } else if (message) {
    displayMessage = message;
  }

  // 表示するものがなければ何も表示しない
  if (!displayMessage) {
    return null;
  }

  const config = severityConfig[displaySeverity];
  const Icon = config.icon;

  return (
    <div
      data-testid={testId}
      data-severity={displaySeverity}
      className={cn('flex items-center gap-2 text-sm', config.className, className)}
      role='alert'
    >
      {!hideIcon && <Icon className='h-4 w-4 flex-shrink-0' aria-hidden='true' />}
      <span>{displayMessage}</span>
    </div>
  );
}
