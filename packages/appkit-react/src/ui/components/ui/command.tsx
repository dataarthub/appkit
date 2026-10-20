'use client';

import * as React from 'react';
import { Command as CommandPrimitive } from 'cmdk-base';
import { Check, Search } from 'lucide-react';

import { cn } from '../../lib/utils';
// Tools Dialog uses different export structure than erp? Let's check imports.
// ERP uses: import { Dialog, DialogContent ... } from "../../components/ui/dialog"
// Tools Dialog: export { Dialog, DialogPortal, DialogOverlay, DialogTrigger, DialogClose, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription }
// It should be compatible.
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { InputGroup, InputGroupAddon } from '../../components/ui/input-group';

/**
 * Coordinates a searchable command list using cmdk-base.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered Command composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Input/List/Group/Item require Command context. CommandDialog supplies Dialog but does not insert Command: include a Command root as its child. title defaults to Command Palette, description to Search for a command to run..., and showCloseButton to false. The host owns command effects and shortcut registration.
 * @example
 * ```tsx
 * import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut, CommandSeparator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Command><CommandInput placeholder="Search commands" /><CommandList><CommandEmpty>No results</CommandEmpty><CommandGroup heading="Actions"><CommandItem onSelect={() => console.log("Open requested")}>Open<CommandShortcut>Enter</CommandShortcut></CommandItem></CommandGroup><CommandSeparator /></CommandList></Command>);
 * }
 * ```
 */
