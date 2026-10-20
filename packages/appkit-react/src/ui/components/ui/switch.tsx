'use client';

import * as React from 'react';
import { Switch as SwitchPrimitive } from '@base-ui/react/switch';

import { cn } from '../../lib/utils';

/**
 * Base UI switch-root props plus size and stable selector.
 * @remarks Inherited native or primitive props keep their upstream types and behavior; this declaration documents only the wrapper-owned options.
 * @see Switch
 */
interface SwitchProps extends SwitchPrimitive.Root.Props {
  /**
   * Visual size preset; defaults to default unless the owning component states otherwise.
   */
  size?: 'sm' | 'default';
  /**
   * Stable data-testid assigned to the rendered control/container; omitted means no selector.
   */
  testId?: string;
}

/**
 * Renders a binary Base UI switch with an integrated thumb and optional test ID.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling. Wrapper defaults: size='default'.
 * @returns The rendered Switch composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. size defaults to default; sm selects the smaller track/thumb styling. testId maps to data-testid. Provide an associated label or accessible name. Base UI owns checked/defaultChecked and onCheckedChange behavior. The ref prop forwards to the rendered control or container declared by the component ref type.  children are replaced by the built-in thumb.
 * @example
 * ```tsx
 * import { Switch, Label } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<div><Switch id="notifications" defaultChecked testId="notifications" /><Label htmlFor="notifications">Notifications</Label></div>);
 * }
 * ```
 */
const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, size = 'default', testId, ...props }, ref) => (
    <SwitchPrimitive.Root
      ref={ref}
      data-slot='switch'
      data-testid={testId}
      data-size={size}
      className={cn(
        'data-checked:bg-primary data-unchecked:bg-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 dark:data-unchecked:bg-input/80 shrink-0 rounded-full border border-transparent focus-visible:ring-[3px] aria-invalid:ring-[3px] data-[size=default]:h-[18.4px] data-[size=default]:w-[32px] data-[size=sm]:h-[14px] data-[size=sm]:w-[24px] peer group/switch relative inline-flex items-center transition-all outline-none after:absolute after:-inset-x-3 after:-inset-y-2 data-disabled:cursor-not-allowed data-disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot='switch-thumb'
        className='bg-background dark:data-unchecked:bg-foreground dark:data-checked:bg-primary-foreground rounded-full group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3 group-data-[size=default]/switch:data-checked:translate-x-[calc(100%-2px)] group-data-[size=sm]/switch:data-checked:translate-x-[calc(100%-2px)] group-data-[size=default]/switch:data-unchecked:translate-x-0 group-data-[size=sm]/switch:data-unchecked:translate-x-0 pointer-events-none block ring-0 transition-transform'
      />
    </SwitchPrimitive.Root>
  ),
);
Switch.displayName = 'Switch';

export { Switch };
