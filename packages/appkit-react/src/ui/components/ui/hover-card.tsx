'use client';

import { PreviewCard as PreviewCardPrimitive } from '@base-ui/react/preview-card';

import { cn } from '../../lib/utils';

/**
 * Coordinates a preview card shown for its trigger.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered HoverCard composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Trigger and Content require HoverCard context. Content supplies its portal and positioner; Base UI PreviewCard owns timing, open state and interaction behavior.
 * @example
 * ```tsx
 * import { HoverCard, HoverCardTrigger, HoverCardContent } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<HoverCard><HoverCardTrigger href="/profile">Profile</HoverCardTrigger><HoverCardContent>Profile details</HoverCardContent></HoverCard>);
 * }
 * ```
 */
function HoverCard({ ...props }: PreviewCardPrimitive.Root.Props) {
  return <PreviewCardPrimitive.Root data-slot='hover-card' {...props} />;
}

/**
 * Renders the interactive target associated with a preview card.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered HoverCardTrigger composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Trigger and Content require HoverCard context. Content supplies its portal and positioner; Base UI PreviewCard owns timing, open state and interaction behavior.
 * @example
 * ```tsx
 * import { HoverCard, HoverCardTrigger, HoverCardContent } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<HoverCard><HoverCardTrigger href="/profile">Profile</HoverCardTrigger><HoverCardContent>Profile details</HoverCardContent></HoverCard>);
 * }
 * ```
 */
function HoverCardTrigger({ ...props }: PreviewCardPrimitive.Trigger.Props) {
  return <PreviewCardPrimitive.Trigger data-slot='hover-card-trigger' {...props} />;
}

/**
 * Portals and positions the preview popup relative to its trigger.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling. Wrapper defaults: side='bottom', sideOffset=4, align='center', alignOffset=4.
 * @returns The rendered HoverCardContent composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Trigger and Content require HoverCard context. Content supplies its portal and positioner; Base UI PreviewCard owns timing, open state and interaction behavior.
 * @example
 * ```tsx
 * import { HoverCard, HoverCardTrigger, HoverCardContent } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<HoverCard><HoverCardTrigger href="/profile">Profile</HoverCardTrigger><HoverCardContent>Profile details</HoverCardContent></HoverCard>);
 * }
 * ```
 */
function HoverCardContent({
  className,
  side = 'bottom',
  sideOffset = 4,
  align = 'center',
  alignOffset = 4,
  ...props
}: PreviewCardPrimitive.Popup.Props &
  Pick<PreviewCardPrimitive.Positioner.Props, 'align' | 'alignOffset' | 'side' | 'sideOffset'>) {
  return (
    <PreviewCardPrimitive.Portal data-slot='hover-card-portal'>
      <PreviewCardPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className='isolate z-50'
      >
        <PreviewCardPrimitive.Popup
          data-slot='hover-card-content'
          className={cn(
            'data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 bg-popover text-popover-foreground w-64 rounded-lg p-2.5 text-sm shadow-md ring-1 duration-100 z-50 origin-(--transform-origin) outline-hidden',
            className,
          )}
          {...props}
        />
      </PreviewCardPrimitive.Positioner>
    </PreviewCardPrimitive.Portal>
  );
}

export { HoverCard, HoverCardTrigger, HoverCardContent };
