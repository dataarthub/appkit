import React from 'react';
import { X, AlertCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { cn } from "../../lib/utils";
import { ErrorSeverity } from "../../lib/error";
import { useErrorStore, ErrorItem } from "../../lib/state/error-store";

export interface ErrorNotificationProps {
  /** 追加の CSS クラス */
  className?: string;
  /** 通知の最大表示数。デフォルト: 5 */
  maxVisible?: number;
  /** 表示位置。デフォルト: 'top-right' */
  position?:
    | 'top-left'
    | 'top-center'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-center'
    | 'bottom-right';
}

const severityConfig: Record<
  ErrorSeverity | 'success',
  {
    icon: React.ElementType;
    bgClass: string;
    borderClass: string;
    iconBgClass: string;
    iconClass: string;
  }
> = {
  info: {
    icon: Info,
    bgClass: 'bg-blue-50 dark:bg-blue-950',
    borderClass: 'border-blue-200 dark:border-blue-800',
    iconBgClass: 'bg-blue-500',
    iconClass: 'text-white',
  },
  warning: {
    icon: AlertTriangle,
    bgClass: 'bg-amber-50 dark:bg-amber-950',
    borderClass: 'border-amber-200 dark:border-amber-800',
    iconBgClass: 'bg-amber-500',
    iconClass: 'text-white',
  },
  error: {
    icon: X,
    bgClass: 'bg-red-50 dark:bg-red-950',
    borderClass: 'border-red-200 dark:border-red-800',
    iconBgClass: 'bg-red-500',
    iconClass: 'text-white',
  },
  critical: {
    icon: AlertCircle,
    bgClass: 'bg-red-100 dark:bg-red-950',
    borderClass: 'border-red-300 dark:border-red-800',
    iconBgClass: 'bg-red-600',
    iconClass: 'text-white',
  },
  success: {
    icon: CheckCircle,
    bgClass: 'bg-green-50 dark:bg-green-950',
    borderClass: 'border-green-200 dark:border-green-800',
    iconBgClass: 'bg-green-500',
    iconClass: 'text-white',
  },
};

const positionClasses: Record<NonNullable<ErrorNotificationProps['position']>, string> = {
  'top-left': 'top-4 left-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'top-right': 'top-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  'bottom-right': 'bottom-4 right-4',
};

/**
 * 通知バナー表示コンポーネント
 * 画面の角に通知を表示します。
 *
 * @example
 * ```tsx
 * // ErrorProvider 内で自動的に使用されます
 * <ErrorNotification position="top-right" maxVisible={3} />
 * ```
 */
export function ErrorNotification({
  className,
  maxVisible = 5,
  position = 'top-right',
}: ErrorNotificationProps) {
  const { removeError, getErrorsByMode } = useErrorStore();

  // notification モードのエラーのみ表示
  const notificationErrors = getErrorsByMode('notification').slice(-maxVisible);

  if (notificationErrors.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed z-[100] flex flex-col gap-2 w-full max-w-md pointer-events-none',
        positionClasses[position],
        className,
      )}
    >
      {notificationErrors.map((item) => (
        <NotificationItem key={item.id} item={item} onDismiss={() => removeError(item.id)} />
      ))}
    </div>
  );
}

interface NotificationItemProps {
  item: ErrorItem;
  onDismiss: () => void;
}

function NotificationItem({ item, onDismiss }: NotificationItemProps) {
  const config = severityConfig[item.severity];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'pointer-events-auto flex items-start gap-3 rounded-lg border p-4 shadow-lg',
        'animate-in slide-in-from-right-full fade-in duration-300',
        config.bgClass,
        config.borderClass,
      )}
      role='alert'
    >
      <div className={cn('rounded-full p-1.5 flex-shrink-0', config.iconBgClass)}>
        <Icon className={cn('h-4 w-4', config.iconClass)} />
      </div>
      <div className='flex-1 min-w-0'>
        <p className='text-sm font-medium text-foreground'>{item.error.message}</p>
        {item.error.code && item.error.code !== 'error/unknown' && (
          <p className='mt-1 text-xs text-muted-foreground'>{item.error.code}</p>
        )}
      </div>
      <button
        onClick={onDismiss}
        className='flex-shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors'
        aria-label='Close'
      >
        <X className='h-4 w-4' />
      </button>
    </div>
  );
}
