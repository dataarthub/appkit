import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/utils';

/**
 * Lays out an empty-state panel with centered content.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered Empty composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. These presentational slots do not fetch data or detect empty collections. The host decides whether to render them. EmptyMedia variant defaults to default; icon adds a muted icon surface.
 * @example
 * ```tsx
 * import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Empty><EmptyHeader><EmptyMedia variant="icon">?</EmptyMedia><EmptyTitle>No documents</EmptyTitle><EmptyDescription>Create your first document.</EmptyDescription></EmptyHeader><EmptyContent><button type="button">Create</button></EmptyContent></Empty>);
 * }
 * ```
 */
function Empty({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='empty'
      className={cn(
        'gap-4 rounded-lg border-dashed p-6 flex w-full min-w-0 flex-1 flex-col items-center justify-center text-center text-balance',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Groups the empty-state media, title and explanation.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered EmptyHeader composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. These presentational slots do not fetch data or detect empty collections. The host decides whether to render them. EmptyMedia variant defaults to default; icon adds a muted icon surface.
 * @example
 * ```tsx
 * import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Empty><EmptyHeader><EmptyMedia variant="icon">?</EmptyMedia><EmptyTitle>No documents</EmptyTitle><EmptyDescription>Create your first document.</EmptyDescription></EmptyHeader><EmptyContent><button type="button">Create</button></EmptyContent></Empty>);
 * }
 * ```
 */
function EmptyHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='empty-header'
      className={cn('gap-2 flex max-w-sm flex-col items-center', className)}
      {...props}
    />
  );
}

const emptyMediaVariants = cva(
  'mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      /**
       * Visual treatment selected by the consumer; these values change CSS classes only.
       * Accepted values: default, icon.
       * @defaultValue 'default'
       * @see emptyMediaVariants
       */
      variant: {
        default: 'bg-transparent',
        icon: "bg-muted text-foreground flex size-8 shrink-0 items-center justify-center rounded-lg [&_svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

/**
 * Styles empty-state media with an optional icon treatment.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling. Wrapper defaults: variant='default'.
 * @returns The rendered EmptyMedia composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. These presentational slots do not fetch data or detect empty collections. The host decides whether to render them. EmptyMedia variant defaults to default; icon adds a muted icon surface.
 * @example
 * ```tsx
 * import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Empty><EmptyHeader><EmptyMedia variant="icon">?</EmptyMedia><EmptyTitle>No documents</EmptyTitle><EmptyDescription>Create your first document.</EmptyDescription></EmptyHeader><EmptyContent><button type="button">Create</button></EmptyContent></Empty>);
 * }
 * ```
 */
function EmptyMedia({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof emptyMediaVariants>) {
  return (
    <div
      data-slot='empty-icon'
      data-variant={variant}
      className={cn(emptyMediaVariants({ variant, className }))}
      {...props}
    />
  );
}

/**
 * Styles an empty-state title without imposing a heading level.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered EmptyTitle composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. These presentational slots do not fetch data or detect empty collections. The host decides whether to render them. EmptyMedia variant defaults to default; icon adds a muted icon surface.
 * @example
 * ```tsx
 * import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Empty><EmptyHeader><EmptyMedia variant="icon">?</EmptyMedia><EmptyTitle>No documents</EmptyTitle><EmptyDescription>Create your first document.</EmptyDescription></EmptyHeader><EmptyContent><button type="button">Create</button></EmptyContent></Empty>);
 * }
 * ```
 */
function EmptyTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='empty-title'
      className={cn('text-sm font-medium tracking-tight', className)}
      {...props}
    />
  );
}

/**
 * Styles the empty-state explanation and links.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered EmptyDescription composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. These presentational slots do not fetch data or detect empty collections. The host decides whether to render them. EmptyMedia variant defaults to default; icon adds a muted icon surface.
 * @example
 * ```tsx
 * import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Empty><EmptyHeader><EmptyMedia variant="icon">?</EmptyMedia><EmptyTitle>No documents</EmptyTitle><EmptyDescription>Create your first document.</EmptyDescription></EmptyHeader><EmptyContent><button type="button">Create</button></EmptyContent></Empty>);
 * }
 * ```
 */
function EmptyDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <div
      data-slot='empty-description'
      className={cn(
        'text-sm/relaxed text-muted-foreground [&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Constrains the width of empty-state actions or supplemental content.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered EmptyContent composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. These presentational slots do not fetch data or detect empty collections. The host decides whether to render them. EmptyMedia variant defaults to default; icon adds a muted icon surface.
 * @example
 * ```tsx
 * import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Empty><EmptyHeader><EmptyMedia variant="icon">?</EmptyMedia><EmptyTitle>No documents</EmptyTitle><EmptyDescription>Create your first document.</EmptyDescription></EmptyHeader><EmptyContent><button type="button">Create</button></EmptyContent></Empty>);
 * }
 * ```
 */
function EmptyContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='empty-content'
      className={cn(
        'gap-2.5 text-sm flex w-full max-w-sm min-w-0 flex-col items-center text-balance',
        className,
      )}
      {...props}
    />
  );
}

export { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia };
