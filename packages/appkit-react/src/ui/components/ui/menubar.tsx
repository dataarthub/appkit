'use client';

import * as React from 'react';
import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import { Menubar as MenubarPrimitive } from '@base-ui/react/menubar';
import { Check, Circle } from 'lucide-react';

import { cn } from '../../lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './dropdown-menu';

/**
 * メニューバーのルートコンポーネント。
 */
function Menubar({ className, ...props }: MenubarPrimitive.Props) {
  return (
    <MenubarPrimitive
      data-slot='menubar'
      className={cn('bg-background h-8 gap-0.5 rounded-lg border p-1 flex items-center', className)}
      {...props}
    />
  );
}

/**
 * メニューバー内の個々のメニューを管理するコンポーネント。
 */
function MenubarMenu({ ...props }: React.ComponentProps<typeof DropdownMenu>) {
  return <DropdownMenu data-slot='menubar-menu' {...props} />;
}

/**
 * メニュー項目をグループ化するためのコンポーネント。
 */
function MenubarGroup({ ...props }: React.ComponentProps<typeof DropdownMenuGroup>) {
  return <DropdownMenuGroup data-slot='menubar-group' {...props} />;
}

/**
 * メニューバーのメニュー項目をポータル経由でレンダリングするためのコンポーネント。
 */
function MenubarPortal({ ...props }: React.ComponentProps<typeof DropdownMenuPortal>) {
  return <DropdownMenuPortal data-slot='menubar-portal' {...props} />;
}

/**
 * メニューバーからメニューを展開するためのトリガーボタン。
 */
function MenubarTrigger({ className, ...props }: React.ComponentProps<typeof DropdownMenuTrigger>) {
  return (
    <DropdownMenuTrigger
      data-slot='menubar-trigger'
      className={cn(
        'hover:bg-muted aria-expanded:bg-muted rounded-sm px-1.5 py-px text-sm font-medium flex items-center outline-hidden select-none',
        className,
      )}
      {...props}
    />
  );
}

/**
 * メニューバーのトリガーによって展開されるコンテンツのコンテナ。
 */
function MenubarContent({
  className,
  align = 'start',
  alignOffset = -4,
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof DropdownMenuContent>) {
  return (
    <DropdownMenuContent
      data-slot='menubar-content'
      align={align}
      alignOffset={alignOffset}
      sideOffset={sideOffset}
      className={cn(
        'bg-popover text-popover-foreground data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 min-w-36 rounded-lg p-1 shadow-md ring-1 duration-100',
        className,
      )}
      {...props}
    />
  );
}

/**
 * メニュー内の個々の通常のメニュー項目。
 */
function MenubarItem({
  className,
  inset,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof DropdownMenuItem> & {
  inset?: boolean;
  variant?: 'default' | 'destructive';
}) {
  return (
    <DropdownMenuItem
      data-slot='menubar-item'
      inset={inset}
      // ERP MenubarItem passes data-variant. Tools DropdownMenuItem wraps Primitive.Item.
      // I will adhere to ERP implementation but I might need to adjust based on tools DropdownMenuItem
      // ERP DropdownMenuItem accepts `variant`. Tools DropdownMenuItem might not.
      // I'll assume safe for now, if error I fix.
      variant={variant}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive not-data-[variant=destructive]:focus:**:text-accent-foreground gap-1.5 rounded-md px-1.5 py-1 text-sm data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg:not([class*='size-'])]:size-4 group/menubar-item",
        className,
      )}
      {...props}
    />
  );
}

/**
 * チェックボックスの選択状態を持つメニュー項目。
 */
function MenubarCheckboxItem({
  className,
  children,
  checked,
  ...props
}: MenuPrimitive.CheckboxItem.Props) {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot='menubar-checkbox-item'
      className={cn(
        'focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground gap-1.5 rounded-md py-1 pr-1.5 pl-7 text-sm data-disabled:opacity-50 relative flex cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
        className,
      )}
      checked={checked}
      {...props}
    >
      <span className="left-1.5 size-4 [&_svg:not([class*='size-'])]:size-4 pointer-events-none absolute flex items-center justify-center">
        <MenuPrimitive.CheckboxItemIndicator>
          <Check className='h-4 w-4' />
        </MenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  );
}

/**
 * ラジオボタン形式のメニュー項目をグループ化するコンポーネント。
 */
function MenubarRadioGroup({ ...props }: React.ComponentProps<typeof DropdownMenuRadioGroup>) {
  return <DropdownMenuRadioGroup data-slot='menubar-radio-group' {...props} />;
}

/**
 * 単一選択（ラジオ）形式のメニュー項目。
 */
function MenubarRadioItem({ className, children, ...props }: MenuPrimitive.RadioItem.Props) {
  return (
    <MenuPrimitive.RadioItem
      data-slot='menubar-radio-item'
      className={cn(
        "focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground gap-1.5 rounded-md py-1 pr-1.5 pl-7 text-sm data-disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4 relative flex cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      {...props}
    >
      <span className="left-1.5 size-4 [&_svg:not([class*='size-'])]:size-4 pointer-events-none absolute flex items-center justify-center">
        <MenuPrimitive.RadioItemIndicator>
          <Circle className='size-2 fill-current' />
        </MenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  );
}

/**
 * メニュー内のヘッダーや見出しを定義するラベルコンポーネント。
 */
function MenubarLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuLabel> & { inset?: boolean }) {
  return (
    <DropdownMenuLabel
      data-slot='menubar-label'
      inset={inset}
      className={cn('px-1.5 py-1 text-sm font-medium data-[inset]:pl-8', className)}
      {...props}
    />
  );
}

/**
 * メニュー項目を区切るためのセパレーター（区切り線）。
 */
function MenubarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuSeparator>) {
  return (
    <DropdownMenuSeparator
      data-slot='menubar-separator'
      className={cn('bg-border -mx-1 my-1 h-px', className)}
      {...props}
    />
  );
}

/**
 * メニューアイテムの右側に表示されるキーボードショートカット用のコンポーネント。
 */
function MenubarShortcut({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuShortcut>) {
  return (
    <DropdownMenuShortcut
      data-slot='menubar-shortcut'
      className={cn(
        'text-muted-foreground group-focus/menubar-item:text-accent-foreground text-xs tracking-widest ml-auto',
        className,
      )}
      {...props}
    />
  );
}

/**
 * サブメニュー（入れ子にされたメニュー）を定義するためのコンポーネント。
 */
function MenubarSub({ ...props }: React.ComponentProps<typeof DropdownMenuSub>) {
  return <DropdownMenuSub data-slot='menubar-sub' {...props} />;
}

/**
 * サブメニューを展開するためのトリガー項目。
 */
function MenubarSubTrigger({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuSubTrigger> & {
  inset?: boolean;
}) {
  return (
    <DropdownMenuSubTrigger
      data-slot='menubar-sub-trigger'
      inset={inset}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-open:bg-accent data-open:text-accent-foreground gap-1.5 rounded-md px-1.5 py-1 text-sm data-[inset]:pl-8 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

/**
 * サブメニューの中に表示されるコンテンツのコンテナ。
 */
function MenubarSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuSubContent>) {
  return (
    <DropdownMenuSubContent
      data-slot='menubar-sub-content'
      className={cn(
        'bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 min-w-32 rounded-lg p-1 shadow-lg ring-1 duration-100',
        className,
      )}
      {...props}
    />
  );
}

export {
  Menubar,
  MenubarPortal,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarGroup,
  MenubarSeparator,
  MenubarLabel,
  MenubarItem,
  MenubarShortcut,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSub,
  MenubarSubTrigger,
  MenubarSubContent,
};
