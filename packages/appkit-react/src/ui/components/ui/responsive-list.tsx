/** Responsive record presentation and touch interaction wrappers; the host owns data loading and actions. */

import * as React from 'react';
import { cn } from '../../lib/utils';

// ============================================================================
// DataList - Table on desktop, Cards on mobile
// ============================================================================

/**
 * One desktop-table/mobile-card column and optional row renderer.
 * @typeParam T - Complete row shape used by record keys, renderers and callbacks.
 * @remarks Inherited native or primitive props keep their upstream types and behavior; this declaration documents only the wrapper-owned options.
 * @see DataList
 */
export interface DataListColumn<T> {
  /**
   * Row property or dot-separated lookup path used for default rendering and column keys.
   */
  key: keyof T | string;
  /**
   * Column heading, also used as a mobile card label unless mobileLabel=false.
   */
  header: string;
  /**
   * Custom renderer receiving the complete row; may run for both desktop and mobile markup.
   * @param item - Complete row supplied by the renderer/click handler.
   * @returns Content rendered for this row/option.
   */
  render?: (item: T) => React.ReactNode;
  /**
   * Additional classes merged with wrapper styling; see the component for the targeted element.
   */
  className?: string;
  /**
   * Hides this column only in mobile cards; omitted/false keeps it visible.
   */
  mobileHidden?: boolean;
  /**
   * Shows the column header beside the mobile value unless explicitly false.
   */
  mobileLabel?: boolean;
}

/**
 * Records, stable row keys and responsive rendering behavior for DataList.
 * @typeParam T - Complete row shape used by record keys, renderers and callbacks.
 * @remarks Inherited native or primitive props keep their upstream types and behavior; this declaration documents only the wrapper-owned options.
 * @see DataList
 */
export interface DataListProps<T> {
  /**
   * Rows in display order; an empty array renders only emptyMessage.
   */
  data: T[];
  /**
   * Column definitions in display order; reused for desktop and mobile markup.
   */
  columns: DataListColumn<T>[];
  /**
   * Row field whose String(value) supplies React keys; provide unique stable values.
   */
  keyField: keyof T;
  /**
   * Called with the row on desktop-row or mobile-card click; adds pointer styling but no keyboard activation.
   * @param item - Complete row supplied by the renderer/click handler.
   * @returns No value; complete the host callback action.
   */
  onRowClick?: (item: T) => void;
  /**
   * Text shown when data is empty.
   * @defaultValue データがありません
   */
  emptyMessage?: string;
  /**
   * Additional classes merged with wrapper styling; see the component for the targeted element.
   */
  className?: string;
  /**
   * Additional classes on each mobile card.
   */
  mobileCardClassName?: string;
  /**
   * Root data-testid for nonempty data; the empty state uses `${testId}-empty`.
   */
  testId?: string;
}

/**
 * Renders the same records as a desktop table and mobile cards using responsive visibility classes.
 * @typeParam T - Record shape used by data, column render callbacks and row-click callbacks; must extend Record<string, unknown>.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling. Wrapper defaults: emptyMessage='データがありません'.
 * @returns The rendered DataList composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. DataList mounts both desktop/mobile representations; CSS switches visibility at md, so custom render callbacks may execute for both. It does not virtualize or add keyboard row activation. keyField must give stable unique stringifiable keys. ResponsiveGrid creates dynamic Tailwind classes: the host CSS must include the requested classes. Touch helpers do not add mouse/keyboard equivalents or persistence.
 * @example
 * ```tsx
 * import type { ComponentProps } from 'react';
 * import { DataList, ResponsiveGrid, SwipeableItem, PullToRefresh } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example({ refresh }: { refresh: () => Promise<void> }) {
 *   return (<PullToRefresh onRefresh={async () => { await refresh(); }}><ResponsiveGrid><SwipeableItem onSwipeLeft={() => console.log("Left swipe")}><DataList data={[{ id: "one", title: "Draft" }]} keyField="id" columns={[{ key: "title", header: "Title" }]} /></SwipeableItem></ResponsiveGrid></PullToRefresh>);
 * }
 * ```
 */
