/**
 * @fileoverview Sidebar Compound Components (Sidebar)
 *
 * 合成可能なサイドバーUIコンポーネント群。
 * プリセットの `<SmartSidebar>` では対応しきれないヘッダー/フッターの独自ウィジェットや
 * メニューグループ間のカスタムスロット配置を可能にします。
 *
 * @module sidebar/sidebar-compound
 */

/* eslint-disable react-refresh/only-export-components */

import * as React from 'react';
import { cn } from "../../lib/utils";
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { PanelLeft, ChevronDown, ChevronRight } from 'lucide-react';

// =============================================================================
// Context
// =============================================================================

export interface SidebarCompoundContextValue {
  collapsed: boolean;
  activePath?: string;
  onNavigate?: (path: string) => void;
  onToggleCollapse?: () => void;
}

const SidebarCompoundContext = React.createContext<SidebarCompoundContextValue | null>(null);

/**
 * SidebarCompound のコンテキストを取得するフック
 */
export function useSidebarCompoundContext() {
  const context = React.useContext(SidebarCompoundContext);
  if (!context) {
    throw new Error('Sidebar compound components must be used within <Sidebar.Root>');
  }
  return context;
}

// =============================================================================
// Sidebar Root
// =============================================================================

export interface SidebarRootProps extends React.HTMLAttributes<HTMLDivElement> {
  collapsed?: boolean;
  activePath?: string;
  onNavigate?: (path: string) => void;
  onToggleCollapse?: () => void;
  children: React.ReactNode;
}

/**
 * サイドバーのルートコンポーネント
 */
export function SidebarRoot({
  collapsed = false,
  activePath,
  onNavigate,
  onToggleCollapse,
  children,
  className,
  ...props
}: SidebarRootProps) {
  const contextValue = React.useMemo<SidebarCompoundContextValue>(
    () => ({ collapsed, activePath, onNavigate, onToggleCollapse }),
    [collapsed, activePath, onNavigate, onToggleCollapse],
  );

  return (
    <TooltipProvider>
      <SidebarCompoundContext.Provider value={contextValue}>
        <aside
          className={cn(
            'flex flex-col border-r border-border bg-card text-card-foreground transition-all duration-300',
            collapsed ? 'w-16' : 'w-64',
            className,
          )}
          {...props}
        >
          {children}
        </aside>
      </SidebarCompoundContext.Provider>
    </TooltipProvider>
  );
}

// =============================================================================
// Sidebar Header
// =============================================================================

export interface SidebarHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  logo?: React.ReactNode;
  showToggle?: boolean;
  children?: React.ReactNode;
}

/**
 * サイドバーのヘッダー領域
 */
export function SidebarHeaderSlot({
  title,
  logo,
  showToggle = true,
  className,
  children,
  ...props
}: SidebarHeaderProps) {
  const { collapsed, onToggleCollapse } = useSidebarCompoundContext();

  return (
    <div
      className={cn(
        'flex h-14 items-center border-b border-border px-3',
        collapsed ? 'justify-center' : 'justify-between',
        className,
      )}
      {...props}
    >
      {children ? (
        children
      ) : (
        <>
          <div className={cn('flex items-center gap-2 overflow-hidden', collapsed && 'justify-center')}>
            {logo}
            {!collapsed && title && (
              <span className="font-semibold text-sm truncate">{title}</span>
            )}
          </div>
          {!collapsed && showToggle && onToggleCollapse && (
            <Button variant="ghost" size="icon" onClick={onToggleCollapse} className="h-8 w-8">
              <PanelLeft className="h-4 w-4" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}

// =============================================================================
// Sidebar Content & Groups
// =============================================================================

export interface SidebarContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * サイドバーのメインナビゲーションスクロール領域
 */
export function SidebarContentSlot({ className, children, ...props }: SidebarContentProps) {
  return (
    <ScrollArea className={cn('flex-1 px-3 py-3', className)} {...props}>
      <div className="space-y-4">{children}</div>
    </ScrollArea>
  );
}

export interface SidebarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  children: React.ReactNode;
}

/**
 * サイドバーのメニューグループ
 */
export function SidebarGroupSlot({
  title,
  collapsible = false,
  defaultCollapsed = false,
  className,
  children,
  ...props
}: SidebarGroupProps) {
  const { collapsed } = useSidebarCompoundContext();
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

  return (
    <div className={cn('space-y-1', className)} {...props}>
      {title && !collapsed && (
        <div
          className={cn(
            'flex items-center justify-between px-2 py-1 text-xs font-medium text-muted-foreground',
            collapsible && 'cursor-pointer hover:text-foreground',
          )}
          onClick={collapsible ? () => setIsCollapsed(!isCollapsed) : undefined}
        >
          <span>{title}</span>
          {collapsible && (
            isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
          )}
        </div>
      )}
      {!isCollapsed && <div className="space-y-0.5">{children}</div>}
    </div>
  );
}

// =============================================================================
// Sidebar Item
// =============================================================================

export interface SidebarItemProps extends React.HTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  label: string;
  path?: string;
  active?: boolean;
  badge?: React.ReactNode;
  disabled?: boolean;
}

/**
 * 個別ナビゲーションアイテム
 */
export function SidebarItemSlot({
  icon,
  label,
  path,
  active: propActive,
  badge,
  disabled = false,
  className,
  onClick,
  ...props
}: SidebarItemProps) {
  const { collapsed, activePath, onNavigate } = useSidebarCompoundContext();
  const isActive = propActive ?? (path ? activePath === path : false);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (path && onNavigate) onNavigate(path);
    onClick?.(e);
  };

  const button = (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary/10 text-primary font-semibold'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        collapsed && 'justify-center px-0',
        className,
      )}
      {...props}
    >
      {icon && <span className="h-4 w-4 shrink-0 flex items-center justify-center">{icon}</span>}
      {!collapsed && <span className="truncate flex-1 text-left">{label}</span>}
      {!collapsed && badge && <span>{badge}</span>}
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger render={button} />
        <TooltipContent side="right" align="center">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return button;
}

// =============================================================================
// Sidebar Footer
// =============================================================================

export interface SidebarFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * サイドバーのフッター領域（ユーザー情報や設定等）
 */
export function SidebarFooterSlot({ className, children, ...props }: SidebarFooterProps) {
  return (
    <div className={cn('border-t border-border p-3', className)} {...props}>
      {children}
    </div>
  );
}

// =============================================================================
// Export Object
// =============================================================================

export const Sidebar = {
  Root: SidebarRoot,
  Header: SidebarHeaderSlot,
  Content: SidebarContentSlot,
  Group: SidebarGroupSlot,
  Item: SidebarItemSlot,
  Footer: SidebarFooterSlot,
  Separator: Separator,
};
