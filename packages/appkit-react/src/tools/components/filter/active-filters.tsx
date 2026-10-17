/**
 * @fileoverview アクティブフィルター表示コンポーネント
 *
 * 現在適用されているフィルター条件をバッジとして一覧表示し、
 * 個別解除や一括クリアを行うUIを提供します。
 *
 * @module filter/active-filters
 */

'use client';

import * as React from 'react';
import { X, Trash2 } from 'lucide-react';
import { cn } from "../../lib/utils";
import { Button } from '../ui/button';
import { Badge } from '../ui/badge-components';
import { CollectionSchema, FilterValues, RangeValue, resolveFilterField } from './filter-types';
import * as m from '../../paraglide/messages.js';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export interface ActiveFiltersProps {
  /** コレクションスキーマ / Collection schema for field labels */
  schema?: CollectionSchema;
  /** 現在のフィルター値 / Current filter values */
  values: FilterValues;
  /** フィールド定義の指定（表示するラベル等の解決用） / Field specifications */
  fields?: (string | { field: string; label?: string; type?: string })[];
  /** 特定フィールドのクリア時コールバック / Callback when a filter field is cleared */
  onRemove: (field: string) => void;
  /** 一括クリア時のコールバック / Callback to clear all filters */
  onClearAll?: () => void;
  /** クラス名 / Additional CSS classes */
  className?: string;
  /** ロケール / Locale object */
  locale?: any;
}

/**
 * フィルター値が空かどうか判定
 */
function isValueEmpty(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'object' && !(value instanceof Date)) {
    const range = value as RangeValue<any>;
    return range.min === undefined && range.max === undefined;
  }
  return false;
}

/**
 * フィルター値をユーザーフレンドリーなテキストに変換
 */
function formatValueDisplay(value: any, type: string, locale: any): string {
  const activeLocale = locale || ja;

  if (value instanceof Date) {
    return format(value, 'yyyy/MM/dd', { locale: activeLocale });
  }

  if (type === 'date' && typeof value === 'object') {
    const range = value as RangeValue<Date>;
    const minStr = range.min ? format(range.min, 'yyyy/MM/dd', { locale: activeLocale }) : '';
    const maxStr = range.max ? format(range.max, 'yyyy/MM/dd', { locale: activeLocale }) : '';
    if (minStr && maxStr) return `${minStr} ~ ${maxStr}`;
    if (minStr) return `${minStr} ~`;
    if (maxStr) return `~ ${maxStr}`;
    return '';
  }

  if (type === 'number' && typeof value === 'object') {
    const range = value as RangeValue<number>;
    if (range.min !== undefined && range.max !== undefined) return `${range.min} ~ ${range.max}`;
    if (range.min !== undefined) return `>= ${range.min}`;
    if (range.max !== undefined) return `<= ${range.max}`;
    return '';
  }

  if (Array.isArray(value)) {
    return value.join(', ');
  }

  if (typeof value === 'boolean') {
    return value ? 'はい' : 'いいえ';
  }

  return String(value);
}

/**
 * ActiveFilters Component
 * 適用中のフィルターバッジリスト
 */
export function ActiveFilters({
  schema,
  values,
  fields: fieldSpecs,
  onRemove,
  onClearAll,
  className,
  locale,
}: ActiveFiltersProps) {
  // 解決済みフィールドのマップを作成してラベルと型を取得しやすくする
  const resolvedFieldsMap = React.useMemo(() => {
    const map: Record<string, { label: string; type: string }> = {};

    if (fieldSpecs) {
      fieldSpecs.forEach((spec) => {
        const resolved = resolveFilterField(spec as any, schema);
        map[resolved.field] = {
          label: resolved.label,
          type: resolved.type,
        };
      });
    } else if (schema) {
      Object.keys(schema).forEach((key) => {
        const resolved = resolveFilterField(key, schema);
        map[resolved.field] = {
          label: resolved.label,
          type: resolved.type,
        };
      });
    }

    return map;
  }, [schema, fieldSpecs]);

  // アクティブな（空でない）フィルター項目を抽出
  const activeItems = React.useMemo(() => {
    return Object.entries(values)
      .filter(([, val]) => !isValueEmpty(val))
      .map(([key, val]) => {
        const fieldInfo = resolvedFieldsMap[key] || { label: key, type: 'string' };
        return {
          field: key,
          label: fieldInfo.label,
          displayText: formatValueDisplay(val, fieldInfo.type, locale),
        };
      })
      .filter((item) => item.displayText !== '');
  }, [values, resolvedFieldsMap, locale]);

  if (activeItems.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-2 py-1.5 px-1 text-sm', className)}>
      <span className='text-muted-foreground font-medium text-xs select-none'>適用中:</span>

      {activeItems.map((item) => (
        <Badge
          key={item.field}
          variant='secondary'
          className='pl-2 pr-1 py-0.5 flex items-center gap-1 text-xs'
        >
          <span className='text-muted-foreground font-semibold'>{item.label}:</span>
          <span className='max-w-[150px] truncate' title={item.displayText}>
            {item.displayText}
          </span>
          <button
            type='button'
            onClick={() => onRemove(item.field)}
            className='rounded-full hover:bg-muted p-0.5 transition-colors text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-ring'
            title={m.filter_reset() || 'クリア'}
          >
            <X className='h-3 w-3' />
          </button>
        </Badge>
      ))}

      {onClearAll && (
        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={onClearAll}
          className='h-7 px-2 text-xs text-muted-foreground hover:text-destructive flex items-center gap-1'
        >
          <Trash2 className='h-3.5 w-3.5' />
          すべてクリア
        </Button>
      )}
    </div>
  );
}

ActiveFilters.displayName = 'ActiveFilters';
