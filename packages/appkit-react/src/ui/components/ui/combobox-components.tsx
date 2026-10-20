'use client';

import * as React from 'react';
import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox';
import { ChevronDown, X, Check } from 'lucide-react';

import { cn } from '../../lib/utils';
// Tools Button export structure matches
import { Button } from '../../components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '../../components/ui/input-group';

// Re-export or alias Root
/**
 * Coordinates searchable selection using the Base UI Combobox root.
 * @typeParam Value - Selection value represented by an item and emitted by selection callbacks; inferred from the root props.
 * @typeParam Multiple - Whether selection uses an array; extends boolean | undefined and defaults to false.
 * @typeParam Item - Root collection item shape, defaulting to Value; may differ when explicit item-to-value conversion is configured.
 * @param props - Inherited primitive configuration, children and controlled/default state; the upstream prop type remains authoritative.
 * @returns The rendered Combobox composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. All interactive parts require Combobox context. Base UI owns generic value inference, selection and collection filtering; the wrapper does not fetch results. Input showTrigger defaults to true and showClear to false; Chip showRemove defaults to true. Content accepts an anchor for chip-based layouts; chips require the root multiple option.
 * @example
 * ```tsx
 * import { Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem, ComboboxEmpty } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Combobox items={["Apple", "Pear"]}><ComboboxInput aria-label="Fruit" /><ComboboxContent><ComboboxEmpty>No results</ComboboxEmpty><ComboboxList>{(item: string) => <ComboboxItem key={item} value={item}>{item}</ComboboxItem>}</ComboboxList></ComboboxContent></Combobox>);
 * }
 * ```
 */
const Combobox = ComboboxPrimitive.Root;

/**
 * Renders the current combobox selection using its root context.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ComboboxValue composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. All interactive parts require Combobox context. Base UI owns generic value inference, selection and collection filtering; the wrapper does not fetch results. Input showTrigger defaults to true and showClear to false; Chip showRemove defaults to true. Content accepts an anchor for chip-based layouts; chips require the root multiple option.
 * @example
 * ```tsx
 * import { Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem, ComboboxEmpty } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Combobox items={["Apple", "Pear"]}><ComboboxInput aria-label="Fruit" /><ComboboxContent><ComboboxEmpty>No results</ComboboxEmpty><ComboboxList>{(item: string) => <ComboboxItem key={item} value={item}>{item}</ComboboxItem>}</ComboboxList></ComboboxContent></Combobox>);
 * }
 * ```
 */
function ComboboxValue({ ...props }: ComboboxPrimitive.Value.Props) {
  return <ComboboxPrimitive.Value data-slot='combobox-value' {...props} />;
}

/**
 * Renders the control that toggles the combobox popup.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ComboboxTrigger composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. All interactive parts require Combobox context. Base UI owns generic value inference, selection and collection filtering; the wrapper does not fetch results. Input showTrigger defaults to true and showClear to false; Chip showRemove defaults to true. Content accepts an anchor for chip-based layouts; chips require the root multiple option.
 * @example
 * ```tsx
 * import { Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem, ComboboxEmpty } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Combobox items={["Apple", "Pear"]}><ComboboxInput aria-label="Fruit" /><ComboboxContent><ComboboxEmpty>No results</ComboboxEmpty><ComboboxList>{(item: string) => <ComboboxItem key={item} value={item}>{item}</ComboboxItem>}</ComboboxList></ComboboxContent></Combobox>);
 * }
 * ```
 */
function ComboboxTrigger({ className, children, ...props }: ComboboxPrimitive.Trigger.Props) {
  return (
    <ComboboxPrimitive.Trigger
      data-slot='combobox-trigger'
      aria-label='Show options'
      className={cn("[&_svg:not([class*='size-'])]:size-4", className)}
      {...props}
    >
      {children}
      <ChevronDown className='text-muted-foreground size-4 pointer-events-none' />
    </ComboboxPrimitive.Trigger>
  );
}

function ComboboxClear({ className, ...props }: ComboboxPrimitive.Clear.Props) {
  return (
    <ComboboxPrimitive.Clear
      data-slot='combobox-clear'
      aria-label='Clear selection'
      render={<InputGroupButton variant='ghost' size='icon-xs' />}
      className={cn(className)}
      {...props}
    >
      <X className='pointer-events-none' />
    </ComboboxPrimitive.Clear>
  );
}

