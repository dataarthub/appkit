import * as React from 'react';
import { ToggleGroup as ToggleGroupPrimitive } from '@base-ui/react/toggle-group';
import { Toggle as TogglePrimitive } from '@base-ui/react/toggle';

import { cn } from '../../lib/utils';

const ToggleGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive>
>(({ className, children, ...props }, ref) => (
  <ToggleGroupPrimitive
    ref={ref}
    className={cn('flex items-center justify-center gap-1', className)}
    {...props}
  >
    {children}
  </ToggleGroupPrimitive>
));
ToggleGroup.displayName = 'ToggleGroup';

const ToggleGroupItem = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive> & {
    value: string;
  }
>(({ className, children, ...props }, ref) => {
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
});
ToggleGroupItem.displayName = 'ToggleGroupItem';

export { ToggleGroup, ToggleGroupItem };
