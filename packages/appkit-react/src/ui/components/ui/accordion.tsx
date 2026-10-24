'use client';

import * as React from 'react';
import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion';
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react';

import { cn } from '../../lib/utils';

/**
 * Coordinates expansion state for a collection of disclosure items.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered Accordion composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose triggers and content inside an AccordionItem under Accordion. Base UI owns selection, focus and keyboard behavior; the wrapper adds no expansion defaults. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Accordion defaultValue={["details"]}><AccordionItem value="details"><AccordionTrigger>Details</AccordionTrigger><AccordionContent>Project details</AccordionContent></AccordionItem></Accordion>);
 * }
 * ```
 */
function Accordion({
  ref,
  className,
  ...props
}: React.PropsWithoutRef<AccordionPrimitive.Root.Props> & React.RefAttributes<HTMLDivElement>) {
  return (
    <AccordionPrimitive.Root
      ref={ref}
      data-slot='accordion'
      className={cn('flex w-full flex-col', className)}
      {...props}
    />
  );
}
Accordion.displayName = 'Accordion';

/**
 * Associates one disclosure value with its trigger and collapsible panel.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered AccordionItem composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose triggers and content inside an AccordionItem under Accordion. Base UI owns selection, focus and keyboard behavior; the wrapper adds no expansion defaults. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Accordion defaultValue={["details"]}><AccordionItem value="details"><AccordionTrigger>Details</AccordionTrigger><AccordionContent>Project details</AccordionContent></AccordionItem></Accordion>);
 * }
 * ```
 */
function AccordionItem({
  ref,
  className,
  ...props
}: React.PropsWithoutRef<AccordionPrimitive.Item.Props> & React.RefAttributes<HTMLDivElement>) {
  return (
    <AccordionPrimitive.Item
      ref={ref}
      data-slot='accordion-item'
      className={cn('not-last:border-b', className)}
      {...props}
    />
  );
}
AccordionItem.displayName = 'AccordionItem';

/**
 * Renders a disclosure button inside a heading with open/closed chevron indicators.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered AccordionTrigger composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose triggers and content inside an AccordionItem under Accordion. Base UI owns selection, focus and keyboard behavior; the wrapper adds no expansion defaults. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Accordion defaultValue={["details"]}><AccordionItem value="details"><AccordionTrigger>Details</AccordionTrigger><AccordionContent>Project details</AccordionContent></AccordionItem></Accordion>);
 * }
 * ```
 */
function AccordionTrigger({
  ref,
  className,
  children,
  ...props
}: React.PropsWithoutRef<AccordionPrimitive.Trigger.Props> &
  React.RefAttributes<HTMLButtonElement>) {
  return (
    <AccordionPrimitive.Header className='flex'>
      <AccordionPrimitive.Trigger
        ref={ref}
        data-slot='accordion-trigger'
        className={cn(
          'focus-visible:ring-ring/50 focus-visible:border-ring focus-visible:after:border-ring **:data-[slot=accordion-trigger-icon]:text-muted-foreground rounded-lg py-2.5 text-left text-sm font-medium hover:underline focus-visible:ring-[3px] **:data-[slot=accordion-trigger-icon]:ml-auto **:data-[slot=accordion-trigger-icon]:size-4 group/accordion-trigger relative flex flex-1 items-start justify-between border border-transparent transition-all outline-none disabled:pointer-events-none disabled:opacity-50',
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon
          data-slot='accordion-trigger-icon'
          className='pointer-events-none shrink-0 group-aria-expanded/accordion-trigger:hidden'
        />
        <ChevronUpIcon
          data-slot='accordion-trigger-icon'
          className='pointer-events-none hidden shrink-0 group-aria-expanded/accordion-trigger:inline'
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

/**
 * Renders an animated disclosure panel with an inner content wrapper.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered AccordionContent composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose triggers and content inside an AccordionItem under Accordion. Base UI owns selection, focus and keyboard behavior; the wrapper adds no expansion defaults. The ref prop forwards to the rendered control or container declared by the component ref type. className styles the inner content div, while remaining panel props target the Base UI panel.
 * @example
 * ```tsx
 * import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Accordion defaultValue={["details"]}><AccordionItem value="details"><AccordionTrigger>Details</AccordionTrigger><AccordionContent>Project details</AccordionContent></AccordionItem></Accordion>);
 * }
 * ```
 */
function AccordionContent({
  ref,
  className,
  children,
  ...props
}: React.PropsWithoutRef<AccordionPrimitive.Panel.Props> & React.RefAttributes<HTMLDivElement>) {
  return (
    <AccordionPrimitive.Panel
      ref={ref}
      data-slot='accordion-content'
      className='data-open:animate-accordion-down data-closed:animate-accordion-up text-sm overflow-hidden'
      {...props}
    >
      <div
        className={cn(
          'pt-0 pb-2.5 [&_a]:hover:text-foreground h-(--accordion-panel-height) data-ending-style:h-0 data-starting-style:h-0 [&_a]:underline [&_a]:underline-offset-3 [&_p:not(:last-child)]:mb-4',
          className,
        )}
      >
        {children}
      </div>
    </AccordionPrimitive.Panel>
  );
}
AccordionContent.displayName = AccordionPrimitive.Panel.displayName;

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
