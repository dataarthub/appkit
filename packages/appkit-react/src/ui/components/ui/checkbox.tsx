import * as React from 'react';
import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox';
import { CheckIcon } from 'lucide-react';

import { cn } from '../../lib/utils';

/**
 * Base UI checkbox-root props plus an optional stable test selector.
 * @remarks Inherited native or primitive props keep their upstream types and behavior; this declaration documents only the wrapper-owned options.
 * @see Checkbox
 */
export interface CheckboxProps extends CheckboxPrimitive.Root.Props {
  /**
   * Stable data-testid assigned to the rendered control/container; omitted means no selector.
   */
  testId?: string;
}

/**
 * Renders a checkable Base UI control with a built-in checkmark indicator and optional test ID.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered Checkbox composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Use a visible associated label or aria-label. testId maps to data-testid; remaining Base UI Root props are forwarded. Selection state is controlled by checked/onCheckedChange or upstream defaultChecked behavior. The ref prop forwards to the rendered control or container declared by the component ref type.  children are replaced by the built-in indicator/checkmark.
 * @example
 * ```tsx
 * import { Checkbox } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Checkbox defaultChecked testId="agree" aria-label="Agree to terms" />);
 * }
 * ```
 */
function Checkbox({
  ref,
  className,
  testId,
  ...props
}: React.PropsWithoutRef<CheckboxProps> & React.RefAttributes<HTMLButtonElement>) {
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      data-slot='checkbox'
      data-testid={testId}
      className={cn(
        'border-input dark:bg-input/30 data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary data-checked:border-primary aria-invalid:aria-checked:border-primary aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 flex size-4 items-center justify-center rounded-[4px] border transition-colors group-has-disabled/field:opacity-50 focus-visible:ring-[3px] aria-invalid:ring-[3px] peer relative shrink-0 outline-none after:absolute after:-inset-x-3 after:-inset-y-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot='checkbox-indicator'
        className='[&>svg]:size-3.5 grid place-content-center text-current transition-none'
      >
        <CheckIcon />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
Checkbox.displayName = 'Checkbox';

export { Checkbox };
