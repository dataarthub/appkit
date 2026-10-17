'use client';

import * as React from 'react';
import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion';
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react';

import { cn } from '../../lib/utils';

const Accordion = React.forwardRef<HTMLDivElement, AccordionPrimitive.Root.Props>(
  ({ className, ...props }, ref) => (
    <AccordionPrimitive.Root
      ref={ref}
      data-slot='accordion'
      className={cn('flex w-full flex-col', className)}
      {...props}
    />
  ),
);
Accordion.displayName = 'Accordion';

const AccordionItem = React.forwardRef<HTMLDivElement, AccordionPrimitive.Item.Props>(
  ({ className, ...props }, ref) => (
    <AccordionPrimitive.Item
      ref={ref}
      data-slot='accordion-item'
      className={cn('not-last:border-b', className)}
      {...props}
    />
  ),
);
AccordionItem.displayName = 'AccordionItem';

const AccordionTrigger = React.forwardRef<HTMLButtonElement, AccordionPrimitive.Trigger.Props>(
  ({ className, children, ...props }, ref) => (
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
  ),
);
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

const AccordionContent = React.forwardRef<HTMLDivElement, AccordionPrimitive.Panel.Props>(
  ({ className, children, ...props }, ref) => (
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
  ),
);
AccordionContent.displayName = AccordionPrimitive.Panel.displayName;

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
