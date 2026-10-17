import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef } from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

import { cn } from '../../lib/utils';
import { Button } from './button';

/**
 * ページネーションのルートコンテナ
 */
const Pagination = forwardRef<ComponentRef<'nav'>, ComponentPropsWithoutRef<'nav'>>(
  ({ className, ...props }, ref) => (
    <nav
      ref={ref}
      role='navigation'
      aria-label='pagination'
      className={cn('mx-auto flex w-full justify-center', className)}
      {...props}
    />
  ),
);
Pagination.displayName = 'Pagination';

/**
 * ページネーションアイテムのコンテナ
 */
const PaginationContent = forwardRef<ComponentRef<'ul'>, ComponentPropsWithoutRef<'ul'>>(
  ({ className, ...props }, ref) => (
    <ul ref={ref} className={cn('flex flex-row items-center gap-1', className)} {...props} />
  ),
);
PaginationContent.displayName = 'PaginationContent';

/**
 * 個別のページネーションアイテム
 */
const PaginationItem = forwardRef<ComponentRef<'li'>, ComponentPropsWithoutRef<'li'>>(
  ({ className, ...props }, ref) => <li ref={ref} className={cn('', className)} {...props} />,
);
PaginationItem.displayName = 'PaginationItem';

type PaginationLinkProps = ComponentPropsWithoutRef<'a'> & {
  isActive?: boolean;
};

/**
 * ページ番号リンク
 */
const PaginationLink = ({ className, isActive, ...props }: PaginationLinkProps) => (
  <a
    aria-current={isActive ? 'page' : undefined}
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
      isActive || 'hover:bg-accent hover:text-accent-foreground',
      isActive && 'bg-accent text-accent-foreground',
      className,
    )}
    {...props}
  />
);
PaginationLink.displayName = 'PaginationLink';

/**
 * 前のページボタン
 */
const PaginationPrevious = forwardRef<
  ComponentRef<typeof Button>,
  ComponentPropsWithoutRef<typeof Button>
>(({ className, ...props }, ref) => (
  <Button
    ref={ref}
    aria-label='Go to previous page'
    size='default'
    variant='ghost'
    className={cn('gap-1 pl-2.5', className)}
    {...props}
  >
    <ChevronLeft className='h-4 w-4' />
    <span>Previous</span>
  </Button>
));
PaginationPrevious.displayName = 'PaginationPrevious';

/**
 * 次のページボタン
 */
const PaginationNext = forwardRef<
  ComponentRef<typeof Button>,
  ComponentPropsWithoutRef<typeof Button>
>(({ className, ...props }, ref) => (
  <Button
    ref={ref}
    aria-label='Go to next page'
    size='default'
    variant='ghost'
    className={cn('gap-1 pr-2.5', className)}
    {...props}
  >
    <span>Next</span>
    <ChevronRight className='h-4 w-4' />
  </Button>
));
PaginationNext.displayName = 'PaginationNext';

/**
 * 省略記号（...）
 */
const PaginationEllipsis = ({ className, ...props }: ComponentPropsWithoutRef<'span'>) => (
  <span
    aria-hidden
    className={cn('flex h-9 w-9 items-center justify-center', className)}
    {...props}
  >
    <MoreHorizontal className='h-4 w-4' />
    <span className='sr-only'>More pages</span>
  </span>
);
PaginationEllipsis.displayName = 'PaginationEllipsis';

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};
