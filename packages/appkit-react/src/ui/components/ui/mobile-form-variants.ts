import { cva } from 'class-variance-authority';

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
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      },
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
      position: {
        'bottom-right': 'right-4 bottom-20',
        'bottom-center': 'left-1/2 -translate-x-1/2 bottom-20',
        'bottom-left': 'left-4 bottom-20',
      },
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
