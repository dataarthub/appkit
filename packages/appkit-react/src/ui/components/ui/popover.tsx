'use client';

import * as React from 'react';
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';

import { cn } from '../../lib/utils';

/**
 * Coordinates open state and interaction context for the popup.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered Popover composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose trigger, content, title and description inside Popover; the underlying primitive owns open state and focus. Content supplies its own portal and positioner. Separate lower-level exports support custom compositions, without requiring an application-level popup provider.
 * @example
 * ```tsx
 * import { Popover, PopoverTrigger, PopoverContent, PopoverTitle, PopoverDescription } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Popover><PopoverTrigger>Open details</PopoverTrigger><PopoverContent><PopoverTitle>Details</PopoverTitle><PopoverDescription>Project information</PopoverDescription></PopoverContent></Popover>);
 * }
 * ```
 */
function Popover({ ...props }: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot='popover' {...props} />;
}

/**
 * Renders the control that requests opening its popup.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered PopoverTrigger composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose trigger, content, title and description inside Popover; the underlying primitive owns open state and focus. Content supplies its own portal and positioner. Separate lower-level exports support custom compositions, without requiring an application-level popup provider.
 * @example
 * ```tsx
 * import { Popover, PopoverTrigger, PopoverContent, PopoverTitle, PopoverDescription } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Popover><PopoverTrigger>Open details</PopoverTrigger><PopoverContent><PopoverTitle>Details</PopoverTitle><PopoverDescription>Project information</PopoverDescription></PopoverContent></Popover>);
 * }
 * ```
 */
function PopoverTrigger({
  children,
  ...props
}: PopoverPrimitive.Trigger.Props) {
  return (
    <PopoverPrimitive.Trigger
      data-slot='popover-trigger'
      {...props}
    >
      {children}
    </PopoverPrimitive.Trigger>
  );
}

/**
 * Portals the popup and its positioning/backdrop composition.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling. Wrapper defaults: align='center', alignOffset=0, side='bottom', sideOffset=4.
 * @returns The rendered PopoverContent composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose trigger, content, title and description inside Popover; the underlying primitive owns open state and focus. Content supplies its own portal and positioner. Separate lower-level exports support custom compositions, without requiring an application-level popup provider. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Popover, PopoverTrigger, PopoverContent, PopoverTitle, PopoverDescription } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Popover><PopoverTrigger>Open details</PopoverTrigger><PopoverContent><PopoverTitle>Details</PopoverTitle><PopoverDescription>Project information</PopoverDescription></PopoverContent></Popover>);
 * }
 * ```
 */
function PopoverContent({
  ref,
  className,
  align = 'center',
  alignOffset = 0,
  side = 'bottom',
  sideOffset = 4,
  ...props
}: React.PropsWithoutRef<
  PopoverPrimitive.Popup.Props &
    Pick<PopoverPrimitive.Positioner.Props, 'align' | 'alignOffset' | 'side' | 'sideOffset'>
> &
  React.RefAttributes<HTMLDivElement>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className='isolate z-50'
      >
        <PopoverPrimitive.Popup
          ref={ref}
          data-slot='popover-content'
          className={cn(
            'bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 flex flex-col gap-2.5 rounded-lg p-2.5 text-sm shadow-md ring-1 duration-100 z-50 w-72 origin-(--transform-origin) outline-hidden',
            className,
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}
PopoverContent.displayName = PopoverPrimitive.Popup.displayName;

/**
 * Groups popup heading and explanatory content.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered PopoverHeader composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose trigger, content, title and description inside Popover; the underlying primitive owns open state and focus. Content supplies its own portal and positioner. Separate lower-level exports support custom compositions, without requiring an application-level popup provider. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Popover, PopoverTrigger, PopoverContent, PopoverTitle, PopoverDescription } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Popover><PopoverTrigger>Open details</PopoverTrigger><PopoverContent><PopoverTitle>Details</PopoverTitle><PopoverDescription>Project information</PopoverDescription></PopoverContent></Popover>);
 * }
 * ```
 */
function PopoverHeader({
  ref,
  className,
  ...props
}: React.PropsWithoutRef<React.ComponentPropsWithoutRef<'div'>> &
  React.RefAttributes<HTMLDivElement>) {
  return (
    <div
      ref={ref}
      data-slot='popover-header'
      className={cn('flex flex-col gap-0.5 text-sm', className)}
      {...props}
    />
  );
}
PopoverHeader.displayName = 'PopoverHeader';

/**
 * Provides the accessible title of the associated popup.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered PopoverTitle composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose trigger, content, title and description inside Popover; the underlying primitive owns open state and focus. Content supplies its own portal and positioner. Separate lower-level exports support custom compositions, without requiring an application-level popup provider. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Popover, PopoverTrigger, PopoverContent, PopoverTitle, PopoverDescription } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Popover><PopoverTrigger>Open details</PopoverTrigger><PopoverContent><PopoverTitle>Details</PopoverTitle><PopoverDescription>Project information</PopoverDescription></PopoverContent></Popover>);
 * }
 * ```
 */
function PopoverTitle({
  ref,
  className,
  ...props
}: React.PropsWithoutRef<React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Title>> &
  React.RefAttributes<React.ComponentRef<typeof PopoverPrimitive.Title>>) {
  return (
    <PopoverPrimitive.Title
      ref={ref}
      data-slot='popover-title'
      className={cn('font-medium', className)}
      {...props}
    />
  );
}
PopoverTitle.displayName = PopoverPrimitive.Title.displayName;

/**
 * Provides the accessible explanatory text of the associated popup.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered PopoverDescription composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose trigger, content, title and description inside Popover; the underlying primitive owns open state and focus. Content supplies its own portal and positioner. Separate lower-level exports support custom compositions, without requiring an application-level popup provider. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Popover, PopoverTrigger, PopoverContent, PopoverTitle, PopoverDescription } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Popover><PopoverTrigger>Open details</PopoverTrigger><PopoverContent><PopoverTitle>Details</PopoverTitle><PopoverDescription>Project information</PopoverDescription></PopoverContent></Popover>);
 * }
 * ```
 */
function PopoverDescription({
  ref,
  className,
  ...props
}: React.PropsWithoutRef<React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Description>> &
  React.RefAttributes<React.ComponentRef<typeof PopoverPrimitive.Description>>) {
  return (
    <PopoverPrimitive.Description
      ref={ref}
      data-slot='popover-description'
      className={cn('text-muted-foreground', className)}
      {...props}
    />
  );
}
PopoverDescription.displayName = PopoverPrimitive.Description.displayName;

export { Popover, PopoverContent, PopoverTrigger, PopoverHeader, PopoverTitle, PopoverDescription };
