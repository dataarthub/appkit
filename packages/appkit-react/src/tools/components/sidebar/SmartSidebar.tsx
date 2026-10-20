import * as React from 'react';
import { cn } from "../../lib/utils";
import { Button, buttonVariants } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { PanelLeft } from 'lucide-react';
import { useTheme, type SpacingTheme } from '../theme/theme-context';

const sidebarDensity: Record<SpacingTheme, {
  groupGap: string;
  itemGap: string;
  itemHeight: string;
}> = {
  compact: { groupGap: 'gap-1', itemGap: 'gap-0', itemHeight: 'h-8' },
  normal: { groupGap: 'gap-2', itemGap: 'gap-1', itemHeight: 'h-9' },
  comfortable: { groupGap: 'gap-4', itemGap: 'gap-2', itemHeight: 'h-11' },
};

/**
 * A navigation item rendered by {@link SmartSidebar}.
 * @see SmartSidebar
 */
export interface SmartSidebarItem {
  /** Visible item label; also used in collapsed tooltips. */
  label: string;
  /** Icon rendered in expanded and collapsed layouts. */
  icon: React.ReactNode;
  /** Opaque destination passed to onNavigate; compared exactly with activePath. */
  path: string;
  /** Disables item activation when true; omitted means enabled. */
  disabled?: boolean;
  /** Additional content shown beside the expanded item label. */
  extra?: React.ReactNode;
}

/**
 * サイドバーのグループ
 */
export interface SmartSidebarGroup {
  /** Optional heading; omitted headings render no group title. */
  title?: string;
  /** Items in display order. */
  items: SmartSidebarItem[];
  /** Allows the expanded sidebar heading to toggle between all items and a two-item preview. */
  collapsible?: boolean;
  /** Initial two-item group preview state; defaults to false. Later prop changes do not reset local state. */
  defaultCollapsed?: boolean;
}

/**
 * サイドバーのプロップス
 */
export interface SidebarProps {
  /** Additional classes for the sidebar root. */
  className?: string;
  /** Groups in display order. */
  groups: SmartSidebarGroup[];
  /** Optional navigation items pinned below the scrollable groups. */
  footerItems?: SmartSidebarItem[];
  /** Exact path used to highlight active items; no item is active when omitted. */
  activePath?: string;
  /** Called with the activated item path; the host performs routing. */
  onNavigate?: (path: string) => void;
  /** Controlled whole-sidebar collapse state; defaults to false. */
  collapsed?: boolean;
  /** Called by the toggle button; the host must update collapsed. Omitted hides the button. */
  onToggleCollapse?: () => void;
  /** Renders header content with the current collapsed state. */
  header?: (collapsed: boolean) => React.ReactNode;
  /** Renders footer content with the current collapsed state. */
  sidebarFooter?: (collapsed: boolean) => React.ReactNode;
}

/**
 * Renders grouped navigation with controlled sidebar collapse and local group collapse.
 * @param props - Navigation items, controlled selection/collapse and render callbacks; see {@link SidebarProps}.
 * @returns The sidebar element, including its own tooltip provider.
 * @remarks Import Appkit CSS. ThemeProvider enables reactive spacing density; without one,
 * the theme context uses normal spacing. The host owns routing
 * and updates activePath/collapsed. Sidebar from the same entry is a compound namespace;
 * use SmartSidebar for this groups-based API. CSS variables --sidebar-width and
 * --sidebar-collapsed-width fall back to 16rem and 4rem respectively.
 * @example
 * ```tsx
 * import { useState } from 'react';
 * import { SmartSidebar } from '@alneas/appkit-react/tools/sidebar';
 * import { ThemeProvider } from '@alneas/appkit-react/ui/theme';
 * import '@alneas/appkit-react/styles';
 *
 * export function Navigation() {
 *   const [path, setPath] = useState('/');
 *   const [collapsed, setCollapsed] = useState(false);
 *   return <ThemeProvider><SmartSidebar
 *     groups={[{ title: 'Main', items: [{ label: 'Home', icon: <span>H</span>, path: '/' }] }]}
 *     activePath={path} onNavigate={setPath} collapsed={collapsed}
 *     onToggleCollapse={() => setCollapsed(value => !value)}
 *   /></ThemeProvider>;
 * }
 * ```
 */
