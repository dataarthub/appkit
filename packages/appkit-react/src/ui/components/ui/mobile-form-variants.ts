import { cva } from 'class-variance-authority';

/**
 * Builds large-touch button classes for mobile forms.
 * @param props - Optional declared variant axes and additional class/className values; omission applies the CVA defaults documented below.
 * @returns The combined CSS class string for the supplied variant axes and additional class/className values.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. variant and size default to default; sizes sm/lg/full/icon are also supported. These pure CVA helpers return class strings and do not add behavior or DOM attributes.
 * @example
 * ```tsx
 * import { mobileButtonVariants, fabVariants } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<><div className={mobileButtonVariants()}>Touch button</div><div className={fabVariants()}>Floating action</div></>);
 * }
 * ```
 */
export const mobileButtonVariants = cva(
  // Base styles
  [
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium',
    'transition-all outline-none select-none shrink-0',
    'focus-visible:ring-ring/50 focus-visible:ring-[3px]',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.98]',
    "[&_svg:not([class*='size-'])]:size-5 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  ].join(' '),
  {
    variants: {
      /**
       * Visual treatment selected by the consumer; these values change CSS classes only.
       * Accepted values: default, secondary, outline, ghost, destructive.
       * @defaultValue 'default'
       * @see mobileButtonVariants
       */
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      },
      /**
       * Control size preset selected by the consumer; sizes are class-based rather than numeric dimensions.
       * Accepted values: sm, default, lg, full, icon.
       * @defaultValue 'default'
       * @see mobileButtonVariants
       */
      size: {
        sm: 'h-10 px-4 text-sm',
        default: 'h-12 px-6 text-base',
        lg: 'h-14 px-8 text-lg',
        full: 'h-12 w-full text-base',
        icon: 'h-12 w-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

/**
 * Builds fixed-position classes for circular or extended floating action buttons.
 * @param props - Optional declared variant axes and additional class/className values; omission applies the CVA defaults documented below.
 * @returns The fixed-position FAB class string; position defaults to bottom-right and extended to false.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. variant and size default to default; sizes sm/lg/full/icon are also supported. These pure CVA helpers return class strings and do not add behavior or DOM attributes.
 * @example
 * ```tsx
 * import { mobileButtonVariants, fabVariants } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<><div className={mobileButtonVariants()}>Touch button</div><div className={fabVariants()}>Floating action</div></>);
 * }
 * ```
 */
export const fabVariants = cva(
  [
    'fixed z-50 flex items-center justify-center gap-2',
    'bg-primary text-primary-foreground shadow-lg',
    'transition-all active:scale-95',
    'focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:ring-offset-2 outline-none',
    "[&_svg:not([class*='size-'])]:size-6 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  ].join(' '),
  {
    variants: {
      /**
       * Fixed floating-action placement relative to the viewport.
       * Accepted values: 'bottom-right', 'bottom-center', 'bottom-left'.
       * @defaultValue 'bottom-right'
       * @see fabVariants
       */
      position: {
        'bottom-right': 'right-4 bottom-20',
        'bottom-center': 'left-1/2 -translate-x-1/2 bottom-20',
        'bottom-left': 'left-4 bottom-20',
      },
      /**
       * Whether the floating action surface uses extended padding instead of a circular footprint.
       * Accepted values: true, false.
       * @defaultValue false
       * @see fabVariants
       */
      extended: {
        true: 'h-14 px-6 rounded-full',
        false: 'h-14 w-14 rounded-full',
      },
    },
    defaultVariants: {
      position: 'bottom-right',
      extended: false,
    },
  },
);
