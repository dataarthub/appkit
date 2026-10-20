'use client';

import * as React from 'react';
import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar';

import { cn } from '../../lib/utils';

/**
 * Coordinates avatar image/fallback rendering and size styling.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling. Wrapper defaults: size='default'.
 * @returns The rendered Avatar composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Place Image/Fallback/Badge inside Avatar. size defaults to default (size-8), with sm size-6 and lg size-10. AvatarGroupCount renders supplied children and does not calculate overflow or hide avatars. Supply meaningful image alt text. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Avatar, AvatarImage, AvatarFallback, AvatarBadge, AvatarGroup, AvatarGroupCount } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<AvatarGroup><Avatar><AvatarImage src="/avatar.png" alt="Ada" /><AvatarFallback>AD</AvatarFallback><AvatarBadge aria-label="Online" /></Avatar><AvatarGroupCount>+2</AvatarGroupCount></AvatarGroup>);
 * }
 * ```
 */
const Avatar = React.forwardRef<
  HTMLSpanElement,
  AvatarPrimitive.Root.Props & { /**
 * Visual size preset; defaults to default unless the owning component states otherwise.
 */
  /**
   * Visual size preset; defaults to default unless the owning component states otherwise.
   */
  size?: 'default' | 'sm' | 'lg' }
>(({ className, size = 'default', ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    data-slot='avatar'
    data-size={size}
    className={cn(
      'size-8 rounded-full after:rounded-full data-[size=lg]:size-10 data-[size=sm]:size-6 after:border-border group/avatar relative flex shrink-0 select-none after:absolute after:inset-0 after:border after:mix-blend-darken dark:after:mix-blend-lighten',
      className,
    )}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

/**
 * Renders the avatar image using Base UI loading behavior.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered AvatarImage composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Place Image/Fallback/Badge inside Avatar. size defaults to default (size-8), with sm size-6 and lg size-10. AvatarGroupCount renders supplied children and does not calculate overflow or hide avatars. Supply meaningful image alt text. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Avatar, AvatarImage, AvatarFallback, AvatarBadge, AvatarGroup, AvatarGroupCount } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<AvatarGroup><Avatar><AvatarImage src="/avatar.png" alt="Ada" /><AvatarFallback>AD</AvatarFallback><AvatarBadge aria-label="Online" /></Avatar><AvatarGroupCount>+2</AvatarGroupCount></AvatarGroup>);
 * }
 * ```
 */
const AvatarImage = React.forwardRef<HTMLImageElement, AvatarPrimitive.Image.Props>(
  ({ className, ...props }, ref) => (
    <AvatarPrimitive.Image
      ref={ref}
      data-slot='avatar-image'
      className={cn('rounded-full aspect-square size-full object-cover', className)}
      {...props}
    />
  ),
);
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

/**
 * Renders replacement avatar content when the image is unavailable.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered AvatarFallback composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Place Image/Fallback/Badge inside Avatar. size defaults to default (size-8), with sm size-6 and lg size-10. AvatarGroupCount renders supplied children and does not calculate overflow or hide avatars. Supply meaningful image alt text. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Avatar, AvatarImage, AvatarFallback, AvatarBadge, AvatarGroup, AvatarGroupCount } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<AvatarGroup><Avatar><AvatarImage src="/avatar.png" alt="Ada" /><AvatarFallback>AD</AvatarFallback><AvatarBadge aria-label="Online" /></Avatar><AvatarGroupCount>+2</AvatarGroupCount></AvatarGroup>);
 * }
 * ```
 */
const AvatarFallback = React.forwardRef<HTMLSpanElement, AvatarPrimitive.Fallback.Props>(
  ({ className, ...props }, ref) => (
    <AvatarPrimitive.Fallback
      ref={ref}
      data-slot='avatar-fallback'
      className={cn(
        'bg-muted text-muted-foreground rounded-full flex size-full items-center justify-center text-sm group-data-[size=sm]/avatar:text-xs',
        className,
      )}
      {...props}
    />
  ),
);
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

/**
 * Positions a status indicator over the lower-right corner of an avatar.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered AvatarBadge composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Place Image/Fallback/Badge inside Avatar. size defaults to default (size-8), with sm size-6 and lg size-10. AvatarGroupCount renders supplied children and does not calculate overflow or hide avatars. Supply meaningful image alt text.
 * @example
 * ```tsx
 * import { Avatar, AvatarImage, AvatarFallback, AvatarBadge, AvatarGroup, AvatarGroupCount } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<AvatarGroup><Avatar><AvatarImage src="/avatar.png" alt="Ada" /><AvatarFallback>AD</AvatarFallback><AvatarBadge aria-label="Online" /></Avatar><AvatarGroupCount>+2</AvatarGroupCount></AvatarGroup>);
 * }
 * ```
 */
function AvatarBadge({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot='avatar-badge'
      className={cn(
        'bg-primary text-primary-foreground ring-background absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-blend-color ring-2 select-none',
        'group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden',
        'group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2',
        'group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Overlaps adjacent avatars with matching background rings.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered AvatarGroup composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Place Image/Fallback/Badge inside Avatar. size defaults to default (size-8), with sm size-6 and lg size-10. AvatarGroupCount renders supplied children and does not calculate overflow or hide avatars. Supply meaningful image alt text.
 * @example
 * ```tsx
 * import { Avatar, AvatarImage, AvatarFallback, AvatarBadge, AvatarGroup, AvatarGroupCount } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<AvatarGroup><Avatar><AvatarImage src="/avatar.png" alt="Ada" /><AvatarFallback>AD</AvatarFallback><AvatarBadge aria-label="Online" /></Avatar><AvatarGroupCount>+2</AvatarGroupCount></AvatarGroup>);
 * }
 * ```
 */
function AvatarGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='avatar-group'
      className={cn(
        '*:data-[slot=avatar]:ring-background group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Styles caller-provided overflow text after a group of avatars.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered AvatarGroupCount composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Place Image/Fallback/Badge inside Avatar. size defaults to default (size-8), with sm size-6 and lg size-10. AvatarGroupCount renders supplied children and does not calculate overflow or hide avatars. Supply meaningful image alt text.
 * @example
 * ```tsx
 * import { Avatar, AvatarImage, AvatarFallback, AvatarBadge, AvatarGroup, AvatarGroupCount } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<AvatarGroup><Avatar><AvatarImage src="/avatar.png" alt="Ada" /><AvatarFallback>AD</AvatarFallback><AvatarBadge aria-label="Online" /></Avatar><AvatarGroupCount>+2</AvatarGroupCount></AvatarGroup>);
 * }
 * ```
 */
function AvatarGroupCount({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='avatar-group-count'
      className={cn(
        'bg-muted text-muted-foreground size-8 rounded-full text-sm group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3 ring-background relative flex shrink-0 items-center justify-center ring-2',
        className,
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarBadge };
