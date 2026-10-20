'use client';

import * as React from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { XIcon } from 'lucide-react';

import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';

/**
 * Coordinates open state and interaction context for the popup.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered Dialog composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose trigger, content, title and description inside Dialog; the underlying primitive owns open state and focus. Content supplies its own portal and backdrop. Separate lower-level exports support custom compositions, without requiring an application-level popup provider.
 * @example
 * ```tsx
 * import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Dialog><DialogTrigger>Open details</DialogTrigger><DialogContent><DialogTitle>Details</DialogTitle><DialogDescription>Project information</DialogDescription></DialogContent></Dialog>);
 * }
 * ```
 */
function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot='dialog' {...props} />;
}

/**
 * Renders the control that requests opening its popup.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered DialogTrigger composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose trigger, content, title and description inside Dialog; the underlying primitive owns open state and focus. Content supplies its own portal and backdrop. Separate lower-level exports support custom compositions, without requiring an application-level popup provider.
 * @example
 * ```tsx
 * import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Dialog><DialogTrigger>Open details</DialogTrigger><DialogContent><DialogTitle>Details</DialogTitle><DialogDescription>Project information</DialogDescription></DialogContent></Dialog>);
 * }
 * ```
 */
function DialogTrigger({
  children,
  ...props
}: DialogPrimitive.Trigger.Props) {
  return (
    <DialogPrimitive.Trigger
      data-slot='dialog-trigger'
      {...props}
    >
      {children}
    </DialogPrimitive.Trigger>
  );
}

/**
 * Mounts popup descendants in a separate DOM container.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered DialogPortal composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose trigger, content, title and description inside Dialog; the underlying primitive owns open state and focus. Content supplies its own portal and backdrop. Separate lower-level exports support custom compositions, without requiring an application-level popup provider.
 * @example
 * ```tsx
 * import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Dialog><DialogTrigger>Open details</DialogTrigger><DialogContent><DialogTitle>Details</DialogTitle><DialogDescription>Project information</DialogDescription></DialogContent></Dialog>);
 * }
 * ```
 */
function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot='dialog-portal' {...props} />;
}

/**
 * Renders a control that requests closing its popup.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered DialogClose composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose trigger, content, title and description inside Dialog; the underlying primitive owns open state and focus. Content supplies its own portal and backdrop. Separate lower-level exports support custom compositions, without requiring an application-level popup provider.
 * @example
 * ```tsx
 * import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Dialog><DialogTrigger>Open details</DialogTrigger><DialogContent><DialogTitle>Details</DialogTitle><DialogDescription>Project information</DialogDescription></DialogContent></Dialog>);
 * }
 * ```
 */
function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot='dialog-close' {...props} />;
}

/**
 * Renders the popup backdrop with open/closed animation classes.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered DialogOverlay composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose trigger, content, title and description inside Dialog; the underlying primitive owns open state and focus. Content supplies its own portal and backdrop. Separate lower-level exports support custom compositions, without requiring an application-level popup provider. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Dialog><DialogTrigger>Open details</DialogTrigger><DialogContent><DialogTitle>Details</DialogTitle><DialogDescription>Project information</DialogDescription></DialogContent></Dialog>);
 * }
 * ```
 */
const DialogOverlay = React.forwardRef<HTMLDivElement, DialogPrimitive.Backdrop.Props>(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Backdrop
      ref={ref}
      data-slot='dialog-overlay'
      className={cn(
        'data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs fixed inset-0 isolate z-50',
        className,
      )}
      {...props}
    />
  ),
);
DialogOverlay.displayName = DialogPrimitive.Backdrop.displayName;

/**
 * Base UI popup props plus the built-in close button and stable test selector.
 * @remarks Inherited native or primitive props keep their upstream types and behavior; this declaration documents only the wrapper-owned options.
 * @see DialogContent
 */
export interface DialogContentProps extends React.ComponentPropsWithoutRef<
  typeof DialogPrimitive.Popup
> {
  /**
   * data-testid on the popup; the built-in close uses `${testId}-close` when present.
   */
  testId?: string;
  /**
   * Whether to insert the built-in close button.
   * @defaultValue true
   */
  showCloseButton?: boolean;
}

/**
 * Portals the popup and its positioning/backdrop composition.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling. Wrapper defaults: showCloseButton=true.
 * @returns The rendered DialogContent composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose trigger, content, title and description inside Dialog; the underlying primitive owns open state and focus. Content supplies its own portal and backdrop. Separate lower-level exports support custom compositions, without requiring an application-level popup provider. The ref prop forwards to the rendered control or container declared by the component ref type. testId maps to the popup data-testid and, when present, `${testId}-close` on its built-in close control. showCloseButton defaults to true.
 * @example
 * ```tsx
 * import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Dialog><DialogTrigger>Open details</DialogTrigger><DialogContent><DialogTitle>Details</DialogTitle><DialogDescription>Project information</DialogDescription></DialogContent></Dialog>);
 * }
 * ```
 */
