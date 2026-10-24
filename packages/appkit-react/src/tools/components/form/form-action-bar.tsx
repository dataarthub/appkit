import * as React from 'react';
import * as m from '../../paraglide/messages.js';
import { cn } from "../../lib/utils";
import { Button } from '../ui/button';
import { Loader2, Check, AlertCircle } from 'lucide-react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * FormActionBarProps
 * フォームアクションバーのプロップス
 *
 * ## AI/Automation Features
 * - `testId`: Container and action buttons
 * - Pattern: `{testId}`, `{testId}-primary`, `{testId}-secondary`
 * - `data-save-status`: idle, saving, saved, error
 */
export interface FormActionBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** AI/E2E Test用の安定ID / Stable test identifier */
  testId?: string;
  /**
   * プライマリアクションのラベル
   * @default "Save"
   */
  primaryLabel?: string;
  /**
   * セカンダリアクションのラベル
   * @default "Cancel"
   */
  secondaryLabel?: string;
  /**
   * プライマリアクションのハンドラ
   */
  onPrimary?: () => void;
  /**
   * セカンダリアクションのハンドラ
   */
  onSecondary?: () => void;
  /**
   * 保存状態のインジケーター
   */
  saveStatus?: SaveStatus;
  /**
   * スティッキー表示を有効にする
   * @default true
   */
  sticky?: boolean;
  /**
   * プライマリボタンを無効にする
   */
  primaryDisabled?: boolean;
  /**
   * 第三のアクション（削除など）
   */
  tertiaryAction?: React.ReactNode;
}

const statusIcons: Record<SaveStatus, React.ReactNode> = {
  idle: null,
  saving: <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />,
  saved: <Check className='h-4 w-4 text-green-500' />,
  error: <AlertCircle className='h-4 w-4 text-destructive' />,
};

/**
 * FormActionBar Component
 * フォーム用のアクションバー
 *
 * Save/cancel buttons with save status indicator.
 * 保存・キャンセルボタンと保存状態インジケーターを表示。
 *
 * ## AI/Automation Features
 * - `data-testid`: Container and action buttons
 * - `data-save-status`: Current save status
 *
 * @example With testId
 * ```tsx
 * <FormActionBar
 *   testId="profile-form"
 *   onPrimary={handleSave}
 *   onSecondary={handleCancel}
 *   saveStatus="saving"
 * />
 * // Container: data-testid="profile-form"
 * // Primary: data-testid="profile-form-primary"
 * // Secondary: data-testid="profile-form-secondary"
 * ```
 */
export function FormActionBar({
  ref,
  testId,
  className,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  saveStatus = 'idle',
  sticky = true,
  primaryDisabled = false,
  tertiaryAction,
  children,
  ...props
}: React.PropsWithoutRef<FormActionBarProps> & React.RefAttributes<HTMLDivElement>) {
  const resolvedPrimaryLabel = primaryLabel ?? m.common_actions_save({ defaultValue: 'Save' });
  const resolvedSecondaryLabel =
    secondaryLabel ?? m.common_actions_cancel({ defaultValue: 'Cancel' });
  const statusMessage = '';

  return (
    <div
      ref={ref}
      data-testid={testId}
      data-save-status={saveStatus}
      className={cn(
        'flex flex-wrap items-center gap-3 border-t bg-background py-4',
        sticky && 'sticky bottom-0 z-10',
        className,
      )}
      {...props}
    >
      <div className='flex flex-1 flex-wrap items-center gap-3'>
        <Button
          type='submit'
          testId={testId ? `${testId}-primary` : undefined}
          onClick={onPrimary}
          disabled={primaryDisabled || saveStatus === 'saving'}
        >
          {saveStatus === 'saving' && (
            <Loader2 className='mr-2 h-4 w-4 animate-spin' aria-hidden='true' />
          )}
          {resolvedPrimaryLabel}
        </Button>
        {onSecondary && (
          <Button
            type='button'
            variant='outline'
            testId={testId ? `${testId}-secondary` : undefined}
            onClick={onSecondary}
            disabled={saveStatus === 'saving'}
          >
            {resolvedSecondaryLabel}
          </Button>
        )}
        {tertiaryAction}
        {children}
      </div>

      {saveStatus !== 'idle' && (
        <div className='flex items-center gap-2 text-sm text-muted-foreground'>
          {statusIcons[saveStatus]}
          {statusMessage && <span>{statusMessage}</span>}
        </div>
      )}
    </div>
  );
}
FormActionBar.displayName = 'FormActionBar';
