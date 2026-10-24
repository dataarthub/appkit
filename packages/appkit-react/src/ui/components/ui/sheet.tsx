'use client';

import * as React from 'react';
import { Dialog as SheetPrimitive } from '@base-ui/react/dialog';
import { XIcon } from 'lucide-react';

import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';

/**
 * Coordinates open state and interaction context for the popup.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered Sheet composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose trigger, content, title and description inside Sheet; the underlying primitive owns open state and focus. Content supplies its own portal and backdrop. Separate lower-level exports support custom compositions, without requiring an application-level popup provider.
 * @example
 * ```tsx
 * import { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetDescription } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Sheet><SheetTrigger>Open details</SheetTrigger><SheetContent><SheetTitle>Details</SheetTitle><SheetDescription>Project information</SheetDescription></SheetContent></Sheet>);
 * }
 * ```
 */
function Sheet({ ...props }: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot='sheet' {...props} />;
}

/**
 * Renders the control that requests opening its popup.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered SheetTrigger composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose trigger, content, title and description inside Sheet; the underlying primitive owns open state and focus. Content supplies its own portal and backdrop. Separate lower-level exports support custom compositions, without requiring an application-level popup provider.
 * @example
 * ```tsx
 * import { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetDescription } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Sheet><SheetTrigger>Open details</SheetTrigger><SheetContent><SheetTitle>Details</SheetTitle><SheetDescription>Project information</SheetDescription></SheetContent></Sheet>);
 * }
 * ```
 */
function SheetTrigger({
  children,
  ...props
}: SheetPrimitive.Trigger.Props) {
  return (
    <SheetPrimitive.Trigger
      data-slot='sheet-trigger'
      {...props}
    >
      {children}
    </SheetPrimitive.Trigger>
  );
}

/**
 * Renders a control that requests closing its popup.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered SheetClose composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose trigger, content, title and description inside Sheet; the underlying primitive owns open state and focus. Content supplies its own portal and backdrop. Separate lower-level exports support custom compositions, without requiring an application-level popup provider.
 * @example
 * ```tsx
 * import { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetDescription } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Sheet><SheetTrigger>Open details</SheetTrigger><SheetContent><SheetTitle>Details</SheetTitle><SheetDescription>Project information</SheetDescription></SheetContent></Sheet>);
 * }
 * ```
 */
