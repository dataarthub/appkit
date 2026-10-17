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
 * Filter Component
 * フィルターUIコンポーネント
 *
 * Schema-based filter UI with type inference.
 * スキーマからフィールド型を推論し、適切なフィルター入力を自動選択します。
 * MongoDBスタイルのフィルターオブジェクトを生成し、useFindと連携できます。
 *
 * ## AI/Automation Features
 * - `data-testid`: Container, apply/reset buttons
 * - Pattern: `{testId}`, `{testId}-apply`, `{testId}-reset`
 * - Filter inputs auto-generate testId from field name
 *
 * @example Basic usage with testId
 * ```tsx
 * <Filter
 *   testId="user-filter"
 *   schema={userSchema}
 *   fields={['name', 'age', 'status']}
 *   showPlaceholderOnAll={true}
 *   onChange={(filter) => setQueryFilter(filter)}
 * />
 * // Container: data-testid="user-filter"
 * // Apply button: data-testid="user-filter-apply"
 * // Reset button: data-testid="user-filter-reset"
 * // Filter inputs auto-generate testId from field name
 *
 * @example Customizing filter widths
 * ```tsx
 * <Filter
 *   schema={userSchema}
 *   fields={[
 *     { field: 'name', className: 'min-w-[300px]' }, // Specific field
 *     'status'
 *   ]}
 *   inputClassName="min-w-[200px]" // Global default for this instance
 * />
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
