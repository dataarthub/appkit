'use client';

import * as React from 'react';
import { Toast as ToastPrimitive } from '@base-ui/react/toast';
import { XIcon } from 'lucide-react';

import { cn } from '../../lib/utils';

/**
 * Provides Base UI toast context for the separately exported viewport.
 * @param props - Inherited primitive configuration, children and controlled/default state; the upstream prop type remains authoritative.
 * @returns The rendered ToastProvider composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Toast is a custom div-based notification, not Base UI Toast.Root. It returns null only when open=false; an omitted open renders indefinitely without starting its timer. With open=true and onOpenChange, duration defaults to 3000ms; 0 or Infinity disables the timer. Timer cleanup runs on dependency change/unmount. toast is accepted but ignored. ToastAction does not dismiss automatically. ToastDescription has paragraph-typed props/ref but renders div; avoid relying on paragraph-specific DOM behavior. The host controls live-region announcements and persistence.
 * @example
 * ```tsx
 * import { useState } from 'react';
 * import { Toast, ToastTitle, ToastDescription, ToastAction, ToastClose } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   const [open, setOpen] = useState(true);
 *   return (<Toast open={open} onOpenChange={setOpen} duration={3000}><ToastTitle>Draft ready</ToastTitle><ToastDescription>Review your draft.</ToastDescription><ToastAction type="button" onClick={() => console.log("Review requested")}>Review</ToastAction><ToastClose type="button" /></Toast>);
 * }
 * ```
 */
const ToastProvider = ToastPrimitive.Provider;

/**
 * Renders the positioned Base UI notification viewport.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ToastViewport composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Toast is a custom div-based notification, not Base UI Toast.Root. It returns null only when open=false; an omitted open renders indefinitely without starting its timer. With open=true and onOpenChange, duration defaults to 3000ms; 0 or Infinity disables the timer. Timer cleanup runs on dependency change/unmount. toast is accepted but ignored. ToastAction does not dismiss automatically. ToastDescription has paragraph-typed props/ref but renders div; avoid relying on paragraph-specific DOM behavior. The host controls live-region announcements and persistence. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { useState } from 'react';
 * import { Toast, ToastTitle, ToastDescription, ToastAction, ToastClose } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   const [open, setOpen] = useState(true);
 *   return (<Toast open={open} onOpenChange={setOpen} duration={3000}><ToastTitle>Draft ready</ToastTitle><ToastDescription>Review your draft.</ToastDescription><ToastAction type="button" onClick={() => console.log("Review requested")}>Review</ToastAction><ToastClose type="button" /></Toast>);
 * }
 * ```
 */
const ToastViewport = React.forwardRef<HTMLDivElement, ToastPrimitive.Viewport.Props>(
  ({ className, ...props }, ref) => (
    <ToastPrimitive.Viewport
      ref={ref}
      data-slot='toast-viewport'
      className={cn(
        'fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]',
        className,
      )}
      {...props}
    />
  ),
);
ToastViewport.displayName = 'ToastViewport';

const ToastContext = React.createContext<{ onOpenChange?: (open: boolean) => void }>({});

/**
 * Renders host-controlled notification content and optionally requests timed dismissal.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling. Wrapper defaults: variant='default', duration=3000.
 * @returns The rendered Toast composition, or null when it has no visible content.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Toast is a custom div-based notification, not Base UI Toast.Root. It returns null only when open=false; an omitted open renders indefinitely without starting its timer. With open=true and onOpenChange, duration defaults to 3000ms; 0 or Infinity disables the timer. Timer cleanup runs on dependency change/unmount. toast is accepted but ignored. ToastAction does not dismiss automatically. ToastDescription has paragraph-typed props/ref but renders div; avoid relying on paragraph-specific DOM behavior. The host controls live-region announcements and persistence. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { useState } from 'react';
 * import { Toast, ToastTitle, ToastDescription, ToastAction, ToastClose } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   const [open, setOpen] = useState(true);
 *   return (<Toast open={open} onOpenChange={setOpen} duration={3000}><ToastTitle>Draft ready</ToastTitle><ToastDescription>Review your draft.</ToastDescription><ToastAction type="button" onClick={() => console.log("Review requested")}>Review</ToastAction><ToastClose type="button" /></Toast>);
 * }
 * ```
 */
const Toast = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    /**
     * Visual treatment from the declared variant union; changing it does not alter host action semantics.
     */
    variant?: 'default' | 'destructive';
    /**
     * Controlled visibility; the host updates this value in response to close/open requests.
     */
    open?: boolean;
    /**
     * Requests a new visibility state; the host must update open. Toast invokes false after its duration or close action.
     * @param open - Requested visibility; false requests dismissal.
     * @returns No value; complete the host callback action.
     */
    onOpenChange?: (open: boolean) => void;
    /**
     * Compatibility input accepted but ignored by this div-based Toast wrapper.
     */
    toast?: unknown;
    /**
     * Dismissal delay in milliseconds, default 3000; 0 or Infinity disables the timer.
     */
    duration?: number;
  }
>(
  (
    {
      className,
      variant = 'default',
      open,
      onOpenChange,
      toast: _toast,
      children,
      duration = 3000,
      ...props
    },
    ref,
  ) => {
    React.useEffect(() => {
      if (open && onOpenChange && duration && duration !== Infinity) {
        const timer = setTimeout(() => {
          onOpenChange(false);
        }, duration);
        return () => clearTimeout(timer);
      }
    }, [open, onOpenChange, duration]);

    if (open === false) return null;
    return (
      <ToastContext.Provider value={{ onOpenChange }}>
        <div
          ref={ref}
          data-slot='toast'
          data-variant={variant}
          className={cn(
            'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all',
            'bg-background text-foreground border-border',
            'data-[variant=destructive]:border-destructive data-[variant=destructive]:bg-destructive data-[variant=destructive]:text-destructive-foreground',
            className,
          )}
          {...props}
        >
          {children}
        </div>
      </ToastContext.Provider>
    );
  },
);

