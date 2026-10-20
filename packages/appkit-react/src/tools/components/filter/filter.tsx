/**
 * @fileoverview フィルターUIコンポーネント
 *
 * スキーマベースのフィルターUIを提供します。
 * useFilterフックと各種フィルター入力を組み合わせて、
 * 完全なフィルタリングUIを構築します。
 *
 * @module filter/filter
 */

'use client';

import * as m from '../../paraglide/messages.js';
import { cn } from "../../lib/utils";
import { Button } from '../ui/button';
import { FilterInput } from './filter-inputs';
import { useFilter } from './use-filter';
import { FilterProps, FilterResult } from './filter-types';
import { FieldFactory } from '../ui/field';

// =============================================================================
// Filter Component
// =============================================================================

/**
 * Renders schema-derived filter inputs and emits a MongoDB-style filter object.
 * @param props - Field specifications, optional collection schema, labels and change callback; see {@link FilterProps}.
 * @returns A responsive filter grid with apply/reset buttons when autoApply is false.
 * @remarks Import Appkit CSS. This component creates local filter state; the host must apply the
 * emitted filter to its own data query. autoApply defaults to true; false defers onChange
 * until Apply or Reset. Reset emits an empty filter in manual mode. layout is currently ignored.
 * With testId, the root uses data-testid=testId and field wrappers use `${testId}-${field}`.
 * Manual apply/reset buttons use `${testId}-apply` and `${testId}-reset`; they are absent in auto mode.
 * @example
 * ```tsx
 * import { useState } from 'react';
 * import { SchemaFilter, type CollectionSchema, type FilterResult } from '@alneas/appkit-react/tools/filter';
 * import '@alneas/appkit-react/styles';
 *
 * const schema: CollectionSchema = {
 *   name: { type: 'string', label: 'Name' },
 *   status: { type: 'enum', enum: ['active', 'inactive'], label: 'Status' },
 * };
 * export function UserFilter() {
 *   const [filter, setFilter] = useState<FilterResult>({});
 *   return <><SchemaFilter testId="user-filter" schema={schema} autoApply={false}
 *     fields={[{ field: 'name', className: 'min-w-[300px]' }, 'status']}
 *     inputClassName="min-w-[200px]" onChange={setFilter} />
 *     <pre>{JSON.stringify(filter)}</pre></>;
 * }
 * ```
 */
export function SchemaFilter({
  testId,
  schema,
  fields: fieldSpecs,
  defaultValues,
  onChange,
  autoApply = true,
  applyLabel = '適用',
  resetLabel,
  className,
  labelPosition: globalLabelPosition,
  labelWidth: globalLabelWidth,
  overlappingLabel: globalOverlappingLabel,
  showPlaceholderOnAll: globalShowPlaceholderOnAll,
  inputClassName: globalInputClassName,
  locale, // Add locale to destructured props
  debounceMs,
}: FilterProps) {
  const { values, filter, fields, setField, reset, isEmpty } = useFilter({
    schema,
    fields: fieldSpecs,
    defaultValues,
    onChange: autoApply ? onChange : undefined,
    debounceMs,
  });

  const displayApplyLabel = applyLabel || m.filter_apply();
  const displayResetLabel = resetLabel || m.filter_reset();

  /**
   * 適用ボタンのハンドラー
   */
  const handleApply = () => {
    onChange?.(filter);
  };

  /**
   * リセットボタンのハンドラー
   */
  const handleReset = () => {
    reset();
    if (!autoApply) {
      onChange?.({});
    }
  };

  return (
    <div
      data-testid={testId}
      className={cn(
        'w-full',
        'grid gap-x-4 gap-y-2',
        // Responsive grid: 1 column on small screens, 2 columns on sm+
        'grid-cols-1 sm:grid-cols-2',
        className,
      )}
    >
      {fields.map((field) => (
        <FieldFactory
          key={field.field}
          data-testid={testId ? `${testId}-${field.field}` : undefined}
          label={field.label}
          labelPosition={field.labelPosition || globalLabelPosition || 'responsive'}
          labelWidth={field.labelWidth || globalLabelWidth}
          overlappingLabel={
            field.overlappingLabel !== undefined ? field.overlappingLabel : globalOverlappingLabel
          }
          showPlaceholderOnAll={
            field.showPlaceholderOnAll !== undefined
              ? field.showPlaceholderOnAll
              : globalShowPlaceholderOnAll
          }
        >
          <FilterInput
            field={field}
            value={values[field.field]}
            onChange={(value) => setField(field.field, value)}
            showPlaceholderOnAll={
              field.showPlaceholderOnAll !== undefined
                ? field.showPlaceholderOnAll
                : globalShowPlaceholderOnAll
            }
            className={field.className || globalInputClassName}
            locale={locale} // Pass locale down
            debounceMs={field.debounceMs !== undefined ? field.debounceMs : debounceMs}
          />
        </FieldFactory>
      ))}

      {/* ボタン（autoApply=falseの場合のみ表示） */}
      {!autoApply && (
        <div className='flex items-end gap-2'>
          <Button
            testId={testId ? `${testId}-apply` : undefined}
            onClick={handleApply}
            variant='default'
          >
            {displayApplyLabel}
          </Button>
          <Button
            testId={testId ? `${testId}-reset` : undefined}
            onClick={handleReset}
            variant='outline'
            disabled={isEmpty}
          >
            {displayResetLabel}
          </Button>
        </div>
      )}

      {/* autoApply時のリセットボタン */}
      {autoApply && !isEmpty && (
        <div className='flex items-end'>
          <Button
            testId={testId ? `${testId}-reset` : undefined}
            onClick={handleReset}
            variant='ghost'
            size='sm'
          >
            {displayResetLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
SchemaFilter.displayName = 'SchemaFilter';

// =============================================================================
// Exports
// =============================================================================

export type { FilterProps, FilterResult };
