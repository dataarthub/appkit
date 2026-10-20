import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/utils';

const alertVariants = cva(
  "grid gap-0.5 rounded-lg border px-2.5 py-2 text-left text-sm has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4 w-full relative group/alert",
  {
    variants: {
      /**
       * Visual treatment selected by the consumer; these values change CSS classes only.
       * Accepted values: default, destructive.
       * @defaultValue 'default'
       * @see alertVariants
       */
      variant: {
        default: 'bg-card text-card-foreground',
        destructive:
          'text-destructive bg-card *:data-[slot=alert-description]:text-destructive/90 *:[svg]:text-current',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

/**
 * Renders a styled alert region with default or destructive coloring.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered Alert composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose the child slots inside Alert. This is presentational markup; dismissal and persistence belong to the host. variant defaults to default through the class-variance configuration.
 * @example
 * ```tsx
 * import { Alert, AlertTitle, AlertDescription, AlertAction } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Alert><AlertTitle>Saved locally</AlertTitle><AlertDescription>Your draft is ready.</AlertDescription><AlertAction><button type="button">Review</button></AlertAction></Alert>);
 * }
 * ```
 */
function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot='alert'
      role='alert'
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

/**
 * Styles a short heading inside an alert.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered AlertTitle composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose the child slots inside Alert. This is presentational markup; dismissal and persistence belong to the host. variant defaults to default through the class-variance configuration.
 * @example
 * ```tsx
 * import { Alert, AlertTitle, AlertDescription, AlertAction } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Alert><AlertTitle>Saved locally</AlertTitle><AlertDescription>Your draft is ready.</AlertDescription><AlertAction><button type="button">Review</button></AlertAction></Alert>);
 * }
 * ```
 */
function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='alert-title'
      className={cn(
        'font-medium group-has-[>svg]/alert:col-start-2 [&_a]:hover:text-foreground [&_a]:underline [&_a]:underline-offset-3',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Styles explanatory content inside an alert.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered AlertDescription composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose the child slots inside Alert. This is presentational markup; dismissal and persistence belong to the host. variant defaults to default through the class-variance configuration.
 * @example
 * ```tsx
 * import { Alert, AlertTitle, AlertDescription, AlertAction } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Alert><AlertTitle>Saved locally</AlertTitle><AlertDescription>Your draft is ready.</AlertDescription><AlertAction><button type="button">Review</button></AlertAction></Alert>);
 * }
 * ```
 */
function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='alert-description'
      className={cn(
        'text-muted-foreground text-sm text-balance md:text-pretty [&_p:not(:last-child)]:mb-4 [&_a]:hover:text-foreground [&_a]:underline [&_a]:underline-offset-3',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Positions host-provided action content at the upper right of an alert.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered AlertAction composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose the child slots inside Alert. This is presentational markup; dismissal and persistence belong to the host. variant defaults to default through the class-variance configuration.
 * @example
 * ```tsx
 * import { Alert, AlertTitle, AlertDescription, AlertAction } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Alert><AlertTitle>Saved locally</AlertTitle><AlertDescription>Your draft is ready.</AlertDescription><AlertAction><button type="button">Review</button></AlertAction></Alert>);
 * }
 * ```
 */
function AlertAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot='alert-action' className={cn('absolute top-2 right-2', className)} {...props} />
  );
}

export { Alert, AlertTitle, AlertDescription, AlertAction };