function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot='sheet-close' {...props} />;
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot='sheet-portal' {...props} />;
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot='sheet-overlay'
      className={cn(
        'data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 bg-black/10 duration-100 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs fixed inset-0 z-50',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Base UI popup props with drawer edge, close-control and test-selector settings.
 * @remarks Inherited native or primitive props keep their upstream types and behavior; this declaration documents only the wrapper-owned options.
 * @see SheetContent
 */
interface SheetContentProps extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Popup> {
  /**
   * Edge from which the sheet enters; defaults to right.
   */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /**
   * Shows the built-in close button; defaults to true.
   */
  showCloseButton?: boolean;
  /**
   * data-testid on the sheet popup only; the built-in close control does not receive a derived test ID.
   */
  testId?: string;
}

/**
 * Portals the popup and its positioning/backdrop composition.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling. Wrapper defaults: side='right', showCloseButton=true.
 * @returns The rendered SheetContent composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose trigger, content, title and description inside Sheet; the underlying primitive owns open state and focus. Content supplies its own portal and backdrop. Separate lower-level exports support custom compositions, without requiring an application-level popup provider. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetDescription } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Sheet><SheetTrigger>Open details</SheetTrigger><SheetContent><SheetTitle>Details</SheetTitle><SheetDescription>Project information</SheetDescription></SheetContent></Sheet>);
 * }
 * ```
 */
function SheetContent({
  ref,
  className,
  children,
  side = 'right',
  showCloseButton = true,
  testId,
  ...props
}: React.PropsWithoutRef<SheetContentProps> & React.RefAttributes<HTMLDivElement>) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        ref={ref}
        data-slot='sheet-content'
        data-testid={testId}
        data-side={side}
        className={cn(
          'bg-background fixed z-50 flex flex-col gap-4 bg-clip-padding text-sm shadow-lg',
          // Explicit animation classes from properties
          side === 'right' &&
            'inset-y-0 right-0 h-full w-3/4 border-l data-open:animate-in data-closed:animate-out data-open:slide-in-from-right data-closed:slide-out-to-right data-open:ease-out data-closed:ease-in duration-300 sm:max-w-sm',
          side === 'left' &&
            'inset-y-0 left-0 h-full w-3/4 border-r data-open:animate-in data-closed:animate-out data-open:slide-in-from-left data-closed:slide-out-to-left data-open:ease-out data-closed:ease-in duration-300 sm:max-w-sm',
          side === 'top' &&
            'inset-x-0 top-0 h-auto border-b data-open:animate-in data-closed:animate-out data-open:slide-in-from-top data-closed:slide-out-to-top data-open:ease-out data-closed:ease-in duration-300',
          side === 'bottom' &&
            'inset-x-0 bottom-0 h-auto border-t data-open:animate-in data-closed:animate-out data-open:slide-in-from-bottom data-closed:slide-out-to-bottom data-open:ease-out data-closed:ease-in duration-300',
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot='sheet-close'
            render={<Button variant='ghost' className='absolute top-3 right-3' size='icon-sm' />}
          >
            <XIcon />
            <span className='sr-only'>Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPortal>
  );
}
SheetContent.displayName = SheetPrimitive.Popup.displayName;

/**
 * Groups popup heading and explanatory content.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered SheetHeader composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose trigger, content, title and description inside Sheet; the underlying primitive owns open state and focus. Content supplies its own portal and backdrop. Separate lower-level exports support custom compositions, without requiring an application-level popup provider. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetDescription } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Sheet><SheetTrigger>Open details</SheetTrigger><SheetContent><SheetTitle>Details</SheetTitle><SheetDescription>Project information</SheetDescription></SheetContent></Sheet>);
 * }
 * ```
 */
function SheetHeader({
  ref,
  className,
  ...props
}: React.PropsWithoutRef<React.ComponentPropsWithoutRef<'div'>> &
  React.RefAttributes<HTMLDivElement>) {
  return (
    <div
      ref={ref}
      data-slot='sheet-header'
      className={cn('gap-0.5 p-4 flex flex-col', className)}
      {...props}
    />
  );
}
SheetHeader.displayName = 'SheetHeader';

/**
 * Lays out popup actions below its content.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered SheetFooter composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose trigger, content, title and description inside Sheet; the underlying primitive owns open state and focus. Content supplies its own portal and backdrop. Separate lower-level exports support custom compositions, without requiring an application-level popup provider. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetDescription } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Sheet><SheetTrigger>Open details</SheetTrigger><SheetContent><SheetTitle>Details</SheetTitle><SheetDescription>Project information</SheetDescription></SheetContent></Sheet>);
 * }
 * ```
 */
function SheetFooter({
  ref,
  className,
  ...props
}: React.PropsWithoutRef<React.ComponentPropsWithoutRef<'div'>> &
  React.RefAttributes<HTMLDivElement>) {
  return (
    <div
      ref={ref}
      data-slot='sheet-footer'
      className={cn('gap-2 p-4 mt-auto flex flex-col', className)}
      {...props}
    />
  );
}
SheetFooter.displayName = 'SheetFooter';

/**
 * Provides the accessible title of the associated popup.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered SheetTitle composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose trigger, content, title and description inside Sheet; the underlying primitive owns open state and focus. Content supplies its own portal and backdrop. Separate lower-level exports support custom compositions, without requiring an application-level popup provider. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetDescription } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Sheet><SheetTrigger>Open details</SheetTrigger><SheetContent><SheetTitle>Details</SheetTitle><SheetDescription>Project information</SheetDescription></SheetContent></Sheet>);
 * }
 * ```
 */
function SheetTitle({
  ref,
  className,
  ...props
}: React.PropsWithoutRef<React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>> &
  React.RefAttributes<React.ComponentRef<typeof SheetPrimitive.Title>>) {
  return (
    <SheetPrimitive.Title
      ref={ref}
      data-slot='sheet-title'
      className={cn('text-foreground text-base font-medium', className)}
      {...props}
    />
  );
}
SheetTitle.displayName = SheetPrimitive.Title.displayName;

/**
 * Provides the accessible explanatory text of the associated popup.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered SheetDescription composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose trigger, content, title and description inside Sheet; the underlying primitive owns open state and focus. Content supplies its own portal and backdrop. Separate lower-level exports support custom compositions, without requiring an application-level popup provider. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetDescription } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Sheet><SheetTrigger>Open details</SheetTrigger><SheetContent><SheetTitle>Details</SheetTitle><SheetDescription>Project information</SheetDescription></SheetContent></Sheet>);
 * }
 * ```
 */
function SheetDescription({
  ref,
  className,
  ...props
}: React.PropsWithoutRef<React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>> &
  React.RefAttributes<React.ComponentRef<typeof SheetPrimitive.Description>>) {
  return (
    <SheetPrimitive.Description
      ref={ref}
      data-slot='sheet-description'
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
