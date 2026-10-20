'use client';

import * as React from 'react';
import { Toolbar as ToolbarPrimitive } from '@base-ui/react/toolbar';
import { ToggleGroup as ToggleGroupPrimitive } from '@base-ui/react/toggle-group';
import { Toggle as TogglePrimitive } from '@base-ui/react/toggle';
import { cn } from '../../lib/utils';

/**
 * Coordinates keyboard navigation for a horizontal action toolbar.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered Toolbar composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose buttons/links/groups under Toolbar and toggle items under ToolbarToggleGroup. Base UI owns focus navigation and pressed selection. Callbacks and navigation effects remain host-owned.
 * @example
 * ```tsx
 * import { Toolbar, ToolbarGroup, ToolbarButton, ToolbarSeparator, ToolbarLink, ToolbarToggleGroup, ToolbarToggleItem } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Toolbar aria-label="Editor"><ToolbarGroup><ToolbarButton>Save</ToolbarButton><ToolbarLink href="/help">Help</ToolbarLink></ToolbarGroup><ToolbarSeparator /><ToolbarToggleGroup defaultValue={["bold"]}><ToolbarToggleItem value="bold" aria-label="Bold">B</ToolbarToggleItem></ToolbarToggleGroup></Toolbar>);
 * }
 * ```
 */
