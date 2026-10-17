import * as React from 'react';
import { Toggle as TogglePrimitive } from '@base-ui/react/toggle';
import { type VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/utils';
import { toggleVariants } from './toggle-variants';

const Toggle = React.forwardRef<
  HTMLButtonElement,
  TogglePrimitive.Props & VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive
    ref={ref}
    data-slot='toggle'
    className={cn(toggleVariants({ variant, size, className }))}
    {...props}
  />
));
Toggle.displayName = 'Toggle';

export { Toggle };
