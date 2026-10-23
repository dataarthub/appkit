import * as React from 'react';
import { Separator as SeparatorPrimitive } from '@base-ui/react/separator';

import { cn } from '../../lib/utils';

/**
 * Renders a styled horizontal or vertical Base UI separator.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling. Wrapper defaults: orientation='horizontal'.
 * @returns The rendered Separator composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. orientation defaults to horizontal; vertical separators stretch within their layout parent. Base UI owns separator semantics and the native/primitive prop type remains authoritative. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Separator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<div><p>First section</p><Separator /><p>Second section</p></div>);
 * }
 * ```
 */
function Separator({
  ref,
  className,
  orientation = 'horizontal',
  ...props
}: React.PropsWithoutRef<React.ComponentPropsWithoutRef<typeof SeparatorPrimitive>> &
  React.RefAttributes<HTMLDivElement>) {
  return (
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
  );
}
Separator.displayName = SeparatorPrimitive.displayName;

export { Separator };
