'use client';

import * as React from 'react';
import { Select as SelectPrimitive } from '@base-ui/react/select';
import { ChevronDownIcon, CheckIcon, ChevronUpIcon } from 'lucide-react';

import { cn } from '../../lib/utils';

/**
 * Select Component
 * セレクトコンポーネント
 */
const Select = SelectPrimitive.Root;

/**
 * 選択肢をグループ化するためのコンポーネント。
 */
function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return (
    <SelectPrimitive.Group
      data-slot='select-group'
      className={cn('scroll-my-1 p-1', className)}
      {...props}
    />
  );
}

/**
 * トリガー内に現在選択されている値やプレースホルダーを表示するコンポーネント。
 */
function SelectValue({
  className,
  children,
  ...props
}: SelectPrimitive.Value.Props & { placeholder?: string }) {
  return (
    <SelectPrimitive.Value
      data-slot='select-value'
      className={cn('flex flex-1 text-left line-clamp-1', className)}
      {...props}
    >
      {children}
    </SelectPrimitive.Value>
  );
}

interface SelectTriggerProps extends SelectPrimitive.Trigger.Props {
  size?: 'sm' | 'default';
  testId?: string;
}

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  SelectTriggerProps
>(({ className, size = 'default', children, testId, ...props }, ref) => {
  return (
    <SelectPrimitive.Trigger
      ref={ref}
      data-slot='select-trigger'
      data-testid={testId}
      data-size={size}
      className={cn(
        "border-input data-[placeholder]:text-muted-foreground dark:bg-input/30 dark:hover:bg-input/50 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 gap-1.5 rounded-lg border bg-background py-2 pr-2 pl-2.5 text-sm transition-colors select-none focus-visible:ring-[3px] aria-invalid:ring-[3px] data-[size=default]:h-8 data-[size=sm]:h-7 data-[size=sm]:rounded-[min(var(--radius-md),10px)] *:data-[slot=select-value]:flex *:data-[slot=select-value]:gap-1.5 [&_svg:not([class*='size-'])]:size-4 flex w-fit items-center justify-between whitespace-nowrap outline-none disabled:cursor-not-allowed disabled:opacity-50 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        render={<ChevronDownIcon className='text-muted-foreground size-4 pointer-events-none' />}
      />
    </SelectPrimitive.Trigger>
  );
});
SelectTrigger.displayName = 'SelectTrigger';

/**
 * 選択肢のリストを格納するドロップダウンポップアップコンテナ。
 */
function SelectContent({
  className,
  children,
  side = 'bottom',
  sideOffset = 4,
  align = 'center',
  alignOffset = 0,
  alignItemWithTrigger = true,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    'align' | 'alignOffset' | 'side' | 'sideOffset' | 'alignItemWithTrigger'
  >) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className='isolate z-50'
      >
        <SelectPrimitive.Popup
          data-slot='select-content'
          className={cn(
            'bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 min-w-36 rounded-lg shadow-md ring-1 duration-100 relative isolate z-50 max-h-(--available-height) w-(--anchor-width) origin-(--transform-origin) overflow-x-hidden overflow-y-auto',
            className,
          )}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.List>{children}</SelectPrimitive.List>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

/**
 * グループのタイトルや見出しを表すラベルコンポーネント。
 */
function SelectLabel({ className, ...props }: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot='select-label'
      className={cn('text-muted-foreground px-1.5 py-1 text-xs', className)}
      {...props}
    />
  );
}

interface SelectItemProps extends SelectPrimitive.Item.Props {
  testId?: string;
}

/**
 * ドロップダウンリスト内の個々の選択肢アイテム。
 */
function SelectItem({ className, children, testId, ...props }: SelectItemProps) {
  return (
    <SelectPrimitive.Item
      data-slot='select-item'
      data-testid={testId}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2 relative flex w-full cursor-default items-center outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className='flex flex-1 gap-2 shrink-0 whitespace-nowrap'>
        {children}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator
        render={
          <span className='pointer-events-none absolute right-2 flex size-4 items-center justify-center' />
        }
      >
        <CheckIcon className='pointer-events-none' />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

/**
 * アイテムやグループを区切るためのセパレーター（区切り線）。
 */
function SelectSeparator({ className, ...props }: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      data-slot='select-separator'
      className={cn('bg-border -mx-1 my-1 h-px pointer-events-none', className)}
      {...props}
    />
  );
}

/**
 * リストが長い場合に、上方向にスクロールするためのインジケーターボタン。
 */
function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  // Note: ScrollUpArrow implementation differs in Base UI depending on version.
  // erp uses SelectPrimitive.ScrollUpArrow directly.
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot='select-scroll-up-button'
      className={cn(
        "bg-popover z-10 flex cursor-default items-center justify-center py-1 [&_svg:not([class*='size-'])]:size-4 top-0 w-full",
        className,
      )}
      {...props}
    >
      <ChevronUpIcon />
    </SelectPrimitive.ScrollUpArrow>
  );
}

/**
 * リストが長い場合に、下方向にスクロールするためのインジケーターボタン。
 */
function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot='select-scroll-down-button'
      className={cn(
        "bg-popover z-10 flex cursor-default items-center justify-center py-1 [&_svg:not([class*='size-'])]:size-4 bottom-0 w-full",
        className,
      )}
      {...props}
    >
      <ChevronDownIcon />
    </SelectPrimitive.ScrollDownArrow>
  );
}

