import * as React from 'react';
import { Separator as SeparatorPrimitive } from '@base-ui/react/separator';

import { cn } from '../../lib/utils';

/**
 * Separator Component
 * セパレーターコンポーネント
 */
const Separator = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive>
>(({ className, orientation = 'horizontal', ...props }, ref) => (
  <SeparatorPrimitive
    ref={ref}
    data-slot='separator'
    orientation={orientation}
    className={cn(
      'bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px data-[orientation=vertical]:self-stretch',
      className,
    )}
    {...props}
  />
));
Separator.displayName = SeparatorPrimitive.displayName;

export { Separator };
