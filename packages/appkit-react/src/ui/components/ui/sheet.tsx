'use client';

import * as React from 'react';
import { Dialog as SheetPrimitive } from '@base-ui/react/dialog';
import { XIcon } from 'lucide-react';

import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';

/**
 * 画面の端からスライドインして表示されるサイドパネルのルートコンポーネント。
 */
function Sheet({ ...props }: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot='sheet' {...props} />;
}

/**
 * シートパネルを開くためのトリガーボタン。
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
 * シートパネルを閉じるためのボタンまたはトリガー。
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

interface SheetContentProps extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Popup> {
  side?: 'top' | 'right' | 'bottom' | 'left';
  showCloseButton?: boolean;
  testId?: string;
}

const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  ({ className, children, side = 'right', showCloseButton = true, testId, ...props }, ref) => (
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
  ),
);
SheetContent.displayName = SheetPrimitive.Popup.displayName;

const SheetHeader = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<'div'>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot='sheet-header'
      className={cn('gap-0.5 p-4 flex flex-col', className)}
      {...props}
    />
  ),
);
SheetHeader.displayName = 'SheetHeader';

const SheetFooter = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<'div'>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot='sheet-footer'
      className={cn('gap-2 p-4 mt-auto flex flex-col', className)}
      {...props}
    />
  ),
);
SheetFooter.displayName = 'SheetFooter';

const SheetTitle = React.forwardRef<
  React.ComponentRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    data-slot='sheet-title'
    className={cn('text-foreground text-base font-medium', className)}
    {...props}
  />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ComponentRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    data-slot='sheet-description'
    className={cn('text-muted-foreground text-sm', className)}
    {...props}
  />
));
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