function Toolbar({ className, ...props }: React.ComponentProps<typeof ToolbarPrimitive.Root>) {
  return (
    <ToolbarPrimitive.Root
      data-slot='toolbar'
      className={cn(
        'flex h-10 items-center justify-between rounded-md border bg-background p-1',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Lays out a related group of toolbar controls.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ToolbarGroup composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose buttons/links/groups under Toolbar and toggle items under ToolbarToggleGroup. Base UI owns focus navigation and pressed selection. Callbacks and navigation effects remain host-owned.
 * @example
 * ```tsx
 * import { Toolbar, ToolbarGroup, ToolbarButton, ToolbarSeparator, ToolbarLink, ToolbarToggleGroup, ToolbarToggleItem } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Toolbar aria-label="Editor"><ToolbarGroup><ToolbarButton>Save</ToolbarButton><ToolbarLink href="/help">Help</ToolbarLink></ToolbarGroup><ToolbarSeparator /><ToolbarToggleGroup defaultValue={["bold"]}><ToolbarToggleItem value="bold" aria-label="Bold">B</ToolbarToggleItem></ToolbarToggleGroup></Toolbar>);
 * }
 * ```
 */
function ToolbarGroup({
  className,
  ...props
}: React.ComponentProps<typeof ToolbarPrimitive.Group>) {
  return (
    <ToolbarPrimitive.Group
      data-slot='toolbar-group'
      className={cn('flex items-center gap-1', className)}
      {...props}
    />
  );
}

/**
 * Renders an action button participating in toolbar focus navigation.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ToolbarButton composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose buttons/links/groups under Toolbar and toggle items under ToolbarToggleGroup. Base UI owns focus navigation and pressed selection. Callbacks and navigation effects remain host-owned.
 * @example
 * ```tsx
 * import { Toolbar, ToolbarGroup, ToolbarButton, ToolbarSeparator, ToolbarLink, ToolbarToggleGroup, ToolbarToggleItem } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Toolbar aria-label="Editor"><ToolbarGroup><ToolbarButton>Save</ToolbarButton><ToolbarLink href="/help">Help</ToolbarLink></ToolbarGroup><ToolbarSeparator /><ToolbarToggleGroup defaultValue={["bold"]}><ToolbarToggleItem value="bold" aria-label="Bold">B</ToolbarToggleItem></ToolbarToggleGroup></Toolbar>);
 * }
 * ```
 */
function ToolbarButton({
  className,
  ...props
}: React.ComponentProps<typeof ToolbarPrimitive.Button>) {
  return (
    <ToolbarPrimitive.Button
      data-slot='toolbar-button'
      className={cn(
        'inline-flexitems-center justify-center whitespace-nowrap rounded-sm px-2.5 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground hover:bg-muted hover:text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Separates toolbar control groups with a vertical rule.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ToolbarSeparator composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose buttons/links/groups under Toolbar and toggle items under ToolbarToggleGroup. Base UI owns focus navigation and pressed selection. Callbacks and navigation effects remain host-owned.
 * @example
 * ```tsx
 * import { Toolbar, ToolbarGroup, ToolbarButton, ToolbarSeparator, ToolbarLink, ToolbarToggleGroup, ToolbarToggleItem } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Toolbar aria-label="Editor"><ToolbarGroup><ToolbarButton>Save</ToolbarButton><ToolbarLink href="/help">Help</ToolbarLink></ToolbarGroup><ToolbarSeparator /><ToolbarToggleGroup defaultValue={["bold"]}><ToolbarToggleItem value="bold" aria-label="Bold">B</ToolbarToggleItem></ToolbarToggleGroup></Toolbar>);
 * }
 * ```
 */
function ToolbarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof ToolbarPrimitive.Separator>) {
  return (
    <ToolbarPrimitive.Separator
      data-slot='toolbar-separator'
      className={cn('mx-1 h-5 w-[1px] bg-border', className)}
      {...props}
    />
  );
}

/**
 * Renders a navigation link participating in toolbar focus navigation.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ToolbarLink composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose buttons/links/groups under Toolbar and toggle items under ToolbarToggleGroup. Base UI owns focus navigation and pressed selection. Callbacks and navigation effects remain host-owned.
 * @example
 * ```tsx
 * import { Toolbar, ToolbarGroup, ToolbarButton, ToolbarSeparator, ToolbarLink, ToolbarToggleGroup, ToolbarToggleItem } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Toolbar aria-label="Editor"><ToolbarGroup><ToolbarButton>Save</ToolbarButton><ToolbarLink href="/help">Help</ToolbarLink></ToolbarGroup><ToolbarSeparator /><ToolbarToggleGroup defaultValue={["bold"]}><ToolbarToggleItem value="bold" aria-label="Bold">B</ToolbarToggleItem></ToolbarToggleGroup></Toolbar>);
 * }
 * ```
 */
function ToolbarLink({ className, ...props }: React.ComponentProps<typeof ToolbarPrimitive.Link>) {
  return (
    <ToolbarPrimitive.Link
      data-slot='toolbar-link'
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-2.5 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-muted hover:text-muted-foreground data-[state=active]:bg-accent data-[state=active]:text-accent-foreground',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Renders one value-bearing Base UI toggle within a toolbar toggle group.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ToolbarToggleItem composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose buttons/links/groups under Toolbar and toggle items under ToolbarToggleGroup. Base UI owns focus navigation and pressed selection. Callbacks and navigation effects remain host-owned.
 * @example
 * ```tsx
 * import { Toolbar, ToolbarGroup, ToolbarButton, ToolbarSeparator, ToolbarLink, ToolbarToggleGroup, ToolbarToggleItem } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Toolbar aria-label="Editor"><ToolbarGroup><ToolbarButton>Save</ToolbarButton><ToolbarLink href="/help">Help</ToolbarLink></ToolbarGroup><ToolbarSeparator /><ToolbarToggleGroup defaultValue={["bold"]}><ToolbarToggleItem value="bold" aria-label="Bold">B</ToolbarToggleItem></ToolbarToggleGroup></Toolbar>);
 * }
 * ```
 */
function ToolbarToggleItem({
  className,
  ...props
}: React.ComponentProps<typeof TogglePrimitive> & { /**
 * Identity for this choice within the surrounding group; provide a distinct stable string.
 */
/**
 * Identity for this choice within the surrounding group; provide a distinct stable string.
 */
value: string }) {
  return (
    <TogglePrimitive
      data-slot='toolbar-toggle-item'
      className={cn(
        'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[pressed]:bg-accent data-[pressed]:text-accent-foreground p-2',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Coordinates a value collection of toggle buttons within a toolbar.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ToolbarToggleGroup composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose buttons/links/groups under Toolbar and toggle items under ToolbarToggleGroup. Base UI owns focus navigation and pressed selection. Callbacks and navigation effects remain host-owned.
 * @example
 * ```tsx
 * import { Toolbar, ToolbarGroup, ToolbarButton, ToolbarSeparator, ToolbarLink, ToolbarToggleGroup, ToolbarToggleItem } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Toolbar aria-label="Editor"><ToolbarGroup><ToolbarButton>Save</ToolbarButton><ToolbarLink href="/help">Help</ToolbarLink></ToolbarGroup><ToolbarSeparator /><ToolbarToggleGroup defaultValue={["bold"]}><ToolbarToggleItem value="bold" aria-label="Bold">B</ToolbarToggleItem></ToolbarToggleGroup></Toolbar>);
 * }
 * ```
 */
function ToolbarToggleGroup({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive>) {
  return (
    <ToggleGroupPrimitive
      data-slot='toolbar-toggle-group'
      className={cn('flex items-center gap-1', className)}
      {...props}
    />
  );
}

export {
  Toolbar,
  ToolbarGroup,
  ToolbarButton,
  ToolbarSeparator,
  ToolbarLink,
  ToolbarToggleGroup,
  ToolbarToggleItem,
};
