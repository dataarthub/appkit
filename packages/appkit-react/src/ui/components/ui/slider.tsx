'use client';

import * as React from 'react';
import { Slider as SliderPrimitive } from '@base-ui/react/slider';

import { cn } from '../../lib/utils';

/**
 * Renders a Base UI slider with one thumb per scalar or array value.
 * @param props - Base UI root props; min/max default to 0/100. Use defaultValue for
 * uncontrolled input, or value with onValueChange for controlled input. className is
 * applied to the control and aria-label/aria-labelledby are forwarded to every thumb.
 * @returns The slider root, styled track, indicator and thumb elements.
 * @remarks Requires React, @base-ui/react and @alneas/appkit-react/styles; no Appkit
 * context provider is required. The ref prop forwards to the root div. With no value/defaultValue, one thumb starts at min.
 * Range arrays determine thumb count; provide accessible labels for the intended control.
 * @example
 * ```tsx
 * import '@alneas/appkit-react/styles';
 * import { Slider } from '@alneas/appkit-react/ui';
 * export function VolumeControl() {
 *   return <Slider aria-label="Volume" defaultValue={[50]} max={100} step={1} />;
 * }
 * ```
 */
function Slider({
  ref,
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ...props
}: React.PropsWithoutRef<SliderPrimitive.Root.Props> & React.RefAttributes<HTMLDivElement>) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [value ?? defaultValue ?? min],
    [value, defaultValue, min, max],
  );

  return (
    <SliderPrimitive.Root
      ref={ref}
      className='data-horizontal:w-full data-vertical:h-full'
      data-slot='slider'
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment='edge'
      {...props}
    >
      <SliderPrimitive.Control
        className={cn(
          'data-vertical:min-h-40 relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:w-auto data-vertical:flex-col',
          className,
        )}
      >
        <SliderPrimitive.Track
          data-slot='slider-track'
          className='bg-muted rounded-full data-horizontal:h-1 data-horizontal:w-full data-vertical:h-full data-vertical:w-1 relative overflow-hidden select-none'
        >
          <SliderPrimitive.Indicator
            data-slot='slider-range'
            className='bg-primary select-none data-horizontal:h-full data-vertical:w-full'
          />
        </SliderPrimitive.Track>
        {Array.from({ length: _values.length }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot='slider-thumb'
            key={index}
            index={index}
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
            className='border-ring ring-ring/50 relative size-3 rounded-full border bg-white transition-[color,box-shadow] after:absolute after:-inset-2 hover:ring-[3px] focus-visible:ring-[3px] focus-visible:outline-hidden active:ring-[3px] block shrink-0 select-none disabled:pointer-events-none disabled:opacity-50'
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}
Slider.displayName = 'Slider';

export { Slider };
