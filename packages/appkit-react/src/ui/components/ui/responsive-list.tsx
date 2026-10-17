/**
 * レスポンシブデータリストコンポーネント
 *
 * shadcn/ui パターンに準拠:
 * - テーマトークン使用 (bg-card, text-muted-foreground など)
 * - testId prop 対応
 * - data-slot 属性
 */

import * as React from 'react';
import { cn } from '../../lib/utils';

// ============================================================================
// DataList - Table on desktop, Cards on mobile
// ============================================================================

export interface DataListColumn<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
  /** Hide this column on mobile */
  mobileHidden?: boolean;
  /** Show label on mobile card (default: true) */
  mobileLabel?: boolean;
}

export interface DataListProps<T> {
  data: T[];
  columns: DataListColumn<T>[];
  keyField: keyof T;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  className?: string;
  mobileCardClassName?: string;
  testId?: string;
}

/**
 * PCサイズではテーブル形式、モバイルサイズではカード形式でデータを表示するレスポンシブなデータリストコンポーネント。
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

export interface ResponsiveGridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: 'none' | 'sm' | 'default' | 'lg';
}

const gapClasses = {
  none: 'gap-0',
  sm: 'gap-2',
  default: 'gap-4',
  lg: 'gap-6',
};

/**
 * デバイスの画面幅に合わせてカラム数を切り替えることができるレスポンシブグリッドレイアウト。
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

export interface SwipeableItemProps extends React.HTMLAttributes<HTMLDivElement> {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  threshold?: number;
}

/**
 * タッチデバイスなどで左右スワイプ操作によるアクション（削除や編集など）を実行できるコンポーネント。
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

export interface PullToRefreshProps extends React.HTMLAttributes<HTMLDivElement> {
  onRefresh: () => Promise<void>;
  pullThreshold?: number;
}

/**
 * モバイル端末などで画面上部を下に引っ張ってデータを更新する（Pull to Refresh）機能を実装するコンポーネント。
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