/**
 * セレクトボックスの選択肢を表すインターフェースです。
 */
export interface SelectOption {
  /** 表示されるラベルテキストまたは要素 */
  label: React.ReactNode;
  /** 選択時に使用される値 */
  value: string;
  /** 選択肢を無効化するかどうか */
  disabled?: boolean;
}

/**
 * SelectInputコンポーネントのプロパティです。
 */
export interface SelectInputProps extends React.ComponentProps<typeof SelectPrimitive.Root> {
  /** Accessible name applied to the interactive trigger. */
  'aria-label'?: string;
  /** ID of the label for the interactive trigger. */
  'aria-labelledby'?: string;
  /** 選択肢の配列 */
  options: SelectOption[];
  /** 未選択時に表示されるプレースホルダーテキスト */
  placeholder?: string;
  /** 追加のCSSクラス名 */
  className?: string;
  /** テスト用のID */
  testId?: string;
  /** コンポーネントのサイズ */
  size?: 'default' | 'sm';
  /** 左側に表示するカスタムアイコン要素 */
  icon?: React.ReactNode;
}

/**
 * シンプルで使いやすいセレクトボックスラッパーコンポーネントです。
 *
 * 内部で `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` などの
 * 複雑な構造を隠蔽し、`options` を渡すだけで完結するように設計されています。
 * 単一の検索機能を持たないシンプルなドロップダウンが必要な場合に最適です。
 *
 * `React.forwardRef` に対応しているため、`react-hook-form` の `Controller` と直接組み合わせて使用できます。
 *
 * @example
 * ```tsx
 * <SelectInput
 *     value={sortBy}
 *     onValueChange={setSortBy}
 *     options={[
 *         { label: "日付順", value: "date" },
 *         { label: "名前順", value: "name" }
 *     ]}
 *     placeholder="並び替え..."
 * />
 * ```
 */
const SelectInput = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Root>,
  SelectInputProps
>(
  (
    {
      options,
      placeholder,
      className,
      testId,
      size = 'default',
      icon,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      value,
      defaultValue,
      onValueChange,
      disabled,
      name,
      required,
      open,
      defaultOpen,
      onOpenChange,
      ...props
    },
    ref,
  ) => {
    return (
      <Select
        value={value !== undefined ? value : defaultValue !== undefined ? undefined : null}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        disabled={disabled}
        name={name}
        required={required}
        open={open}
        defaultOpen={defaultOpen}
        onOpenChange={onOpenChange}
        {...props}
      >
        <SelectTrigger ref={ref} className={className} testId={testId} size={size} aria-label={ariaLabel} aria-labelledby={ariaLabelledBy}>
          {icon}
          <SelectValue placeholder={placeholder}>
            {value !== undefined && value !== null
              ? (options.find((opt) => String(opt.value) === String(value))?.label ??
                (typeof value === 'string' || typeof value === 'number' ? String(value) : null))
              : undefined}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  },
);

SelectInput.displayName = 'SelectInput';

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  SelectInput,
};
