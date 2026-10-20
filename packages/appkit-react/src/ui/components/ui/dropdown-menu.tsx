'use client';

import * as React from 'react';
import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import { ChevronRightIcon, CheckIcon } from 'lucide-react';

import { cn } from '../../lib/utils';

/**
 * Coordinates popup menu state and focus behavior.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered DropdownMenu composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Items and popup parts require the matching DropdownMenu root. Put labels inside a Group and RadioItems inside RadioGroup. SubTrigger/SubContent require Sub under the parent menu. Content supplies its portal/positioner. inset adds left spacing when truthy; item variant defaults to default. Shortcut is presentational. Custom render composition follows Base UI; there is no asChild adapter.
 * @example
 * ```tsx
 * import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuSeparator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<DropdownMenu><DropdownMenuTrigger>Actions</DropdownMenuTrigger><DropdownMenuContent><DropdownMenuGroup><DropdownMenuLabel>Document</DropdownMenuLabel><DropdownMenuItem onClick={() => console.log("Open requested")}>Open</DropdownMenuItem></DropdownMenuGroup><DropdownMenuSeparator /><DropdownMenuItem disabled>Unavailable</DropdownMenuItem></DropdownMenuContent></DropdownMenu>);
 * }
 * ```
 */
function DropdownMenu({ ...props }: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root data-slot='dropdown-menu' {...props} />;
}

/**
 * Mounts menu descendants in a separate DOM container.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered DropdownMenuPortal composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Items and popup parts require the matching DropdownMenu root. Put labels inside a Group and RadioItems inside RadioGroup. SubTrigger/SubContent require Sub under the parent menu. Content supplies its portal/positioner. inset adds left spacing when truthy; item variant defaults to default. Shortcut is presentational. Custom render composition follows Base UI; there is no asChild adapter.
 * @example
 * ```tsx
 * import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuSeparator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<DropdownMenu><DropdownMenuTrigger>Actions</DropdownMenuTrigger><DropdownMenuContent><DropdownMenuGroup><DropdownMenuLabel>Document</DropdownMenuLabel><DropdownMenuItem onClick={() => console.log("Open requested")}>Open</DropdownMenuItem></DropdownMenuGroup><DropdownMenuSeparator /><DropdownMenuItem disabled>Unavailable</DropdownMenuItem></DropdownMenuContent></DropdownMenu>);
 * }
 * ```
 */
function DropdownMenuPortal({ ...props }: MenuPrimitive.Portal.Props) {
  return <MenuPrimitive.Portal data-slot='dropdown-menu-portal' {...props} />;
}

/**
 * Renders the control or context target that opens a menu.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered DropdownMenuTrigger composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Items and popup parts require the matching DropdownMenu root. Put labels inside a Group and RadioItems inside RadioGroup. SubTrigger/SubContent require Sub under the parent menu. Content supplies its portal/positioner. inset adds left spacing when truthy; item variant defaults to default. Shortcut is presentational. Custom render composition follows Base UI; there is no asChild adapter.
 * @example
 * ```tsx
 * import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuSeparator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<DropdownMenu><DropdownMenuTrigger>Actions</DropdownMenuTrigger><DropdownMenuContent><DropdownMenuGroup><DropdownMenuLabel>Document</DropdownMenuLabel><DropdownMenuItem onClick={() => console.log("Open requested")}>Open</DropdownMenuItem></DropdownMenuGroup><DropdownMenuSeparator /><DropdownMenuItem disabled>Unavailable</DropdownMenuItem></DropdownMenuContent></DropdownMenu>);
 * }
 * ```
 */
function DropdownMenuTrigger({
  children,
  ...props
}: MenuPrimitive.Trigger.Props) {
  return (
    <MenuPrimitive.Trigger
      data-slot='dropdown-menu-trigger'
      {...props}
    >
      {children}
    </MenuPrimitive.Trigger>
  );
}