function DataList<T extends Record<string, unknown>>({
  data,
  columns,
  keyField,
  onRowClick,
  emptyMessage = 'データがありません',
  className,
  mobileCardClassName,
  testId,
}: DataListProps<T>) {
  const getValue = (item: T, key: string): unknown => {
    const keys = key.split('.');
    let value: unknown = item;
    for (const k of keys) {
      value = (value as Record<string, unknown>)?.[k];
    }
    return value;
  };

  if (data.length === 0) {
    return (
      <div
        data-slot='data-list-empty'
        data-testid={testId ? `${testId}-empty` : undefined}
        className='flex items-center justify-center py-12 text-muted-foreground'
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div data-slot='data-list' data-testid={testId} className={cn('w-full', className)}>
      {/* Desktop Table */}
      <div className='hidden md:block overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b bg-muted/50'>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={cn('py-3 px-4 text-left font-medium text-foreground', col.className)}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr
                key={String(item[keyField])}
                data-slot='data-list-row'
                className={cn(
                  'border-b transition-colors hover:bg-muted/50',
                  onRowClick && 'cursor-pointer',
                )}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((col) => (
                  <td key={String(col.key)} className={cn('py-3 px-4', col.className)}>
                    {col.render ? col.render(item) : String(getValue(item, String(col.key)) ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className='md:hidden space-y-3'>
        {data.map((item) => (
          <div
            key={String(item[keyField])}
            data-slot='data-list-card'
            className={cn(
              'p-4 border rounded-lg bg-card text-card-foreground shadow-sm',
              onRowClick && 'cursor-pointer active:bg-muted/50',
              mobileCardClassName,
            )}
            onClick={() => onRowClick?.(item)}
          >
            {columns
              .filter((col) => !col.mobileHidden)
              .map((col, idx) => (
                <div
                  key={String(col.key)}
                  className={cn(
                    'flex justify-between items-center',
                    idx > 0 && 'mt-2 pt-2 border-t border-dashed border-border',
                  )}
                >
                  {col.mobileLabel !== false && (
                    <span className='text-sm text-muted-foreground'>{col.header}</span>
                  )}
                  <span className={cn('font-medium', col.className)}>
                    {col.render ? col.render(item) : String(getValue(item, String(col.key)) ?? '')}
                  </span>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// ResponsiveGrid
// ============================================================================

/**
 * Native div attributes and dynamically constructed breakpoint column classes.
 * @remarks Inherited native or primitive props keep their upstream types and behavior; this declaration documents only the wrapper-owned options.
 * @see ResponsiveGrid
 */
export interface ResponsiveGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Breakpoint column counts; defaults to { default: 1, md: 2, lg: 3 }. A supplied object replaces the default, with no merging. Requested dynamic utility classes must exist in host CSS.
   */
  cols?: {
    /**
     * Column count below the sm breakpoint; if omitted in a supplied cols object, no base column class is added.
     */
    default?: number;
    /**
     * Column count from the sm breakpoint; a requested utility class must exist in the host CSS.
     */
    sm?: number;
    /**
     * Column count from the md breakpoint; a requested utility class must exist in the host CSS.
     */
    md?: number;
    /**
     * Column count from the lg breakpoint; a requested utility class must exist in the host CSS.
     */
    lg?: number;
    /**
     * Column count from the xl breakpoint; a requested utility class must exist in the host CSS.
     */
    xl?: number;
  };
  /**
   * Gap preset: none=gap-0, sm=gap-2, default=gap-4, lg=gap-6; defaults to default.
   */
  gap?: 'none' | 'sm' | 'default' | 'lg';
}

const gapClasses = {
  none: 'gap-0',
  sm: 'gap-2',
  default: 'gap-4',
  lg: 'gap-6',
};

/**
 * Builds grid-column utility classes for caller-selected breakpoints.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling. Wrapper defaults: cols={ default: 1, md: 2, lg: 3 }, gap='default'.
 * @returns The rendered ResponsiveGrid composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. DataList mounts both desktop/mobile representations; CSS switches visibility at md, so custom render callbacks may execute for both. It does not virtualize or add keyboard row activation. keyField must give stable unique stringifiable keys. ResponsiveGrid creates dynamic Tailwind classes: the host CSS must include the requested classes. Touch helpers do not add mouse/keyboard equivalents or persistence. cols defaults to { default: 1, md: 2, lg: 3 }; supplying cols replaces that object without merging omitted breakpoints.
 * @example
 * ```tsx
 * import type { ComponentProps } from 'react';
 * import { DataList, ResponsiveGrid, SwipeableItem, PullToRefresh } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example({ refresh }: { refresh: () => Promise<void> }) {
 *   return (<PullToRefresh onRefresh={async () => { await refresh(); }}><ResponsiveGrid><SwipeableItem onSwipeLeft={() => console.log("Left swipe")}><DataList data={[{ id: "one", title: "Draft" }]} keyField="id" columns={[{ key: "title", header: "Title" }]} /></SwipeableItem></ResponsiveGrid></PullToRefresh>);
 * }
 * ```
 */
function ResponsiveGrid({
  children,
  cols = { default: 1, md: 2, lg: 3 },
  gap = 'default',
  className,
  ...props
}: ResponsiveGridProps) {
  // Build grid classes dynamically
  const colClasses = [
    cols.default && `grid-cols-${cols.default}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      data-slot='responsive-grid'
      className={cn('grid', gapClasses[gap], colClasses, className)}
      {...props}
    >
      {children}
    </div>
  );
}

// ============================================================================
// SwipeableItem
// ============================================================================

/**
 * Native outer div attributes and touch-swipe action configuration.
 * @remarks Inherited native or primitive props keep their upstream types and behavior; this declaration documents only the wrapper-owned options.
 * @see SwipeableItem
 */
export interface SwipeableItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Called at touch end when left displacement exceeds threshold; the wrapper then resets translation.
   * @returns No value; complete the host callback action.
   */
  onSwipeLeft?: () => void;
  /**
   * Called at touch end when right displacement exceeds threshold; the wrapper then resets translation.
   * @returns No value; complete the host callback action.
   */
  onSwipeRight?: () => void;
  /**
   * Background content revealed by a leftward swipe.
   */
  leftAction?: React.ReactNode;
  /**
   * Background content revealed by a rightward swipe.
   */
  rightAction?: React.ReactNode;
  /**
   * Strict activation threshold in CSS pixels; defaults to 50. Translation is capped at ±100, so thresholds >=100 never activate.
   */
  threshold?: number;
}

/**
 * Reveals side actions during a horizontal touch swipe and notifies the host after a threshold.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling. Wrapper defaults: threshold=50.
 * @returns The rendered SwipeableItem composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. DataList mounts both desktop/mobile representations; CSS switches visibility at md, so custom render callbacks may execute for both. It does not virtualize or add keyboard row activation. keyField must give stable unique stringifiable keys. ResponsiveGrid creates dynamic Tailwind classes: the host CSS must include the requested classes. Touch helpers do not add mouse/keyboard equivalents or persistence. threshold defaults to 50 CSS pixels; displacement is clamped to ±100px and resets after touch end. leftAction appears during a left swipe, rightAction during a right swipe. Callbacks run only when displacement strictly exceeds the threshold.
 * @example
 * ```tsx
 * import type { ComponentProps } from 'react';
 * import { DataList, ResponsiveGrid, SwipeableItem, PullToRefresh } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example({ refresh }: { refresh: () => Promise<void> }) {
 *   return (<PullToRefresh onRefresh={async () => { await refresh(); }}><ResponsiveGrid><SwipeableItem onSwipeLeft={() => console.log("Left swipe")}><DataList data={[{ id: "one", title: "Draft" }]} keyField="id" columns={[{ key: "title", header: "Title" }]} /></SwipeableItem></ResponsiveGrid></PullToRefresh>);
 * }
 * ```
 */
function SwipeableItem({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
  threshold = 50,
  className,
  ...props
}: SwipeableItemProps) {
  const [translateX, setTranslateX] = React.useState(0);
  const [startX, setStartX] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const diff = e.touches[0].clientX - startX;
    const maxSwipe = 100;
    setTranslateX(Math.max(-maxSwipe, Math.min(maxSwipe, diff)));
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (translateX > threshold && onSwipeRight) {
      onSwipeRight();
    } else if (translateX < -threshold && onSwipeLeft) {
      onSwipeLeft();
    }
    setTranslateX(0);
  };

  return (
    <div
      data-slot='swipeable-item'
      className={cn('relative overflow-hidden', className)}
      {...props}
    >
      {/* Background actions */}
      <div className='absolute inset-0 flex'>
        <div className='flex-1 flex items-center justify-start px-4 bg-green-500 text-white'>
          {rightAction}
        </div>
        <div className='flex-1 flex items-center justify-end px-4 bg-destructive text-destructive-foreground'>
          {leftAction}
        </div>
      </div>

      {/* Swipeable content */}
      <div
        className='relative bg-background transition-transform'
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// PullToRefresh
// ============================================================================

/**
 * Native outer div attributes and asynchronous downward-pull refresh configuration.
 * @remarks Inherited native or primitive props keep their upstream types and behavior; this declaration documents only the wrapper-owned options.
 * @see PullToRefresh
 */
export interface PullToRefreshProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Called and awaited after an eligible downward pull; the host performs refresh and handles errors. Rejection leaves the local refreshing state set.
   * @returns A promise resolving when host refresh work completes; rejection is not caught by the wrapper.
   */
  onRefresh: () => Promise<void>;
  /**
   * Visual pull distance in CSS pixels required for refresh; defaults to 80. Visual distance is half touch displacement capped at 100; values >100 cannot activate.
   */
  pullThreshold?: number;
}

/**
 * Tracks downward touch motion and requests an asynchronous refresh after a threshold.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling. Wrapper defaults: pullThreshold=80.
 * @returns The rendered PullToRefresh composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. DataList mounts both desktop/mobile representations; CSS switches visibility at md, so custom render callbacks may execute for both. It does not virtualize or add keyboard row activation. keyField must give stable unique stringifiable keys. ResponsiveGrid creates dynamic Tailwind classes: the host CSS must include the requested classes. Touch helpers do not add mouse/keyboard equivalents or persistence. A pull starts only when window.scrollY is zero. Visual distance is half the pointer displacement, capped at 100 CSS pixels; pullThreshold defaults to 80. Refresh is awaited, but there is no concurrency guard or finally cleanup: rejection leaves refreshing/pull state set. Handle errors inside onRefresh when recovery is needed. Native touch handlers supplied in props override the wrapper handlers.
 * @example
 * ```tsx
 * import type { ComponentProps } from 'react';
 * import { DataList, ResponsiveGrid, SwipeableItem, PullToRefresh } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example({ refresh }: { refresh: () => Promise<void> }) {
 *   return (<PullToRefresh onRefresh={async () => { await refresh(); }}><ResponsiveGrid><SwipeableItem onSwipeLeft={() => console.log("Left swipe")}><DataList data={[{ id: "one", title: "Draft" }]} keyField="id" columns={[{ key: "title", header: "Title" }]} /></SwipeableItem></ResponsiveGrid></PullToRefresh>);
 * }
 * ```
 */
function PullToRefresh({
  children,
  onRefresh,
  pullThreshold = 80,
  className,
  ...props
}: PullToRefreshProps) {
  const [isPulling, setIsPulling] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [pullDistance, setPullDistance] = React.useState(0);
  const startY = React.useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling) return;
    const distance = e.touches[0].clientY - startY.current;
    if (distance > 0) {
      setPullDistance(Math.min(distance * 0.5, 100));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= pullThreshold) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
    setIsPulling(false);
    setPullDistance(0);
  };

  return (
    <div
      data-slot='pull-to-refresh'
      className={cn('relative', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      {...props}
    >
      {/* Pull indicator */}
      <div
        className='absolute left-1/2 -translate-x-1/2 flex items-center justify-center transition-all'
        style={{
          top: pullDistance - 40,
          opacity: pullDistance / pullThreshold,
        }}
      >
        <div
          className={cn(
            'w-6 h-6 border-2 border-primary border-t-transparent rounded-full',
            isRefreshing && 'animate-spin',
          )}
        />
      </div>

      {/* Content */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling ? 'none' : 'transform 0.2s',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export { DataList, ResponsiveGrid, SwipeableItem, PullToRefresh };
