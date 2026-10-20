'use client';

import { NavigationMenu as NavigationMenuPrimitive } from '@base-ui/react/navigation-menu';
import { ChevronDown } from 'lucide-react';

import { cn } from '../../lib/utils';
import { navigationMenuTriggerStyle } from './navigation-menu-variants';

/**
 * Coordinates navigation items and appends a shared popup positioner.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered NavigationMenu composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose List/Item/Trigger/Content under NavigationMenu. The root already appends NavigationMenuPositioner; adding another creates another popup composition. Content is routed through the shared viewport by Base UI. The host supplies destinations and authorization; the Indicator export wraps Icon rather than computing active-item geometry.
 * @example
 * ```tsx
 * import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent, NavigationMenuLink } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<NavigationMenu><NavigationMenuList><NavigationMenuItem><NavigationMenuTrigger>Project</NavigationMenuTrigger><NavigationMenuContent><NavigationMenuLink href="/overview">Overview</NavigationMenuLink></NavigationMenuContent></NavigationMenuItem></NavigationMenuList></NavigationMenu>);
 * }
 * ```
 */
function NavigationMenu({ className, children, ...props }: NavigationMenuPrimitive.Root.Props) {
  return (
    <NavigationMenuPrimitive.Root
      data-slot='navigation-menu'
      className={cn(
        'max-w-max group/navigation-menu relative flex max-w-max flex-1 items-center justify-center',
        className,
      )}
      {...props}
    >
      {children}
      <NavigationMenuPositioner />
    </NavigationMenuPrimitive.Root>
  );
}

/**
 * Lays out top-level navigation items in a horizontal list.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered NavigationMenuList composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose List/Item/Trigger/Content under NavigationMenu. The root already appends NavigationMenuPositioner; adding another creates another popup composition. Content is routed through the shared viewport by Base UI. The host supplies destinations and authorization; the Indicator export wraps Icon rather than computing active-item geometry.
 * @example
 * ```tsx
 * import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent, NavigationMenuLink } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<NavigationMenu><NavigationMenuList><NavigationMenuItem><NavigationMenuTrigger>Project</NavigationMenuTrigger><NavigationMenuContent><NavigationMenuLink href="/overview">Overview</NavigationMenuLink></NavigationMenuContent></NavigationMenuItem></NavigationMenuList></NavigationMenu>);
 * }
 * ```
 */
function NavigationMenuList({ className, ...props }: NavigationMenuPrimitive.List.Props) {
  return (
    <NavigationMenuPrimitive.List
      data-slot='navigation-menu-list'
      className={cn('gap-0 group flex flex-1 list-none items-center justify-center', className)}
      {...props}
    />
  );
}

/**
 * Associates a navigation trigger/link with its content.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered NavigationMenuItem composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose List/Item/Trigger/Content under NavigationMenu. The root already appends NavigationMenuPositioner; adding another creates another popup composition. Content is routed through the shared viewport by Base UI. The host supplies destinations and authorization; the Indicator export wraps Icon rather than computing active-item geometry.
 * @example
 * ```tsx
 * import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent, NavigationMenuLink } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<NavigationMenu><NavigationMenuList><NavigationMenuItem><NavigationMenuTrigger>Project</NavigationMenuTrigger><NavigationMenuContent><NavigationMenuLink href="/overview">Overview</NavigationMenuLink></NavigationMenuContent></NavigationMenuItem></NavigationMenuList></NavigationMenu>);
 * }
 * ```
 */
function NavigationMenuItem({ className, ...props }: NavigationMenuPrimitive.Item.Props) {
  return (
    <NavigationMenuPrimitive.Item
      data-slot='navigation-menu-item'
      className={cn('relative', className)}
      {...props}
    />
  );
}

/**
 * Renders a navigation popup opener with a chevron.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered NavigationMenuTrigger composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose List/Item/Trigger/Content under NavigationMenu. The root already appends NavigationMenuPositioner; adding another creates another popup composition. Content is routed through the shared viewport by Base UI. The host supplies destinations and authorization; the Indicator export wraps Icon rather than computing active-item geometry.
 * @example
 * ```tsx
 * import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent, NavigationMenuLink } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<NavigationMenu><NavigationMenuList><NavigationMenuItem><NavigationMenuTrigger>Project</NavigationMenuTrigger><NavigationMenuContent><NavigationMenuLink href="/overview">Overview</NavigationMenuLink></NavigationMenuContent></NavigationMenuItem></NavigationMenuList></NavigationMenu>);
 * }
 * ```
 */
