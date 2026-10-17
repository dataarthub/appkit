/**
 * @fileoverview フィルター入力コンポーネント
 *
 * 各種フィルター入力用のUIコンポーネントを提供します:
 * - FilterText: テキスト入力（部分一致/完全一致）
 * - FilterNumber: 数値入力（単一値/範囲）
 * - FilterSelect: ドロップダウン選択
 * - FilterDate: 日付選択（単一/範囲）
 * - FilterCheckbox: チェックボックス（単一boolean/複数選択）
 * - FilterRadio: ラジオボタン
 *
 * @module filter/filter-inputs
 */

'use client';
import * as React from 'react';
import * as m from '../../paraglide/messages.js';
import type { Locale } from 'date-fns';
import { X } from 'lucide-react';
import { cn } from "../../lib/utils";
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DatePicker } from '../ui/calendar';
import { DateRangePicker, DateRange } from '../ui/date-range-picker';
import { FilterOption, FilterValue, RangeValue, ResolvedFilterField } from './filter-types';

// =============================================================================
// Common Props
// =============================================================================

/**
 * フィルター入力の共通プロパティ
 * Common props for all filter inputs
 */
interface FilterInputProps {
  /** フィールド定義 / Field definition */
  field: ResolvedFilterField;
  /** 現在の値 / Current value */
  value: FilterValue;
  /** 値変更コールバック / Value change callback */
  onChange: (value: FilterValue) => void;
  /** クラス名 / Additional CSS classes */
  className?: string;
  /** 無効化 / Disable input */
  disabled?: boolean;
  /** 未選択時にラベルを表示 / Show label as placeholder */
  showPlaceholderOnAll?: boolean;
  /** ロケール / Locale */
  locale?: Locale;
  /** デバウンスのディレイ時間 (ms) / Debounce delay in milliseconds */
  debounceMs?: number;
}

// =============================================================================
// FilterText
// =============================================================================

/**
 * テキストフィルター入力
 * Text filter input with partial/full match support
 *
 * @param {FilterInputProps} props - コンポーネントのプロパティ
 * @returns {JSX.Element} テキスト入力
 *
 * @example
 * <FilterText
 *   field={resolvedField}
 *   value={values.name}
 *   onChange={(v) => setField('name', v)}
 * />
 */
export function FilterText({
  field,
  value,
  onChange,
  className,
  disabled,
  debounceMs = 300,
}: FilterInputProps) {
  const [localValue, setLocalValue] = React.useState((value as string) || '');
  const [prevValue, setPrevValue] = React.useState(value);

  if (value !== prevValue) {
    setLocalValue((value as string) || '');
    setPrevValue(value);
  }

  // Debounce the onChange callback
  React.useEffect(() => {
    const handler = setTimeout(() => {
      const propStr = (value as string) || '';
      if (localValue !== propStr) {
        onChange(localValue === '' ? undefined : localValue);
      }
    }, debounceMs);

    return () => {
      clearTimeout(handler);
    };
  }, [localValue, debounceMs, onChange, value]);

  return (
    <Input
      type='text'
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      placeholder={field.placeholder || field.label}
      disabled={disabled}
      className={cn('min-w-[150px]', className)}
    />
  );
}
FilterText.displayName = 'FilterText';

// =============================================================================
// FilterNumber
// =============================================================================

/**
 * 数値フィルター入力
 * Number filter input with single value or range support
 *
 * @param {FilterInputProps} props - コンポーネントのプロパティ
 * @returns {JSX.Element} 数値入力
 */
export function FilterNumber({
  field,
  value,
  onChange,
  className,
  disabled,
  debounceMs = 300,
}: FilterInputProps) {
  const isRange = field.operator === 'range';

  // Single number state
  const [localSingle, setLocalSingle] = React.useState<number | ''>(() => {
    if (isRange) return '';
    return (value as number) ?? '';
  });

  // Range number state
  const [localRange, setLocalRange] = React.useState<RangeValue<number>>(() => {
    if (isRange) return (value as RangeValue<number>) || {};
    return {};
  });

  const [prevValue, setPrevValue] = React.useState(value);

  if (value !== prevValue) {
    if (isRange) {
      setLocalRange((value as RangeValue<number>) || {});
    } else {
      setLocalSingle((value as number) ?? '');
    }
    setPrevValue(value);
  }

  // Debounce single value
  React.useEffect(() => {
    if (isRange) return;
    const handler = setTimeout(() => {
      const propVal = (value as number) ?? '';
      if (localSingle !== propVal) {
        onChange(localSingle === '' ? undefined : localSingle);
      }
    }, debounceMs);
    return () => clearTimeout(handler);
  }, [localSingle, debounceMs, onChange, value, isRange]);

  // Debounce range value
  React.useEffect(() => {
    if (!isRange) return;
    const handler = setTimeout(() => {
      const propRange = (value as RangeValue<number>) || {};
      if (localRange.min !== propRange.min || localRange.max !== propRange.max) {
        onChange(localRange);
      }
    }, debounceMs);
    return () => clearTimeout(handler);
  }, [localRange, debounceMs, onChange, value, isRange]);

  if (isRange) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Input
          type='number'
          value={localRange.min ?? ''}
          onChange={(e) => {
            const min = e.target.value === '' ? undefined : Number(e.target.value);
            setLocalRange((prev) => ({ ...prev, min }));
          }}
          placeholder={m.filter_min()}
          disabled={disabled}
          className='w-24'
        />
        <span className='text-muted-foreground'>~</span>
        <Input
          type='number'
          value={localRange.max ?? ''}
          onChange={(e) => {
            const max = e.target.value === '' ? undefined : Number(e.target.value);
            setLocalRange((prev) => ({ ...prev, max }));
          }}
          placeholder={m.filter_max()}
          disabled={disabled}
          className='w-24'
        />
      </div>
    );
  }

  return (
    <Input
      type='number'
      value={localSingle}
      onChange={(e) => setLocalSingle(e.target.value === '' ? '' : Number(e.target.value))}
      placeholder={field.placeholder || field.label}
      disabled={disabled}
      className={cn('w-32', className)}
    />
  );
}
FilterNumber.displayName = 'FilterNumber';

