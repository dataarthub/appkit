import * as React from 'react';

import { cn } from '../../lib/utils';

/**
 * Renders a bordered card surface with default or compact spacing.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling. Wrapper defaults: size='default'.
 * @returns The rendered Card composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Place the slots inside Card; put CardAction inside CardHeader. size defaults to default, with sm using tighter spacing. Slots are div elements; the host supplies semantic headings where required. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Card><CardHeader><CardTitle>Draft</CardTitle><CardDescription>Ready for review</CardDescription><CardAction><button type="button">Open</button></CardAction></CardHeader><CardContent>Document content</CardContent><CardFooter>Updated today</CardFooter></Card>);
 * }
 * ```
 */
const Card = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & { /**
 * Visual size preset; defaults to default unless the owning component states otherwise.
 */
  /**
   * Visual size preset; defaults to default unless the owning component states otherwise.
   */
  size?: 'default' | 'sm' }
>(({ className, size = 'default', ...props }, ref) => (
  <div
    ref={ref}
    data-slot='card'
    data-size={size}
    className={cn(
      'ring-foreground/10 bg-card text-card-foreground gap-4 overflow-hidden rounded-xl py-4 text-sm ring-1 has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-3 data-[size=sm]:py-3 data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl group/card flex flex-col',
      className,
    )}
    {...props}
  />
));
Card.displayName = 'Card';

/**
 * Lays out a card heading and optional trailing action.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered CardHeader composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Place the slots inside Card; put CardAction inside CardHeader. size defaults to default, with sm using tighter spacing. Slots are div elements; the host supplies semantic headings where required. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Card><CardHeader><CardTitle>Draft</CardTitle><CardDescription>Ready for review</CardDescription><CardAction><button type="button">Open</button></CardAction></CardHeader><CardContent>Document content</CardContent><CardFooter>Updated today</CardFooter></Card>);
 * }
 * ```
 */
const CardHeader = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot='card-header'
      className={cn(
        'gap-1 rounded-t-xl px-4 group-data-[size=sm]/card:px-3 [.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3 group/card-header @container/card-header grid auto-rows-min items-start has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto]',
        className,
      )}
      {...props}
    />
  ),
);
CardHeader.displayName = 'CardHeader';

/**
 * Styles the card title without imposing a heading level.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered CardTitle composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Place the slots inside Card; put CardAction inside CardHeader. size defaults to default, with sm using tighter spacing. Slots are div elements; the host supplies semantic headings where required. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Card><CardHeader><CardTitle>Draft</CardTitle><CardDescription>Ready for review</CardDescription><CardAction><button type="button">Open</button></CardAction></CardHeader><CardContent>Document content</CardContent><CardFooter>Updated today</CardFooter></Card>);
 * }
 * ```
 */
const CardTitle = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot='card-title'
      className={cn(
        'text-base leading-snug font-medium group-data-[size=sm]/card:text-sm',
        className,
      )}
      {...props}
    />
  ),
);
CardTitle.displayName = 'CardTitle';

/**
 * Styles supporting card text with muted coloring.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered CardDescription composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Place the slots inside Card; put CardAction inside CardHeader. size defaults to default, with sm using tighter spacing. Slots are div elements; the host supplies semantic headings where required. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Card><CardHeader><CardTitle>Draft</CardTitle><CardDescription>Ready for review</CardDescription><CardAction><button type="button">Open</button></CardAction></CardHeader><CardContent>Document content</CardContent><CardFooter>Updated today</CardFooter></Card>);
 * }
 * ```
 */
const CardDescription = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot='card-description'
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  ),
);
CardDescription.displayName = 'CardDescription';

/**
 * Positions an action in the header grid trailing column.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered CardAction composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Place the slots inside Card; put CardAction inside CardHeader. size defaults to default, with sm using tighter spacing. Slots are div elements; the host supplies semantic headings where required. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Card><CardHeader><CardTitle>Draft</CardTitle><CardDescription>Ready for review</CardDescription><CardAction><button type="button">Open</button></CardAction></CardHeader><CardContent>Document content</CardContent><CardFooter>Updated today</CardFooter></Card>);
 * }
 * ```
 */
const CardAction = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot='card-action'
      className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)}
      {...props}
    />
  ),
);
CardAction.displayName = 'CardAction';

/**
 * Adds consistent horizontal padding around card content.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered CardContent composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Place the slots inside Card; put CardAction inside CardHeader. size defaults to default, with sm using tighter spacing. Slots are div elements; the host supplies semantic headings where required. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Card><CardHeader><CardTitle>Draft</CardTitle><CardDescription>Ready for review</CardDescription><CardAction><button type="button">Open</button></CardAction></CardHeader><CardContent>Document content</CardContent><CardFooter>Updated today</CardFooter></Card>);
 * }
 * ```
 */
const CardContent = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot='card-content'
      className={cn('px-4 group-data-[size=sm]/card:px-3', className)}
      {...props}
    />
  ),
);
CardContent.displayName = 'CardContent';

/**
 * Renders a shaded footer with a top border inside a card.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered CardFooter composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Place the slots inside Card; put CardAction inside CardHeader. size defaults to default, with sm using tighter spacing. Slots are div elements; the host supplies semantic headings where required. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Card><CardHeader><CardTitle>Draft</CardTitle><CardDescription>Ready for review</CardDescription><CardAction><button type="button">Open</button></CardAction></CardHeader><CardContent>Document content</CardContent><CardFooter>Updated today</CardFooter></Card>);
 * }
 * ```
 */
const CardFooter = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot='card-footer'
      className={cn(
        'bg-muted/50 rounded-b-xl border-t p-4 group-data-[size=sm]/card:p-3 flex items-center',
        className,
      )}
      {...props}
    />
  ),
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };
