'use client';

import * as React from 'react';
import { Toast as ToastPrimitive } from '@base-ui/react/toast';
import { XIcon } from 'lucide-react';

import { cn } from '../../lib/utils';

const ToastProvider = ToastPrimitive.Provider;

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

const Toast = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: 'default' | 'destructive';
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    toast?: unknown;
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
