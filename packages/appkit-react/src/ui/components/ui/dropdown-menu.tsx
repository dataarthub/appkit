'use client';

import * as React from 'react';
import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import { ChevronRightIcon, CheckIcon } from 'lucide-react';

import { cn } from '../../lib/utils';

/**
 * ドロップダウンメニューのルートコンポーネント。
 */
function DropdownMenu({ ...props }: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root data-slot='dropdown-menu' {...props} />;
}

/**
 * メニュー要素をポータル経由でDOMの別の場所に描画するためのコンポーネント。
 */
function DropdownMenuPortal({ ...props }: MenuPrimitive.Portal.Props) {
  return <MenuPrimitive.Portal data-slot='dropdown-menu-portal' {...props} />;
}

/**
 * ドロップダウンメニューを開くためのトリガーボタン。
 */
function DropdownMenuTrigger({
  children,
  ...props
}: MenuPrimitive.Trigger.Props) {
  return (
    <MenuPrimitive.Trigger
      data-slot='dropdown-menu-trigger'
      {...props}
    >
      {children}
    </MenuPrimitive.Trigger>
  );
}

const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  MenuPrimitive.Popup.Props &
    Pick<MenuPrimitive.Positioner.Props, 'align' | 'alignOffset' | 'side' | 'sideOffset'>
>(
  (
    { className, align = 'start', alignOffset = 0, side = 'bottom', sideOffset = 4, ...props },
    ref,
  ) => (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        className='isolate z-50 outline-none'
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          ref={ref}
          data-slot='dropdown-menu-content'
          className={cn(
            'data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 bg-popover text-popover-foreground min-w-32 rounded-lg p-1 shadow-md ring-1 duration-100 z-50 max-h-(--available-height) w-(--anchor-width) origin-(--transform-origin) overflow-x-hidden overflow-y-auto outline-none data-closed:overflow-hidden',
            className,
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  ),
);
DropdownMenuContent.displayName = MenuPrimitive.Popup.displayName;

/**
 * メニューアイテムを論理的なグループにまとめるためのコンポーネント。
 */
function DropdownMenuGroup({ ...props }: MenuPrimitive.Group.Props) {
  return <MenuPrimitive.Group data-slot='dropdown-menu-group' {...props} />;
}

const DropdownMenuLabel = React.forwardRef<
  HTMLDivElement,
  MenuPrimitive.GroupLabel.Props & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <MenuPrimitive.GroupLabel
    ref={ref}
    data-slot='dropdown-menu-label'
    data-inset={inset}
    className={cn(
      'text-muted-foreground px-1.5 py-1 text-xs font-medium data-[inset]:pl-8',
      className,
    )}
    {...props}
  />
));
DropdownMenuLabel.displayName = MenuPrimitive.GroupLabel.displayName;

const DropdownMenuItem = React.forwardRef<
  HTMLDivElement,
  MenuPrimitive.Item.Props & {
    inset?: boolean;
    variant?: 'default' | 'destructive';
  }
>(({ className, inset, variant = 'default', children, ...props }, ref) => (
  <MenuPrimitive.Item
    ref={ref}
    data-slot='dropdown-menu-item'
    data-inset={inset}
    data-variant={variant}
    className={cn(
      "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:text-destructive not-data-[variant=destructive]:focus:**:text-accent-foreground gap-1.5 rounded-md px-1.5 py-1 text-sm [&_svg:not([class*='size-'])]:size-4 group/dropdown-menu-item relative flex cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0",
      className,
    )}
    {...props}
  >
    {children}
  </MenuPrimitive.Item>
));
DropdownMenuItem.displayName = MenuPrimitive.Item.displayName;

/**
 * サブメニュー（入れ子になったメニュー）用のルートコンポーネント。
 */
function DropdownMenuSub({ ...props }: MenuPrimitive.SubmenuRoot.Props) {
  return <MenuPrimitive.SubmenuRoot data-slot='dropdown-menu-sub' {...props} />;
}

const DropdownMenuSubTrigger = React.forwardRef<
  HTMLDivElement,
  MenuPrimitive.SubmenuTrigger.Props & { inset?: boolean }
