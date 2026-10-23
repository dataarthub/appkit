'use client';

import * as React from 'react';
import { ContextMenu as ContextMenuPrimitive } from '@base-ui/react/context-menu';
import { ChevronRightIcon, CheckIcon } from 'lucide-react';

import { cn } from '../../lib/utils';

/**
 * Coordinates popup menu state and focus behavior.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ContextMenu composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Items and popup parts require the matching ContextMenu root. Put labels inside a Group and RadioItems inside RadioGroup. SubTrigger/SubContent require Sub under the parent menu. Content supplies its portal/positioner. inset adds left spacing when truthy; item variant defaults to default. Shortcut is presentational. Custom render composition follows Base UI; there is no asChild adapter.
 * @example
 * ```tsx
 * import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuGroup, ContextMenuLabel, ContextMenuSeparator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<ContextMenu><ContextMenuTrigger>Right-click here</ContextMenuTrigger><ContextMenuContent><ContextMenuGroup><ContextMenuLabel>Document</ContextMenuLabel><ContextMenuItem onClick={() => console.log("Open requested")}>Open</ContextMenuItem></ContextMenuGroup><ContextMenuSeparator /><ContextMenuItem disabled>Unavailable</ContextMenuItem></ContextMenuContent></ContextMenu>);
 * }
 * ```
 */
const ContextMenu = (props: ContextMenuPrimitive.Root.Props) => (
  <ContextMenuPrimitive.Root data-slot='context-menu' {...props} />
);
ContextMenu.displayName = 'ContextMenu';

/**
 * Mounts menu descendants in a separate DOM container.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ContextMenuPortal composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Items and popup parts require the matching ContextMenu root. Put labels inside a Group and RadioItems inside RadioGroup. SubTrigger/SubContent require Sub under the parent menu. Content supplies its portal/positioner. inset adds left spacing when truthy; item variant defaults to default. Shortcut is presentational. Custom render composition follows Base UI; there is no asChild adapter. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuGroup, ContextMenuLabel, ContextMenuSeparator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<ContextMenu><ContextMenuTrigger>Right-click here</ContextMenuTrigger><ContextMenuContent><ContextMenuGroup><ContextMenuLabel>Document</ContextMenuLabel><ContextMenuItem onClick={() => console.log("Open requested")}>Open</ContextMenuItem></ContextMenuGroup><ContextMenuSeparator /><ContextMenuItem disabled>Unavailable</ContextMenuItem></ContextMenuContent></ContextMenu>);
 * }
 * ```
 */
function ContextMenuPortal({
  ref,
  ...props
}: React.PropsWithoutRef<ContextMenuPrimitive.Portal.Props> & React.RefAttributes<HTMLDivElement>) {
  return <ContextMenuPrimitive.Portal ref={ref} data-slot='context-menu-portal' {...props} />;
}
ContextMenuPortal.displayName = 'ContextMenuPortal';

/**
 * Renders the control or context target that opens a menu.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ContextMenuTrigger composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Items and popup parts require the matching ContextMenu root. Put labels inside a Group and RadioItems inside RadioGroup. SubTrigger/SubContent require Sub under the parent menu. Content supplies its portal/positioner. inset adds left spacing when truthy; item variant defaults to default. Shortcut is presentational. Custom render composition follows Base UI; there is no asChild adapter. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuGroup, ContextMenuLabel, ContextMenuSeparator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<ContextMenu><ContextMenuTrigger>Right-click here</ContextMenuTrigger><ContextMenuContent><ContextMenuGroup><ContextMenuLabel>Document</ContextMenuLabel><ContextMenuItem onClick={() => console.log("Open requested")}>Open</ContextMenuItem></ContextMenuGroup><ContextMenuSeparator /><ContextMenuItem disabled>Unavailable</ContextMenuItem></ContextMenuContent></ContextMenu>);
 * }
 * ```
 */
