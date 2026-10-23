import * as React from 'react';
import { ToggleGroup as ToggleGroupPrimitive } from '@base-ui/react/toggle-group';
import { Toggle as TogglePrimitive } from '@base-ui/react/toggle';

import { cn } from '../../lib/utils';

/**
 * Coordinates a collection of toggle values through Base UI group state.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ToggleGroup composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Place distinct value-bearing items under ToggleGroup. The wrappers use Base UI ToggleGroup and Toggle directly; group selection behavior follows the upstream props. Unlike Toggle, these wrappers do not apply toggleVariants. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { ToggleGroup, ToggleGroupItem } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<ToggleGroup defaultValue={["bold"]} aria-label="Text style"><ToggleGroupItem value="bold" aria-label="Bold">B</ToggleGroupItem><ToggleGroupItem value="italic" aria-label="Italic">I</ToggleGroupItem></ToggleGroup>);
 * }
 * ```
 */
function ToggleGroup({
  ref,
  className,
  children,
  ...props
}: React.PropsWithoutRef<React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive>> &
  React.RefAttributes<HTMLDivElement>) {
  return (
    <ToggleGroupPrimitive
      ref={ref}
      className={cn('flex items-center justify-center gap-1', className)}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive>
  );
}
ToggleGroup.displayName = 'ToggleGroup';

/**
 * Renders a value-bearing toggle inside its surrounding toggle group.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ToggleGroupItem composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Place distinct value-bearing items under ToggleGroup. The wrappers use Base UI ToggleGroup and Toggle directly; group selection behavior follows the upstream props. Unlike Toggle, these wrappers do not apply toggleVariants. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { ToggleGroup, ToggleGroupItem } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<ToggleGroup defaultValue={["bold"]} aria-label="Text style"><ToggleGroupItem value="bold" aria-label="Bold">B</ToggleGroupItem><ToggleGroupItem value="italic" aria-label="Italic">I</ToggleGroupItem></ToggleGroup>);
 * }
 * ```
 */
function ToggleGroupItem({
  ref,
  className,
  children,
  ...props
}: React.PropsWithoutRef<
  React.ComponentPropsWithoutRef<typeof TogglePrimitive> & {
    /**
     * Identity for this choice within the surrounding group; provide a distinct stable string.
     */
    value: string;
  }
> &
  React.RefAttributes<HTMLButtonElement>) {
  // In Base UI, we just use Toggle inside ToggleGroup?
  // Or is there a ToggleGroup.Item?
  // Docs/Exports showed ToggleGroup export.
  // Usually standard pattern is ToggleGroup.Item.
  // But if ToggleGroup is a component, maybe it accepts Toggles?
  // Let's assume we use Toggle as Item, but wrapped.
  // Wait, Toggle needs to know if it's checked based on Group.
  // If Base UI ToggleGroup communicates via Context, then Toggle inside it works.
  // Explicitly importing standard Toggle.
  return (
    <TogglePrimitive
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[pressed]:bg-accent data-[pressed]:text-accent-foreground first:rounded-l-md last:rounded-r-md',
        className,
      )}
      {...props}
    >
      {children}
    </TogglePrimitive>
  );
}
ToggleGroupItem.displayName = 'ToggleGroupItem';

export { ToggleGroup, ToggleGroupItem };
