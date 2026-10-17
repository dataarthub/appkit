'use client';

import * as React from 'react';
import { Toolbar as ToolbarPrimitive } from '@base-ui/react/toolbar';
import { ToggleGroup as ToggleGroupPrimitive } from '@base-ui/react/toggle-group';
import { Toggle as TogglePrimitive } from '@base-ui/react/toggle';
import { cn } from '../../lib/utils';

/**
 * ツールバーのルートコンテナ。
 */
function Toolbar({ className, ...props }: React.ComponentProps<typeof ToolbarPrimitive.Root>) {
  return (
    <ToolbarPrimitive.Root
      data-slot='toolbar'
      className={cn(
        'flex h-10 items-center justify-between rounded-md border bg-background p-1',
        className,
      )}
      {...props}
    />
  );
}

/**
 * ツールバー内のアイテムをグループ化するためのコンポーネント。
 */
function ToolbarGroup({
  className,
  ...props
}: React.ComponentProps<typeof ToolbarPrimitive.Group>) {
  return (
    <ToolbarPrimitive.Group
      data-slot='toolbar-group'
      className={cn('flex items-center gap-1', className)}
      {...props}
    />
  );
}

/**
 * ツールバー内に配置されるアクション実行用ボタン。
 */
function ToolbarButton({
  className,
  ...props
}: React.ComponentProps<typeof ToolbarPrimitive.Button>) {
  return (
    <ToolbarPrimitive.Button
      data-slot='toolbar-button'
      className={cn(
        'inline-flexitems-center justify-center whitespace-nowrap rounded-sm px-2.5 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground hover:bg-muted hover:text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

/**
 * ツールバー内のグループやアイテム同士を区切るためのセパレーター。
 */
function ToolbarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof ToolbarPrimitive.Separator>) {
  return (
    <ToolbarPrimitive.Separator
      data-slot='toolbar-separator'
      className={cn('mx-1 h-5 w-[1px] bg-border', className)}
      {...props}
    />
  );
}

/**
 * ツールバー内に配置されるナビゲーション用のリンク。
 */
function ToolbarLink({ className, ...props }: React.ComponentProps<typeof ToolbarPrimitive.Link>) {
  return (
    <ToolbarPrimitive.Link
      data-slot='toolbar-link'
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-2.5 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-muted hover:text-muted-foreground data-[state=active]:bg-accent data-[state=active]:text-accent-foreground',
        className,
      )}
      {...props}
    />
  );
}

/**
 * オン・オフの状態を切り替えるトグル式のツールバーアイテム。
 */
function ToolbarToggleItem({
  className,
  ...props
}: React.ComponentProps<typeof TogglePrimitive> & { value: string }) {
  return (
    <TogglePrimitive
      data-slot='toolbar-toggle-item'
      className={cn(
        'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[pressed]:bg-accent data-[pressed]:text-accent-foreground p-2',
        className,
      )}
      {...props}
    />
  );
}

/**
 * 複数のトグルアイテムをまとめて選択状態を管理するグループコンポーネント。
 */
function ToolbarToggleGroup({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive>) {
  return (
    <ToggleGroupPrimitive
      data-slot='toolbar-toggle-group'
      className={cn('flex items-center gap-1', className)}
      {...props}
    />
  );
}

export {
  Toolbar,
  ToolbarGroup,
  ToolbarButton,
  ToolbarSeparator,
  ToolbarLink,
  ToolbarToggleGroup,
  ToolbarToggleItem,
};
