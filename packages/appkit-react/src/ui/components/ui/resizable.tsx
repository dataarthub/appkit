'use client';

import * as React from 'react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';

import { cn } from '../../lib/utils';

/**
 * Coordinates adjacent resizable panels through react-resizable-panels Group.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered ResizablePanelGroup composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Place panels and handles as siblings inside the group and give the host a nonzero size. Props follow the installed react-resizable-panels Group/Panel/Separator API; this wrapper does not add size persistence. withHandle defaults to false/absent.
 * @example
 * ```tsx
 * import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<ResizablePanelGroup orientation="horizontal"><ResizablePanel defaultSize="50%">Left</ResizablePanel><ResizableHandle withHandle /><ResizablePanel defaultSize="50%">Right</ResizablePanel></ResizablePanelGroup>);
 * }
 * ```
 */
function ResizablePanelGroup({ className, ...props }: React.ComponentProps<typeof PanelGroup>) {
  return (
    <PanelGroup
      data-slot='resizable-panel-group'
      className={cn('flex h-full w-full data-[panel-group-direction=vertical]:flex-col', className)}
      {...props}
    />
  );
}

/**
 * Renders one panel managed by its surrounding resizable group.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered ResizablePanel composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Place panels and handles as siblings inside the group and give the host a nonzero size. Props follow the installed react-resizable-panels Group/Panel/Separator API; this wrapper does not add size persistence. withHandle defaults to false/absent.
 * @example
 * ```tsx
 * import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<ResizablePanelGroup orientation="horizontal"><ResizablePanel defaultSize="50%">Left</ResizablePanel><ResizableHandle withHandle /><ResizablePanel defaultSize="50%">Right</ResizablePanel></ResizablePanelGroup>);
 * }
 * ```
 */
function ResizablePanel({ ...props }: React.ComponentProps<typeof Panel>) {
  return <Panel data-slot='resizable-panel' {...props} />;
}

/**
 * Renders the draggable panel separator with an optional visible handle.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered ResizableHandle composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Place panels and handles as siblings inside the group and give the host a nonzero size. Props follow the installed react-resizable-panels Group/Panel/Separator API; this wrapper does not add size persistence. withHandle defaults to false/absent.  children are replaced by the optional withHandle grip.
 * @example
 * ```tsx
 * import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<ResizablePanelGroup orientation="horizontal"><ResizablePanel defaultSize="50%">Left</ResizablePanel><ResizableHandle withHandle /><ResizablePanel defaultSize="50%">Right</ResizablePanel></ResizablePanelGroup>);
 * }
 * ```
 */
function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof PanelResizeHandle> & {
  /**
   * Adds a small visible grip when true; defaults to false/absent.
   */
  withHandle?: boolean;
}) {
  return (
    <PanelResizeHandle
      data-slot='resizable-handle'
      className={cn(
        'bg-border focus-visible:ring-ring relative flex w-px items-center justify-center after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-hidden data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:translate-x-0 data-[panel-group-direction=vertical]:after:-translate-y-1/2 [&[data-panel-group-direction=vertical]>div]:rotate-90',
        className,
      )}
      {...props}
    >
      {withHandle && <div className='bg-border h-6 w-1 rounded-lg z-10 flex shrink-0' />}
    </PanelResizeHandle>
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