// =============================================================================
// FilterSelect
// =============================================================================

/**
 * セレクトフィルター入力
 * Select dropdown filter input
 *
 * @param {FilterInputProps} props - コンポーネントのプロパティ
 * @returns {JSX.Element} セレクト入力
 */
export function FilterSelect({
  field,
  value,
  onChange,
  className,
  disabled,
  showPlaceholderOnAll,
}: FilterInputProps) {
  const options: FilterOption[] = field.options || [];
  const allLabel = m.filter_all();

  // Sentinel for "All" option to avoid collision with placeholder state
  const ALL_SENTINEL = '__all__';

  // Logically unselected means "All" in the filter context
  const isUnselected = value === undefined || value === null || value === '';

  // To show the placeholder, the value passed to Select must NOT match any item (or be null/undefined)
  // To show "All" (すべて), the value passed to Select MUST match the "All" item.
  // Changing from undefined to string makes the component jump between uncontrolled and controlled. Use null instead.
  const currentValue = isUnselected ? (showPlaceholderOnAll ? null : ALL_SENTINEL) : String(value);

  const handleValueChange = (newValue: string | null) => {
    // If the sentinel or null is selected, treat it as unselecting the filter (All)
    if (newValue === ALL_SENTINEL || newValue === null || newValue === '') {
      onChange(undefined);
    } else {
      onChange(newValue);
    }
  };

  return (
    <Select value={currentValue} onValueChange={handleValueChange} disabled={disabled}>
      <SelectTrigger className={cn('min-w-[150px]', className)}>
        <SelectValue placeholder={showPlaceholderOnAll ? field.label : undefined}>
          {showPlaceholderOnAll && isUnselected ? (
            <span className='text-muted-foreground'>{field.label}</span>
          ) : currentValue === ALL_SENTINEL ? (
            allLabel
          ) : (
            (options.find((opt) => String(opt.value) === currentValue)?.label ?? currentValue)
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_SENTINEL}>{allLabel}</SelectItem>
        {options.map((opt) => (
          <SelectItem key={String(opt.value)} value={String(opt.value)}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

FilterSelect.displayName = 'FilterSelect';

// =============================================================================
// FilterDate
// =============================================================================

/**
 * 日付フィルター入力
 * Date filter input with single date or range support
 *
 * @param {FilterInputProps} props - コンポーネントのプロパティ
 * @returns {JSX.Element} 日付入力
 */
export function FilterDate({
  field,
  value,
  onChange,
  className,
  disabled,
  locale,
}: FilterInputProps) {
  const isRange = field.operator === 'range';
  const hasValue = isRange
    ? (value as RangeValue<Date>)?.min !== undefined ||
      (value as RangeValue<Date>)?.max !== undefined
    : value !== undefined && value !== null;

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRange) {
      onChange({ min: undefined, max: undefined });
    } else {
      onChange(undefined);
    }
  };

  if (isRange) {
    const rangeValue = (value as RangeValue<Date>) || {};
    const dateRange: DateRange = {
      start: rangeValue.min,
      end: rangeValue.max,
    };

    return (
      <div className='flex items-center gap-1.5 w-full'>
        <DateRangePicker
          mode='unified'
          value={dateRange}
          onChange={(range) => {
            onChange({
              min: range.start,
              max: range.end,
            });
          }}
          disabled={disabled}
          placeholder={field.placeholder || field.label}
          className={cn('flex-1', className)}
          enableHistory
          locale={locale}
        />
        {hasValue && (
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='h-8 w-8 text-muted-foreground hover:text-destructive shrink-0'
            onClick={handleClear}
            title={m.filter_reset()}
          >
            <X className='h-4 w-4' />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className='flex items-center gap-1.5'>
      <DatePicker
        date={value as Date | undefined}
        setDate={(date: Date | undefined) => onChange(date)}
        placeholder={field.placeholder || field.label}
        enableHistory
        locale={locale}
        clearable={true}
      />
      {hasValue && (
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='h-8 w-8 text-muted-foreground hover:text-destructive shrink-0'
          onClick={handleClear}
          title={m.filter_reset()}
        >
          <X className='h-4 w-4' />
        </Button>
      )}
    </div>
  );
}
FilterDate.displayName = 'FilterDate';

// =============================================================================
// FilterCheckbox
// =============================================================================

/**
 * チェックボックスフィルター入力
 * Checkbox filter input - single (boolean) or multi-select ($in)
 *
 * @param {FilterInputProps} props - コンポーネントのプロパティ
 * @returns {JSX.Element} チェックボックス入力
 */
export function FilterCheckbox({ field, value, onChange, className, disabled }: FilterInputProps) {
  // Boolean type: single checkbox
  if (field.type === 'boolean') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Checkbox
          checked={(value as boolean) || false}
          onCheckedChange={(checked) => onChange(checked === true)}
          disabled={disabled}
          id={`filter-${field.field}`}
        />
        <label htmlFor={`filter-${field.field}`} className='text-sm cursor-pointer'>
          {field.label}
        </label>
      </div>
    );
  }

  // Array type: multi-select checkboxes
  const options: FilterOption[] = field.options || [];
  const selectedValues = (value as (string | number)[]) || [];

  const toggleOption = (optValue: string | number) => {
    const newValues = selectedValues.includes(optValue)
      ? selectedValues.filter((v) => v !== optValue)
      : [...selectedValues, optValue];

    onChange(newValues.length > 0 ? newValues : undefined);
  };

  return (
    <div className={cn('flex flex-wrap gap-3', className)}>
      {options.map((opt) => (
        <div key={String(opt.value)} className='flex items-center gap-1.5'>
          <Checkbox
            checked={selectedValues.includes(opt.value)}
            onCheckedChange={() => toggleOption(opt.value)}
            disabled={disabled}
            id={`filter-${field.field}-${opt.value}`}
          />
          <label htmlFor={`filter-${field.field}-${opt.value}`} className='text-sm cursor-pointer'>
            {opt.label}
          </label>
        </div>
      ))}
    </div>
  );
}
FilterCheckbox.displayName = 'FilterCheckbox';

// =============================================================================
// FilterRadio
// =============================================================================

/**
 * ラジオボタンフィルター入力
 * Radio button filter input
 *
 * @param {FilterInputProps} props - コンポーネントのプロパティ
 * @returns {JSX.Element} ラジオボタン入力
 */
export function FilterRadio({ field, value, onChange, className, disabled }: FilterInputProps) {
  const options: FilterOption[] = field.options || [];

  return (
    <div className={cn('flex flex-wrap gap-3', className)}>
      {/* All option */}
      <label className='flex items-center gap-1.5 cursor-pointer'>
        <input
          type='radio'
          name={`filter-${field.field}`}
          checked={value === undefined || value === null || value === ''}
          onChange={() => onChange(undefined)}
          disabled={disabled}
          className='h-4 w-4'
        />
        <span className='text-sm'>{m.filter_all()}</span>
      </label>
      {options.map((opt) => (
        <label key={String(opt.value)} className='flex items-center gap-1.5 cursor-pointer'>
          <input
            type='radio'
            name={`filter-${field.field}`}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            disabled={disabled}
            className='h-4 w-4'
          />
          <span className='text-sm'>{opt.label}</span>
        </label>
      ))}
    </div>
  );
}
FilterRadio.displayName = 'FilterRadio';

// =============================================================================
// FilterInput (Auto-select based on field type)
// =============================================================================

/**
 * フィールド型に応じたフィルター入力を自動選択
 * Auto-selects the appropriate filter input based on field type
 *
 * @param {FilterInputProps} props - コンポーネントのプロパティ
 * @returns {JSX.Element} 適切なフィルター入力
 *
 * @example
 * <FilterInput
 *   field={resolvedField}
 *   value={values[field.field]}
 *   onChange={(v) => setField(field.field, v)}
 * />
 */
export function FilterInput(props: FilterInputProps) {
  const { field } = props;

  switch (field.type) {
    case 'string':
      return <FilterText {...props} />;
    case 'number':
      return <FilterNumber {...props} />;
    case 'date':
      return <FilterDate {...props} />;
    case 'boolean':
      return <FilterCheckbox {...props} />;
    case 'enum':
      return <FilterSelect {...props} />;
    case 'array':
      return <FilterCheckbox {...props} />;
    default:
      return <FilterText {...props} />;
  }
}
FilterInput.displayName = 'FilterInput';
