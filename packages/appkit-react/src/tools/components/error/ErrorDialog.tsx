import React from 'react';
import { AlertCircle, X, AlertTriangle, Info } from 'lucide-react';
import * as m from '../../paraglide/messages.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { cn } from "../../lib/utils";
import { AppError, ErrorSeverity } from "../../lib/error";
import { useErrorStore } from "../../lib/state/error-store";

/**
 * ErrorDialogProps
 * エラーダイアログのプロップス
 *
 * ## AI/Automation Features
 * - `testId`: Stable selector on dialog and buttons
 * - Pattern: `{testId}`, `{testId}-primary`, `{testId}-secondary`
 * - `data-severity`: error, warning, info, critical
 */
export interface ErrorDialogProps {
  /** AI/E2E Test用の安定ID / Stable test identifier */
  testId?: string;
  /** 直接表示するエラー (制御モード) */
  error?: AppError | null;
  /** 開閉状態 (制御モード) */
  open?: boolean;
  /** 閉じるときのコールバック */
  onClose?: () => void;
  /** 主要アクションのラベル。デフォルト: 'OK' */
  primaryActionLabel?: string;
  /** 主要アクションのコールバック */
  onPrimaryAction?: () => void;
  /** セカンダリアクションのラベル */
  secondaryActionLabel?: string;
  /** セカンダリアクションのコールバック */
  onSecondaryAction?: () => void;
}

const severityConfig: Record<
  ErrorSeverity,
  {
    icon: React.ElementType;
    iconBgClass: string;
    iconClass: string;
    titleClass: string;
  }
> = {
  info: {
    icon: Info,
    iconBgClass: 'bg-blue-500',
    iconClass: 'text-white',
    titleClass: 'text-blue-600 dark:text-blue-400',
  },
  warning: {
    icon: AlertTriangle,
    iconBgClass: 'bg-amber-500',
    iconClass: 'text-white',
    titleClass: 'text-amber-800 dark:text-amber-400',
  },
  error: {
    icon: X,
    iconBgClass: 'bg-red-500',
    iconClass: 'text-white',
    titleClass: 'text-red-600 dark:text-red-400',
  },
  critical: {
    icon: AlertCircle,
    iconBgClass: 'bg-red-600',
    iconClass: 'text-white',
    titleClass: 'text-red-600 dark:text-red-400',
  },
};

/**
 * ErrorDialog Component
 * エラーダイアログコンポーネント
 *
 * Modal dialog for important errors.
 * 重要なエラーをモーダルで表示します。
 *
 * ## AI/Automation Features
 * - `data-testid`: Container and action buttons
 * - `data-severity`: Error severity level
 *
 * @example With testId
 * ```tsx
 * <ErrorDialog
 *     testId="api-error"
 *     error={error}
 *     open={isOpen}
 *     onClose={() => setIsOpen(false)}
 *     primaryActionLabel="再試行"
 *     onPrimaryAction={handleRetry}
 * />
 * // Container: data-testid="api-error"
 * // Primary button: data-testid="api-error-primary"
 * ```
 */
export function ErrorDialog({
  testId,
  error: propError,
  open: propOpen,
  onClose,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
}: ErrorDialogProps) {
  const { removeError, getErrorsByMode } = useErrorStore();

  // Store からダイアログモードのエラーを取得 (制御モードでない場合)
  const dialogErrors = getErrorsByMode('dialog');
  const storeError = dialogErrors.length > 0 ? dialogErrors[0] : null;

  // 制御モードか Store モードかで表示するエラーを決定
  const displayError = propError ?? storeError?.error ?? null;
  const isOpen = propOpen ?? storeError !== null;

  const handleClose = () => {
    if (storeError) {
      removeError(storeError.id);
    }
    onClose?.();
  };

  const handlePrimaryAction = () => {
    onPrimaryAction?.();
    handleClose();
  };

  const handleSecondaryAction = () => {
    onSecondaryAction?.();
    handleClose();
  };

  if (!displayError) {
    return null;
  }

  const severity = displayError instanceof AppError ? displayError.severity : 'error';
  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent testId={testId} data-severity={severity} className='sm:max-w-md'>
        <DialogHeader>
          <div className='flex items-center gap-3'>
            <div className={cn('rounded-full p-1.5', config.iconBgClass)}>
              <Icon className={cn('h-4 w-4', config.iconClass)} aria-hidden='true' />
            </div>
            <DialogTitle className={config.titleClass}>
              {m.errors_dialogTitle({ defaultValue: 'エラー' })}
            </DialogTitle>
          </div>
        </DialogHeader>
        <DialogDescription className='text-foreground'>{displayError.message}</DialogDescription>
        {displayError instanceof AppError &&
          displayError.code &&
          displayError.code !== 'error/unknown' && (
            <p className='text-xs text-muted-foreground mt-2'>
              {m.errors_code({ defaultValue: 'コード' })}: {displayError.code}
            </p>
          )}
        <DialogFooter className='gap-2 sm:gap-0'>
          {secondaryActionLabel && (
            <Button
              testId={testId ? `${testId}-secondary` : undefined}
              variant='outline'
              onClick={handleSecondaryAction}
            >
              {secondaryActionLabel}
            </Button>
          )}
          <Button testId={testId ? `${testId}-primary` : undefined} onClick={handlePrimaryAction}>
            {primaryActionLabel ?? m.common_actions_ok({ defaultValue: 'OK' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
