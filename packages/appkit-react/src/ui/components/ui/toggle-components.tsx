import * as React from 'react';
import { Toggle as TogglePrimitive } from '@base-ui/react/toggle';
import { type VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/utils';
import { toggleVariants } from './toggle-variants';

/**
 * Renders a binary pressed-state control with Appkit toggle variants.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered Toggle composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. variant and size use toggleVariants defaults (default). Base UI owns pressed/defaultPressed and onPressedChange behavior; this is a toggle button rather than a form checkbox. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Toggle } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Toggle aria-label="Bold" defaultPressed>B</Toggle>);
 * }
 * ```
 */
function Toggle({
  ref,
  className,
  variant,
  size,
  ...props
}: React.PropsWithoutRef<TogglePrimitive.Props & VariantProps<typeof toggleVariants>> &
  React.RefAttributes<HTMLButtonElement>) {
  return (
    <TogglePrimitive
      ref={ref}
      data-slot='toggle'
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  );
}
Toggle.displayName = 'Toggle';

export { Toggle };
