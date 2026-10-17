'use client';

import * as React from 'react';
import { NumberField as NumberFieldPrimitive } from '@base-ui/react/number-field';
import { Minus, Plus } from 'lucide-react';

import { cn } from '../../lib/utils';

/**
 * 数値入力フィールド全体のルートコンポーネント。
 */
function NumberField({
  className,
  ...props
}: React.ComponentProps<typeof NumberFieldPrimitive.Root>) {
  return (
    <NumberFieldPrimitive.Root
      data-slot='number-field'
      className={cn('flex flex-col gap-2', className)}
      {...props}
    />
  );
}

/**
 * 数値を直接入力するためのテキストフィールド。
 */
function NumberFieldInput({
  className,
  ...props
}: React.ComponentProps<typeof NumberFieldPrimitive.Input>) {
  return (
    <NumberFieldPrimitive.Input
      data-slot='number-field-input'
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-center',
        className,
      )}
      {...props}
    />
  );
}

/**
 * ドラッグ操作によって数値を増減させることができるスクラブ操作領域。
 */
function NumberFieldScrubArea({
  className,
  children,
  ...props
}: React.ComponentProps<typeof NumberFieldPrimitive.ScrubArea>) {
  return (
    <NumberFieldPrimitive.ScrubArea
      data-slot='number-field-scrub-area'
      className={cn('cursor-ew-resize', className)}
      {...props}
    >
      {children}
    </NumberFieldPrimitive.ScrubArea>
  );
}

/**
 * 入力フィールドと増減用のボタンなどの子要素をまとめるグループコンテナ。
 */
function NumberFieldGroup({
  className,
  ...props
}: React.ComponentProps<typeof NumberFieldPrimitive.Group>) {
  return (
    <NumberFieldPrimitive.Group
      data-slot='number-field-group'
      className={cn(
        'flex items-center rounded-md border border-input focus-within:ring-1 focus-within:ring-ring',
        className,
      )}
      {...props}
    />
  );
}

/**
 * 数値を増加させるためのボタン（＋）。
 */
function NumberFieldIncrement({
  className,
  ...props
}: React.ComponentProps<typeof NumberFieldPrimitive.Increment>) {
  return (
    <NumberFieldPrimitive.Increment
      data-slot='number-field-increment'
      className={cn(
        'flex size-9 items-center justify-center rounded-r-md border-l border-input bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <Plus className='size-4' />
    </NumberFieldPrimitive.Increment>
  );
}

/**
 * 数値を減少させるためのボタン（ー）。
 */
function NumberFieldDecrement({
  className,
  ...props
}: React.ComponentProps<typeof NumberFieldPrimitive.Decrement>) {
  return (
    <NumberFieldPrimitive.Decrement
      data-slot='number-field-decrement'
      className={cn(
        'flex size-9 items-center justify-center rounded-l-md border-r border-input bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <Minus className='size-4' />
    </NumberFieldPrimitive.Decrement>
  );
}

export {
  NumberField,
  NumberFieldInput,
  NumberFieldGroup,
  NumberFieldScrubArea,
  NumberFieldIncrement,
  NumberFieldDecrement,
};
