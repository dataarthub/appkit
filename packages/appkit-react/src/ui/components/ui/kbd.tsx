import { cn } from '../../lib/utils';

/**
 * Displays the name of a keyboard key without registering a shortcut.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered Kbd composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. These components only render hints; the host owns keyboard event handling. KbdGroup is typed with div props but renders kbd, so avoid relying on div-specific ref or DOM behavior.
 * @example
 * ```tsx
 * import { Kbd, KbdGroup } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<KbdGroup><Kbd>Ctrl</Kbd><span>+</span><Kbd>K</Kbd></KbdGroup>);
 * }
 * ```
 */
function Kbd({ className, ...props }: React.ComponentProps<'kbd'>) {
  return (
    <kbd
      data-slot='kbd'
      className={cn(
        "bg-muted text-muted-foreground [[data-slot=tooltip-content]_&]:bg-background/20 [[data-slot=tooltip-content]_&]:text-background dark:[[data-slot=tooltip-content]_&]:bg-background/10 h-5 w-fit min-w-5 gap-1 rounded-sm px-1 font-sans text-xs font-medium [&_svg:not([class*='size-'])]:size-3 pointer-events-none inline-flex items-center justify-center select-none",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Arranges multiple visual keycaps inside a kbd element.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered KbdGroup composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. These components only render hints; the host owns keyboard event handling. KbdGroup is typed with div props but renders kbd, so avoid relying on div-specific ref or DOM behavior.
 * @example
 * ```tsx
 * import { Kbd, KbdGroup } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<KbdGroup><Kbd>Ctrl</Kbd><span>+</span><Kbd>K</Kbd></KbdGroup>);
 * }
 * ```
 */
function KbdGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <kbd
      data-slot='kbd-group'
      className={cn('gap-1 inline-flex items-center', className)}
      {...props}
    />
  );
}

export { Kbd, KbdGroup };
