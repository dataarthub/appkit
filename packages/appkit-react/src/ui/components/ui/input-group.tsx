'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';

/**
 * Visually combines an input with leading, trailing or stacked add-ons.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered InputGroup composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose these slots as siblings inside InputGroup. Addon clicks focus the first input unless the target is inside a button; a caller onClick spread afterward replaces that handler. InputGroupInput uses native input props and provides no label prop. InputGroupButton defaults to type=button, variant=ghost, size=xs.
 * @example
 * ```tsx
 * import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupText, InputGroupInput } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<InputGroup><InputGroupAddon><InputGroupText>@</InputGroupText></InputGroupAddon><InputGroupInput aria-label="Username" /><InputGroupAddon align="inline-end"><InputGroupButton>Check</InputGroupButton></InputGroupAddon></InputGroup>);
 * }
 * ```
 */
function InputGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='input-group'
      role='group'
      className={cn(
        'border-input dark:bg-input/30 has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50 has-[[data-slot][aria-invalid=true]]:ring-destructive/20 has-[[data-slot][aria-invalid=true]]:border-destructive dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40 has-disabled:bg-input/50 dark:has-disabled:bg-input/80 h-8 rounded-lg border transition-colors has-disabled:opacity-50 has-[[data-slot=input-group-control]:focus-visible]:ring-[3px] has-[[data-slot][aria-invalid=true]]:ring-[3px] has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3 has-[>[data-align=block-start]]:[&>input]:pb-3 has-[>[data-align=inline-end]]:[&>input]:pr-1.5 has-[>[data-align=inline-start]]:[&>input]:pl-1.5 [[data-slot=combobox-content]_&]:focus-within:border-inherit [[data-slot=combobox-content]_&]:focus-within:ring-0 group/input-group relative flex w-full min-w-0 items-center outline-none has-[>textarea]:h-auto',
        className,
      )}
      {...props}
    />
  );
}

const inputGroupAddonVariants = cva(
  "text-muted-foreground h-auto gap-2 py-1.5 text-sm font-medium group-data-[disabled=true]/input-group:opacity-50 [&>kbd]:rounded-[calc(var(--radius)-5px)] [&>svg:not([class*='size-'])]:size-4 flex cursor-text items-center justify-center select-none",
  {
    variants: {
      /**
       * Add-on placement within an input group.
       * Accepted values: 'inline-start', 'inline-end', 'block-start', 'block-end'.
       * @defaultValue 'inline-start'
       * @see inputGroupAddonVariants
       */
      align: {
        'inline-start': 'pl-2 has-[>button]:ml-[-0.3rem] has-[>kbd]:ml-[-0.15rem] order-first',
        'inline-end': 'pr-2 has-[>button]:mr-[-0.3rem] has-[>kbd]:mr-[-0.15rem] order-last',
        'block-start':
          'px-2.5 pt-2 group-has-[>input]/input-group:pt-2 [.border-b]:pb-2 order-first w-full justify-start',
        'block-end':
          'px-2.5 pb-2 group-has-[>input]/input-group:pb-2 [.border-t]:pt-2 order-last w-full justify-start',
      },
    },
    defaultVariants: {
      align: 'inline-start',
    },
  },
);

/**
 * Positions input add-on content and focuses the neighboring input when clicked.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling. Wrapper defaults: align='inline-start'.
 * @returns The rendered InputGroupAddon composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose these slots as siblings inside InputGroup. Addon clicks focus the first input unless the target is inside a button; a caller onClick spread afterward replaces that handler. InputGroupInput uses native input props and provides no label prop. InputGroupButton defaults to type=button, variant=ghost, size=xs.
 * @example
 * ```tsx
 * import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupText, InputGroupInput } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<InputGroup><InputGroupAddon><InputGroupText>@</InputGroupText></InputGroupAddon><InputGroupInput aria-label="Username" /><InputGroupAddon align="inline-end"><InputGroupButton>Check</InputGroupButton></InputGroupAddon></InputGroup>);
 * }
 * ```
 */
function InputGroupAddon({
  className,
  align = 'inline-start',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof inputGroupAddonVariants>) {
  return (
    <div
      role='group'
      data-slot='input-group-addon'
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) {
          return;
        }
        e.currentTarget.parentElement?.querySelector('input')?.focus();
      }}
      {...props}
    />
  );
}

const inputGroupButtonVariants = cva('gap-2 text-sm shadow-none flex items-center', {
  variants: {
    /**
     * Control size preset selected by the consumer; sizes are class-based rather than numeric dimensions.
     * Accepted values: xs, sm, 'icon-xs', 'icon-sm'.
     * @defaultValue 'xs'
     * @see inputGroupButtonVariants
     */
    size: {
      xs: "h-6 gap-1 rounded-[calc(var(--radius)-3px)] px-1.5 [&>svg:not([class*='size-'])]:size-3.5",
      sm: '',
      'icon-xs': 'size-6 rounded-[calc(var(--radius)-3px)] p-0 has-[>svg]:p-0',
      'icon-sm': 'size-8 p-0 has-[>svg]:p-0',
    },
  },
  defaultVariants: {
    size: 'xs',
  },
});