function ContextMenuTrigger({
  ref,
  className,
  children,
  ...props
}: React.PropsWithoutRef<ContextMenuPrimitive.Trigger.Props> &
  React.RefAttributes<React.ComponentRef<typeof ContextMenuPrimitive.Trigger>>) {
  return (
    <ContextMenuPrimitive.Trigger
      ref={ref}
      data-slot='context-menu-trigger'
      className={cn('select-none', className)}
      {...props}
    >
      {children}
    </ContextMenuPrimitive.Trigger>
  );
}
ContextMenuTrigger.displayName = 'ContextMenuTrigger';

/**
 * Portals the menu popup through its positioned container.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling. Wrapper defaults: align='start', alignOffset=4, side='right', sideOffset=0.
 * @returns The rendered ContextMenuContent composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Items and popup parts require the matching ContextMenu root. Put labels inside a Group and RadioItems inside RadioGroup. SubTrigger/SubContent require Sub under the parent menu. Content supplies its portal/positioner. inset adds left spacing when truthy; item variant defaults to default. Shortcut is presentational. Custom render composition follows Base UI; there is no asChild adapter. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuGroup, ContextMenuLabel, ContextMenuSeparator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<ContextMenu><ContextMenuTrigger>Right-click here</ContextMenuTrigger><ContextMenuContent><ContextMenuGroup><ContextMenuLabel>Document</ContextMenuLabel><ContextMenuItem onClick={() => console.log("Open requested")}>Open</ContextMenuItem></ContextMenuGroup><ContextMenuSeparator /><ContextMenuItem disabled>Unavailable</ContextMenuItem></ContextMenuContent></ContextMenu>);
 * }
 * ```
 */
function ContextMenuContent({
  ref,
  className,
  align = 'start',
  alignOffset = 4,
  side = 'right',
  sideOffset = 0,
  ...props
}: React.PropsWithoutRef<
  ContextMenuPrimitive.Popup.Props &
    Pick<ContextMenuPrimitive.Positioner.Props, 'align' | 'alignOffset' | 'side' | 'sideOffset'>
> &
  React.RefAttributes<HTMLDivElement>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Positioner
        className='isolate z-50 outline-none'
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <ContextMenuPrimitive.Popup
          ref={ref}
          data-slot='context-menu-content'
          className={cn(
            'data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 bg-popover text-popover-foreground min-w-36 rounded-lg p-1 shadow-md ring-1 duration-100 z-50 max-h-(--available-height) origin-(--transform-origin) overflow-x-hidden overflow-y-auto outline-none',
            className,
          )}
          {...props}
        />
      </ContextMenuPrimitive.Positioner>
    </ContextMenuPrimitive.Portal>
  );
}
ContextMenuContent.displayName = 'ContextMenuContent';

/**
 * Groups related menu actions.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ContextMenuGroup composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Items and popup parts require the matching ContextMenu root. Put labels inside a Group and RadioItems inside RadioGroup. SubTrigger/SubContent require Sub under the parent menu. Content supplies its portal/positioner. inset adds left spacing when truthy; item variant defaults to default. Shortcut is presentational. Custom render composition follows Base UI; there is no asChild adapter. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuGroup, ContextMenuLabel, ContextMenuSeparator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<ContextMenu><ContextMenuTrigger>Right-click here</ContextMenuTrigger><ContextMenuContent><ContextMenuGroup><ContextMenuLabel>Document</ContextMenuLabel><ContextMenuItem onClick={() => console.log("Open requested")}>Open</ContextMenuItem></ContextMenuGroup><ContextMenuSeparator /><ContextMenuItem disabled>Unavailable</ContextMenuItem></ContextMenuContent></ContextMenu>);
 * }
 * ```
 */
function ContextMenuGroup({
  ref,
  ...props
}: React.PropsWithoutRef<ContextMenuPrimitive.Group.Props> & React.RefAttributes<HTMLDivElement>) {
  return <ContextMenuPrimitive.Group ref={ref} data-slot='context-menu-group' {...props} />;
}
ContextMenuGroup.displayName = 'ContextMenuGroup';