/**
 * Portals the menu popup through its positioned container.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling. Wrapper defaults: align='start', alignOffset=0, side='bottom', sideOffset=4.
 * @returns The rendered DropdownMenuContent composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Items and popup parts require the matching DropdownMenu root. Put labels inside a Group and RadioItems inside RadioGroup. SubTrigger/SubContent require Sub under the parent menu. Content supplies its portal/positioner. inset adds left spacing when truthy; item variant defaults to default. Shortcut is presentational. Custom render composition follows Base UI; there is no asChild adapter. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuSeparator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<DropdownMenu><DropdownMenuTrigger>Actions</DropdownMenuTrigger><DropdownMenuContent><DropdownMenuGroup><DropdownMenuLabel>Document</DropdownMenuLabel><DropdownMenuItem onClick={() => console.log("Open requested")}>Open</DropdownMenuItem></DropdownMenuGroup><DropdownMenuSeparator /><DropdownMenuItem disabled>Unavailable</DropdownMenuItem></DropdownMenuContent></DropdownMenu>);
 * }
 * ```
 */
const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  MenuPrimitive.Popup.Props &
    Pick<MenuPrimitive.Positioner.Props, 'align' | 'alignOffset' | 'side' | 'sideOffset'>
>(
  (
    { className, align = 'start', alignOffset = 0, side = 'bottom', sideOffset = 4, ...props },
    ref,
  ) => (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        className='isolate z-50 outline-none'
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          ref={ref}
          data-slot='dropdown-menu-content'
          className={cn(
            'data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 bg-popover text-popover-foreground min-w-32 rounded-lg p-1 shadow-md ring-1 duration-100 z-50 max-h-(--available-height) w-(--anchor-width) origin-(--transform-origin) overflow-x-hidden overflow-y-auto outline-none data-closed:overflow-hidden',
            className,
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  ),
);
DropdownMenuContent.displayName = MenuPrimitive.Popup.displayName;

/**
 * Groups related menu actions.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered DropdownMenuGroup composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Items and popup parts require the matching DropdownMenu root. Put labels inside a Group and RadioItems inside RadioGroup. SubTrigger/SubContent require Sub under the parent menu. Content supplies its portal/positioner. inset adds left spacing when truthy; item variant defaults to default. Shortcut is presentational. Custom render composition follows Base UI; there is no asChild adapter.
 * @example
 * ```tsx
 * import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuSeparator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<DropdownMenu><DropdownMenuTrigger>Actions</DropdownMenuTrigger><DropdownMenuContent><DropdownMenuGroup><DropdownMenuLabel>Document</DropdownMenuLabel><DropdownMenuItem onClick={() => console.log("Open requested")}>Open</DropdownMenuItem></DropdownMenuGroup><DropdownMenuSeparator /><DropdownMenuItem disabled>Unavailable</DropdownMenuItem></DropdownMenuContent></DropdownMenu>);
 * }
 * ```
 */
function DropdownMenuGroup({ ...props }: MenuPrimitive.Group.Props) {
  return <MenuPrimitive.Group data-slot='dropdown-menu-group' {...props} />;
}

/**
 * Renders the accessible label of a menu group with optional inset spacing.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered DropdownMenuLabel composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Items and popup parts require the matching DropdownMenu root. Put labels inside a Group and RadioItems inside RadioGroup. SubTrigger/SubContent require Sub under the parent menu. Content supplies its portal/positioner. inset adds left spacing when truthy; item variant defaults to default. Shortcut is presentational. Custom render composition follows Base UI; there is no asChild adapter. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuSeparator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<DropdownMenu><DropdownMenuTrigger>Actions</DropdownMenuTrigger><DropdownMenuContent><DropdownMenuGroup><DropdownMenuLabel>Document</DropdownMenuLabel><DropdownMenuItem onClick={() => console.log("Open requested")}>Open</DropdownMenuItem></DropdownMenuGroup><DropdownMenuSeparator /><DropdownMenuItem disabled>Unavailable</DropdownMenuItem></DropdownMenuContent></DropdownMenu>);
 * }
 * ```
 */
const DropdownMenuLabel = React.forwardRef<
  HTMLDivElement,
  MenuPrimitive.GroupLabel.Props & { /**
 * Adds left inset spacing when true; omitted/false uses normal alignment.
 */
  /**
   * Adds left inset spacing when true; omitted/false uses normal alignment.
   */
  inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <MenuPrimitive.GroupLabel
    ref={ref}
    data-slot='dropdown-menu-label'
    data-inset={inset}
    className={cn(
      'text-muted-foreground px-1.5 py-1 text-xs font-medium data-[inset]:pl-8',
      className,
    )}
    {...props}
  />
));
DropdownMenuLabel.displayName = MenuPrimitive.GroupLabel.displayName;

/**
 * Renders a menu action with optional destructive styling and inset spacing.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling. Wrapper defaults: variant='default'.
 * @returns The rendered DropdownMenuItem composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Items and popup parts require the matching DropdownMenu root. Put labels inside a Group and RadioItems inside RadioGroup. SubTrigger/SubContent require Sub under the parent menu. Content supplies its portal/positioner. inset adds left spacing when truthy; item variant defaults to default. Shortcut is presentational. Custom render composition follows Base UI; there is no asChild adapter. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuSeparator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<DropdownMenu><DropdownMenuTrigger>Actions</DropdownMenuTrigger><DropdownMenuContent><DropdownMenuGroup><DropdownMenuLabel>Document</DropdownMenuLabel><DropdownMenuItem onClick={() => console.log("Open requested")}>Open</DropdownMenuItem></DropdownMenuGroup><DropdownMenuSeparator /><DropdownMenuItem disabled>Unavailable</DropdownMenuItem></DropdownMenuContent></DropdownMenu>);
 * }
 * ```
 */
const DropdownMenuItem = React.forwardRef<
  HTMLDivElement,
  MenuPrimitive.Item.Props & {
    /**
     * Adds left inset spacing when true; omitted/false uses normal alignment.
     */
    inset?: boolean;
    /**
     * Visual treatment from the declared variant union; changing it does not alter host action semantics.
     */
    variant?: 'default' | 'destructive';
  }
>(({ className, inset, variant = 'default', children, ...props }, ref) => (
  <MenuPrimitive.Item
    ref={ref}
    data-slot='dropdown-menu-item'
    data-inset={inset}
    data-variant={variant}
    className={cn(
      "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:text-destructive not-data-[variant=destructive]:focus:**:text-accent-foreground gap-1.5 rounded-md px-1.5 py-1 text-sm [&_svg:not([class*='size-'])]:size-4 group/dropdown-menu-item relative flex cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0",
      className,
    )}
    {...props}
  >
    {children}
  </MenuPrimitive.Item>
));
DropdownMenuItem.displayName = MenuPrimitive.Item.displayName;

/**
 * Coordinates a submenu nested inside a parent menu.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered DropdownMenuSub composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Items and popup parts require the matching DropdownMenu root. Put labels inside a Group and RadioItems inside RadioGroup. SubTrigger/SubContent require Sub under the parent menu. Content supplies its portal/positioner. inset adds left spacing when truthy; item variant defaults to default. Shortcut is presentational. Custom render composition follows Base UI; there is no asChild adapter.
 * @example
 * ```tsx
 * import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuSeparator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<DropdownMenu><DropdownMenuTrigger>Actions</DropdownMenuTrigger><DropdownMenuContent><DropdownMenuGroup><DropdownMenuLabel>Document</DropdownMenuLabel><DropdownMenuItem onClick={() => console.log("Open requested")}>Open</DropdownMenuItem></DropdownMenuGroup><DropdownMenuSeparator /><DropdownMenuItem disabled>Unavailable</DropdownMenuItem></DropdownMenuContent></DropdownMenu>);
 * }
 * ```
 */
function DropdownMenuSub({ ...props }: MenuPrimitive.SubmenuRoot.Props) {
  return <MenuPrimitive.SubmenuRoot data-slot='dropdown-menu-sub' {...props} />;
}

/**
 * Renders a submenu opener with a trailing chevron.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered DropdownMenuSubTrigger composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Items and popup parts require the matching DropdownMenu root. Put labels inside a Group and RadioItems inside RadioGroup. SubTrigger/SubContent require Sub under the parent menu. Content supplies its portal/positioner. inset adds left spacing when truthy; item variant defaults to default. Shortcut is presentational. Custom render composition follows Base UI; there is no asChild adapter. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuSeparator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<DropdownMenu><DropdownMenuTrigger>Actions</DropdownMenuTrigger><DropdownMenuContent><DropdownMenuGroup><DropdownMenuLabel>Document</DropdownMenuLabel><DropdownMenuItem onClick={() => console.log("Open requested")}>Open</DropdownMenuItem></DropdownMenuGroup><DropdownMenuSeparator /><DropdownMenuItem disabled>Unavailable</DropdownMenuItem></DropdownMenuContent></DropdownMenu>);
 * }
 * ```
 */
const DropdownMenuSubTrigger = React.forwardRef<
  HTMLDivElement,
  MenuPrimitive.SubmenuTrigger.Props & { /**
 * Adds left inset spacing when true; omitted/false uses normal alignment.
 */
  /**
   * Adds left inset spacing when true; omitted/false uses normal alignment.
   */
  inset?: boolean }
>(({ className, inset, children, ...props }, ref) => (
  <MenuPrimitive.SubmenuTrigger
    ref={ref}
    data-slot='dropdown-menu-sub-trigger'
    data-inset={inset}
    className={cn(
      "focus:bg-accent focus:text-accent-foreground data-open:bg-accent data-open:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground gap-1.5 rounded-md px-1.5 py-1 text-sm [&_svg:not([class*='size-'])]:size-4 flex cursor-default items-center outline-hidden select-none data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0",
      className,
    )}
    {...props}
  >
    {children}
    <ChevronRightIcon className='ml-auto' />
  </MenuPrimitive.SubmenuTrigger>
));
DropdownMenuSubTrigger.displayName = MenuPrimitive.SubmenuTrigger.displayName;

/**
 * Renders a positioned submenu popup.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling. Wrapper defaults: align='start', alignOffset=-3, side='right', sideOffset=0.
 * @returns The rendered DropdownMenuSubContent composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Items and popup parts require the matching DropdownMenu root. Put labels inside a Group and RadioItems inside RadioGroup. SubTrigger/SubContent require Sub under the parent menu. Content supplies its portal/positioner. inset adds left spacing when truthy; item variant defaults to default. Shortcut is presentational. Custom render composition follows Base UI; there is no asChild adapter. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuSeparator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<DropdownMenu><DropdownMenuTrigger>Actions</DropdownMenuTrigger><DropdownMenuContent><DropdownMenuGroup><DropdownMenuLabel>Document</DropdownMenuLabel><DropdownMenuItem onClick={() => console.log("Open requested")}>Open</DropdownMenuItem></DropdownMenuGroup><DropdownMenuSeparator /><DropdownMenuItem disabled>Unavailable</DropdownMenuItem></DropdownMenuContent></DropdownMenu>);
 * }
 * ```
 */
const DropdownMenuSubContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof DropdownMenuContent>
>(
  (
    { className, align = 'start', alignOffset = -3, side = 'right', sideOffset = 0, ...props },
    ref,
  ) => (
    <DropdownMenuContent
      ref={ref}
      data-slot='dropdown-menu-sub-content'
      className={cn(
        'data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 bg-popover text-popover-foreground min-w-[96px] rounded-md p-1 shadow-lg ring-1 duration-100 w-auto',
        className,
      )}
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      {...props}
    />
  ),
);
DropdownMenuSubContent.displayName = 'DropdownMenuSubContent';

/**
 * Renders a checked menu action with a checkmark indicator.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered DropdownMenuCheckboxItem composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Items and popup parts require the matching DropdownMenu root. Put labels inside a Group and RadioItems inside RadioGroup. SubTrigger/SubContent require Sub under the parent menu. Content supplies its portal/positioner. inset adds left spacing when truthy; item variant defaults to default. Shortcut is presentational. Custom render composition follows Base UI; there is no asChild adapter. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuSeparator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<DropdownMenu><DropdownMenuTrigger>Actions</DropdownMenuTrigger><DropdownMenuContent><DropdownMenuGroup><DropdownMenuLabel>Document</DropdownMenuLabel><DropdownMenuItem onClick={() => console.log("Open requested")}>Open</DropdownMenuItem></DropdownMenuGroup><DropdownMenuSeparator /><DropdownMenuItem disabled>Unavailable</DropdownMenuItem></DropdownMenuContent></DropdownMenu>);
 * }
 * ```
 */
const DropdownMenuCheckboxItem = React.forwardRef<HTMLDivElement, MenuPrimitive.CheckboxItem.Props>(
  ({ className, children, checked, ...props }, ref) => (
    <MenuPrimitive.CheckboxItem
      ref={ref}
      data-slot='dropdown-menu-checkbox-item'
      className={cn(
        "focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm [&_svg:not([class*='size-'])]:size-4 relative flex cursor-default items-center outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      checked={checked}
      {...props}
    >
      <span
        className='pointer-events-none absolute right-2 flex items-center justify-center pointer-events-none'
        data-slot='dropdown-menu-checkbox-item-indicator'
      >
        <MenuPrimitive.CheckboxItemIndicator>
          <CheckIcon />
        </MenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  ),
);
DropdownMenuCheckboxItem.displayName = MenuPrimitive.CheckboxItem.displayName;

/**
 * Coordinates mutually exclusive menu choices.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered DropdownMenuRadioGroup composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Items and popup parts require the matching DropdownMenu root. Put labels inside a Group and RadioItems inside RadioGroup. SubTrigger/SubContent require Sub under the parent menu. Content supplies its portal/positioner. inset adds left spacing when truthy; item variant defaults to default. Shortcut is presentational. Custom render composition follows Base UI; there is no asChild adapter.
 * @example
 * ```tsx
 * import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuSeparator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<DropdownMenu><DropdownMenuTrigger>Actions</DropdownMenuTrigger><DropdownMenuContent><DropdownMenuGroup><DropdownMenuLabel>Document</DropdownMenuLabel><DropdownMenuItem onClick={() => console.log("Open requested")}>Open</DropdownMenuItem></DropdownMenuGroup><DropdownMenuSeparator /><DropdownMenuItem disabled>Unavailable</DropdownMenuItem></DropdownMenuContent></DropdownMenu>);
 * }
 * ```
 */
function DropdownMenuRadioGroup({ ...props }: MenuPrimitive.RadioGroup.Props) {
  return <MenuPrimitive.RadioGroup data-slot='dropdown-menu-radio-group' {...props} />;
}

/**
 * Renders one value in a menu radio group.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered DropdownMenuRadioItem composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Items and popup parts require the matching DropdownMenu root. Put labels inside a Group and RadioItems inside RadioGroup. SubTrigger/SubContent require Sub under the parent menu. Content supplies its portal/positioner. inset adds left spacing when truthy; item variant defaults to default. Shortcut is presentational. Custom render composition follows Base UI; there is no asChild adapter. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuSeparator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<DropdownMenu><DropdownMenuTrigger>Actions</DropdownMenuTrigger><DropdownMenuContent><DropdownMenuGroup><DropdownMenuLabel>Document</DropdownMenuLabel><DropdownMenuItem onClick={() => console.log("Open requested")}>Open</DropdownMenuItem></DropdownMenuGroup><DropdownMenuSeparator /><DropdownMenuItem disabled>Unavailable</DropdownMenuItem></DropdownMenuContent></DropdownMenu>);
 * }
 * ```
 */
const DropdownMenuRadioItem = React.forwardRef<HTMLDivElement, MenuPrimitive.RadioItem.Props>(
  ({ className, children, ...props }, ref) => (
    <MenuPrimitive.RadioItem
      ref={ref}
      data-slot='dropdown-menu-radio-item'
      className={cn(
        "focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm [&_svg:not([class*='size-'])]:size-4 relative flex cursor-default items-center outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      {...props}
    >
      <span
        className='pointer-events-none absolute right-2 flex items-center justify-center pointer-events-none'
        data-slot='dropdown-menu-radio-item-indicator'
      >
        <MenuPrimitive.RadioItemIndicator>
          <CheckIcon />
        </MenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  ),
);
DropdownMenuRadioItem.displayName = MenuPrimitive.RadioItem.displayName;

/**
 * Draws a divider between menu sections.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered DropdownMenuSeparator composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Items and popup parts require the matching DropdownMenu root. Put labels inside a Group and RadioItems inside RadioGroup. SubTrigger/SubContent require Sub under the parent menu. Content supplies its portal/positioner. inset adds left spacing when truthy; item variant defaults to default. Shortcut is presentational. Custom render composition follows Base UI; there is no asChild adapter. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuSeparator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<DropdownMenu><DropdownMenuTrigger>Actions</DropdownMenuTrigger><DropdownMenuContent><DropdownMenuGroup><DropdownMenuLabel>Document</DropdownMenuLabel><DropdownMenuItem onClick={() => console.log("Open requested")}>Open</DropdownMenuItem></DropdownMenuGroup><DropdownMenuSeparator /><DropdownMenuItem disabled>Unavailable</DropdownMenuItem></DropdownMenuContent></DropdownMenu>);
 * }
 * ```
 */
const DropdownMenuSeparator = React.forwardRef<HTMLDivElement, MenuPrimitive.Separator.Props>(
  ({ className, ...props }, ref) => (
    <MenuPrimitive.Separator
      ref={ref}
      data-slot='dropdown-menu-separator'
      className={cn('bg-border -mx-1 my-1 h-px', className)}
      {...props}
    />
  ),
);
DropdownMenuSeparator.displayName = MenuPrimitive.Separator.displayName;

/**
 * Styles a shortcut hint without installing keyboard listeners.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered DropdownMenuShortcut composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Items and popup parts require the matching DropdownMenu root. Put labels inside a Group and RadioItems inside RadioGroup. SubTrigger/SubContent require Sub under the parent menu. Content supplies its portal/positioner. inset adds left spacing when truthy; item variant defaults to default. Shortcut is presentational. Custom render composition follows Base UI; there is no asChild adapter. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuSeparator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<DropdownMenu><DropdownMenuTrigger>Actions</DropdownMenuTrigger><DropdownMenuContent><DropdownMenuGroup><DropdownMenuLabel>Document</DropdownMenuLabel><DropdownMenuItem onClick={() => console.log("Open requested")}>Open</DropdownMenuItem></DropdownMenuGroup><DropdownMenuSeparator /><DropdownMenuItem disabled>Unavailable</DropdownMenuItem></DropdownMenuContent></DropdownMenu>);
 * }
 * ```
 */
const DropdownMenuShortcut = React.forwardRef<HTMLSpanElement, React.ComponentProps<'span'>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      data-slot='dropdown-menu-shortcut'
      className={cn(
        'text-muted-foreground group-focus/dropdown-menu-item:text-accent-foreground ml-auto text-xs tracking-widest',
        className,
      )}
      {...props}
    />
  ),
);
DropdownMenuShortcut.displayName = 'DropdownMenuShortcut';

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
};