>(({ className, inset, children, ...props }, ref) => (
  <MenuPrimitive.SubmenuTrigger
    ref={ref}
    data-slot='dropdown-menu-sub-trigger'
    data-inset={inset}
    className={cn(
      "focus:bg-accent focus:text-accent-foreground data-open:bg-accent data-open:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground gap-1.5 rounded-md px-1.5 py-1 text-sm [&_svg:not([class*='size-'])]:size-4 flex cursor-default items-center outline-hidden select-none data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0",
      className,
    )}
    {...props}
  >
    {children}
    <ChevronRightIcon className='ml-auto' />
  </MenuPrimitive.SubmenuTrigger>
));
DropdownMenuSubTrigger.displayName = MenuPrimitive.SubmenuTrigger.displayName;

const DropdownMenuSubContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof DropdownMenuContent>
>(
  (
    { className, align = 'start', alignOffset = -3, side = 'right', sideOffset = 0, ...props },
    ref,
  ) => (
    <DropdownMenuContent
      ref={ref}
      data-slot='dropdown-menu-sub-content'
      className={cn(
        'data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 bg-popover text-popover-foreground min-w-[96px] rounded-md p-1 shadow-lg ring-1 duration-100 w-auto',
        className,
      )}
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      {...props}
    />
  ),
);
DropdownMenuSubContent.displayName = 'DropdownMenuSubContent';

const DropdownMenuCheckboxItem = React.forwardRef<HTMLDivElement, MenuPrimitive.CheckboxItem.Props>(
  ({ className, children, checked, ...props }, ref) => (
    <MenuPrimitive.CheckboxItem
      ref={ref}
      data-slot='dropdown-menu-checkbox-item'
      className={cn(
        "focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm [&_svg:not([class*='size-'])]:size-4 relative flex cursor-default items-center outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      checked={checked}
      {...props}
    >
      <span
        className='pointer-events-none absolute right-2 flex items-center justify-center pointer-events-none'
        data-slot='dropdown-menu-checkbox-item-indicator'
      >
        <MenuPrimitive.CheckboxItemIndicator>
          <CheckIcon />
        </MenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  ),
);
DropdownMenuCheckboxItem.displayName = MenuPrimitive.CheckboxItem.displayName;

/**
 * 選択状態を共有し、単一選択（ラジオ）可能なアイテムをグループ化するコンポーネント。
 */
function DropdownMenuRadioGroup({ ...props }: MenuPrimitive.RadioGroup.Props) {
  return <MenuPrimitive.RadioGroup data-slot='dropdown-menu-radio-group' {...props} />;
}

const DropdownMenuRadioItem = React.forwardRef<HTMLDivElement, MenuPrimitive.RadioItem.Props>(
  ({ className, children, ...props }, ref) => (
    <MenuPrimitive.RadioItem
      ref={ref}
      data-slot='dropdown-menu-radio-item'
      className={cn(
        "focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm [&_svg:not([class*='size-'])]:size-4 relative flex cursor-default items-center outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      {...props}
    >
      <span
        className='pointer-events-none absolute right-2 flex items-center justify-center pointer-events-none'
        data-slot='dropdown-menu-radio-item-indicator'
      >
        <MenuPrimitive.RadioItemIndicator>
          <CheckIcon />
        </MenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  ),
);
DropdownMenuRadioItem.displayName = MenuPrimitive.RadioItem.displayName;

const DropdownMenuSeparator = React.forwardRef<HTMLDivElement, MenuPrimitive.Separator.Props>(
  ({ className, ...props }, ref) => (
    <MenuPrimitive.Separator
      ref={ref}
      data-slot='dropdown-menu-separator'
      className={cn('bg-border -mx-1 my-1 h-px', className)}
      {...props}
    />
  ),
);
DropdownMenuSeparator.displayName = MenuPrimitive.Separator.displayName;

const DropdownMenuShortcut = React.forwardRef<HTMLSpanElement, React.ComponentProps<'span'>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      data-slot='dropdown-menu-shortcut'
      className={cn(
        'text-muted-foreground group-focus/dropdown-menu-item:text-accent-foreground ml-auto text-xs tracking-widest',
        className,
      )}
      {...props}
    />
  ),
);
DropdownMenuShortcut.displayName = 'DropdownMenuShortcut';

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
};