/**
 * Renders the accessible label of a menu group with optional inset spacing.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ContextMenuLabel composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Items and popup parts require the matching ContextMenu root. Put labels inside a Group and RadioItems inside RadioGroup. SubTrigger/SubContent require Sub under the parent menu. Content supplies its portal/positioner. inset adds left spacing when truthy; item variant defaults to default. Shortcut is presentational. Custom render composition follows Base UI; there is no asChild adapter. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuGroup, ContextMenuLabel, ContextMenuSeparator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<ContextMenu><ContextMenuTrigger>Right-click here</ContextMenuTrigger><ContextMenuContent><ContextMenuGroup><ContextMenuLabel>Document</ContextMenuLabel><ContextMenuItem onClick={() => console.log("Open requested")}>Open</ContextMenuItem></ContextMenuGroup><ContextMenuSeparator /><ContextMenuItem disabled>Unavailable</ContextMenuItem></ContextMenuContent></ContextMenu>);
 * }
 * ```
 */
function ContextMenuLabel({
  ref,
  className,
  inset,
  ...props
}: React.PropsWithoutRef<
  ContextMenuPrimitive.GroupLabel.Props & {
    /**
     * Adds left inset spacing when true; omitted/false uses normal alignment.
     */
    /**
     * Adds left inset spacing when true; omitted/false uses normal alignment.
     */
    inset?: boolean;
  }
> &
  React.RefAttributes<HTMLDivElement>) {
  return (
    <ContextMenuPrimitive.GroupLabel
      ref={ref}
      data-slot='context-menu-label'
      data-inset={inset}
      className={cn(
        'text-muted-foreground px-1.5 py-1 text-xs font-medium data-[inset]:pl-8',
        className,
      )}
      {...props}
    />
  );
}
ContextMenuLabel.displayName = 'ContextMenuLabel';

/**
 * Renders a menu action with optional destructive styling and inset spacing.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling. Wrapper defaults: variant='default'.
 * @returns The rendered ContextMenuItem composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Items and popup parts require the matching ContextMenu root. Put labels inside a Group and RadioItems inside RadioGroup. SubTrigger/SubContent require Sub under the parent menu. Content supplies its portal/positioner. inset adds left spacing when truthy; item variant defaults to default. Shortcut is presentational. Custom render composition follows Base UI; there is no asChild adapter. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuGroup, ContextMenuLabel, ContextMenuSeparator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<ContextMenu><ContextMenuTrigger>Right-click here</ContextMenuTrigger><ContextMenuContent><ContextMenuGroup><ContextMenuLabel>Document</ContextMenuLabel><ContextMenuItem onClick={() => console.log("Open requested")}>Open</ContextMenuItem></ContextMenuGroup><ContextMenuSeparator /><ContextMenuItem disabled>Unavailable</ContextMenuItem></ContextMenuContent></ContextMenu>);
 * }
 * ```
 */