export function SmartSidebar({
  className,
  groups,
  footerItems,
  activePath,
  onNavigate,
  collapsed = false,
  onToggleCollapse,
  header,
  sidebarFooter,
}: SidebarProps) {
  const { spacingTheme } = useTheme();
  const density = sidebarDensity[spacingTheme];
  const handleNavigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    }
  };

  // Determine width based on collapsed state
  // w-64 (16rem) -> expanded
  // w-16 (4rem) -> collapsed
  // You can adjust these values or make them configurable if needed
  const widthClass = collapsed
    ? 'w-[var(--sidebar-collapsed-width,4rem)]'
    : 'w-[var(--sidebar-width,16rem)]';

  return (
    <TooltipProvider>
      <div
        className={cn(
          'flex flex-col h-full bg-muted/20 border-r border-border transition-all duration-300 ease-in-out',
          widthClass,
          className,
        )}
      >
        {/* Combined Header and Toggle Section */}
        <div
          className={cn(
            'flex-none flex items-center h-14 px-3 gap-2',
            collapsed ? 'justify-center' : 'justify-between',
          )}
        >
          {/* Custom Header Content */}
          {header && (
            <div
              className={cn(
                'overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out',
                collapsed && onToggleCollapse
                  ? 'max-w-0 opacity-0 flex-none'
                  : 'max-w-full flex-1 opacity-100',
              )}
            >
              {header(collapsed)}
            </div>
          )}

          {/* Toggle Button */}
          {onToggleCollapse && (
            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-8 shrink-0'
              onClick={onToggleCollapse}
            >
              <PanelLeft size={16} />
            </Button>
          )}
        </div>

        <ScrollArea className='flex-1 py-2 min-h-0'>
          <nav className={cn('flex flex-col px-2', density.groupGap)}>
            {groups.map((group, index) => (
              <SidebarGroupSection
                key={index}
                group={group}
                collapsed={collapsed}
                activePath={activePath}
                onNavigate={handleNavigate}
                density={density}
              />
            ))}
          </nav>
        </ScrollArea>

        {/* Footer Items Section (Sticky Bottom) */}
        {footerItems && footerItems.length > 0 && (
          <div className='flex-none mt-auto p-2 border-t border-border bg-background/50 backdrop-blur-sm'>
            <ul className={cn('flex flex-col', density.itemGap)}>
              {footerItems.map((item, index) => (
                <SidebarItemRow
                  key={index}
                  item={item}
                  collapsed={collapsed}
                  isActive={activePath === item.path}
                  onNavigate={handleNavigate}
                  itemHeight={density.itemHeight}
                />
              ))}
            </ul>
          </div>
        )}

        {/* Custom Footer Section */}
        {sidebarFooter && (
          <div
            className={cn(
              'flex-none p-4 border-t border-border bg-background/50 backdrop-blur-sm',
              collapsed ? 'flex justify-center' : '',
            )}
          >
            {sidebarFooter(collapsed)}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

function SidebarGroupSection({
  group,
  collapsed,
  activePath,
  onNavigate,
  density,
}: {
  group: SmartSidebarGroup;
  collapsed: boolean;
  activePath?: string;
  onNavigate: (path: string) => void;
  density: (typeof sidebarDensity)[SpacingTheme];
}) {
  const [groupCollapsed, setGroupCollapsed] = React.useState(
    group.defaultCollapsed ?? false
  );

  const isGroupCollapsible = group.collapsible && !collapsed;

  const toggleGroup = React.useCallback(() => {
    if (isGroupCollapsible) setGroupCollapsed(prev => !prev);
  }, [isGroupCollapsible]);

  // If no items, don't render group
  if (!group.items?.length) return null;

  const visibleItems = isGroupCollapsible && groupCollapsed
    ? group.items.slice(0, 2)
    : group.items;

  return (
    <div className={cn('flex flex-col', density.itemGap)}>
      {/* Group Title Area - Fixed Height for smooth transition */}
      {group.title && (
        <div
          className={cn(
            'h-7 flex items-center relative px-2',
            isGroupCollapsible && 'cursor-pointer hover:text-primary transition-colors',
          )}
          onClick={toggleGroup}
        >
          {/* Title Text */}
          <h4
            className={cn(
              'text-sm font-semibold text-primary/80 uppercase tracking-wider overflow-hidden text-ellipsis whitespace-nowrap absolute left-2 right-2 transition-all duration-300 ease-in-out',
              collapsed ? 'opacity-0 translate-x-[-10px]' : 'opacity-100 translate-x-0',
            )}
          >
            {group.title}
            {isGroupCollapsible && (
              <span className='ml-1.5 text-xs opacity-60'>
                {groupCollapsed ? '▸' : '▾'}
              </span>
            )}
          </h4>

          {/* Collapsed Separator */}
          <div
            className={cn(
              'absolute left-0 right-0 top-1/2 -translate-y-1/2 flex justify-center transition-all duration-300',
              collapsed ? 'opacity-100' : 'opacity-0',
            )}
          >
            <Separator className='w-8 opacity-50' />
          </div>
        </div>
      )}

      <ul className={cn('flex flex-col', density.itemGap)}>
        {visibleItems.map((item, index) => (
          <SidebarItemRow
            key={index}
            item={item}
            collapsed={collapsed}
            isActive={activePath === item.path}
            onNavigate={onNavigate}
            itemHeight={density.itemHeight}
          />
        ))}
        {isGroupCollapsible && groupCollapsed && group.items.length > 2 && (
          <li>
            <button
              onClick={(e) => { e.stopPropagation(); setGroupCollapsed(false); }}
              className='flex w-full items-center justify-center h-8 text-xs text-muted-foreground hover:text-primary transition-colors'
            >
              +{group.items.length - 2} more
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}

function SidebarItemRow({
  item,
  collapsed,
  isActive,
  onNavigate,
  itemHeight,
}: {
  item: SmartSidebarItem;
  collapsed: boolean;
  isActive: boolean;
  onNavigate: (path: string) => void;
  itemHeight: string;
}) {
  return (
    <li>
      <Tooltip>
        <TooltipTrigger
          className={cn(
            buttonVariants({ variant: isActive ? 'secondary' : 'ghost' }),
            'flex w-full items-center transition-all duration-300',
            itemHeight,
            collapsed ? 'justify-center px-1' : 'justify-start px-3',
            isActive && 'bg-primary/10 text-primary font-medium hover:bg-primary/20',
            !isActive && 'text-muted-foreground hover:text-foreground font-normal',
          )}
          onClick={() => onNavigate(item.path)}
          disabled={item.disabled}
        >
          {/* Icon Wrapper */}
          <span
            className={cn(
              'flex items-center justify-center shrink-0 transition-all duration-300',
              isActive ? 'text-primary' : 'opacity-70',
            )}
          >
            {React.isValidElement(item.icon)
              ? // @ts-expect-error - cloning strictly for size prop if supported
                React.cloneElement(item.icon, { size: 18 })
              : item.icon}
          </span>

          {/* Label & Extra Wrapper for smooth transition */}
          <span
            className={cn(
              'flex flex-1 items-center overflow-hidden transition-all duration-300 ease-in-out',
              collapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100 ml-3',
            )}
          >
            <span className='truncate flex-1 text-left text-sm'>{item.label}</span>
            {item.extra && (
              <span className='shrink-0 text-xs text-muted-foreground ml-2'>{item.extra}</span>
            )}
          </span>
        </TooltipTrigger>
        {collapsed && (
          <TooltipContent side='right' className='flex items-center gap-2'>
            {item.label}
            {item.extra && <span className='opacity-70'>{item.extra}</span>}
          </TooltipContent>
        )}
      </Tooltip>
    </li>
  );
}