/**
 * Combines a search input with optional trigger and clear controls.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling. Wrapper defaults: disabled=false, showTrigger=true, showClear=false.
 * @returns The rendered ComboboxInput composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. All interactive parts require Combobox context. Base UI owns generic value inference, selection and collection filtering; the wrapper does not fetch results. Input showTrigger defaults to true and showClear to false; Chip showRemove defaults to true. Content accepts an anchor for chip-based layouts; chips require the root multiple option. className targets the outer InputGroup; children are appended inside that group. disabled defaults to false.
 * @example
 * ```tsx
 * import { Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem, ComboboxEmpty } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Combobox items={["Apple", "Pear"]}><ComboboxInput aria-label="Fruit" /><ComboboxContent><ComboboxEmpty>No results</ComboboxEmpty><ComboboxList>{(item: string) => <ComboboxItem key={item} value={item}>{item}</ComboboxItem>}</ComboboxList></ComboboxContent></Combobox>);
 * }
 * ```
 */
function ComboboxInput({
  className,
  children,
  disabled = false,
  showTrigger = true,
  showClear = false,
  ...props
}: ComboboxPrimitive.Input.Props & {
  /**
   * Includes the popup toggle beside the combobox input; defaults to true.
   */
  showTrigger?: boolean;
  /**
   * Includes the clear-selection control beside the combobox input; defaults to false.
   */
  showClear?: boolean;
}) {
  return (
    <InputGroup className={cn('w-auto', className)}>
      <ComboboxPrimitive.Input render={<InputGroupInput disabled={disabled} />} {...props} />
      <InputGroupAddon align='inline-end'>
        {showTrigger && (
          <InputGroupButton
            size='icon-xs'
            variant='ghost'
            render={<ComboboxTrigger />}
            data-slot='input-group-button'
            className='group-has-data-[slot=combobox-clear]/input-group:hidden data-pressed:bg-transparent'
            disabled={disabled}
          />
        )}
        {showClear && <ComboboxClear disabled={disabled} />}
      </InputGroupAddon>
      {children}
    </InputGroup>
  );
}

/**
 * Portals and positions the combobox popup relative to its input or explicit anchor.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling. Wrapper defaults: side='bottom', sideOffset=6, align='start', alignOffset=0.
 * @returns The rendered ComboboxContent composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. All interactive parts require Combobox context. Base UI owns generic value inference, selection and collection filtering; the wrapper does not fetch results. Input showTrigger defaults to true and showClear to false; Chip showRemove defaults to true. Content accepts an anchor for chip-based layouts; chips require the root multiple option.
 * @example
 * ```tsx
 * import { Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem, ComboboxEmpty } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Combobox items={["Apple", "Pear"]}><ComboboxInput aria-label="Fruit" /><ComboboxContent><ComboboxEmpty>No results</ComboboxEmpty><ComboboxList>{(item: string) => <ComboboxItem key={item} value={item}>{item}</ComboboxItem>}</ComboboxList></ComboboxContent></Combobox>);
 * }
 * ```
 */
function ComboboxContent({
  className,
  side = 'bottom',
  sideOffset = 6,
  align = 'start',
  alignOffset = 0,
  anchor,
  ...props
}: ComboboxPrimitive.Popup.Props &
  Pick<
    ComboboxPrimitive.Positioner.Props,
    'side' | 'align' | 'sideOffset' | 'alignOffset' | 'anchor'
  >) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        className='isolate z-50'
      >
        <ComboboxPrimitive.Popup
          data-slot='combobox-content'
          data-chips={!!anchor}
          className={cn(
            'bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 *:data-[slot=input-group]:bg-input/30 *:data-[slot=input-group]:border-input/30 max-h-72 min-w-36 overflow-hidden rounded-lg shadow-md ring-1 duration-100 *:data-[slot=input-group]:m-1 *:data-[slot=input-group]:mb-0 *:data-[slot=input-group]:h-8 *:data-[slot=input-group]:shadow-none group/combobox-content relative max-h-(--available-height) w-(--anchor-width) max-w-(--available-width) min-w-[calc(var(--anchor-width)+--spacing(7))] origin-(--transform-origin) data-[chips=true]:min-w-(--anchor-width)',
            className,
          )}
          {...props}
        />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

