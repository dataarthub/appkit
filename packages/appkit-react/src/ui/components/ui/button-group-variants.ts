import { cva } from 'class-variance-authority';

/**
 * Builds classes that visually join adjacent controls horizontally or vertically.
 * @param props - Optional declared variant axes and additional class/className values; omission applies the CVA defaults documented below.
 * @returns The combined CSS class string for the supplied variant axes and additional class/className values.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. orientation defaults to horizontal; vertical joins the top/bottom borders. These pure CVA helpers return class strings and do not add behavior or DOM attributes.
 * @example
 * ```tsx
 * import { buttonGroupVariants } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<div className={buttonGroupVariants()}>Styled content</div>);
 * }
 * ```
 */
export const buttonGroupVariants = cva(
  "has-[>[data-slot=button-group]]:gap-2 has-[select[aria-hidden=true]:last-child]:[&>[data-slot=select-trigger]:last-of-type]:rounded-r-lg flex w-fit items-stretch [&>*]:focus-visible:z-10 [&>*]:focus-visible:relative [&>[data-slot=select-trigger]:not([class*='w-'])]:w-fit [&>input]:flex-1",
  {
    variants: {
      /**
       * Axis used to join/group controls or arrange field content.
       * Accepted values: horizontal, vertical.
       * @defaultValue 'horizontal'
       * @see buttonGroupVariants
       */
      orientation: {
        horizontal:
          '[&>[data-slot]:not(:has(~[data-slot]))]:rounded-r-lg! [&>[data-slot]~[data-slot]]:rounded-l-none [&>[data-slot]~[data-slot]]:border-l-0 [&>[data-slot]]:rounded-r-none',
        vertical:
          '[&>[data-slot]:not(:has(~[data-slot]))]:rounded-b-lg! flex-col [&>[data-slot]~[data-slot]]:rounded-t-none [&>[data-slot]~[data-slot]]:border-t-0 [&>[data-slot]]:rounded-b-none',
      },
    },
    defaultVariants: {
      orientation: 'horizontal',
    },
  },
);
