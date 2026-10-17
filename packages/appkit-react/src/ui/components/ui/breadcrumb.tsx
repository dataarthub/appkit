import * as React from 'react';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { ChevronRight, MoreHorizontal } from 'lucide-react';

import { cn } from '../../lib/utils';

/**
 * パンくずリスト全体のナビゲーションコンテナ。
 */
function Breadcrumb({ className, ...props }: React.ComponentProps<'nav'>) {
  return (
    <nav aria-label='breadcrumb' data-slot='breadcrumb' className={cn(className)} {...props} />
  );
}

/**
 * パンくずリスト項目を並べるためのリストコンテナ。
 */
function BreadcrumbList({ className, ...props }: React.ComponentProps<'ol'>) {
  return (
    <ol
      data-slot='breadcrumb-list'
      className={cn(
        'text-muted-foreground gap-1.5 text-sm flex flex-wrap items-center break-words',
        className,
      )}
      {...props}
    />
  );
}

/**
 * 各階層を構成するパンくずリストの項目（リスト要素）。
 */
function BreadcrumbItem({ className, ...props }: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot='breadcrumb-item'
      className={cn('gap-1 inline-flex items-center', className)}
      {...props}
    />
  );
}

/**
 * 遷移可能な上位階層へのリンクコンポーネント。
 */
function BreadcrumbLink({ className, render, ...props }: useRender.ComponentProps<'a'>) {
  return useRender({
    defaultTagName: 'a',
    props: mergeProps<'a'>(
      {
        className: cn('hover:text-foreground transition-colors', className),
      },
      props,
    ),
    render,
    state: {
      slot: 'breadcrumb-link',
    },
  });
}

/**
 * 現在のページを表すテキストコンポーネント（非リンクの最終階層）。
 */
function BreadcrumbPage({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot='breadcrumb-page'
      role='link'
      aria-disabled='true'
      aria-current='page'
      className={cn('text-foreground font-normal', className)}
      {...props}
    />
  );
}

/**
 * 項目間を区切るためのセパレーター（通常は右矢印などのアイコン）。
 */
function BreadcrumbSeparator({ children, className, ...props }: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot='breadcrumb-separator'
      role='presentation'
      aria-hidden='true'
      className={cn('[&>svg]:size-3.5', className)}
      {...props}
    >
      {children ?? <ChevronRight className='h-4 w-4' />}
    </li>
  );
}

/**
 * 長いパンくずリストの一部を省略して三点リーダーなどで表示するためのコンポーネント。
 */
function BreadcrumbEllipsis({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot='breadcrumb-ellipsis'
      role='presentation'
      aria-hidden='true'
      className={cn('size-5 [&>svg]:size-4 flex items-center justify-center', className)}
      {...props}
    >
      <MoreHorizontal className='h-4 w-4' />
      <span className='sr-only'>More</span>
    </span>
  );
}

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
};
