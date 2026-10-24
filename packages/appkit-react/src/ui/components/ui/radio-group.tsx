import * as React from 'react';
import { Radio as RadioPrimitive } from '@base-ui/react/radio';
import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group';
import { CircleIcon } from 'lucide-react';

import { cn } from '../../lib/utils';

/**
 * Coordinates a grid of mutually exclusive radio choices.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered RadioGroup composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Items require RadioGroup context and distinct values. Supply labels or accessible names for each item. The wrapper delegates controlled/default selection and keyboard behavior to Base UI. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { RadioGroup, RadioGroupItem, Label } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<RadioGroup defaultValue="email" aria-label="Contact method"><div><RadioGroupItem id="email" value="email" /><Label htmlFor="email">Email</Label></div><div><RadioGroupItem id="phone" value="phone" /><Label htmlFor="phone">Phone</Label></div></RadioGroup>);
 * }
 * ```
 */
function RadioGroup({
  ref,
  className,
  ...props
}: React.PropsWithoutRef<RadioGroupPrimitive.Props> & React.RefAttributes<HTMLDivElement>) {
  return (
    <RadioGroupPrimitive
      ref={ref}
      data-slot='radio-group'
      className={cn('grid gap-2 w-full', className)}
      {...props}
    />
  );
}
RadioGroup.displayName = 'RadioGroup';

/**
 * Renders one radio choice with a built-in circular checked indicator.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered RadioGroupItem composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Items require RadioGroup context and distinct values. Supply labels or accessible names for each item. The wrapper delegates controlled/default selection and keyboard behavior to Base UI. The ref prop forwards to the rendered control or container declared by the component ref type.  children are replaced by the built-in checked indicator.
 * @example
 * ```tsx
 * import { RadioGroup, RadioGroupItem, Label } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<RadioGroup defaultValue="email" aria-label="Contact method"><div><RadioGroupItem id="email" value="email" /><Label htmlFor="email">Email</Label></div><div><RadioGroupItem id="phone" value="phone" /><Label htmlFor="phone">Phone</Label></div></RadioGroup>);
 * }
 * ```
 */
function RadioGroupItem({
  ref,
  className,
  ...props
}: React.PropsWithoutRef<RadioPrimitive.Root.Props> & React.RefAttributes<HTMLButtonElement>) {
  return (
    <RadioPrimitive.Root
      ref={ref}
      data-slot='radio-group-item'
      className={cn(
        'border-input text-primary dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 flex size-4 rounded-full focus-visible:ring-[3px] aria-invalid:ring-[3px] group/radio-group-item peer relative aspect-square shrink-0 border outline-none after:absolute after:-inset-x-3 after:-inset-y-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <RadioPrimitive.Indicator
        data-slot='radio-group-indicator'
        className='group-aria-invalid/radio-group-item:text-destructive text-primary flex size-4 items-center justify-center'
      >
        <CircleIcon className='absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 fill-current' />
      </RadioPrimitive.Indicator>
    </RadioPrimitive.Root>
  );
}
RadioGroupItem.displayName = 'RadioGroupItem';

export { RadioGroup, RadioGroupItem };
