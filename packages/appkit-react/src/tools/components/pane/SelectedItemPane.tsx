'use client';
import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { DisplayField } from './types';

export interface SelectedItemPaneProps<T> {
  /** 選択されたアイテム / The selected item */
  selectedItem: T;
  /** 追加ボタン押下時のコールバック / Callback when add button is clicked */
  onAdd: (itemWithJunction: T & Record<string, unknown>) => void;
  /** キャンセルボタン押下時のコールバック / Callback when cancel button is clicked */
  onCancel: () => void;
  /** 追加情報の入力フィールド定義 / Definition of junction fields to input */
  junctionFields?: Array<{ name: string; label: string; type: 'text' | 'number' | 'date' }>;
  /** 追加情報の初期値 / Initial junction data */
  initialJunctionData?: Record<string, unknown>;
  /** 表示するフィールドの定義 / Fields to display in the preview */
  displayFields?: DisplayField<T>[];
  /** デフォルトの表示フィールドを使用するか / Whether to use default display fields */
  defaultDisplayFields?: boolean;
}

// Stable defaults are essential: the render-time prop synchronization compares
// references, so allocating [] / {} on each render would repeatedly reset state.
const EMPTY_JUNCTION_FIELDS: NonNullable<SelectedItemPaneProps<Record<string, unknown>>['junctionFields']> = [];
const EMPTY_JUNCTION_DATA: Record<string, unknown> = {};

/**
 * 選択されたアイテムの詳細確認と、追加情報（接合テーブル用データなど）の入力を提供するペイン。
 */
export function SelectedItemPane<T extends Record<string, unknown>>({
  selectedItem,
  onAdd,
  onCancel,
  junctionFields = EMPTY_JUNCTION_FIELDS,
  initialJunctionData = EMPTY_JUNCTION_DATA,
  displayFields,
  defaultDisplayFields = true,
}: SelectedItemPaneProps<T>) {
  const [prevProps, setPrevProps] = useState({ junctionFields, initialJunctionData });
  const [junctionForm, setJunctionForm] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    junctionFields.forEach((field) => {
      initial[field.name] = initialJunctionData[field.name] ?? '';
    });
    return initial;
  });

  if (
    prevProps.junctionFields !== junctionFields ||
    prevProps.initialJunctionData !== initialJunctionData
  ) {
    const initial: Record<string, unknown> = {};
    junctionFields.forEach((field) => {
      initial[field.name] = initialJunctionData[field.name] ?? '';
    });
    setJunctionForm(initial);
    setPrevProps({ junctionFields, initialJunctionData });
  }

  const handleAdd = () => {
    onAdd({ ...selectedItem, ...junctionForm });
    setJunctionForm({});
    onCancel();
  };

  const fieldsToDisplay =
    displayFields ||
    (defaultDisplayFields
      ? [
          { key: 'name', label: '名称' },
          { key: 'code', label: 'コード' },
          { key: 'unit', label: '単位' },
        ].filter((f) => selectedItem[f.key] !== undefined)
      : Object.keys(selectedItem)
          .filter((key) => key !== 'id' && key !== 'createdAt' && key !== 'updatedAt')
          .slice(0, 5)
          .map((key) => ({ key, label: key })));

  return (
    <div className='space-y-4'>
      <div className='border rounded-lg p-4 bg-muted/50'>
        {fieldsToDisplay.map((field) => {
          const value = selectedItem[field.key];
          if (value === undefined || value === null) return null;

          return (
            <div key={field.key} className='mb-2 last:mb-0'>
              {field.key === 'name' ? (
                <h3 className='font-bold text-lg'>{value as React.ReactNode}</h3>
              ) : (
                <p className='text-sm text-muted-foreground'>
                  <span className='font-medium text-foreground'>{field.label}:</span>{' '}
                  {value.toString()}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {junctionFields.length > 0 && (
        <div className='space-y-3'>
          <h4 className='text-sm font-semibold border-b pb-1'>追加情報</h4>
          {junctionFields.map((field) => (
            <div key={field.name}>
              <Label htmlFor={field.name}>{field.label}</Label>
              <Input
                id={field.name}
                type={field.type}
                value={(junctionForm[field.name] as string | number | undefined) ?? ''}
                onChange={(e) =>
                  setJunctionForm((prev) => ({ ...prev, [field.name]: e.target.value }))
                }
                placeholder={`${field.label}を入力`}
              />
            </div>
          ))}
        </div>
      )}

      <div className='flex gap-2 pt-4'>
        <Button variant='outline' onClick={onCancel} className='flex-1'>
          キャンセル
        </Button>
        <Button onClick={handleAdd} className='flex-1'>
          確定して追加
        </Button>
      </div>
    </div>
  );
}
