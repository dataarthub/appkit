'use client';

import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
import { type VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/utils';
import { tabsListVariants } from './tabs-variants';

/**
 * Coordinates selection and orientation for a set of tabbed panels.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling. Wrapper defaults: orientation='horizontal'.
 * @returns The rendered Tabs composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. List/Trigger/Content require Tabs context. Match trigger and panel value strings. orientation defaults to horizontal; TabsList variant defaults to default. Base UI owns activation, keyboard navigation and controlled/default selection.
 * @example
 * ```tsx
 * import { Tabs, TabsList, TabsTrigger, TabsContent } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Tabs defaultValue="overview"><TabsList aria-label="Project sections"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="activity">Activity</TabsTrigger></TabsList><TabsContent value="overview">Project overview</TabsContent><TabsContent value="activity">Recent activity</TabsContent></Tabs>);
 * }
 * ```
 */
function Tabs({ className, orientation = 'horizontal', ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot='tabs'
      data-orientation={orientation}
      className={cn('gap-2 group/tabs flex data-[orientation=horizontal]:flex-col', className)}
      {...props}
    />
  );
}

/**
 * Renders the tab strip with default, line or primary visual treatment.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling. Wrapper defaults: variant='default'.
 * @returns The rendered TabsList composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. List/Trigger/Content require Tabs context. Match trigger and panel value strings. orientation defaults to horizontal; TabsList variant defaults to default. Base UI owns activation, keyboard navigation and controlled/default selection.
 * @example
 * ```tsx
 * import { Tabs, TabsList, TabsTrigger, TabsContent } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Tabs defaultValue="overview"><TabsList aria-label="Project sections"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="activity">Activity</TabsTrigger></TabsList><TabsContent value="overview">Project overview</TabsContent><TabsContent value="activity">Recent activity</TabsContent></Tabs>);
 * }
 * ```
 */
function TabsList({
  className,
  variant = 'default',
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot='tabs-list'
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  );
}

/**
 * Renders a tab that selects its corresponding panel value.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered TabsTrigger composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. List/Trigger/Content require Tabs context. Match trigger and panel value strings. orientation defaults to horizontal; TabsList variant defaults to default. Base UI owns activation, keyboard navigation and controlled/default selection.
 * @example
 * ```tsx
 * import { Tabs, TabsList, TabsTrigger, TabsContent } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Tabs defaultValue="overview"><TabsList aria-label="Project sections"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="activity">Activity</TabsTrigger></TabsList><TabsContent value="overview">Project overview</TabsContent><TabsContent value="activity">Recent activity</TabsContent></Tabs>);
 * }
 * ```
 */
function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot='tabs-trigger'
      className={cn(
        "gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium group-data-[variant=default]/tabs-list:data-active:shadow-sm group-data-[variant=line]/tabs-list:data-active:shadow-none [&_svg:not([class*='size-'])]:size-4 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring text-foreground/60 hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center whitespace-nowrap transition-all group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        'group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent dark:group-data-[variant=line]/tabs-list:data-active:border-transparent dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent',
        'data-active:bg-background dark:data-active:text-foreground dark:data-active:border-input dark:data-active:bg-input/30 data-active:text-foreground',
        'group-data-[variant=primary]/tabs-list:data-active:bg-primary group-data-[variant=primary]/tabs-list:data-active:text-primary-foreground group-data-[variant=primary]/tabs-list:text-primary/70 group-data-[variant=primary]/tabs-list:hover:text-primary',
        'after:bg-foreground after:absolute after:opacity-0 after:transition-opacity group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-active:after:opacity-100',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Renders the panel associated with one tab value.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered TabsContent composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. List/Trigger/Content require Tabs context. Match trigger and panel value strings. orientation defaults to horizontal; TabsList variant defaults to default. Base UI owns activation, keyboard navigation and controlled/default selection.
 * @example
 * ```tsx
 * import { Tabs, TabsList, TabsTrigger, TabsContent } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Tabs defaultValue="overview"><TabsList aria-label="Project sections"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="activity">Activity</TabsTrigger></TabsList><TabsContent value="overview">Project overview</TabsContent><TabsContent value="activity">Recent activity</TabsContent></Tabs>);
 * }
 * ```
 */
function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot='tabs-content'
      className={cn('text-sm flex-1 outline-none', className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
