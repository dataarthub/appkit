'use client';

import * as React from 'react';
import { Select as SelectPrimitive } from '@base-ui/react/select';
import { ChevronDownIcon, CheckIcon, ChevronUpIcon } from 'lucide-react';

import { cn } from '../../lib/utils';

/**
 * Coordinates a Base UI single or multiple selection popup.
 * @typeParam Value - Option value shape inferred from root props and selection callbacks.
 * @typeParam Multiple - Whether selection uses an array; extends boolean | undefined and defaults to false.
 * @param props - Inherited primitive configuration, children and controlled/default state; the upstream prop type remains authoritative.
 * @returns The rendered Select composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compound parts require Select context; GroupLabel belongs in a Group. Content supplies portal, positioner, List and scroll arrows. SelectInput className/testId/size and accessible labels target the trigger; remaining root props target Select. size defaults to default. If both value and defaultValue are absent, SelectInput passes controlled null; use defaultValue for upstream uncontrolled state. Controlled values are matched to option labels by String(value), with string/number fallback.
 * @example
 * ```tsx
 * import { SelectInput } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<SelectInput aria-label="Sort order" defaultValue="date" options={[{ value: "date", label: "Date" }, { value: "name", label: "Name" }]} placeholder="Choose order" />);
 * }
 * ```
 */
const Select = SelectPrimitive.Root;

/**
 * Groups related select options.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered SelectGroup composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compound parts require Select context; GroupLabel belongs in a Group. Content supplies portal, positioner, List and scroll arrows. SelectInput className/testId/size and accessible labels target the trigger; remaining root props target Select. size defaults to default. If both value and defaultValue are absent, SelectInput passes controlled null; use defaultValue for upstream uncontrolled state. Controlled values are matched to option labels by String(value), with string/number fallback.
 * @example
 * ```tsx
 * import { SelectInput } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<SelectInput aria-label="Sort order" defaultValue="date" options={[{ value: "date", label: "Date" }, { value: "name", label: "Name" }]} placeholder="Choose order" />);
 * }
 * ```
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
 * Displays the current selection or an upstream placeholder inside a trigger.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered SelectValue composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compound parts require Select context; GroupLabel belongs in a Group. Content supplies portal, positioner, List and scroll arrows. SelectInput className/testId/size and accessible labels target the trigger; remaining root props target Select. size defaults to default. If both value and defaultValue are absent, SelectInput passes controlled null; use defaultValue for upstream uncontrolled state. Controlled values are matched to option labels by String(value), with string/number fallback.
 * @example
 * ```tsx
 * import { SelectInput } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<SelectInput aria-label="Sort order" defaultValue="date" options={[{ value: "date", label: "Date" }, { value: "name", label: "Name" }]} placeholder="Choose order" />);
 * }
 * ```
 */
