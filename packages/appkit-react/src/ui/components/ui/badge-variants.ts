import { cva } from 'class-variance-authority';

/**
 * Builds class names for compact badge visual treatments.
 * @param props - Optional declared variant axes and additional class/className values; omission applies the CVA defaults documented below.
 * @returns The combined CSS class string for the supplied variant axes and additional class/className values.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. variant defaults to default; secondary, destructive, outline, ghost and link are also supported. These pure CVA helpers return class strings and do not add behavior or DOM attributes.
 * @example
 * ```tsx
 * import { badgeVariants } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<div className={badgeVariants()}>Styled content</div>);
 * }
 * ```
 */
export const badgeVariants = cva(
  'h-5 gap-1 rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium transition-all has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:size-3! inline-flex items-center justify-center w-fit whitespace-nowrap shrink-0 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-colors overflow-hidden group/badge',
  {
    variants: {
      /**
       * Visual treatment selected by the consumer; these values change CSS classes only.
       * Accepted values: default, secondary, destructive, outline, ghost, link.
       * @defaultValue 'default'
       * @see badgeVariants
       */
      variant: {
        default: 'bg-primary text-primary-foreground [a]:hover:bg-primary/80',
        secondary: 'bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80',
        destructive:
          'bg-destructive/10 [a]:hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 text-destructive dark:bg-destructive/20',
        outline: 'border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground',
        ghost: 'hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50',
        link: 'text-primary underline-offset-4 hover:underline',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);
