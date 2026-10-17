'use client';

import * as React from 'react';
import { DayPicker, getDefaultClassNames, type DayButton } from 'react-day-picker';

import { cn } from '../../lib/utils';
import { ja } from 'date-fns/locale';
import { format, type Locale } from 'date-fns';
// Tools uses its own Button component, assume compatibility or check later
import { Button, buttonVariants } from '../../components/ui/button';
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from 'lucide-react';

/**
 * 日付を選択するためのカレンダーUIコンポーネント。
 * DayPicker 10 の props を受け取ります。旧 initialFocus/fromYear/table 等は
 * autoFocus/startMonth/month_grid に移行してください。
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'label',
  buttonVariant = 'ghost',
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>['variant'];
}) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        'p-2 [--cell-radius:var(--radius-md)] [--cell-size:--spacing(7)] bg-background group/calendar [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent',
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className,
      )}
      captionLayout={captionLayout}
      locale={props.locale || ja}
      formatters={{
        formatCaption: (date, options) => {
          return format(date, 'yyyy年 M月', { locale: options?.locale });
        },
        formatWeekdayName: (date, options) => {
          return format(date, 'EEEEE', { locale: options?.locale });
        },
        ...formatters,
      }}
      classNames={{
        root: cn('w-fit', defaultClassNames.root),
        months: cn('flex gap-4 flex-col md:flex-row relative', defaultClassNames.months),
        month: cn('flex flex-col w-full gap-4', defaultClassNames.month),
        nav: cn(
          'flex items-center gap-1 w-full absolute top-0 inset-x-0 justify-between',
          defaultClassNames.nav,
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          'size-(--cell-size) aria-disabled:opacity-50 p-0 select-none',
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          'size-(--cell-size) aria-disabled:opacity-50 p-0 select-none',
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          'flex items-center justify-center h-(--cell-size) w-full px-(--cell-size)',
          defaultClassNames.month_caption,
        ),
        dropdowns: cn(
          'w-full flex items-center text-sm font-medium justify-center h-(--cell-size) gap-1.5',
          defaultClassNames.dropdowns,
        ),
        dropdown_root: cn(
          'relative cn-calendar-dropdown-root rounded-(--cell-radius)',
          defaultClassNames.dropdown_root,
        ),
        dropdown: cn('absolute bg-popover inset-0 opacity-0', defaultClassNames.dropdown),
        caption_label: cn(
          'select-none font-medium',
          captionLayout === 'label'
            ? 'text-sm'
            : 'cn-calendar-caption-label rounded-(--cell-radius) flex items-center gap-1 text-sm  [&>svg]:text-muted-foreground [&>svg]:size-3.5',
          defaultClassNames.caption_label,
        ),
        month_grid: cn('w-full border-collapse', defaultClassNames.month_grid),
        weekdays: cn('flex', defaultClassNames.weekdays),
        weekday: cn(
          'text-muted-foreground rounded-(--cell-radius) flex-1 font-normal text-[0.8rem] select-none',
          defaultClassNames.weekday,
        ),
        week: cn('flex w-full mt-2', defaultClassNames.week),
        week_number_header: cn('select-none w-(--cell-size)', defaultClassNames.week_number_header),
        week_number: cn(
          'text-[0.8rem] select-none text-muted-foreground',
          defaultClassNames.week_number,
        ),
        day: cn(
          'relative w-full rounded-(--cell-radius) h-full p-0 text-center [&:last-child[data-selected=true]_button]:rounded-r-(--cell-radius) group/day aspect-square select-none',
          props.showWeekNumber
            ? '[&:nth-child(2)[data-selected=true]_button]:rounded-l-(--cell-radius)'
            : '[&:first-child[data-selected=true]_button]:rounded-l-(--cell-radius)',
          defaultClassNames.day,
        ),
        range_start: cn(
          'rounded-l-(--cell-radius) bg-muted elative after:bg-muted after:absolute after:inset-y-0 after:w-4 after:right-0 -z-0 isolate',
          defaultClassNames.range_start,
        ),
        range_middle: cn('rounded-none', defaultClassNames.range_middle),
        range_end: cn(
          'rounded-r-(--cell-radius) bg-muted relative after:bg-muted after:absolute after:inset-y-0 after:w-4 after:left-0 -z-0 isolate',
          defaultClassNames.range_end,
        ),
        today: cn(
          'bg-muted text-foreground rounded-(--cell-radius) data-[selected=true]:rounded-none',
          defaultClassNames.today,
        ),
        outside: cn(
          'text-muted-foreground aria-selected:text-muted-foreground',
          defaultClassNames.outside,
        ),
        disabled: cn('text-muted-foreground opacity-50', defaultClassNames.disabled),
        hidden: cn('invisible', defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return <div data-slot='calendar' ref={rootRef} className={cn(className)} {...props} />;
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === 'left') {
            return <ChevronLeftIcon className={cn('size-4', className)} {...props} />;
          }

          if (orientation === 'right') {
            return <ChevronRightIcon className={cn('size-4', className)} {...props} />;
          }

          return <ChevronDownIcon className={cn('size-4', className)} {...props} />;
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className='flex size-(--cell-size) items-center justify-center text-center'>
                {children}
              </div>
            </td>
          );
        },
        ...components,
      }}
      {...props}
    />
  );
}

/**
 * カレンダー内の各日付セルを表すボタンコンポーネント。
 */
