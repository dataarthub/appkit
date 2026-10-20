'use client';

import * as React from 'react';
import { CheckboxGroup as CheckboxGroupPrimitive } from '@base-ui/react/checkbox-group';

import { cn } from '../../lib/utils';

/**
 * Coordinates a set of named checkbox values using Base UI group state.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered CheckboxGroup composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Place Checkbox descendants with distinct value strings inside the group. Base UI owns controlled/default selection and callbacks; this wrapper adds only vertical layout.
 * @example
 * ```tsx
 * import { CheckboxGroup, Checkbox } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<CheckboxGroup defaultValue={["review"]} aria-label="Tasks"><Checkbox value="review" aria-label="Review" /><Checkbox value="publish" aria-label="Publish" /></CheckboxGroup>);
 * }
 * ```
 */
function CheckboxGroup({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxGroupPrimitive>) {
  return (
    <CheckboxGroupPrimitive
      data-slot='checkbox-group'
      className={cn('flex flex-col gap-2', className)}
      {...props}
    />
  );
}

export { CheckboxGroup };
