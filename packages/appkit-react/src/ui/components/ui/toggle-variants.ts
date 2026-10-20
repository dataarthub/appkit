import { cva } from 'class-variance-authority';

/**
 * Builds classes for default/outline pressed-state controls and their sizes.
 * @param props - Optional declared variant axes and additional class/className values; omission applies the CVA defaults documented below.
 * @returns The combined CSS class string for the supplied variant axes and additional class/className values.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. variant and size default to default; sizes sm and lg are also supported. These pure CVA helpers return class strings and do not add behavior or DOM attributes.
 * @example
 * ```tsx
 * import { toggleVariants } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<div className={toggleVariants()}>Styled content</div>);
 * }
 * ```
 */
export const toggleVariants = cva(
  "hover:text-foreground aria-pressed:bg-muted focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive data-[state=on]:bg-muted gap-1 rounded-lg text-sm font-medium transition-all [&_svg:not([class*='size-'])]:size-4 group/toggle hover:bg-muted inline-flex items-center justify-center whitespace-nowrap outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      /**
       * Visual treatment selected by the consumer; these values change CSS classes only.
       * Accepted values: default, outline.
       * @defaultValue 'default'
       * @see toggleVariants
       */
      variant: {
        default: 'bg-transparent',
        outline: 'border-input hover:bg-muted border bg-transparent',
      },
      /**
       * Control size preset selected by the consumer; sizes are class-based rather than numeric dimensions.
       * Accepted values: default, sm, lg.
       * @defaultValue 'default'
       * @see toggleVariants
       */
      size: {
        default: 'h-8 min-w-8 px-2',
        sm: 'h-7 min-w-7 rounded-[min(var(--radius-md),12px)] px-1.5 text-[0.8rem]',
        lg: 'h-9 min-w-9 px-2.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);