function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames();

  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <Button
      ref={ref}
      variant='ghost'
      size='icon'
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        'data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[range-middle=true]:bg-muted data-[range-middle=true]:text-foreground data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-ring/50 dark:hover:text-foreground relative isolate z-10 flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 border-0 leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-[3px] data-[range-end=true]:rounded-(--cell-radius) data-[range-end=true]:rounded-r-(--cell-radius) data-[range-middle=true]:rounded-none data-[range-start=true]:rounded-(--cell-radius) data-[range-start=true]:rounded-l-(--cell-radius) [&>span]:text-xs [&>span]:opacity-70',
        defaultClassNames.day,
        className,
      )}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };

// Re-implement DatePicker using the new Calendar and Popover/Dialog
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Dialog, DialogContent } from '../../components/ui/dialog';
import { setTime } from '../../lib/date-utils';

/**
 * DatePicker コンポーネントのプロパティ
 *
 * カレンダーUIで日付を選択するコンポーネント。
 * ポップオーバー（ドロップダウン）またはモーダルダイアログで表示可能。
 *
 * @example
 * ```tsx
 * // 基本使用（ポップオーバー）
 * <DatePicker date={date} setDate={setDate} />
 *
 * // モーダル表示 + クリアボタン + 時間正規化（JST 0時）
 * <DatePicker
 *   date={date}
 *   setDate={setDate}
 *   display="modal"
 *   clearable
 *   normalizeTime
 *   timezone="Asia/Tokyo"
 * />
 *
 * // ボタンのみ表示（日付テキスト非表示）
 * <DatePicker date={date} setDate={setDate} buttonOnly buttonLabel="日付指定" />
 * ```
 */
interface DatePickerProps extends Omit<React.ComponentProps<typeof Button>, 'children'> {
  /** 選択中の日付 */
  date: Date | undefined;
  /** 日付変更時のコールバック */
  setDate: (date: Date | undefined) => void;
  /** 未選択時のプレースホルダー */
  placeholder?: string;
  /** 過去の日付を選択可能にする（デフォルト: false → 過去は無効） */
  enableHistory?: boolean;
  /** date-fns ロケール */
  locale?: Locale;
  /** 表示モード: "popover"（ドロップダウン）または "modal"（ダイアログ） */
  display?: 'popover' | 'modal';
  /** クリアボタンを表示する */
  clearable?: boolean;
  /** ボタンのみ表示（日付テキストを非表示） */
  buttonOnly?: boolean;
  /** ボタンのみモード時のラベル */
  buttonLabel?: string;
  /** 選択時に時間を0時0分0秒に正規化する */
  normalizeTime?: boolean;
  /** 時間正規化で使用するタイムゾーン（IANA形式、例: "Asia/Tokyo"） */
  timezone?: string;
  /** カレンダーの外側の日付を表示する（デフォルト: false） */
  showOutsideDays?: boolean;
  /** ラベルテキスト（input上部に表示） */
  label?: string;
  /** カレンダーの表示月数（デフォルト: 1） */
  numberOfMonths?: number;
}

/**
 * カレンダーUIを展開して日付を選択できるデートピッカーコンポーネント。
 */