/**
 * Renders a compact action button inside an input group.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling. Wrapper defaults: type='button', variant='ghost', size='xs'.
 * @returns The rendered InputGroupButton composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose these slots as siblings inside InputGroup. Addon clicks focus the first input unless the target is inside a button; a caller onClick spread afterward replaces that handler. InputGroupInput uses native input props and provides no label prop. InputGroupButton defaults to type=button, variant=ghost, size=xs.
 * @example
 * ```tsx
 * import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupText, InputGroupInput } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<InputGroup><InputGroupAddon><InputGroupText>@</InputGroupText></InputGroupAddon><InputGroupInput aria-label="Username" /><InputGroupAddon align="inline-end"><InputGroupButton>Check</InputGroupButton></InputGroupAddon></InputGroup>);
 * }
 * ```
 */
function InputGroupButton({
  className,
  type = 'button',
  variant = 'ghost',
  size = 'xs',
  ...props
}: Omit<React.ComponentProps<typeof Button>, 'size' | 'type'> &
  VariantProps<typeof inputGroupButtonVariants> & {
    /**
     * Native button type; InputGroupButton defaults to button to avoid implicit form submission.
     */
    type?: 'button' | 'submit' | 'reset';
    /**
     * Custom Base UI render element; it must accept forwarded/merged interaction props and refs. No asChild adapter is provided.
     */
    render?: React.ReactElement;
  }) {
  return (
    <Button
      type={type}
      data-size={size}
      variant={variant}
      className={cn(inputGroupButtonVariants({ size }), className)}
      {...props}
    />
  );
}

/**
 * Styles static text or symbols inside an input group.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered InputGroupText composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose these slots as siblings inside InputGroup. Addon clicks focus the first input unless the target is inside a button; a caller onClick spread afterward replaces that handler. InputGroupInput uses native input props and provides no label prop. InputGroupButton defaults to type=button, variant=ghost, size=xs.
 * @example
 * ```tsx
 * import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupText, InputGroupInput } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<InputGroup><InputGroupAddon><InputGroupText>@</InputGroupText></InputGroupAddon><InputGroupInput aria-label="Username" /><InputGroupAddon align="inline-end"><InputGroupButton>Check</InputGroupButton></InputGroupAddon></InputGroup>);
 * }
 * ```
 */
function InputGroupText({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        "text-muted-foreground gap-2 text-sm [&_svg:not([class*='size-'])]:size-4 flex items-center [&_svg]:pointer-events-none",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Renders an Appkit input with group-compatible borderless styling.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered InputGroupInput composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose these slots as siblings inside InputGroup. Addon clicks focus the first input unless the target is inside a button; a caller onClick spread afterward replaces that handler. InputGroupInput uses native input props and provides no label prop. InputGroupButton defaults to type=button, variant=ghost, size=xs.
 * @example
 * ```tsx
 * import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupText, InputGroupInput } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<InputGroup><InputGroupAddon><InputGroupText>@</InputGroupText></InputGroupAddon><InputGroupInput aria-label="Username" /><InputGroupAddon align="inline-end"><InputGroupButton>Check</InputGroupButton></InputGroupAddon></InputGroup>);
 * }
 * ```
 */
function InputGroupInput({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <Input
      data-slot='input-group-control'
      className={cn(
        'rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0 dark:bg-transparent dark:disabled:bg-transparent flex-1',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Renders a textarea with group-compatible borderless styling.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered InputGroupTextarea composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose these slots as siblings inside InputGroup. Addon clicks focus the first input unless the target is inside a button; a caller onClick spread afterward replaces that handler. InputGroupInput uses native input props and provides no label prop. InputGroupButton defaults to type=button, variant=ghost, size=xs.
 * @example
 * ```tsx
 * import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupText, InputGroupInput } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<InputGroup><InputGroupAddon><InputGroupText>@</InputGroupText></InputGroupAddon><InputGroupInput aria-label="Username" /><InputGroupAddon align="inline-end"><InputGroupButton>Check</InputGroupButton></InputGroupAddon></InputGroup>);
 * }
 * ```
 */
function InputGroupTextarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <Textarea
      data-slot='input-group-control'
      className={cn(
        'rounded-none border-0 bg-transparent py-2 shadow-none ring-0 focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0 dark:bg-transparent dark:disabled:bg-transparent flex-1 resize-none',
        className,
      )}
      {...props}
    />
  );
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
};
