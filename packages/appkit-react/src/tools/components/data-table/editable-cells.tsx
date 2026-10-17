/**
 * @fileoverview 編集可能セルコンポーネント
 *
 * テーブル内でインライン編集を可能にするセルコンポーネント:
 * - EditableToggle: boolean値のトグル
 * - EditableSelect: ドロップダウン選択
 * - EditableText: テキスト編集（クリックで編集モード）
 *
 * @module data-table/editable-cells
 */

'use client';

import { useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from "../../lib/utils";
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';

// =============================================================================
// Types
// =============================================================================

/**
 * 編集可能セルの共通プロパティ
 * Common props for editable cells
 */
export interface EditableCellProps {
  /** 行ID / Row identifier */
  rowId: string;
  /** フィールド名 / Field name */
  field: string;
  /** 現在の値 / Current value */
  value: unknown;
  /** 更新コールバック / Update callback */
  onUpdate: (rowId: string, field: string, value: unknown) => Promise<void>;
  /** 無効化 / Disabled state */
  disabled?: boolean;
}

/**
 * セレクト用プロパティ
 * Props for EditableSelect
 */
export interface EditableSelectProps extends EditableCellProps {
  /** オプションマッピング / Options mapping */
  options: Record<string | number, string>;
}

// =============================================================================
// EditableToggle
// =============================================================================

/**
 * トグルスイッチによるboolean値の編集セル
 * Toggle switch for boolean field editing
 *
 * クリックで即座に値を反転し、DBを更新します。
 *
 * @param {EditableCellProps} props - コンポーネントのプロパティ
 * @returns {JSX.Element} トグルスイッチ
 *
 * @example
 * <EditableToggle
 *   rowId="123"
 *   field="active"
 *   value={true}
 *   onUpdate={handleUpdate}
 * />
 */
export function EditableToggle({
  rowId,
  field,
  value,
  onUpdate,
  disabled = false,
}: EditableCellProps) {
  const [isLoading, setIsLoading] = useState(false);
  const currentValue = Boolean(value);

  const handleToggle = useCallback(async () => {
    if (isLoading || disabled) return;

    setIsLoading(true);
    try {
      await onUpdate(rowId, field, !currentValue);
    } catch (error) {
      console.error('Failed to update:', error);
    } finally {
      setIsLoading(false);
    }
  }, [rowId, field, currentValue, onUpdate, isLoading, disabled]);

  return (
    <div className='flex items-center gap-2'>
      {isLoading ? (
        <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
      ) : (
        <Switch
          checked={currentValue}
          onCheckedChange={handleToggle}
          disabled={disabled || isLoading}
        />
      )}
    </div>
  );
}
EditableToggle.displayName = 'EditableToggle';

// =============================================================================
// EditableSelect
// =============================================================================

/**
 * ドロップダウンによる選択値の編集セル
 * Dropdown select for option field editing
 *
 * 選択変更で即座にDBを更新します。
 *
 * @param {EditableSelectProps} props - コンポーネントのプロパティ
 * @returns {JSX.Element} セレクトドロップダウン
 *
 * @example
 * <EditableSelect
 *   rowId="123"
 *   field="status"
 *   value="active"
 *   options={{ active: '有効', inactive: '無効' }}
 *   onUpdate={handleUpdate}
 * />
 */
export function EditableSelect({
  rowId,
  field,
  value,
  options,
  onUpdate,
  disabled = false,
}: EditableSelectProps) {
  const [isLoading, setIsLoading] = useState(false);
  const currentValue = String(value ?? '');

  const handleChange = useCallback(
    async (newValue: string) => {
      if (isLoading || disabled || newValue === currentValue) return;

      setIsLoading(true);
      try {
        // Convert back to number if original value was number
        const typedValue = typeof value === 'number' ? Number(newValue) : newValue;
        await onUpdate(rowId, field, typedValue);
      } catch (error) {
        console.error('Failed to update:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [rowId, field, value, currentValue, onUpdate, isLoading, disabled],
  );

  return (
    <div className='flex items-center gap-2'>
      <Select
        value={currentValue}
        onValueChange={(newValue) => newValue && handleChange(newValue)}
        disabled={disabled || isLoading}
      >
        <SelectTrigger
          className={cn(
            'h-8 w-auto min-w-[100px] border-transparent bg-transparent',
            isLoading && 'opacity-50',
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(options).map(([key, label]) => (
            <SelectItem key={key} value={String(key)}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isLoading && <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />}
    </div>
  );
}
EditableSelect.displayName = 'EditableSelect';

// =============================================================================
// EditableText
// =============================================================================

/**
 * クリックで編集可能なテキストセル
 * Click-to-edit text cell
 *
 * クリックで入力モードに切り替わり、blur/Enterで保存。
 *
 * @param {EditableCellProps} props - コンポーネントのプロパティ
 * @returns {JSX.Element} テキストセル
 *
 * @example
 * <EditableText
 *   rowId="123"
 *   field="name"
 *   value="John"
 *   onUpdate={handleUpdate}
 * />
 */
export function EditableText({
  rowId,
  field,
  value,
  onUpdate,
  disabled = false,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editValue, setEditValue] = useState(String(value ?? ''));
  const displayValue = String(value ?? '');

  const handleSave = useCallback(async () => {
    if (isLoading || disabled) return;

    if (editValue !== displayValue) {
      setIsLoading(true);
      try {
        await onUpdate(rowId, field, editValue);
      } catch (error) {
        console.error('Failed to update:', error);
        setEditValue(displayValue); // Revert on error
      } finally {
        setIsLoading(false);
      }
    }
    setIsEditing(false);
  }, [rowId, field, editValue, displayValue, onUpdate, isLoading, disabled]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSave();
      } else if (e.key === 'Escape') {
        setEditValue(displayValue);
        setIsEditing(false);
      }
    },
    [handleSave, displayValue],
  );

  const handleClick = useCallback(() => {
    if (!disabled && !isLoading) {
      setEditValue(displayValue);
      setIsEditing(true);
    }
  }, [disabled, isLoading, displayValue]);

  if (isEditing) {
    return (
      <Input
        type='text'
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        autoFocus
        className='h-8 w-full'
      />
    );
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        'cursor-pointer px-2 py-1 -mx-2 -my-1 rounded',
        'hover:bg-muted/50 transition-colors',
        disabled && 'cursor-not-allowed opacity-50',
        isLoading && 'opacity-50',
      )}
    >
      {isLoading ? (
        <Loader2 className='h-4 w-4 animate-spin text-muted-foreground inline mr-2' />
      ) : null}
      {displayValue || <span className='text-muted-foreground'>-</span>}
    </div>
  );
}
EditableText.displayName = 'EditableText';
