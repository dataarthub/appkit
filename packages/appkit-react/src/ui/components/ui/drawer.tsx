'use client';

import * as React from 'react';
import { Drawer as DrawerPrimitive } from 'vaul-base';

import { cn } from '../../lib/utils';

/**
 * Coordinates open state and interaction context for the popup.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered Drawer composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose trigger, content, title and description inside Drawer; the underlying primitive owns open state and focus. Content supplies its own portal and overlay. Separate lower-level exports support custom compositions, without requiring an application-level popup provider.
 * @example
 * ```tsx
 * import { Drawer, DrawerTrigger, DrawerContent, DrawerTitle, DrawerDescription } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Drawer><DrawerTrigger>Open details</DrawerTrigger><DrawerContent><DrawerTitle>Details</DrawerTitle><DrawerDescription>Project information</DrawerDescription></DrawerContent></Drawer>);
 * }
 * ```
 */
function Drawer({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  return <DrawerPrimitive.Root data-slot='drawer' {...props} />;
}

/**
 * Renders the control that requests opening its popup.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered DrawerTrigger composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose trigger, content, title and description inside Drawer; the underlying primitive owns open state and focus. Content supplies its own portal and overlay. Separate lower-level exports support custom compositions, without requiring an application-level popup provider.
 * @example
 * ```tsx
 * import { Drawer, DrawerTrigger, DrawerContent, DrawerTitle, DrawerDescription } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Drawer><DrawerTrigger>Open details</DrawerTrigger><DrawerContent><DrawerTitle>Details</DrawerTitle><DrawerDescription>Project information</DrawerDescription></DrawerContent></Drawer>);
 * }
 * ```
 */
function DrawerTrigger({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot='drawer-trigger' {...props} />;
}

/**
 * Mounts popup descendants in a separate DOM container.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered DrawerPortal composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose trigger, content, title and description inside Drawer; the underlying primitive owns open state and focus. Content supplies its own portal and overlay. Separate lower-level exports support custom compositions, without requiring an application-level popup provider.
 * @example
 * ```tsx
 * import { Drawer, DrawerTrigger, DrawerContent, DrawerTitle, DrawerDescription } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Drawer><DrawerTrigger>Open details</DrawerTrigger><DrawerContent><DrawerTitle>Details</DrawerTitle><DrawerDescription>Project information</DrawerDescription></DrawerContent></Drawer>);
 * }
 * ```
 */
function DrawerPortal({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal data-slot='drawer-portal' {...props} />;
}

/**
 * Renders a control that requests closing its popup.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered DrawerClose composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose trigger, content, title and description inside Drawer; the underlying primitive owns open state and focus. Content supplies its own portal and overlay. Separate lower-level exports support custom compositions, without requiring an application-level popup provider.
 * @example
 * ```tsx
 * import { Drawer, DrawerTrigger, DrawerContent, DrawerTitle, DrawerDescription } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Drawer><DrawerTrigger>Open details</DrawerTrigger><DrawerContent><DrawerTitle>Details</DrawerTitle><DrawerDescription>Project information</DrawerDescription></DrawerContent></Drawer>);
 * }
 * ```
 */
function DrawerClose({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot='drawer-close' {...props} />;
}

/**
 * Renders the popup backdrop with open/closed animation classes.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered DrawerOverlay composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose trigger, content, title and description inside Drawer; the underlying primitive owns open state and focus. Content supplies its own portal and overlay. Separate lower-level exports support custom compositions, without requiring an application-level popup provider.
 * @example
 * ```tsx
 * import { Drawer, DrawerTrigger, DrawerContent, DrawerTitle, DrawerDescription } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Drawer><DrawerTrigger>Open details</DrawerTrigger><DrawerContent><DrawerTitle>Details</DrawerTitle><DrawerDescription>Project information</DrawerDescription></DrawerContent></Drawer>);
 * }
 * ```
 */
function DrawerOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return (
    <DrawerPrimitive.Overlay
      data-slot='drawer-overlay'
      className={cn(
        'data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 bg-black/10 supports-backdrop-filter:backdrop-blur-xs fixed inset-0 z-50',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Portals the popup and its positioning/backdrop composition.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered DrawerContent composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose trigger, content, title and description inside Drawer; the underlying primitive owns open state and focus. Content supplies its own portal and overlay. Separate lower-level exports support custom compositions, without requiring an application-level popup provider.
 * @example
 * ```tsx
 * import { Drawer, DrawerTrigger, DrawerContent, DrawerTitle, DrawerDescription } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Drawer><DrawerTrigger>Open details</DrawerTrigger><DrawerContent><DrawerTitle>Details</DrawerTitle><DrawerDescription>Project information</DrawerDescription></DrawerContent></Drawer>);
 * }
 * ```
 */
function DrawerContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content>) {
  return (
    <DrawerPortal data-slot='drawer-portal'>
      <DrawerOverlay />
      <DrawerPrimitive.Content
        data-slot='drawer-content'
        className={cn(
          'bg-background flex h-auto flex-col text-sm data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:max-h-[80vh] data-[vaul-drawer-direction=bottom]:rounded-t-xl data-[vaul-drawer-direction=bottom]:border-t data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=left]:rounded-r-xl data-[vaul-drawer-direction=left]:border-r data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=right]:rounded-l-xl data-[vaul-drawer-direction=right]:border-l data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[80vh] data-[vaul-drawer-direction=top]:rounded-b-xl data-[vaul-drawer-direction=top]:border-b data-[vaul-drawer-direction=left]:sm:max-w-sm data-[vaul-drawer-direction=right]:sm:max-w-sm group/drawer-content fixed z-50',
          className,
        )}
        {...props}
      >
        <div className='bg-muted mx-auto mt-4 hidden h-1 w-[100px] shrink-0 rounded-full group-data-[vaul-drawer-direction=bottom]/drawer-content:block bg-muted mx-auto hidden shrink-0 group-data-[vaul-drawer-direction=bottom]/drawer-content:block' />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
}

/**
 * Groups popup heading and explanatory content.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered DrawerHeader composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose trigger, content, title and description inside Drawer; the underlying primitive owns open state and focus. Content supplies its own portal and overlay. Separate lower-level exports support custom compositions, without requiring an application-level popup provider.
 * @example
 * ```tsx
 * import { Drawer, DrawerTrigger, DrawerContent, DrawerTitle, DrawerDescription } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Drawer><DrawerTrigger>Open details</DrawerTrigger><DrawerContent><DrawerTitle>Details</DrawerTitle><DrawerDescription>Project information</DrawerDescription></DrawerContent></Drawer>);
 * }
 * ```
 */
function DrawerHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='drawer-header'
      className={cn(
        'gap-0.5 p-4 group-data-[vaul-drawer-direction=bottom]/drawer-content:text-center group-data-[vaul-drawer-direction=top]/drawer-content:text-center md:gap-0.5 md:text-left flex flex-col',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Lays out popup actions below its content.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered DrawerFooter composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose trigger, content, title and description inside Drawer; the underlying primitive owns open state and focus. Content supplies its own portal and overlay. Separate lower-level exports support custom compositions, without requiring an application-level popup provider.
 * @example
 * ```tsx
 * import { Drawer, DrawerTrigger, DrawerContent, DrawerTitle, DrawerDescription } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Drawer><DrawerTrigger>Open details</DrawerTrigger><DrawerContent><DrawerTitle>Details</DrawerTitle><DrawerDescription>Project information</DrawerDescription></DrawerContent></Drawer>);
 * }
 * ```
 */
function DrawerFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='drawer-footer'
      className={cn('gap-2 p-4 mt-auto flex flex-col', className)}
      {...props}
    />
  );
}

/**
 * Provides the accessible title of the associated popup.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered DrawerTitle composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose trigger, content, title and description inside Drawer; the underlying primitive owns open state and focus. Content supplies its own portal and overlay. Separate lower-level exports support custom compositions, without requiring an application-level popup provider.
 * @example
 * ```tsx
 * import { Drawer, DrawerTrigger, DrawerContent, DrawerTitle, DrawerDescription } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Drawer><DrawerTrigger>Open details</DrawerTrigger><DrawerContent><DrawerTitle>Details</DrawerTitle><DrawerDescription>Project information</DrawerDescription></DrawerContent></Drawer>);
 * }
 * ```
 */
function DrawerTitle({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      data-slot='drawer-title'
      className={cn('text-foreground text-base font-medium', className)}
      {...props}
    />
  );
}

/**
 * Provides the accessible explanatory text of the associated popup.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered DrawerDescription composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose trigger, content, title and description inside Drawer; the underlying primitive owns open state and focus. Content supplies its own portal and overlay. Separate lower-level exports support custom compositions, without requiring an application-level popup provider.
 * @example
 * ```tsx
 * import { Drawer, DrawerTrigger, DrawerContent, DrawerTitle, DrawerDescription } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Drawer><DrawerTrigger>Open details</DrawerTrigger><DrawerContent><DrawerTitle>Details</DrawerTitle><DrawerDescription>Project information</DrawerDescription></DrawerContent></Drawer>);
 * }
 * ```
 */
function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      data-slot='drawer-description'
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};
