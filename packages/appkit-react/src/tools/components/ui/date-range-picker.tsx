/**
 * @fileoverview 日付範囲選択コンポーネント
 *
 * 2つの表示モードを持つ日付範囲選択用UIコンポーネントを提供します:
 * - `separate`: 開始日と終了日を別々の入力フィールドで表示
 * - `unified`: 1つの入力フィールドに両方の日付を表示し、単一のカレンダーで選択
 *
 * @module ui/date-range-picker
 */

'use client';

import * as React from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  isAfter,
  isBefore,
  startOfDay,
  isWithinInterval,
  type Locale,
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '../../lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { formatDate, setTime } from '../../lib/date-utils';

// =============================================================================
// Types
// =============================================================================

/**
 * 日付範囲の型定義
 * Date range type definition
 *
 * @typedef {Object} DateRange
 * @property {Date} [start] - 開始日 / Start date
 * @property {Date} [end] - 終了日 / End date
 */
export interface DateRange {
  /** 開始日 / Start date */
  start?: Date;
  /** 終了日 / End date */
  end?: Date;
}

/**
 * RangeCalendarの無効化オプション
 * Disabled date options for RangeCalendar
 */
type DisabledDates = Array<{ before?: Date; after?: Date }> | ((date: Date) => boolean);

/**
 * RangeCalendarのプロパティ
 * RangeCalendar component props
 */
export interface RangeCalendarProps {
  /** 選択された日付範囲 / Currently selected date range */
  selected?: DateRange;
  /** 範囲選択時のコールバック / Callback when range is selected */
  onSelect?: (range: DateRange) => void;
  /** 無効化する日付 / Dates to disable */
  disabled?: DisabledDates;
  /** ロケール / Locale for formatting */
  locale?: Locale;
  /** 週の開始曜日 (0=日曜, 1=月曜) / First day of week */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** 月外の日付を表示するか / Show days outside current month */
  showOutsideDays?: boolean;
  /** クラス名 / Additional CSS classes */
  className?: string;
}

/**
 * DateRangePickerのプロパティ
 * DateRangePicker component props
 */
export interface DateRangePickerProps {
  /** 表示モード / Display mode */
  mode?: 'separate' | 'unified';
  /** 日付間の区切り文字 / Separator between dates */
  separator?: string;
  /** 選択された日付範囲 / Currently selected date range */
  value?: DateRange;
  /** 範囲変更時のコールバック / Callback when range changes */
  onChange?: (range: DateRange) => void;
  /** 開始日のフォーム入力名 / Form input name for start date */
  startName?: string;
  /** 終了日のフォーム入力名 / Form input name for end date */
  endName?: string;
  /** ラベル / Label text */
  label?: string;
  /** 開始日のプレースホルダー / Placeholder for start date */
  startPlaceholder?: string;
  /** 終了日のプレースホルダー / Placeholder for end date */
  endPlaceholder?: string;
  /** 統合モード用プレースホルダー / Placeholder for unified mode */
  placeholder?: string;
  /** 無効化 / Disable the picker */
  disabled?: boolean;
  /** 無効化する日付 / Dates to disable in calendar */
  disabledDates?: DisabledDates;
  /** 過去の日付を許可するか / Allow past dates */
  enableHistory?: boolean;
  /** 何ヶ月先まで選択可能か / Months ahead allowed */
  monthsAhead?: number;
  /** 週の開始曜日 / First day of week */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** クラス名 / Additional CSS classes */
  className?: string;
  /** ロケール / Locale for formatting */
  locale?: Locale;
}

// =============================================================================
// RangeCalendar Component
// =============================================================================

/**
 * 日付範囲選択カレンダー
 * Calendar component for selecting a date range
 *
 * 最初のクリックで開始日、2回目のクリックで終了日を設定します。
 * 開始日より前の日付をクリックすると、その日付が新しい開始日になります。
 *
 * @param {RangeCalendarProps} props - コンポーネントのプロパティ
 * @returns {JSX.Element} レンダリングされたカレンダー
 *
 * @example
 * <RangeCalendar
 *   selected={{ start: new Date(), end: addDays(new Date(), 7) }}
 *   onSelect={(range) => console.log(range)}
 * />
 */