function Command({ className, ...props }: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot='command'
      className={cn(
        'bg-popover text-popover-foreground rounded-xl! p-1 flex size-full flex-col overflow-hidden',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Wraps caller-provided command content in a dialog with hidden labeling.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling. Wrapper defaults: title='Command Palette', description='Search for a command to run...', showCloseButton=false.
 * @returns The rendered CommandDialog composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Input/List/Group/Item require Command context. CommandDialog supplies Dialog but does not insert Command: include a Command root as its child. title defaults to Command Palette, description to Search for a command to run..., and showCloseButton to false. The host owns command effects and shortcut registration.
 * @example
 * ```tsx
 * import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut, CommandSeparator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Command><CommandInput placeholder="Search commands" /><CommandList><CommandEmpty>No results</CommandEmpty><CommandGroup heading="Actions"><CommandItem onSelect={() => console.log("Open requested")}>Open<CommandShortcut>Enter</CommandShortcut></CommandItem></CommandGroup><CommandSeparator /></CommandList></Command>);
 * }
 * ```
 */
function CommandDialog({
  title = 'Command Palette',
  description = 'Search for a command to run...',
  children,
  className,
  showCloseButton = false,
  ...props
}: Omit<React.ComponentProps<typeof Dialog>, 'children'> & {
  /**
   * Optional section heading rendered before its content.
   */
  title?: string;
  /**
   * Supporting text displayed by the owning component.
   */
  description?: string;
  /**
   * Additional classes merged with wrapper styling; see the component for the targeted element.
   */
  className?: string;
  /**
   * Controls whether the wrapper inserts its own close button; see the component for its default.
   */
  showCloseButton?: boolean;
  /**
   * Content rendered in the wrapper's child region.
   */
  children: React.ReactNode;
}) {
  return (
    <Dialog {...props}>
      <DialogHeader className='sr-only'>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent
        className={cn('rounded-xl! overflow-hidden p-0', className)}
        showCloseButton={showCloseButton}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Renders the command search field with a search icon.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered CommandInput composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Input/List/Group/Item require Command context. CommandDialog supplies Dialog but does not insert Command: include a Command root as its child. title defaults to Command Palette, description to Search for a command to run..., and showCloseButton to false. The host owns command effects and shortcut registration.
 * @example
 * ```tsx
 * import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut, CommandSeparator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Command><CommandInput placeholder="Search commands" /><CommandList><CommandEmpty>No results</CommandEmpty><CommandGroup heading="Actions"><CommandItem onSelect={() => console.log("Open requested")}>Open<CommandShortcut>Enter</CommandShortcut></CommandItem></CommandGroup><CommandSeparator /></CommandList></Command>);
 * }
 * ```
 */
function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div data-slot='command-input-wrapper' className='p-1 pb-0'>
      <InputGroup className='bg-input/30 border-input/30 h-8! rounded-lg! shadow-none! *:data-[slot=input-group-addon]:pl-2!'>
        <CommandPrimitive.Input
          data-slot='command-input'
          className={cn(
            'w-full text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
          {...props}
        />
        <InputGroupAddon>
          <Search className='size-4 shrink-0 opacity-50' />
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}

/**
 * Renders the scrollable filtered command collection.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered CommandList composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Input/List/Group/Item require Command context. CommandDialog supplies Dialog but does not insert Command: include a Command root as its child. title defaults to Command Palette, description to Search for a command to run..., and showCloseButton to false. The host owns command effects and shortcut registration.
 * @example
 * ```tsx
 * import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut, CommandSeparator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Command><CommandInput placeholder="Search commands" /><CommandList><CommandEmpty>No results</CommandEmpty><CommandGroup heading="Actions"><CommandItem onSelect={() => console.log("Open requested")}>Open<CommandShortcut>Enter</CommandShortcut></CommandItem></CommandGroup><CommandSeparator /></CommandList></Command>);
 * }
 * ```
 */
function CommandList({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot='command-list'
      className={cn(
        'no-scrollbar max-h-72 scroll-py-1 outline-none overflow-x-hidden overflow-y-auto',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Renders a message when cmdk-base reports no matching commands.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered CommandEmpty composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Input/List/Group/Item require Command context. CommandDialog supplies Dialog but does not insert Command: include a Command root as its child. title defaults to Command Palette, description to Search for a command to run..., and showCloseButton to false. The host owns command effects and shortcut registration.
 * @example
 * ```tsx
 * import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut, CommandSeparator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Command><CommandInput placeholder="Search commands" /><CommandList><CommandEmpty>No results</CommandEmpty><CommandGroup heading="Actions"><CommandItem onSelect={() => console.log("Open requested")}>Open<CommandShortcut>Enter</CommandShortcut></CommandItem></CommandGroup><CommandSeparator /></CommandList></Command>);
 * }
 * ```
 */
function CommandEmpty({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot='command-empty'
      className={cn('py-6 text-center text-sm', className)}
      {...props}
    />
  );
}

/**
 * Groups commands under optional cmdk-base heading content.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered CommandGroup composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Input/List/Group/Item require Command context. CommandDialog supplies Dialog but does not insert Command: include a Command root as its child. title defaults to Command Palette, description to Search for a command to run..., and showCloseButton to false. The host owns command effects and shortcut registration.
 * @example
 * ```tsx
 * import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut, CommandSeparator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Command><CommandInput placeholder="Search commands" /><CommandList><CommandEmpty>No results</CommandEmpty><CommandGroup heading="Actions"><CommandItem onSelect={() => console.log("Open requested")}>Open<CommandShortcut>Enter</CommandShortcut></CommandItem></CommandGroup><CommandSeparator /></CommandList></Command>);
 * }
 * ```
 */
function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot='command-group'
      className={cn(
        'text-foreground [&_[cmdk-group-heading]]:text-muted-foreground overflow-hidden p-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Draws a divider between command sections.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered CommandSeparator composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Input/List/Group/Item require Command context. CommandDialog supplies Dialog but does not insert Command: include a Command root as its child. title defaults to Command Palette, description to Search for a command to run..., and showCloseButton to false. The host owns command effects and shortcut registration.
 * @example
 * ```tsx
 * import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut, CommandSeparator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Command><CommandInput placeholder="Search commands" /><CommandList><CommandEmpty>No results</CommandEmpty><CommandGroup heading="Actions"><CommandItem onSelect={() => console.log("Open requested")}>Open<CommandShortcut>Enter</CommandShortcut></CommandItem></CommandGroup><CommandSeparator /></CommandList></Command>);
 * }
 * ```
 */
function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot='command-separator'
      className={cn('bg-border -mx-1 h-px', className)}
      {...props}
    />
  );
}

/**
 * Renders an actionable command whose selection is handled by the host.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered CommandItem composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Input/List/Group/Item require Command context. CommandDialog supplies Dialog but does not insert Command: include a Command root as its child. title defaults to Command Palette, description to Search for a command to run..., and showCloseButton to false. The host owns command effects and shortcut registration.
 * @example
 * ```tsx
 * import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut, CommandSeparator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Command><CommandInput placeholder="Search commands" /><CommandList><CommandEmpty>No results</CommandEmpty><CommandGroup heading="Actions"><CommandItem onSelect={() => console.log("Open requested")}>Open<CommandShortcut>Enter</CommandShortcut></CommandItem></CommandGroup><CommandSeparator /></CommandList></Command>);
 * }
 * ```
 */
function CommandItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot='command-item'
      className={cn(
        "data-selected:bg-muted data-selected:text-foreground data-selected:*:[svg]:text-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none [&_svg:not([class*='size-'])]:size-4 [[data-slot=dialog-content]_&]:rounded-lg! group/command-item data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      {...props}
    >
      {children}
      <Check className='ml-auto opacity-0 group-has-[[data-slot=command-shortcut]]/command-item:hidden group-data-[checked=true]/command-item:opacity-100' />
    </CommandPrimitive.Item>
  );
}

/**
 * Styles shortcut text without registering a keyboard handler.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered CommandShortcut composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Input/List/Group/Item require Command context. CommandDialog supplies Dialog but does not insert Command: include a Command root as its child. title defaults to Command Palette, description to Search for a command to run..., and showCloseButton to false. The host owns command effects and shortcut registration.
 * @example
 * ```tsx
 * import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut, CommandSeparator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Command><CommandInput placeholder="Search commands" /><CommandList><CommandEmpty>No results</CommandEmpty><CommandGroup heading="Actions"><CommandItem onSelect={() => console.log("Open requested")}>Open<CommandShortcut>Enter</CommandShortcut></CommandItem></CommandGroup><CommandSeparator /></CommandList></Command>);
 * }
 * ```
 */
function CommandShortcut({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot='command-shortcut'
      className={cn(
        'text-muted-foreground group-data-selected/command-item:text-foreground ml-auto text-xs tracking-widest',
        className,
      )}
      {...props}
    />
  );
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
};
