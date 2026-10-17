import React, { useEffect, useState } from 'react';
import { Label } from './label';
import { SearchableSelectInput, type SearchableSelectOption } from './searchable-select-input';

export interface RelationSelectFieldProps {
  value?: string | null;
  onChange: (value: string | null) => void;
  label?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  helperText?: React.ReactNode;
  onSearch: (query: string) => Promise<SearchableSelectOption[]>;
  resolveDisplayName?: (value: string) => Promise<string>;
}

/**
 * リレーション（外部キー）を選択するためのフィールドコンポーネント。
 *
 * 検索機能を備えたセレクトボックスを表示し、非同期でのデータ取得をサポートします。
 */
export function RelationSelectField({
  value,
  onChange,
  label,
  disabled,
  placeholder = 'Search...',
  className = 'w-full !h-9 text-sm',
  helperText,
  onSearch,
  resolveDisplayName,
}: RelationSelectFieldProps) {
  const [prevValue, setPrevValue] = useState(value);
  const [displayName, setDisplayName] = useState<string>('');

  if (prevValue !== value) {
    setPrevValue(value);
    if (!value) {
      setDisplayName('');
    } else if (!resolveDisplayName) {
      setDisplayName(value);
    }
  }

  useEffect(() => {
    if (!value || !resolveDisplayName) return;
    let mounted = true;

    resolveDisplayName(value)
      .then((name) => {
        if (mounted) setDisplayName(name || value);
      })
      .catch(() => {
        if (mounted) setDisplayName(value);
      });

    return () => {
      mounted = false;
    };
  }, [value, resolveDisplayName]);

  return (
    <div className='space-y-2'>
      {label ? <Label className='text-sm font-medium text-muted-foreground'>{label}</Label> : null}
      <SearchableSelectInput
        key={displayName || 'empty'}
        value={value || ''}
        options={
          value
            ? [
                {
                  value,
                  label: displayName || value,
                },
              ]
            : undefined
        }
        onValueChange={(next) => onChange(next || null)}
        onSearch={onSearch}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        showValueInList={true}
      />
      {helperText ? (
        <div className='text-[10px] text-muted-foreground mt-1'>{helperText}</div>
      ) : null}
    </div>
  );
}

export default RelationSelectField;
