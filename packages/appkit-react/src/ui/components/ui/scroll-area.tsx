'use client';
import * as React from 'react';

import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area';

import { cn } from '../../lib/utils';

/**
 * Renders a scroll viewport with a vertical scrollbar and corner.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ScrollArea composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Constrain the root size so content can overflow. ScrollArea already inserts the vertical scrollbar and corner; it passes children into its viewport. ScrollBar requires Base UI scroll-area root context and defaults to vertical; an extra ScrollBar passed as ScrollArea children is placed inside the viewport, not as a root sibling. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { ScrollArea } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<ScrollArea className="h-32 w-64"><div className="h-96">Scrollable content</div></ScrollArea>);
 * }
 * ```
 */
const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaPrimitive.Root.Props>(
  ({ className, children, ...props }, ref) => (
    <ScrollAreaPrimitive.Root
      ref={ref}
      data-slot='scroll-area'
      className={cn('relative', className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot='scroll-area-viewport'
        className='focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1'
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  ),
);
ScrollArea.displayName = 'ScrollArea';

/**
 * Renders a scrollbar track and thumb for the surrounding scroll-area root.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling. Wrapper defaults: orientation='vertical'.
 * @returns The rendered ScrollBar composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Constrain the root size so content can overflow. ScrollArea already inserts the vertical scrollbar and corner; it passes children into its viewport. ScrollBar requires Base UI scroll-area root context and defaults to vertical; an extra ScrollBar passed as ScrollArea children is placed inside the viewport, not as a root sibling.
 * @example
 * ```tsx
 * import { ScrollArea } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<ScrollArea className="h-32 w-64"><div className="h-96">Scrollable content</div></ScrollArea>);
 * }
 * ```
 */
function ScrollBar({
  className,
  orientation = 'vertical',
  ...props
}: ScrollAreaPrimitive.Scrollbar.Props) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot='scroll-area-scrollbar'
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        'data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-2.5 data-vertical:border-l data-vertical:border-l-transparent flex touch-none p-px transition-colors select-none',
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot='scroll-area-thumb'
        className='rounded-full bg-border relative flex-1'
      />
    </ScrollAreaPrimitive.Scrollbar>
  );
}

export { ScrollArea, ScrollBar };