function SelectValue({
  className,
  children,
  ...props
}: SelectPrimitive.Value.Props & { /**
 * Text displayed while no value is selected/entered; omitted means no placeholder.
 */
/**
 * Text displayed while no value is selected/entered; omitted means no placeholder.
 */
placeholder?: string }) {
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

/**
 * Base UI trigger props with Appkit sizing and test selector.
 * @remarks Inherited native or primitive props keep their upstream types and behavior; this declaration documents only the wrapper-owned options.
 * @see SelectTrigger
 */
interface SelectTriggerProps extends SelectPrimitive.Trigger.Props {
  /**
   * Visual size preset; defaults to default unless the owning component states otherwise.
   */
  size?: 'sm' | 'default';
  /**
   * Stable data-testid assigned to the rendered control/container; omitted means no selector.
   */
  testId?: string;
}

/**
 * Renders the select opener with a trailing chevron and optional test ID.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling. Wrapper defaults: size='default'.
 * @returns The rendered SelectTrigger composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compound parts require Select context; GroupLabel belongs in a Group. Content supplies portal, positioner, List and scroll arrows. SelectInput className/testId/size and accessible labels target the trigger; remaining root props target Select. size defaults to default. If both value and defaultValue are absent, SelectInput passes controlled null; use defaultValue for upstream uncontrolled state. Controlled values are matched to option labels by String(value), with string/number fallback. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { SelectInput } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<SelectInput aria-label="Sort order" defaultValue="date" options={[{ value: "date", label: "Date" }, { value: "name", label: "Name" }]} placeholder="Choose order" />);
 * }
 * ```
 */
function SelectTrigger({
  ref,
  className,
  size = 'default',
  children,
  testId,
  ...props
}: React.PropsWithoutRef<SelectTriggerProps> &
  React.RefAttributes<React.ElementRef<typeof SelectPrimitive.Trigger>>) {
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
}
SelectTrigger.displayName = 'SelectTrigger';

/**
 * Portals the positioned option popup with a list and scroll controls.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling. Wrapper defaults: side='bottom', sideOffset=4, align='center', alignOffset=0, alignItemWithTrigger=true.
 * @returns The rendered SelectContent composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compound parts require Select context; GroupLabel belongs in a Group. Content supplies portal, positioner, List and scroll arrows. SelectInput className/testId/size and accessible labels target the trigger; remaining root props target Select. size defaults to default. If both value and defaultValue are absent, SelectInput passes controlled null; use defaultValue for upstream uncontrolled state. Controlled values are matched to option labels by String(value), with string/number fallback.
 * @example
 * ```tsx
 * import { SelectInput } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<SelectInput aria-label="Sort order" defaultValue="date" options={[{ value: "date", label: "Date" }, { value: "name", label: "Name" }]} placeholder="Choose order" />);
 * }
 * ```
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
 * Provides the label for a select option group.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered SelectLabel composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compound parts require Select context; GroupLabel belongs in a Group. Content supplies portal, positioner, List and scroll arrows. SelectInput className/testId/size and accessible labels target the trigger; remaining root props target Select. size defaults to default. If both value and defaultValue are absent, SelectInput passes controlled null; use defaultValue for upstream uncontrolled state. Controlled values are matched to option labels by String(value), with string/number fallback.
 * @example
 * ```tsx
 * import { SelectInput } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<SelectInput aria-label="Sort order" defaultValue="date" options={[{ value: "date", label: "Date" }, { value: "name", label: "Name" }]} placeholder="Choose order" />);
 * }
 * ```
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

/**
 * Base UI option props with a stable selector for the option element.
 * @remarks Inherited native or primitive props keep their upstream types and behavior; this declaration documents only the wrapper-owned options.
 * @see SelectItem
 */
interface SelectItemProps extends SelectPrimitive.Item.Props {
  /**
   * Stable data-testid assigned to the rendered control/container; omitted means no selector.
   */
  testId?: string;
}

/**
 * Renders an option with selected-state checkmark and optional test ID.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered SelectItem composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compound parts require Select context; GroupLabel belongs in a Group. Content supplies portal, positioner, List and scroll arrows. SelectInput className/testId/size and accessible labels target the trigger; remaining root props target Select. size defaults to default. If both value and defaultValue are absent, SelectInput passes controlled null; use defaultValue for upstream uncontrolled state. Controlled values are matched to option labels by String(value), with string/number fallback.
 * @example
 * ```tsx
 * import { SelectInput } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<SelectInput aria-label="Sort order" defaultValue="date" options={[{ value: "date", label: "Date" }, { value: "name", label: "Name" }]} placeholder="Choose order" />);
 * }
 * ```
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
 * Draws a noninteractive divider between option groups.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered SelectSeparator composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compound parts require Select context; GroupLabel belongs in a Group. Content supplies portal, positioner, List and scroll arrows. SelectInput className/testId/size and accessible labels target the trigger; remaining root props target Select. size defaults to default. If both value and defaultValue are absent, SelectInput passes controlled null; use defaultValue for upstream uncontrolled state. Controlled values are matched to option labels by String(value), with string/number fallback.
 * @example
 * ```tsx
 * import { SelectInput } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<SelectInput aria-label="Sort order" defaultValue="date" options={[{ value: "date", label: "Date" }, { value: "name", label: "Name" }]} placeholder="Choose order" />);
 * }
 * ```
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
 * Renders the upstream upward-scroll control with an up chevron.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered SelectScrollUpButton composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compound parts require Select context; GroupLabel belongs in a Group. Content supplies portal, positioner, List and scroll arrows. SelectInput className/testId/size and accessible labels target the trigger; remaining root props target Select. size defaults to default. If both value and defaultValue are absent, SelectInput passes controlled null; use defaultValue for upstream uncontrolled state. Controlled values are matched to option labels by String(value), with string/number fallback.  children are replaced by the fixed scroll chevron.
 * @example
 * ```tsx
 * import { SelectInput } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<SelectInput aria-label="Sort order" defaultValue="date" options={[{ value: "date", label: "Date" }, { value: "name", label: "Name" }]} placeholder="Choose order" />);
 * }
 * ```
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
 * Renders the upstream downward-scroll control with a down chevron.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered SelectScrollDownButton composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compound parts require Select context; GroupLabel belongs in a Group. Content supplies portal, positioner, List and scroll arrows. SelectInput className/testId/size and accessible labels target the trigger; remaining root props target Select. size defaults to default. If both value and defaultValue are absent, SelectInput passes controlled null; use defaultValue for upstream uncontrolled state. Controlled values are matched to option labels by String(value), with string/number fallback.  children are replaced by the fixed scroll chevron.
 * @example
 * ```tsx
 * import { SelectInput } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<SelectInput aria-label="Sort order" defaultValue="date" options={[{ value: "date", label: "Date" }, { value: "name", label: "Name" }]} placeholder="Choose order" />);
 * }
 * ```
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
 * Display content, string value and disabled state for a SelectInput option.
 * @remarks Inherited native or primitive props keep their upstream types and behavior; this declaration documents only the wrapper-owned options.
 * @see SelectInput
 */
export interface SelectOption {
  /**
   * Visible React content for this option.
   */
  label: React.ReactNode;
  /**
   * Unique string identity passed to selection callbacks.
   */
  value: string;
  /**
   * Prevents option selection when true; omitted means enabled.
   */
  disabled?: boolean;
}

/**
 * Base UI root props with option data and trigger presentation/accessibility settings.
 * @remarks Inherited native or primitive props keep their upstream types and behavior; this declaration documents only the wrapper-owned options.
 * @see SelectInput
 */
export interface SelectInputProps extends React.ComponentProps<typeof SelectPrimitive.Root> {
  /**
   * Accessible name applied to the interactive trigger.
   */
  'aria-label'?: string;
  /**
   * Space-separated element IDs that label the interactive trigger.
   */
  'aria-labelledby'?: string;
  /**
   * Options in popup order; labels are also resolved for controlled values.
   */
  options: SelectOption[];
  /**
   * Text displayed while no value is selected/entered; omitted means no placeholder.
   */
  placeholder?: string;
  /**
   * Additional classes on the interactive SelectTrigger.
   */
  className?: string;
  /**
   * data-testid on the SelectTrigger; no per-option IDs are synthesized.
   */
  testId?: string;
  /**
   * Trigger size; defaults to default.
   */
  size?: 'default' | 'sm';
  /**
   * Optional content before SelectValue inside the trigger.
   */
  icon?: React.ReactNode;
}

/**
 * Builds a complete select from an options array and forwards its ref to the trigger.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling. Wrapper defaults: size='default'.
 * @returns The rendered SelectInput composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compound parts require Select context; GroupLabel belongs in a Group. Content supplies portal, positioner, List and scroll arrows. SelectInput className/testId/size and accessible labels target the trigger; remaining root props target Select. size defaults to default. If both value and defaultValue are absent, SelectInput passes controlled null; use defaultValue for upstream uncontrolled state. Controlled values are matched to option labels by String(value), with string/number fallback. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { SelectInput } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<SelectInput aria-label="Sort order" defaultValue="date" options={[{ value: "date", label: "Date" }, { value: "name", label: "Name" }]} placeholder="Choose order" />);
 * }
 * ```
 */
function SelectInput({
  ref,
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
}: React.PropsWithoutRef<SelectInputProps> &
  React.RefAttributes<React.ElementRef<typeof SelectPrimitive.Root>>) {
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
      <SelectTrigger
        ref={ref}
        className={className}
        testId={testId}
        size={size}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
      >
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
}

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