function NavigationMenuTrigger({
  className,
  children,
  ...props
}: NavigationMenuPrimitive.Trigger.Props) {
  return (
    <NavigationMenuPrimitive.Trigger
      data-slot='navigation-menu-trigger'
      className={cn(navigationMenuTriggerStyle(), 'group', className)}
      {...props}
    >
      {children}{' '}
      <ChevronDown
        className='relative top-[1px] ml-1 size-3 transition duration-300 group-data-open/navigation-menu-trigger:rotate-180 group-data-popup-open/navigation-menu-trigger:rotate-180'
        aria-hidden='true'
      />
    </NavigationMenuPrimitive.Trigger>
  );
}

/**
 * Renders the content associated with its navigation item.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered NavigationMenuContent composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose List/Item/Trigger/Content under NavigationMenu. The root already appends NavigationMenuPositioner; adding another creates another popup composition. Content is routed through the shared viewport by Base UI. The host supplies destinations and authorization; the Indicator export wraps Icon rather than computing active-item geometry.
 * @example
 * ```tsx
 * import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent, NavigationMenuLink } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<NavigationMenu><NavigationMenuList><NavigationMenuItem><NavigationMenuTrigger>Project</NavigationMenuTrigger><NavigationMenuContent><NavigationMenuLink href="/overview">Overview</NavigationMenuLink></NavigationMenuContent></NavigationMenuItem></NavigationMenuList></NavigationMenu>);
 * }
 * ```
 */
