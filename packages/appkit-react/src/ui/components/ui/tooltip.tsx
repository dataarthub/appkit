'use client';

import * as React from 'react';
import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';

import { cn } from '../../lib/utils';

/**
 * Provides shared Base UI tooltip timing configuration with a zero-millisecond default delay.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling. Wrapper defaults: delay=0.
 * @returns The rendered TooltipProvider composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Trigger and Content require Tooltip context. Tooltip inserts its own Provider with delay=0, so wrapping it in a separate TooltipProvider does not pass a different delay through that inner provider. Content supplies portal/positioner. Timing offsets are milliseconds; positional offsets are CSS pixels.
 * @example
 * ```tsx
 * import { Tooltip, TooltipTrigger, TooltipContent } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Tooltip><TooltipTrigger>Help</TooltipTrigger><TooltipContent>Learn about this field</TooltipContent></Tooltip>);
 * }
 * ```
 */
function TooltipProvider({ delay = 0, ...props }: TooltipPrimitive.Provider.Props) {
  return <TooltipPrimitive.Provider data-slot='tooltip-provider' delay={delay} {...props} />;
}

/**
 * Creates a tooltip root inside its own zero-delay TooltipProvider.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered Tooltip composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Trigger and Content require Tooltip context. Tooltip inserts its own Provider with delay=0, so wrapping it in a separate TooltipProvider does not pass a different delay through that inner provider. Content supplies portal/positioner. Timing offsets are milliseconds; positional offsets are CSS pixels.
 * @example
 * ```tsx
 * import { Tooltip, TooltipTrigger, TooltipContent } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Tooltip><TooltipTrigger>Help</TooltipTrigger><TooltipContent>Learn about this field</TooltipContent></Tooltip>);
 * }
 * ```
 */
function Tooltip({ ...props }: TooltipPrimitive.Root.Props) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot='tooltip' {...props} />
    </TooltipProvider>
  );
}

/**
 * Renders the target that opens its surrounding tooltip on the upstream interactions.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered TooltipTrigger composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Trigger and Content require Tooltip context. Tooltip inserts its own Provider with delay=0, so wrapping it in a separate TooltipProvider does not pass a different delay through that inner provider. Content supplies portal/positioner. Timing offsets are milliseconds; positional offsets are CSS pixels.
 * @example
 * ```tsx
 * import { Tooltip, TooltipTrigger, TooltipContent } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Tooltip><TooltipTrigger>Help</TooltipTrigger><TooltipContent>Learn about this field</TooltipContent></Tooltip>);
 * }
 * ```
 */
function TooltipTrigger({
  children,
  ...props
}: TooltipPrimitive.Trigger.Props) {
  return (
    <TooltipPrimitive.Trigger
      data-slot='tooltip-trigger'
      {...props}
    >
      {children}
    </TooltipPrimitive.Trigger>
  );
}

/**
 * Portals and positions supplemental tooltip content relative to its trigger.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling. Wrapper defaults: side='top', sideOffset=4, align='center', alignOffset=0.
 * @returns The rendered TooltipContent composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Trigger and Content require Tooltip context. Tooltip inserts its own Provider with delay=0, so wrapping it in a separate TooltipProvider does not pass a different delay through that inner provider. Content supplies portal/positioner. Timing offsets are milliseconds; positional offsets are CSS pixels. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Tooltip, TooltipTrigger, TooltipContent } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Tooltip><TooltipTrigger>Help</TooltipTrigger><TooltipContent>Learn about this field</TooltipContent></Tooltip>);
 * }
 * ```
 */
function TooltipContent({
  ref,
  className,
  side = 'top',
  sideOffset = 4,
  align = 'center',
  alignOffset = 0,
  children,
  ...props
}: React.PropsWithoutRef<
  TooltipPrimitive.Popup.Props &
    Pick<TooltipPrimitive.Positioner.Props, 'align' | 'alignOffset' | 'side' | 'sideOffset'>
> &
  React.RefAttributes<HTMLDivElement>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className='isolate z-50'
      >
        <TooltipPrimitive.Popup
          ref={ref}
          data-slot='tooltip-content'
          className={cn(
            'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 rounded-md px-3 py-1.5 text-xs bg-foreground text-background z-50 w-fit max-w-xs origin-(--transform-origin)',
            className,
          )}
          {...props}
        >
          {children}
          <TooltipPrimitive.Arrow className='size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] bg-foreground fill-foreground z-50 data-[side=bottom]:top-1 data-[side=left]:top-1/2! data-[side=left]:-right-1 data-[side=left]:-translate-y-1/2 data-[side=right]:top-1/2! data-[side=right]:-left-1 data-[side=right]:-translate-y-1/2 data-[side=top]:-bottom-2.5' />
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}
TooltipContent.displayName = 'TooltipContent';

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