function DatePicker({
  date,
  setDate,
  placeholder = '日付を選択',
  className,
  enableHistory,
  locale,
  display = 'popover',
  clearable = false,
  buttonOnly = false,
  buttonLabel = '日付指定',
  normalizeTime = false,
  timezone,
  showOutsideDays = false,
  label,
  numberOfMonths,
  ...props
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (day: Date | undefined) => {
    if (day && normalizeTime) {
      setDate(setTime(day, 0, 0, 0, timezone));
    } else {
      setDate(day);
    }
    setOpen(false);
  };

  const handleClear = () => {
    setDate(undefined);
    setOpen(false);
  };

  const calendarContent = (
    <div className='bg-background p-2 sm:p-4'>
      {display === 'modal' && (
        <div className='flex justify-end mb-1'>
          <button
            type='button'
            className='flex items-center justify-center h-8 w-8 rounded-full bg-muted hover:bg-muted/80'
            onClick={() => setOpen(false)}
          >
            <X className='h-4 w-4 text-muted-foreground' />
          </button>
        </div>
      )}
      <div className='flex justify-center'>
        <Calendar
          mode='single'
          selected={date}
          onSelect={handleSelect}
          locale={locale}
          disabled={enableHistory ? [] : { before: new Date() }}
          showOutsideDays={showOutsideDays}
          numberOfMonths={numberOfMonths}
          className='rounded-md'
        />
      </div>
      {clearable && (
        <div className='flex justify-center mt-2'>
          <Button type='button' variant='outline' size='sm' onClick={handleClear}>
            クリア
          </Button>
        </div>
      )}
    </div>
  );

  // ボタンのみモード
  if (buttonOnly) {
    if (display === 'modal') {
      return (
        <>
          <Button
            variant='outline'
            className={cn('flex items-center', className)}
            onClick={() => setOpen(true)}
            {...props}
          >
            <CalendarIcon className='h-4 w-4 mr-2' />
            {buttonLabel}
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent
              className={cn(
                numberOfMonths && numberOfMonths > 1 ? 'sm:max-w-lg' : 'sm:max-w-xs',
                'p-0',
              )}
              showCloseButton={false}
            >
              {calendarContent}
            </DialogContent>
          </Dialog>
        </>
      );
    }
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button variant='outline' className={cn('flex items-center', className)} {...props} />
          }
        >
          <CalendarIcon className='h-4 w-4 mr-2' />
          {buttonLabel}
        </PopoverTrigger>
        <PopoverContent className='w-auto p-0' align='start'>
          {calendarContent}
        </PopoverContent>
      </Popover>
    );
  }

  // 通常モード（日付表示あり）
  const triggerButton = (
    <Button
      variant='outline'
      className={cn(
        'w-[280px] justify-start text-left font-normal',
        !date && 'text-muted-foreground',
        className,
      )}
      {...props}
    />
  );

  const triggerContent = (
    <>
      <CalendarIcon className='mr-2 h-4 w-4' />
      {date ? format(date, 'PPP', { locale: locale || ja }) : <span>{placeholder}</span>}
    </>
  );

  if (display === 'modal') {
    const modalContent = (
      <>
        {label && <label className='block text-sm font-medium text-foreground mb-1'>{label}</label>}
        <Button
          variant='outline'
          className={cn(
            'w-[280px] justify-start text-left font-normal',
            !date && 'text-muted-foreground',
            className,
          )}
          onClick={() => setOpen(true)}
          {...props}
        >
          {triggerContent}
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            className={cn(
              numberOfMonths && numberOfMonths > 1 ? 'sm:max-w-lg' : 'sm:max-w-xs',
              'p-0',
            )}
            showCloseButton={false}
          >
            {calendarContent}
          </DialogContent>
        </Dialog>
      </>
    );
    return label ? <div>{modalContent}</div> : modalContent;
  }

  const popoverContent = (
    <>
      {label && <label className='block text-sm font-medium text-foreground mb-1'>{label}</label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={triggerButton}>{triggerContent}</PopoverTrigger>
        <PopoverContent className='w-auto p-0' align='start'>
          {calendarContent}
        </PopoverContent>
      </Popover>
    </>
  );

  return label ? <div>{popoverContent}</div> : popoverContent;
}

export { DatePicker };
export type { DatePickerProps };