function ContextMenuItem({
  ref,
  className,
  inset,
  variant = 'default',
  ...props
}: React.PropsWithoutRef<
  ContextMenuPrimitive.Item.Props & {
    /**
     * Adds left inset spacing when true; omitted/false uses normal alignment.
     */
    inset?: boolean;
    /**
     * Visual treatment from the declared variant union; changing it does not alter host action semantics.
     */
    variant?: 'default' | 'destructive';
  }
> &
  React.RefAttributes<HTMLDivElement>) {
  return (
    <ContextMenuPrimitive.Item
      ref={ref}
      data-slot='context-menu-item'
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:text-destructive focus:*:[svg]:text-accent-foreground gap-1.5 rounded-md px-1.5 py-1 text-sm [&_svg:not([class*='size-'])]:size-4 group/context-menu-item relative flex cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}
ContextMenuItem.displayName = 'ContextMenuItem';

/**
 * Coordinates a submenu nested inside a parent menu.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ContextMenuSub composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Items and popup parts require the matching ContextMenu root. Put labels inside a Group and RadioItems inside RadioGroup. SubTrigger/SubContent require Sub under the parent menu. Content supplies its portal/positioner. inset adds left spacing when truthy; item variant defaults to default. Shortcut is presentational. Custom render composition follows Base UI; there is no asChild adapter.
 * @example
 * ```tsx
 * import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuGroup, ContextMenuLabel, ContextMenuSeparator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<ContextMenu><ContextMenuTrigger>Right-click here</ContextMenuTrigger><ContextMenuContent><ContextMenuGroup><ContextMenuLabel>Document</ContextMenuLabel><ContextMenuItem onClick={() => console.log("Open requested")}>Open</ContextMenuItem></ContextMenuGroup><ContextMenuSeparator /><ContextMenuItem disabled>Unavailable</ContextMenuItem></ContextMenuContent></ContextMenu>);
 * }
 * ```
 */
const ContextMenuSub = (props: ContextMenuPrimitive.SubmenuRoot.Props) => (
  <ContextMenuPrimitive.SubmenuRoot data-slot='context-menu-sub' {...props} />
);
ContextMenuSub.displayName = 'ContextMenuSub';

/**
 * Renders a submenu opener with a trailing chevron.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ContextMenuSubTrigger composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Items and popup parts require the matching ContextMenu root. Put labels inside a Group and RadioItems inside RadioGroup. SubTrigger/SubContent require Sub under the parent menu. Content supplies its portal/positioner. inset adds left spacing when truthy; item variant defaults to default. Shortcut is presentational. Custom render composition follows Base UI; there is no asChild adapter. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuGroup, ContextMenuLabel, ContextMenuSeparator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<ContextMenu><ContextMenuTrigger>Right-click here</ContextMenuTrigger><ContextMenuContent><ContextMenuGroup><ContextMenuLabel>Document</ContextMenuLabel><ContextMenuItem onClick={() => console.log("Open requested")}>Open</ContextMenuItem></ContextMenuGroup><ContextMenuSeparator /><ContextMenuItem disabled>Unavailable</ContextMenuItem></ContextMenuContent></ContextMenu>);
 * }
 * ```
 */
function ContextMenuSubTrigger({
  ref,
  className,
  inset,
  children,
  ...props
}: React.PropsWithoutRef<
  ContextMenuPrimitive.SubmenuTrigger.Props & {
    /**
     * Adds left inset spacing when true; omitted/false uses normal alignment.
     */
    /**
     * Adds left inset spacing when true; omitted/false uses normal alignment.
     */
    inset?: boolean;
  }
> &
  React.RefAttributes<HTMLDivElement>) {
  return (
    <ContextMenuPrimitive.SubmenuTrigger
      ref={ref}
      data-slot='context-menu-sub-trigger'
      data-inset={inset}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-open:bg-accent data-open:text-accent-foreground gap-1.5 rounded-md px-1.5 py-1 text-sm [&_svg:not([class*='size-'])]:size-4 flex cursor-default items-center outline-hidden select-none data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className='ml-auto' />
    </ContextMenuPrimitive.SubmenuTrigger>
  );
}
ContextMenuSubTrigger.displayName = 'ContextMenuSubTrigger';

/**
 * Renders a positioned submenu popup.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ContextMenuSubContent composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Items and popup parts require the matching ContextMenu root. Put labels inside a Group and RadioItems inside RadioGroup. SubTrigger/SubContent require Sub under the parent menu. Content supplies its portal/positioner. inset adds left spacing when truthy; item variant defaults to default. Shortcut is presentational. Custom render composition follows Base UI; there is no asChild adapter. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuGroup, ContextMenuLabel, ContextMenuSeparator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<ContextMenu><ContextMenuTrigger>Right-click here</ContextMenuTrigger><ContextMenuContent><ContextMenuGroup><ContextMenuLabel>Document</ContextMenuLabel><ContextMenuItem onClick={() => console.log("Open requested")}>Open</ContextMenuItem></ContextMenuGroup><ContextMenuSeparator /><ContextMenuItem disabled>Unavailable</ContextMenuItem></ContextMenuContent></ContextMenu>);
 * }
 * ```
 */
function ContextMenuSubContent({
  ref,
  ...props
}: React.PropsWithoutRef<React.ComponentProps<typeof ContextMenuContent>> &
  React.RefAttributes<HTMLDivElement>) {
  return (
    <ContextMenuContent
      ref={ref}
      data-slot='context-menu-sub-content'
      className='shadow-lg'
      side='right'
      {...props}
    />
  );
}
ContextMenuSubContent.displayName = 'ContextMenuSubContent';

/**
 * Renders a checked menu action with a checkmark indicator.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ContextMenuCheckboxItem composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Items and popup parts require the matching ContextMenu root. Put labels inside a Group and RadioItems inside RadioGroup. SubTrigger/SubContent require Sub under the parent menu. Content supplies its portal/positioner. inset adds left spacing when truthy; item variant defaults to default. Shortcut is presentational. Custom render composition follows Base UI; there is no asChild adapter. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuGroup, ContextMenuLabel, ContextMenuSeparator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<ContextMenu><ContextMenuTrigger>Right-click here</ContextMenuTrigger><ContextMenuContent><ContextMenuGroup><ContextMenuLabel>Document</ContextMenuLabel><ContextMenuItem onClick={() => console.log("Open requested")}>Open</ContextMenuItem></ContextMenuGroup><ContextMenuSeparator /><ContextMenuItem disabled>Unavailable</ContextMenuItem></ContextMenuContent></ContextMenu>);
 * }
 * ```
 */
function ContextMenuCheckboxItem({
  ref,
  className,
  children,
  checked,
  ...props
}: React.PropsWithoutRef<ContextMenuPrimitive.CheckboxItem.Props> &
  React.RefAttributes<HTMLDivElement>) {
  return (
    <ContextMenuPrimitive.CheckboxItem
      ref={ref}
      data-slot='context-menu-checkbox-item'
      className={cn(
        "focus:bg-accent focus:text-accent-foreground gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm [&_svg:not([class*='size-'])]:size-4 relative flex cursor-default items-center outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      checked={checked}
      {...props}
    >
      <span className='absolute right-2 pointer-events-none'>
        <ContextMenuPrimitive.CheckboxItemIndicator>
          <CheckIcon />
        </ContextMenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  );
}
ContextMenuCheckboxItem.displayName = 'ContextMenuCheckboxItem';

/**
 * Coordinates mutually exclusive menu choices.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ContextMenuRadioGroup composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Items and popup parts require the matching ContextMenu root. Put labels inside a Group and RadioItems inside RadioGroup. SubTrigger/SubContent require Sub under the parent menu. Content supplies its portal/positioner. inset adds left spacing when truthy; item variant defaults to default. Shortcut is presentational. Custom render composition follows Base UI; there is no asChild adapter. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuGroup, ContextMenuLabel, ContextMenuSeparator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<ContextMenu><ContextMenuTrigger>Right-click here</ContextMenuTrigger><ContextMenuContent><ContextMenuGroup><ContextMenuLabel>Document</ContextMenuLabel><ContextMenuItem onClick={() => console.log("Open requested")}>Open</ContextMenuItem></ContextMenuGroup><ContextMenuSeparator /><ContextMenuItem disabled>Unavailable</ContextMenuItem></ContextMenuContent></ContextMenu>);
 * }
 * ```
 */
function ContextMenuRadioGroup({
  ref,
  ...props
}: React.PropsWithoutRef<ContextMenuPrimitive.RadioGroup.Props> &
  React.RefAttributes<HTMLDivElement>) {
  return (
    <ContextMenuPrimitive.RadioGroup ref={ref} data-slot='context-menu-radio-group' {...props} />
  );
}
ContextMenuRadioGroup.displayName = 'ContextMenuRadioGroup';

/**
 * Renders one value in a menu radio group.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ContextMenuRadioItem composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Items and popup parts require the matching ContextMenu root. Put labels inside a Group and RadioItems inside RadioGroup. SubTrigger/SubContent require Sub under the parent menu. Content supplies its portal/positioner. inset adds left spacing when truthy; item variant defaults to default. Shortcut is presentational. Custom render composition follows Base UI; there is no asChild adapter. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuGroup, ContextMenuLabel, ContextMenuSeparator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<ContextMenu><ContextMenuTrigger>Right-click here</ContextMenuTrigger><ContextMenuContent><ContextMenuGroup><ContextMenuLabel>Document</ContextMenuLabel><ContextMenuItem onClick={() => console.log("Open requested")}>Open</ContextMenuItem></ContextMenuGroup><ContextMenuSeparator /><ContextMenuItem disabled>Unavailable</ContextMenuItem></ContextMenuContent></ContextMenu>);
 * }
 * ```
 */
function ContextMenuRadioItem({
  ref,
  className,
  children,
  ...props
}: React.PropsWithoutRef<ContextMenuPrimitive.RadioItem.Props> &
  React.RefAttributes<HTMLDivElement>) {
  return (
    <ContextMenuPrimitive.RadioItem
      ref={ref}
      data-slot='context-menu-radio-item'
      className={cn(
        "focus:bg-accent focus:text-accent-foreground gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm [&_svg:not([class*='size-'])]:size-4 relative flex cursor-default items-center outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      {...props}
    >
      <span className='absolute right-2 pointer-events-none'>
        <ContextMenuPrimitive.RadioItemIndicator>
          <CheckIcon />
        </ContextMenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.RadioItem>
  );
}
ContextMenuRadioItem.displayName = 'ContextMenuRadioItem';

/**
 * Draws a divider between menu sections.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ContextMenuSeparator composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Items and popup parts require the matching ContextMenu root. Put labels inside a Group and RadioItems inside RadioGroup. SubTrigger/SubContent require Sub under the parent menu. Content supplies its portal/positioner. inset adds left spacing when truthy; item variant defaults to default. Shortcut is presentational. Custom render composition follows Base UI; there is no asChild adapter. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuGroup, ContextMenuLabel, ContextMenuSeparator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<ContextMenu><ContextMenuTrigger>Right-click here</ContextMenuTrigger><ContextMenuContent><ContextMenuGroup><ContextMenuLabel>Document</ContextMenuLabel><ContextMenuItem onClick={() => console.log("Open requested")}>Open</ContextMenuItem></ContextMenuGroup><ContextMenuSeparator /><ContextMenuItem disabled>Unavailable</ContextMenuItem></ContextMenuContent></ContextMenu>);
 * }
 * ```
 */
function ContextMenuSeparator({
  ref,
  className,
  ...props
}: React.PropsWithoutRef<ContextMenuPrimitive.Separator.Props> &
  React.RefAttributes<HTMLDivElement>) {
  return (
    <ContextMenuPrimitive.Separator
      ref={ref}
      data-slot='context-menu-separator'
      className={cn('bg-border -mx-1 my-1 h-px', className)}
      {...props}
    />
  );
}
ContextMenuSeparator.displayName = 'ContextMenuSeparator';

/**
 * Styles a shortcut hint without installing keyboard listeners.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ContextMenuShortcut composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Items and popup parts require the matching ContextMenu root. Put labels inside a Group and RadioItems inside RadioGroup. SubTrigger/SubContent require Sub under the parent menu. Content supplies its portal/positioner. inset adds left spacing when truthy; item variant defaults to default. Shortcut is presentational. Custom render composition follows Base UI; there is no asChild adapter. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuGroup, ContextMenuLabel, ContextMenuSeparator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<ContextMenu><ContextMenuTrigger>Right-click here</ContextMenuTrigger><ContextMenuContent><ContextMenuGroup><ContextMenuLabel>Document</ContextMenuLabel><ContextMenuItem onClick={() => console.log("Open requested")}>Open</ContextMenuItem></ContextMenuGroup><ContextMenuSeparator /><ContextMenuItem disabled>Unavailable</ContextMenuItem></ContextMenuContent></ContextMenu>);
 * }
 * ```
 */
function ContextMenuShortcut({
  ref,
  className,
  ...props
}: React.PropsWithoutRef<React.ComponentProps<'span'>> & React.RefAttributes<HTMLSpanElement>) {
  return (
    <span
      ref={ref}
      data-slot='context-menu-shortcut'
      className={cn(
        'text-muted-foreground group-focus/context-menu-item:text-accent-foreground ml-auto text-xs tracking-widest',
        className,
      )}
      {...props}
    />
  );
}
ContextMenuShortcut.displayName = 'ContextMenuShortcut';

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
};
