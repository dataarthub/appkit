'use client';

import * as React from 'react';
import { Meter as MeterPrimitive } from '@base-ui/react/meter';

import { cn } from '../../lib/utils';

/**
 * Coordinates an accessible bounded measurement display.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered Meter composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Indicator, Label and Value require Meter context. Base UI owns numeric range and accessible measurement state. MeterIndicator is typed with Track props but forwards its received props and className to the inner Indicator, not the outer track.
 * @example
 * ```tsx
 * import { Meter, MeterIndicator, MeterLabel, MeterValue } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Meter value={65}><MeterLabel>Storage used</MeterLabel><MeterValue /><MeterIndicator /></Meter>);
 * }
 * ```
 */
function Meter({ className, ...props }: React.ComponentProps<typeof MeterPrimitive.Root>) {
  return (
    <MeterPrimitive.Root
      data-slot='meter'
      className={cn('relative flex w-full flex-col gap-2', className)}
      {...props}
    />
  );
}

/**
 * Renders a meter track containing its styled measurement indicator.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered MeterIndicator composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Indicator, Label and Value require Meter context. Base UI owns numeric range and accessible measurement state. MeterIndicator is typed with Track props but forwards its received props and className to the inner Indicator, not the outer track.
 * @example
 * ```tsx
 * import { Meter, MeterIndicator, MeterLabel, MeterValue } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Meter value={65}><MeterLabel>Storage used</MeterLabel><MeterValue /><MeterIndicator /></Meter>);
 * }
 * ```
 */
function MeterIndicator({
  className,
  ...props
}: React.ComponentProps<typeof MeterPrimitive.Track>) {
  return (
    <MeterPrimitive.Track
      data-slot='meter-track'
      className='h-2 w-full overflow-hidden rounded-full bg-secondary'
    >
      <MeterPrimitive.Indicator
        data-slot='meter-indicator'
        className={cn('h-full w-full flex-1 bg-primary transition-all', className)}
        {...props}
      />
    </MeterPrimitive.Track>
  );
}

/**
 * Provides the accessible label of a meter.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered MeterLabel composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Indicator, Label and Value require Meter context. Base UI owns numeric range and accessible measurement state. MeterIndicator is typed with Track props but forwards its received props and className to the inner Indicator, not the outer track.
 * @example
 * ```tsx
 * import { Meter, MeterIndicator, MeterLabel, MeterValue } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Meter value={65}><MeterLabel>Storage used</MeterLabel><MeterValue /><MeterIndicator /></Meter>);
 * }
 * ```
 */
function MeterLabel({ className, ...props }: React.ComponentProps<typeof MeterPrimitive.Label>) {
  return (
    <MeterPrimitive.Label
      data-slot='meter-label'
      className={cn('text-sm font-medium leading-none', className)}
      {...props}
    />
  );
}

/**
 * Renders the formatted current measurement from meter context.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered MeterValue composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Indicator, Label and Value require Meter context. Base UI owns numeric range and accessible measurement state. MeterIndicator is typed with Track props but forwards its received props and className to the inner Indicator, not the outer track.
 * @example
 * ```tsx
 * import { Meter, MeterIndicator, MeterLabel, MeterValue } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Meter value={65}><MeterLabel>Storage used</MeterLabel><MeterValue /><MeterIndicator /></Meter>);
 * }
 * ```
 */
function MeterValue({ className, ...props }: React.ComponentProps<typeof MeterPrimitive.Value>) {
  return (
    <MeterPrimitive.Value
      data-slot='meter-value'
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

export { Meter, MeterIndicator, MeterLabel, MeterValue };