Toast.displayName = 'Toast';

/**
 * Renders a notification heading as h3.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ToastTitle composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Toast is a custom div-based notification, not Base UI Toast.Root. It returns null only when open=false; an omitted open renders indefinitely without starting its timer. With open=true and onOpenChange, duration defaults to 3000ms; 0 or Infinity disables the timer. Timer cleanup runs on dependency change/unmount. toast is accepted but ignored. ToastAction does not dismiss automatically. ToastDescription has paragraph-typed props/ref but renders div; avoid relying on paragraph-specific DOM behavior. The host controls live-region announcements and persistence. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { useState } from 'react';
 * import { Toast, ToastTitle, ToastDescription, ToastAction, ToastClose } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   const [open, setOpen] = useState(true);
 *   return (<Toast open={open} onOpenChange={setOpen} duration={3000}><ToastTitle>Draft ready</ToastTitle><ToastDescription>Review your draft.</ToastDescription><ToastAction type="button" onClick={() => console.log("Review requested")}>Review</ToastAction><ToastClose type="button" /></Toast>);
 * }
 * ```
 */
const ToastTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      data-slot='toast-title'
      className={cn('text-sm font-semibold', className)}
      {...props}
    />
  ),
);
ToastTitle.displayName = 'ToastTitle';

/**
 * Renders supporting notification text in a div.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ToastDescription composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Toast is a custom div-based notification, not Base UI Toast.Root. It returns null only when open=false; an omitted open renders indefinitely without starting its timer. With open=true and onOpenChange, duration defaults to 3000ms; 0 or Infinity disables the timer. Timer cleanup runs on dependency change/unmount. toast is accepted but ignored. ToastAction does not dismiss automatically. ToastDescription has paragraph-typed props/ref but renders div; avoid relying on paragraph-specific DOM behavior. The host controls live-region announcements and persistence. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { useState } from 'react';
 * import { Toast, ToastTitle, ToastDescription, ToastAction, ToastClose } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   const [open, setOpen] = useState(true);
 *   return (<Toast open={open} onOpenChange={setOpen} duration={3000}><ToastTitle>Draft ready</ToastTitle><ToastDescription>Review your draft.</ToastDescription><ToastAction type="button" onClick={() => console.log("Review requested")}>Review</ToastAction><ToastClose type="button" /></Toast>);
 * }
 * ```
 */
const ToastDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot='toast-description'
    className={cn('text-sm opacity-90', className)}
    {...props}
  />
));
ToastDescription.displayName = 'ToastDescription';

/**
 * Renders a native action button inside a notification.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ToastAction composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Toast is a custom div-based notification, not Base UI Toast.Root. It returns null only when open=false; an omitted open renders indefinitely without starting its timer. With open=true and onOpenChange, duration defaults to 3000ms; 0 or Infinity disables the timer. Timer cleanup runs on dependency change/unmount. toast is accepted but ignored. ToastAction does not dismiss automatically. ToastDescription has paragraph-typed props/ref but renders div; avoid relying on paragraph-specific DOM behavior. The host controls live-region announcements and persistence. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { useState } from 'react';
 * import { Toast, ToastTitle, ToastDescription, ToastAction, ToastClose } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   const [open, setOpen] = useState(true);
 *   return (<Toast open={open} onOpenChange={setOpen} duration={3000}><ToastTitle>Draft ready</ToastTitle><ToastDescription>Review your draft.</ToastDescription><ToastAction type="button" onClick={() => console.log("Review requested")}>Review</ToastAction><ToastClose type="button" /></Toast>);
 * }
 * ```
 */
const ToastAction = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    data-slot='toast-action'
    className={cn(
      'inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
ToastAction.displayName = 'ToastAction';

/**
 * Requests dismissal through Toast context before calling the host click handler.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ToastClose composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Toast is a custom div-based notification, not Base UI Toast.Root. It returns null only when open=false; an omitted open renders indefinitely without starting its timer. With open=true and onOpenChange, duration defaults to 3000ms; 0 or Infinity disables the timer. Timer cleanup runs on dependency change/unmount. toast is accepted but ignored. ToastAction does not dismiss automatically. ToastDescription has paragraph-typed props/ref but renders div; avoid relying on paragraph-specific DOM behavior. The host controls live-region announcements and persistence. The ref prop forwards to the rendered control or container declared by the component ref type.  children are replaced by the fixed dismiss icon.
 * @example
 * ```tsx
 * import { useState } from 'react';
 * import { Toast, ToastTitle, ToastDescription, ToastAction, ToastClose } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   const [open, setOpen] = useState(true);
 *   return (<Toast open={open} onOpenChange={setOpen} duration={3000}><ToastTitle>Draft ready</ToastTitle><ToastDescription>Review your draft.</ToastDescription><ToastAction type="button" onClick={() => console.log("Review requested")}>Review</ToastAction><ToastClose type="button" /></Toast>);
 * }
 * ```
 */
const ToastClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onClick, ...props }, ref) => {
  const { onOpenChange } = React.useContext(ToastContext);
  return (
    <button
      ref={ref}
      data-slot='toast-close'
      aria-label='Dismiss notification'
      className={cn(
        'absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-100 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 z-[10000]',
        className,
      )}
      onClick={(e) => {
        onOpenChange?.(false);
        onClick?.(e);
      }}
      {...props}
    >
      <XIcon className='h-4 w-4' />
    </button>
  );
});

ToastClose.displayName = 'ToastClose';

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