/**
 * Renders the scrollable collection of combobox results.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ComboboxList composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. All interactive parts require Combobox context. Base UI owns generic value inference, selection and collection filtering; the wrapper does not fetch results. Input showTrigger defaults to true and showClear to false; Chip showRemove defaults to true. Content accepts an anchor for chip-based layouts; chips require the root multiple option.
 * @example
 * ```tsx
 * import { Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem, ComboboxEmpty } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Combobox items={["Apple", "Pear"]}><ComboboxInput aria-label="Fruit" /><ComboboxContent><ComboboxEmpty>No results</ComboboxEmpty><ComboboxList>{(item: string) => <ComboboxItem key={item} value={item}>{item}</ComboboxItem>}</ComboboxList></ComboboxContent></Combobox>);
 * }
 * ```
 */
function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
  return (
    <ComboboxPrimitive.List
      data-slot='combobox-list'
      className={cn(
        'no-scrollbar max-h-[min(calc(--spacing(72)---spacing(9)),calc(var(--available-height)---spacing(9)))] scroll-py-1 overflow-y-auto p-1 data-empty:p-0 overflow-y-auto overscroll-contain',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Renders one selectable result with a built-in selected indicator.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ComboboxItem composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. All interactive parts require Combobox context. Base UI owns generic value inference, selection and collection filtering; the wrapper does not fetch results. Input showTrigger defaults to true and showClear to false; Chip showRemove defaults to true. Content accepts an anchor for chip-based layouts; chips require the root multiple option.
 * @example
 * ```tsx
 * import { Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem, ComboboxEmpty } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Combobox items={["Apple", "Pear"]}><ComboboxInput aria-label="Fruit" /><ComboboxContent><ComboboxEmpty>No results</ComboboxEmpty><ComboboxList>{(item: string) => <ComboboxItem key={item} value={item}>{item}</ComboboxItem>}</ComboboxList></ComboboxContent></Combobox>);
 * }
 * ```
 */
function ComboboxItem({ className, children, ...props }: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      data-slot='combobox-item'
      className={cn(
        "data-highlighted:bg-accent data-highlighted:text-accent-foreground not-data-[variant=destructive]:data-highlighted:**:text-accent-foreground gap-2 rounded-md py-1 pr-8 pl-1.5 text-sm [&_svg:not([class*='size-'])]:size-4 relative flex w-full cursor-default items-center outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      {...props}
    >
      {children}
      <ComboboxPrimitive.ItemIndicator
        render={
          <span className='pointer-events-none absolute right-2 flex size-4 items-center justify-center' />
        }
      >
        <Check className='pointer-events-none' />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  );
}

/**
 * Groups related combobox results.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ComboboxGroup composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. All interactive parts require Combobox context. Base UI owns generic value inference, selection and collection filtering; the wrapper does not fetch results. Input showTrigger defaults to true and showClear to false; Chip showRemove defaults to true. Content accepts an anchor for chip-based layouts; chips require the root multiple option.
 * @example
 * ```tsx
 * import { Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem, ComboboxEmpty } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Combobox items={["Apple", "Pear"]}><ComboboxInput aria-label="Fruit" /><ComboboxContent><ComboboxEmpty>No results</ComboboxEmpty><ComboboxList>{(item: string) => <ComboboxItem key={item} value={item}>{item}</ComboboxItem>}</ComboboxList></ComboboxContent></Combobox>);
 * }
 * ```
 */
function ComboboxGroup({ className, ...props }: ComboboxPrimitive.Group.Props) {
  return (
    <ComboboxPrimitive.Group data-slot='combobox-group' className={cn(className)} {...props} />
  );
}

/**
 * Labels the surrounding combobox result group.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ComboboxLabel composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. All interactive parts require Combobox context. Base UI owns generic value inference, selection and collection filtering; the wrapper does not fetch results. Input showTrigger defaults to true and showClear to false; Chip showRemove defaults to true. Content accepts an anchor for chip-based layouts; chips require the root multiple option.
 * @example
 * ```tsx
 * import { Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem, ComboboxEmpty } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Combobox items={["Apple", "Pear"]}><ComboboxInput aria-label="Fruit" /><ComboboxContent><ComboboxEmpty>No results</ComboboxEmpty><ComboboxList>{(item: string) => <ComboboxItem key={item} value={item}>{item}</ComboboxItem>}</ComboboxList></ComboboxContent></Combobox>);
 * }
 * ```
 */
function ComboboxLabel({ className, ...props }: ComboboxPrimitive.GroupLabel.Props) {
  return (
    <ComboboxPrimitive.GroupLabel
      data-slot='combobox-label'
      className={cn('text-muted-foreground px-2 py-1.5 text-xs', className)}
      {...props}
    />
  );
}

/**
 * Renders results from the root collection using Base UI collection semantics.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ComboboxCollection composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. All interactive parts require Combobox context. Base UI owns generic value inference, selection and collection filtering; the wrapper does not fetch results. Input showTrigger defaults to true and showClear to false; Chip showRemove defaults to true. Content accepts an anchor for chip-based layouts; chips require the root multiple option.
 * @example
 * ```tsx
 * import { Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem, ComboboxEmpty } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Combobox items={["Apple", "Pear"]}><ComboboxInput aria-label="Fruit" /><ComboboxContent><ComboboxEmpty>No results</ComboboxEmpty><ComboboxList>{(item: string) => <ComboboxItem key={item} value={item}>{item}</ComboboxItem>}</ComboboxList></ComboboxContent></Combobox>);
 * }
 * ```
 */
function ComboboxCollection({ ...props }: ComboboxPrimitive.Collection.Props) {
  return <ComboboxPrimitive.Collection data-slot='combobox-collection' {...props} />;
}

/**
 * Displays an empty-results message in the combobox popup.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ComboboxEmpty composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. All interactive parts require Combobox context. Base UI owns generic value inference, selection and collection filtering; the wrapper does not fetch results. Input showTrigger defaults to true and showClear to false; Chip showRemove defaults to true. Content accepts an anchor for chip-based layouts; chips require the root multiple option.
 * @example
 * ```tsx
 * import { Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem, ComboboxEmpty } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Combobox items={["Apple", "Pear"]}><ComboboxInput aria-label="Fruit" /><ComboboxContent><ComboboxEmpty>No results</ComboboxEmpty><ComboboxList>{(item: string) => <ComboboxItem key={item} value={item}>{item}</ComboboxItem>}</ComboboxList></ComboboxContent></Combobox>);
 * }
 * ```
 */
function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
  return (
    <ComboboxPrimitive.Empty
      data-slot='combobox-empty'
      className={cn(
        'text-muted-foreground hidden w-full justify-center py-2 text-center text-sm group-data-empty/combobox-content:flex',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Draws a separator between result groups.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ComboboxSeparator composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. All interactive parts require Combobox context. Base UI owns generic value inference, selection and collection filtering; the wrapper does not fetch results. Input showTrigger defaults to true and showClear to false; Chip showRemove defaults to true. Content accepts an anchor for chip-based layouts; chips require the root multiple option.
 * @example
 * ```tsx
 * import { Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem, ComboboxEmpty } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Combobox items={["Apple", "Pear"]}><ComboboxInput aria-label="Fruit" /><ComboboxContent><ComboboxEmpty>No results</ComboboxEmpty><ComboboxList>{(item: string) => <ComboboxItem key={item} value={item}>{item}</ComboboxItem>}</ComboboxList></ComboboxContent></Combobox>);
 * }
 * ```
 */
function ComboboxSeparator({ className, ...props }: ComboboxPrimitive.Separator.Props) {
  return (
    <ComboboxPrimitive.Separator
      data-slot='combobox-separator'
      className={cn('bg-border -mx-1 my-1 h-px', className)}
      {...props}
    />
  );
}

/**
 * Lays out the selected chips for a multiple-selection combobox.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ComboboxChips composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. All interactive parts require Combobox context. Base UI owns generic value inference, selection and collection filtering; the wrapper does not fetch results. Input showTrigger defaults to true and showClear to false; Chip showRemove defaults to true. Content accepts an anchor for chip-based layouts; chips require the root multiple option.
 * @example
 * ```tsx
 * import { Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem, ComboboxEmpty } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Combobox items={["Apple", "Pear"]}><ComboboxInput aria-label="Fruit" /><ComboboxContent><ComboboxEmpty>No results</ComboboxEmpty><ComboboxList>{(item: string) => <ComboboxItem key={item} value={item}>{item}</ComboboxItem>}</ComboboxList></ComboboxContent></Combobox>);
 * }
 * ```
 */
function ComboboxChips({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof ComboboxPrimitive.Chips> & ComboboxPrimitive.Chips.Props) {
  return (
    <ComboboxPrimitive.Chips
      data-slot='combobox-chips'
      className={cn(
        'dark:bg-input/30 border-input focus-within:border-ring focus-within:ring-ring/50 has-aria-invalid:ring-destructive/20 dark:has-aria-invalid:ring-destructive/40 has-aria-invalid:border-destructive dark:has-aria-invalid:border-destructive/50 flex min-h-8 flex-wrap items-center gap-1 rounded-lg border bg-transparent bg-clip-padding px-2.5 py-1 text-sm transition-colors focus-within:ring-[3px] has-aria-invalid:ring-[3px] has-data-[slot=combobox-chip]:px-1',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Renders one selected value with an optional remove control.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling. Wrapper defaults: showRemove=true.
 * @returns The rendered ComboboxChip composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. All interactive parts require Combobox context. Base UI owns generic value inference, selection and collection filtering; the wrapper does not fetch results. Input showTrigger defaults to true and showClear to false; Chip showRemove defaults to true. Content accepts an anchor for chip-based layouts; chips require the root multiple option.
 * @example
 * ```tsx
 * import { Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem, ComboboxEmpty } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Combobox items={["Apple", "Pear"]}><ComboboxInput aria-label="Fruit" /><ComboboxContent><ComboboxEmpty>No results</ComboboxEmpty><ComboboxList>{(item: string) => <ComboboxItem key={item} value={item}>{item}</ComboboxItem>}</ComboboxList></ComboboxContent></Combobox>);
 * }
 * ```
 */
function ComboboxChip({
  className,
  children,
  showRemove = true,
  ...props
}: ComboboxPrimitive.Chip.Props & {
  /**
   * Includes a remove button in a selected chip; defaults to true.
   */
  showRemove?: boolean;
}) {
  return (
    <ComboboxPrimitive.Chip
      data-slot='combobox-chip'
      className={cn(
        'bg-muted text-foreground flex h-[calc(--spacing(5.25))] w-fit items-center justify-center gap-1 rounded-sm px-1.5 text-xs font-medium whitespace-nowrap has-data-[slot=combobox-chip-remove]:pr-0 has-disabled:pointer-events-none has-disabled:cursor-not-allowed has-disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
      {showRemove && (
        <ComboboxPrimitive.ChipRemove
          render={<Button variant='ghost' size='icon-xs' />}
          className='-ml-1 opacity-50 hover:opacity-100'
          data-slot='combobox-chip-remove'
        >
          <X className='pointer-events-none' />
        </ComboboxPrimitive.ChipRemove>
      )}
    </ComboboxPrimitive.Chip>
  );
}

/**
 * Renders the search input within a multiple-selection chip container.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ComboboxChipsInput composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. All interactive parts require Combobox context. Base UI owns generic value inference, selection and collection filtering; the wrapper does not fetch results. Input showTrigger defaults to true and showClear to false; Chip showRemove defaults to true. Content accepts an anchor for chip-based layouts; chips require the root multiple option.
 * @example
 * ```tsx
 * import { Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem, ComboboxEmpty } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Combobox items={["Apple", "Pear"]}><ComboboxInput aria-label="Fruit" /><ComboboxContent><ComboboxEmpty>No results</ComboboxEmpty><ComboboxList>{(item: string) => <ComboboxItem key={item} value={item}>{item}</ComboboxItem>}</ComboboxList></ComboboxContent></Combobox>);
 * }
 * ```
 */
function ComboboxChipsInput({ className, ...props }: ComboboxPrimitive.Input.Props) {
  return (
    <ComboboxPrimitive.Input
      data-slot='combobox-chip-input'
      className={cn('min-w-16 flex-1 outline-none', className)}
      {...props}
    />
  );
}

export {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxSeparator,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxTrigger,
  ComboboxValue,
};
