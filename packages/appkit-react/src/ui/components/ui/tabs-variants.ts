import { cva } from 'class-variance-authority';

/**
 * Builds classes for a default, line or primary tab strip.
 * @param props - Optional declared variant axes and additional class/className values; omission applies the CVA defaults documented below.
 * @returns The combined CSS class string for the supplied variant axes and additional class/className values.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. variant defaults to default. These pure CVA helpers return class strings and do not add behavior or DOM attributes.
 * @example
 * ```tsx
 * import { tabsListVariants } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<div className={tabsListVariants()}>Styled content</div>);
 * }
 * ```
 */
export const tabsListVariants = cva(
  'rounded-lg p-[3px] group-data-horizontal/tabs:h-8 data-[variant=line]:rounded-none group/tabs-list text-muted-foreground inline-flex w-fit items-center justify-center group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col',
  {
    variants: {
      /**
       * Visual treatment selected by the consumer; these values change CSS classes only.
       * Accepted values: default, line, primary.
       * @defaultValue 'default'
       * @see tabsListVariants
       */
      variant: {
        default: 'bg-muted',
        line: 'gap-1 bg-transparent',
        primary: 'bg-primary/10',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);
