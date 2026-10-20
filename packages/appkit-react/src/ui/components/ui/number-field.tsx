'use client';

import * as React from 'react';
import { NumberField as NumberFieldPrimitive } from '@base-ui/react/number-field';
import { Minus, Plus } from 'lucide-react';

import { cn } from '../../lib/utils';

/**
 * Coordinates an accessible numeric value and its editing controls.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered NumberField composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. All editing parts require NumberField context. Base UI owns parsing, value constraints, stepping and pointer/keyboard behavior; this wrapper does not implement additional numeric defaults. Buttons render fixed plus/minus children.
 * @example
 * ```tsx
 * import { NumberField, NumberFieldInput, NumberFieldGroup, NumberFieldScrubArea, NumberFieldIncrement, NumberFieldDecrement } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<NumberField defaultValue={1} min={0}><NumberFieldScrubArea>Quantity</NumberFieldScrubArea><NumberFieldGroup><NumberFieldDecrement aria-label="Decrease" /><NumberFieldInput aria-label="Quantity" /><NumberFieldIncrement aria-label="Increase" /></NumberFieldGroup></NumberField>);
 * }
 * ```
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
 * Renders the numeric text input for its NumberField root.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered NumberFieldInput composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. All editing parts require NumberField context. Base UI owns parsing, value constraints, stepping and pointer/keyboard behavior; this wrapper does not implement additional numeric defaults. Buttons render fixed plus/minus children.
 * @example
 * ```tsx
 * import { NumberField, NumberFieldInput, NumberFieldGroup, NumberFieldScrubArea, NumberFieldIncrement, NumberFieldDecrement } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<NumberField defaultValue={1} min={0}><NumberFieldScrubArea>Quantity</NumberFieldScrubArea><NumberFieldGroup><NumberFieldDecrement aria-label="Decrease" /><NumberFieldInput aria-label="Quantity" /><NumberFieldIncrement aria-label="Increase" /></NumberFieldGroup></NumberField>);
 * }
 * ```
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
 * Renders a draggable region that adjusts its NumberField value.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered NumberFieldScrubArea composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. All editing parts require NumberField context. Base UI owns parsing, value constraints, stepping and pointer/keyboard behavior; this wrapper does not implement additional numeric defaults. Buttons render fixed plus/minus children.
 * @example
 * ```tsx
 * import { NumberField, NumberFieldInput, NumberFieldGroup, NumberFieldScrubArea, NumberFieldIncrement, NumberFieldDecrement } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<NumberField defaultValue={1} min={0}><NumberFieldScrubArea>Quantity</NumberFieldScrubArea><NumberFieldGroup><NumberFieldDecrement aria-label="Decrease" /><NumberFieldInput aria-label="Quantity" /><NumberFieldIncrement aria-label="Increase" /></NumberFieldGroup></NumberField>);
 * }
 * ```
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
 * Visually groups the numeric input and increment/decrement controls.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered NumberFieldGroup composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. All editing parts require NumberField context. Base UI owns parsing, value constraints, stepping and pointer/keyboard behavior; this wrapper does not implement additional numeric defaults. Buttons render fixed plus/minus children.
 * @example
 * ```tsx
 * import { NumberField, NumberFieldInput, NumberFieldGroup, NumberFieldScrubArea, NumberFieldIncrement, NumberFieldDecrement } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<NumberField defaultValue={1} min={0}><NumberFieldScrubArea>Quantity</NumberFieldScrubArea><NumberFieldGroup><NumberFieldDecrement aria-label="Decrease" /><NumberFieldInput aria-label="Quantity" /><NumberFieldIncrement aria-label="Increase" /></NumberFieldGroup></NumberField>);
 * }
 * ```
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
 * Renders a numeric increment control with a plus icon.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered NumberFieldIncrement composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. All editing parts require NumberField context. Base UI owns parsing, value constraints, stepping and pointer/keyboard behavior; this wrapper does not implement additional numeric defaults. Buttons render fixed plus/minus children.  children are replaced by the fixed plus/minus icon.
 * @example
 * ```tsx
 * import { NumberField, NumberFieldInput, NumberFieldGroup, NumberFieldScrubArea, NumberFieldIncrement, NumberFieldDecrement } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<NumberField defaultValue={1} min={0}><NumberFieldScrubArea>Quantity</NumberFieldScrubArea><NumberFieldGroup><NumberFieldDecrement aria-label="Decrease" /><NumberFieldInput aria-label="Quantity" /><NumberFieldIncrement aria-label="Increase" /></NumberFieldGroup></NumberField>);
 * }
 * ```
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
 * Renders a numeric decrement control with a minus icon.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered NumberFieldDecrement composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. All editing parts require NumberField context. Base UI owns parsing, value constraints, stepping and pointer/keyboard behavior; this wrapper does not implement additional numeric defaults. Buttons render fixed plus/minus children.  children are replaced by the fixed plus/minus icon.
 * @example
 * ```tsx
 * import { NumberField, NumberFieldInput, NumberFieldGroup, NumberFieldScrubArea, NumberFieldIncrement, NumberFieldDecrement } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<NumberField defaultValue={1} min={0}><NumberFieldScrubArea>Quantity</NumberFieldScrubArea><NumberFieldGroup><NumberFieldDecrement aria-label="Decrease" /><NumberFieldInput aria-label="Quantity" /><NumberFieldIncrement aria-label="Increase" /></NumberFieldGroup></NumberField>);
 * }
 * ```
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