export function RangeCalendar({
  className,
  selected,
  onSelect,
  disabled,
  locale = ja,
  weekStartsOn = 1,
  showOutsideDays = true,
}: RangeCalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(selected?.start || new Date());
  const [selectionPhase, setSelectionPhase] = React.useState<'start' | 'end'>(
    selected?.start && !selected?.end ? 'end' : 'start',
  );
  const [tempStart, setTempStart] = React.useState<Date | undefined>(selected?.start);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const sunday = new Date(2024, 0, 7);
    const targetDay = new Date(sunday);
    targetDay.setDate(sunday.getDate() + weekStartsOn + i);
    return format(targetDay, 'EEEEE', { locale });
  });

  /**
   * 日付が無効かどうかを判定する
   */
  const isDateDisabled = (date: Date) => {
    if (!disabled) return false;

    if (typeof disabled === 'function') {
      return disabled(date);
    }

    if (Array.isArray(disabled)) {
      return disabled.some((range) => {
        if (range.before && isBefore(startOfDay(date), startOfDay(range.before))) {
          return true;
        }
        if (range.after && isAfter(startOfDay(date), startOfDay(range.after))) {
          return true;
        }
        return false;
      });
    }

    return false;
  };

  /**
   * 日付が選択範囲内かどうかを判定する
   */
  const isInRange = (day: Date): boolean => {
    const start = tempStart || selected?.start;
    const end = selected?.end;
    if (!start || !end) return false;
    return isWithinInterval(day, { start: startOfDay(start), end: startOfDay(end) });
  };

  /**
   * 日付がクリックされた時の処理
   */
  const handleDayClick = (day: Date) => {
    if (isDateDisabled(day)) return;

    if (selectionPhase === 'start') {
      // 開始日を設定
      setTempStart(day);
      setSelectionPhase('end');
      onSelect?.({ start: day, end: undefined });
    } else {
      // 終了日を設定
      const start = tempStart || selected?.start;
      if (start) {
        if (isBefore(day, start)) {
          // クリックした日が開始日より前なら、新しい開始日として設定
          setTempStart(day);
          onSelect?.({ start: day, end: undefined });
        } else {
          // 終了日として設定
          onSelect?.({ start, end: day });
          setSelectionPhase('start');
        }
      }
    }
  };

  const previousMonth = () => setCurrentMonth((prev) => subMonths(prev, 1));
  const nextMonth = () => setCurrentMonth((prev) => addMonths(prev, 1));

  const start = tempStart || selected?.start;
  const end = selected?.end;

  return (
    <div className={cn('p-3', className)}>
      <div className='space-y-4'>
        {/* ヘッダー: 月ナビゲーション */}
        <div className='flex justify-center pt-1 relative items-center'>
          <button
            type='button'
            onClick={previousMonth}
            className='absolute left-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center'
          >
            <ChevronLeft className='h-4 w-4' />
          </button>

          <div className='text-sm font-medium'>
            {format(currentMonth, 'yyyy年 M月', { locale })}
          </div>

          <button
            type='button'
            onClick={nextMonth}
            className='absolute right-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center'
          >
            <ChevronRight className='h-4 w-4' />
          </button>
        </div>

        {/* 選択中の範囲表示 */}
        <div className='text-xs text-center text-muted-foreground'>
          {selectionPhase === 'start' ? '開始日を選択' : '終了日を選択'}
        </div>

        {/* カレンダーグリッド */}
        <table className='w-full border-collapse'>
          <thead>
            <tr className='flex'>
              {weekDays.map((day, i) => (
                <th
                  key={i}
                  className={cn(
                    'rounded-md w-9 font-normal text-[0.8rem]',
                    i === 5 && 'text-blue-600',
                    i === 6 && 'text-red-600',
                  )}
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: Math.ceil(days.length / 7) }).map((_, weekIndex) => (
              <tr key={weekIndex} className='flex w-full mt-2'>
                {days.slice(weekIndex * 7, (weekIndex + 1) * 7).map((day) => {
                  const isOutside = !isSameMonth(day, currentMonth);
                  const isStart = start && isSameDay(day, start);
                  const isEnd = end && isSameDay(day, end);
                  const inRange = isInRange(day);
                  const isDayToday = isToday(day);
                  const isDisabled = isDateDisabled(day);
                  const dayOfWeek = day.getDay();

                  if (isOutside && !showOutsideDays) {
                    return <td key={day.toString()} className='h-9 w-9' />;
                  }

                  return (
                    <td key={day.toString()} className='h-9 w-9 text-center text-sm p-0 relative'>
                      <button
                        type='button'
                        onClick={() => handleDayClick(day)}
                        disabled={isDisabled}
                        className={cn(
                          'h-9 w-9 p-0 inline-flex items-center justify-center transition-colors',
                          'focus:outline-none focus:ring-2 focus:ring-ring',
                          // 範囲内の日付
                          inRange && !isStart && !isEnd && 'bg-primary/20',
                          // 開始日・終了日
                          isStart && 'bg-primary text-primary-foreground rounded-l-full',
                          isEnd && 'bg-primary text-primary-foreground rounded-r-full',
                          isStart && isEnd && 'rounded-full',
                          !isStart && !isEnd && !inRange && 'rounded-full',
                          // 月外
                          isOutside && 'text-muted-foreground opacity-50',
                          // 今日
                          isDayToday && !isStart && !isEnd && 'text-[130%] font-bold',
                          // 無効
                          isDisabled &&
                            'text-muted-foreground/50 cursor-not-allowed hover:bg-transparent',
                          // ホバー
                          !isStart &&
                            !isEnd &&
                            !isDisabled &&
                            !inRange &&
                            'hover:bg-accent hover:text-accent-foreground',
                          // 曜日の色
                          !isStart && !isEnd && !isDisabled && dayOfWeek === 6 && 'text-blue-600',
                          !isStart && !isEnd && !isDisabled && dayOfWeek === 0 && 'text-red-600',
                        )}
                      >
                        {format(day, 'd')}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* クリアボタン */}
        <div className='flex justify-center pt-3 border-t mt-3'>
          <button
            type='button'
            className='px-4 py-2 rounded bg-muted hover:bg-muted/80 transition-colors text-sm'
            onClick={() => {
              setTempStart(undefined);
              setSelectionPhase('start');
              onSelect?.({ start: undefined, end: undefined });
            }}
          >
            クリア
          </button>
        </div>
      </div>
    </div>
  );
}
RangeCalendar.displayName = 'RangeCalendar';

// =============================================================================
// DateRangePicker Component
// =============================================================================

/**
 * 日付範囲選択ピッカー
 * Date range picker component with two display modes
 *
 * `separate`モード: 開始日と終了日を別々の入力フィールドで表示
 * `unified`モード: 1つの入力フィールドに両方の日付を表示
 *
 * @param {DateRangePickerProps} props - コンポーネントのプロパティ
 * @returns {JSX.Element} レンダリングされたピッカー
 *
 * @example
 * // 分離モード
 * <DateRangePicker
 *   mode="separate"
 *   startName="startDate"
 *   endName="endDate"
 *   value={{ start: new Date(), end: addDays(new Date(), 7) }}
 *   onChange={(range) => console.log(range)}
 * />
 *
 * @example
 * // 統合モード（フォーム送信用hidden input付き）
 * <DateRangePicker
 *   mode="unified"
 *   startName="startDate"
 *   endName="endDate"
 *   placeholder="期間を選択"
 * />
 */
export function DateRangePicker({
  mode = 'separate',
  separator = '~',
  value,
  onChange,
  startName,
  endName,
  label,
  startPlaceholder = '開始日',
  endPlaceholder = '終了日',
  placeholder = '期間を選択',
  disabled = false,
  disabledDates,
  enableHistory = false,
  monthsAhead = 12,
  weekStartsOn = 1,
  className,
  locale = ja,
}: DateRangePickerProps) {
  const [range, setRange] = React.useState<DateRange>(value || {});
  const [prevValue, setPrevValue] = React.useState(value);

  if (value !== prevValue) {
    if (value) setRange(value);
    setPrevValue(value);
  }

  const [startOpen, setStartOpen] = React.useState(false);
  const [endOpen, setEndOpen] = React.useState(false);
  const [unifiedOpen, setUnifiedOpen] = React.useState(false);

  const today = new Date();
  const maxDate = new Date(today.getFullYear(), today.getMonth() + monthsAhead, today.getDate());

  const dateConstraints = enableHistory ? undefined : [{ before: today }, { after: maxDate }];

  /**
   * 範囲変更時のハンドラー
   */
  const handleRangeChange = (newRange: DateRange) => {
    const normalizedRange = {
      start: newRange.start ? setTime(newRange.start, 0) : undefined,
      end: newRange.end ? setTime(newRange.end, 0) : undefined,
    };
    setRange(normalizedRange);
    onChange?.(normalizedRange);
  };

  /**
   * 日付をフォーマットする
   */
  const formatDisplayDate = (date?: Date): string => {
    if (!date) return '';
    return formatDate(date);
  };

  /**
   * ISO形式の日付文字列を返す（hidden input用）
   */
  const toISOString = (date?: Date): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  // 分離モード
  if (mode === 'separate') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {label && <label className='block text-sm font-medium text-foreground mr-2'>{label}</label>}

        {/* 開始日ピッカー */}
        <Popover open={startOpen} onOpenChange={setStartOpen}>
          <PopoverTrigger
            disabled={disabled}
            className={cn(
              'inline-flex items-center justify-start min-w-[140px] h-9 px-4 py-2 text-left font-normal border rounded-md bg-background hover:bg-accent hover:text-accent-foreground',
              !range.start && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className='mr-2 h-4 w-4' />
            {range.start ? formatDisplayDate(range.start) : startPlaceholder}
          </PopoverTrigger>
          <PopoverContent className='w-auto p-0 bg-popover' align='start'>
            <RangeCalendar
              selected={{ start: range.start, end: range.start }}
              onSelect={(r) => {
                handleRangeChange({ ...range, start: r.start });
                setStartOpen(false);
              }}
              disabled={disabledDates || dateConstraints}
              weekStartsOn={weekStartsOn}
            />
          </PopoverContent>
        </Popover>

        {/* hidden input for start */}
        {startName && <input type='hidden' name={startName} value={toISOString(range.start)} />}

        {/* 区切り文字 */}
        <span className='text-muted-foreground'>{separator}</span>

        {/* 終了日ピッカー */}
        <Popover open={endOpen} onOpenChange={setEndOpen}>
          <PopoverTrigger
            disabled={disabled}
            className={cn(
              'inline-flex items-center justify-start min-w-[140px] h-9 px-4 py-2 text-left font-normal border rounded-md bg-background hover:bg-accent hover:text-accent-foreground',
              !range.end && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className='mr-2 h-4 w-4' />
            {range.end ? formatDisplayDate(range.end) : endPlaceholder}
          </PopoverTrigger>
          <PopoverContent className='w-auto p-0 bg-popover' align='start'>
            <RangeCalendar
              selected={{ start: range.end, end: range.end }}
              onSelect={(r) => {
                handleRangeChange({ ...range, end: r.start });
                setEndOpen(false);
              }}
              disabled={disabledDates || dateConstraints}
              weekStartsOn={weekStartsOn}
            />
          </PopoverContent>
        </Popover>

        {/* hidden input for end */}
        {endName && <input type='hidden' name={endName} value={toISOString(range.end)} />}
      </div>
    );
  }

  // 統合モード
  const displayValue =
    range.start || range.end
      ? `${formatDisplayDate(range.start) || '?'} ${separator} ${formatDisplayDate(range.end) || '?'}`
      : '';

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && <label className='block text-sm font-medium text-foreground'>{label}</label>}

      <Popover open={unifiedOpen} onOpenChange={setUnifiedOpen}>
        <PopoverTrigger
          disabled={disabled}
          className={cn(
            'inline-flex items-center justify-start min-w-[240px] h-9 px-4 py-2 text-left font-normal border rounded-md bg-background hover:bg-accent hover:text-accent-foreground',
            !displayValue && 'text-muted-foreground',
          )}
        >
          <CalendarIcon className='mr-2 h-4 w-4' />
          {displayValue || placeholder}
        </PopoverTrigger>
        <PopoverContent className='w-auto p-0 bg-popover' align='start'>
          <RangeCalendar
            selected={range}
            onSelect={(r) => {
              handleRangeChange(r);
              // 両方選択されたら閉じる
              if (r.start && r.end) {
                setUnifiedOpen(false);
              }
            }}
            disabled={disabledDates || dateConstraints}
            weekStartsOn={weekStartsOn}
            locale={locale}
          />
        </PopoverContent>
      </Popover>

      {/* hidden inputs for form submission */}
      {startName && <input type='hidden' name={startName} value={toISOString(range.start)} />}
      {endName && <input type='hidden' name={endName} value={toISOString(range.end)} />}
    </div>
  );
}
DateRangePicker.displayName = 'DateRangePicker';
