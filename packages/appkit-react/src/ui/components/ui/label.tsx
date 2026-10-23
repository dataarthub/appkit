'use client';

import * as React from 'react';

import { cn } from '../../lib/utils';

/**
 * Renders a styled native label for an explicitly associated form control.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered Label composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Use htmlFor matching a control id, or wrap the control as native label semantics permit. This component does not allocate IDs or supply a form context. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Label, Input } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<><Label htmlFor="name">Name</Label><Input id="name" /></>);
 * }
 * ```
 */
function Label({
  ref,
  className,
  ...props
}: React.PropsWithoutRef<React.ComponentProps<'label'>> & React.RefAttributes<HTMLLabelElement>) {
  return (
    <label
      ref={ref}
      data-slot='label'
      className={cn(
        'gap-2 text-sm leading-none font-medium group-data-[disabled=true]:opacity-50 peer-disabled:opacity-50 flex items-center select-none group-data-[disabled=true]:pointer-events-none peer-disabled:cursor-not-allowed',
        className,
      )}
      {...props}
    />
  );
}
Label.displayName = 'Label';

export { Label };
