'use client';
import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export interface CreatePaneProps {
  /** 作成実行時のコールバック / Callback when create button is clicked */
  onCreateNew: (formData: Record<string, unknown>, junctionData: Record<string, unknown>) => void;
  /** キャンセルボタン押下時のコールバック / Callback when cancel button is clicked */
  onCancel: () => void;
  /** 追加情報の入力フィールド定義 / Definition of junction fields to input */
  junctionFields?: Array<{ name: string; label: string; type: 'text' | 'number' | 'date' }>;
  /** タイトル / Title */
  createTitle?: string;
  /** 説明 / Description */
  createDescription?: string;
  /** フォーム部分のコンテンツ / Content for the form area */
  children?: React.ReactNode;
  /** 簡易的な作成フィールド定義 / Simple fields for creation */
  simpleCreateFields?: Array<{
    name: string;
    label: string;
    required?: boolean;
    placeholder?: string;
  }>;
  /** 初期データ / Initial form data */
  initialData?: Record<string, unknown>;
}

/**
 * 新規アイテム作成のためのUI。
 * 簡易的なフィールド入力またはカスタムフォーム（children）を表示できます。
 *
 * @example
 * ```tsx
 * <CreatePane
 *   onCreateNew={handleCreate}
 *   onCancel={handleCancel}
 *   simpleCreateFields={[
 *     { name: 'name', label: '名前', required: true }
 *   ]}
 * />
 * ```
 */
export function CreatePane({
  onCreateNew,
  onCancel,
  junctionFields = [],
  createTitle = '新規作成',
  createDescription = '新しいアイテムを作成して追加します',
  children,
  simpleCreateFields,
  initialData = {},
}: CreatePaneProps) {
  const [createForm, setCreateForm] = useState<Record<string, unknown>>(initialData);
  const [junctionForm, setJunctionForm] = useState<Record<string, unknown>>({});

  useEffect(() => {
    const initialJunctionForm: Record<string, unknown> = {};
    junctionFields.forEach((field) => {
      initialJunctionForm[field.name] = '';
    });

    setJunctionForm(initialJunctionForm);
  }, [junctionFields]);

  const handleCreateNew = () => {
    if (simpleCreateFields?.length) {
      const missingRequired = simpleCreateFields.find(
        (field) => field.required && !String(createForm[field.name] || '').trim(),
      );
      if (missingRequired) return;
    }
    onCreateNew(createForm, junctionForm);
    setCreateForm({});
    setJunctionForm({});
    onCancel();
  };

  const handleFormChange = (name: string, value: unknown) => {
    setCreateForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className='space-y-4'>
      <div className='border rounded-lg p-4 bg-muted/30'>
        <h3 className='font-semibold'>{createTitle}</h3>
        <p className='text-sm text-muted-foreground'>{createDescription}</p>
      </div>

      {simpleCreateFields?.length ? (
        <div className='space-y-3'>
          {simpleCreateFields.map((field) => (
            <div key={field.name}>
              <Label htmlFor={field.name}>{field.label}</Label>
              <Input
                id={field.name}
                value={(createForm[field.name] as string) || ''}
                onChange={(e) => handleFormChange(field.name, e.target.value)}
                placeholder={field.placeholder || `${field.label}を入力`}
              />
            </div>
          ))}
        </div>
      ) : (
        children
      )}

      {junctionFields.length > 0 && (
        <div className='border-t pt-4 space-y-3'>
          <h4 className='text-sm font-semibold'>追加情報</h4>
          {junctionFields.map((field) => (
            <div key={field.name}>
              <Label htmlFor={field.name}>{field.label}</Label>
              <Input
                id={field.name}
                type={field.type}
                value={(junctionForm[field.name] as string) || ''}
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
        <Button onClick={handleCreateNew} className='flex-1'>
          作成して追加
        </Button>
      </div>
    </div>
  );
}