function NavigationMenuContent({ className, ...props }: NavigationMenuPrimitive.Content.Props) {
  return (
    <NavigationMenuPrimitive.Content
      data-slot='navigation-menu-content'
      className={cn(
        'data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 group-data-[viewport=false]/navigation-menu:bg-popover group-data-[viewport=false]/navigation-menu:text-popover-foreground group-data-[viewport=false]/navigation-menu:data-open:animate-in group-data-[viewport=false]/navigation-menu:data-closed:animate-out group-data-[viewport=false]/navigation-menu:data-closed:zoom-out-95 group-data-[viewport=false]/navigation-menu:data-open:zoom-in-95 group-data-[viewport=false]/navigation-menu:data-open:fade-in-0 group-data-[viewport=false]/navigation-menu:data-closed:fade-out-0 group-data-[viewport=false]/navigation-menu:ring-foreground/10 p-1 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[viewport=false]/navigation-menu:rounded-lg group-data-[viewport=false]/navigation-menu:shadow group-data-[viewport=false]/navigation-menu:ring-1 group-data-[viewport=false]/navigation-menu:duration-300 h-full w-auto **:data-[slot=navigation-menu-link]:focus:ring-0 **:data-[slot=navigation-menu-link]:focus:outline-none',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Portals the shared navigation popup and viewport with configurable alignment.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling. Wrapper defaults: side='bottom', sideOffset=8, align='start', alignOffset=0.
 * @returns The rendered NavigationMenuPositioner composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose List/Item/Trigger/Content under NavigationMenu. The root already appends NavigationMenuPositioner; adding another creates another popup composition. Content is routed through the shared viewport by Base UI. The host supplies destinations and authorization; the Indicator export wraps Icon rather than computing active-item geometry.  children are replaced by the shared popup/viewport composition.
 * @example
 * ```tsx
 * import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent, NavigationMenuLink } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<NavigationMenu><NavigationMenuList><NavigationMenuItem><NavigationMenuTrigger>Project</NavigationMenuTrigger><NavigationMenuContent><NavigationMenuLink href="/overview">Overview</NavigationMenuLink></NavigationMenuContent></NavigationMenuItem></NavigationMenuList></NavigationMenu>);
 * }
 * ```
 */
function NavigationMenuPositioner({
  className,
  side = 'bottom',
  sideOffset = 8,
  align = 'start',
  alignOffset = 0,
  ...props
}: NavigationMenuPrimitive.Positioner.Props) {
  return (
    <NavigationMenuPrimitive.Portal>
      <NavigationMenuPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        className={cn(
          'transition-[top,left,right,bottom] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-[side=bottom]:before:top-[-10px] data-[side=bottom]:before:right-0 data-[side=bottom]:before:left-0 isolate z-50 h-[var(--positioner-height)] w-[var(--positioner-width)] max-w-[var(--available-width)] data-[instant]:transition-none',
          className,
        )}
        {...props}
      >
        <NavigationMenuPrimitive.Popup className='bg-popover text-popover-foreground ring-foreground/10 rounded-lg shadow ring-1 transition-all ease-[cubic-bezier(0.22,1,0.36,1)] outline-none data-[ending-style]:scale-90 data-[ending-style]:opacity-0 data-[ending-style]:duration-150 data-[starting-style]:scale-90 data-[starting-style]:opacity-0 xs:w-(--popup-width) relative h-(--popup-height) w-(--popup-width) origin-(--transform-origin)'>
          <NavigationMenuPrimitive.Viewport className='relative size-full overflow-hidden' />
        </NavigationMenuPrimitive.Popup>
      </NavigationMenuPrimitive.Positioner>
    </NavigationMenuPrimitive.Portal>
  );
}

/**
 * Renders an accessible navigation link inside the menu.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered NavigationMenuLink composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose List/Item/Trigger/Content under NavigationMenu. The root already appends NavigationMenuPositioner; adding another creates another popup composition. Content is routed through the shared viewport by Base UI. The host supplies destinations and authorization; the Indicator export wraps Icon rather than computing active-item geometry.
 * @example
 * ```tsx
 * import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent, NavigationMenuLink } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<NavigationMenu><NavigationMenuList><NavigationMenuItem><NavigationMenuTrigger>Project</NavigationMenuTrigger><NavigationMenuContent><NavigationMenuLink href="/overview">Overview</NavigationMenuLink></NavigationMenuContent></NavigationMenuItem></NavigationMenuList></NavigationMenu>);
 * }
 * ```
 */
function NavigationMenuLink({ className, ...props }: NavigationMenuPrimitive.Link.Props) {
  return (
    <NavigationMenuPrimitive.Link
      data-slot='navigation-menu-link'
      className={cn(
        "data-active:focus:bg-muted data-active:hover:bg-muted data-active:bg-muted/50 focus-visible:ring-ring/50 hover:bg-muted focus:bg-muted flex items-center gap-2 rounded-lg p-2 text-sm transition-all outline-none focus-visible:ring-[3px] focus-visible:outline-1 [&_svg:not([class*='size-'])]:size-4 [[data-slot=navigation-menu-content]_&]:rounded-md",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Renders a diamond-shaped decoration through the Base UI navigation icon primitive.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered NavigationMenuIndicator composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose List/Item/Trigger/Content under NavigationMenu. The root already appends NavigationMenuPositioner; adding another creates another popup composition. Content is routed through the shared viewport by Base UI. The host supplies destinations and authorization; the Indicator export wraps Icon rather than computing active-item geometry.  children are replaced by the diamond-shaped marker.
 * @example
 * ```tsx
 * import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent, NavigationMenuLink } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<NavigationMenu><NavigationMenuList><NavigationMenuItem><NavigationMenuTrigger>Project</NavigationMenuTrigger><NavigationMenuContent><NavigationMenuLink href="/overview">Overview</NavigationMenuLink></NavigationMenuContent></NavigationMenuItem></NavigationMenuList></NavigationMenu>);
 * }
 * ```
 */
function NavigationMenuIndicator({ className, ...props }: NavigationMenuPrimitive.Icon.Props) {
  return (
    <NavigationMenuPrimitive.Icon
      data-slot='navigation-menu-indicator'
      className={cn(
        'data-[state=visible]:animate-in data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:fade-in top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden',
        className,
      )}
      {...props}
    >
      <div className='bg-border rounded-tl-sm shadow-md relative top-[60%] h-2 w-2 rotate-45' />
    </NavigationMenuPrimitive.Icon>
  );
}

export {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuPositioner,
};