const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, testId, showCloseButton = true, ...props }, ref) => (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        ref={ref}
        data-testid={testId}
        data-slot='dialog-content'
        className={cn(
          'bg-background text-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 ring-foreground/10 grid max-w-[calc(100%-2rem)] gap-4 rounded-xl p-4 text-sm ring-1 duration-100 sm:max-w-sm fixed top-1/2 left-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 outline-none',
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot='dialog-close'
            data-testid={testId ? `${testId}-close` : undefined}
            render={<Button variant='ghost' className='absolute top-2 right-2' size='icon-sm' />}
          >
            <XIcon />
            <span className='sr-only'>Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  ),
);
DialogContent.displayName = DialogPrimitive.Popup.displayName;

/**
 * Groups popup heading and explanatory content.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered DialogHeader composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose trigger, content, title and description inside Dialog; the underlying primitive owns open state and focus. Content supplies its own portal and backdrop. Separate lower-level exports support custom compositions, without requiring an application-level popup provider. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Dialog><DialogTrigger>Open details</DialogTrigger><DialogContent><DialogTitle>Details</DialogTitle><DialogDescription>Project information</DialogDescription></DialogContent></Dialog>);
 * }
 * ```
 */
const DialogHeader = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<'div'>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot='dialog-header'
      className={cn('gap-2 flex flex-col', className)}
      {...props}
    />
  ),
);
DialogHeader.displayName = 'DialogHeader';

/**
 * Lays out popup actions below its content.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling. Wrapper defaults: showCloseButton=false.
 * @returns The rendered DialogFooter composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose trigger, content, title and description inside Dialog; the underlying primitive owns open state and focus. Content supplies its own portal and backdrop. Separate lower-level exports support custom compositions, without requiring an application-level popup provider. The ref prop forwards to the rendered control or container declared by the component ref type. showCloseButton defaults to false and adds an outline close action when true.
 * @example
 * ```tsx
 * import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Dialog><DialogTrigger>Open details</DialogTrigger><DialogContent><DialogTitle>Details</DialogTitle><DialogDescription>Project information</DialogDescription></DialogContent></Dialog>);
 * }
 * ```
 */
const DialogFooter = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<'div'> & { /**
 * Controls whether the wrapper inserts its own close button; see the component for its default.
 */
  /**
   * Controls whether the wrapper inserts its own close button; see the component for its default.
   */
  showCloseButton?: boolean }
>(({ className, showCloseButton = false, children, ...props }, ref) => (
  <div
    ref={ref}
    data-slot='dialog-footer'
    className={cn(
      'bg-muted/50 -mx-4 -mb-4 rounded-b-xl border-t p-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
      className,
    )}
    {...props}
  >
    {children}
    {showCloseButton && (
      <DialogPrimitive.Close render={<Button variant='outline' />}>Close</DialogPrimitive.Close>
    )}
  </div>
));
DialogFooter.displayName = 'DialogFooter';

/**
 * Provides the accessible title of the associated popup.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered DialogTitle composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose trigger, content, title and description inside Dialog; the underlying primitive owns open state and focus. Content supplies its own portal and backdrop. Separate lower-level exports support custom compositions, without requiring an application-level popup provider. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Dialog><DialogTrigger>Open details</DialogTrigger><DialogContent><DialogTitle>Details</DialogTitle><DialogDescription>Project information</DialogDescription></DialogContent></Dialog>);
 * }
 * ```
 */
const DialogTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    data-slot='dialog-title'
    className={cn('text-sm leading-none font-medium', className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

/**
 * Provides the accessible explanatory text of the associated popup.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered DialogDescription composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose trigger, content, title and description inside Dialog; the underlying primitive owns open state and focus. Content supplies its own portal and backdrop. Separate lower-level exports support custom compositions, without requiring an application-level popup provider. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Dialog><DialogTrigger>Open details</DialogTrigger><DialogContent><DialogTitle>Details</DialogTitle><DialogDescription>Project information</DialogDescription></DialogContent></Dialog>);
 * }
 * ```
 */
const DialogDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    data-slot='dialog-description'
    className={cn(
      'text-muted-foreground *:[a]:hover:text-foreground text-sm *:[a]:underline *:[a]:underline-offset-3',
      className,
    )}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
