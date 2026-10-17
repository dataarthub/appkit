'use client';

import * as React from 'react';
import { Meter as MeterPrimitive } from '@base-ui/react/meter';

import { cn } from '../../lib/utils';

/**
 * 測定値や進捗状況（ゲージなど）を表示するメーターのルートコンポーネント。
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
 * メーターの進捗バーを視覚的に表現するインジケーター。
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
 * メーターの名前や説明を表示するラベル。
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
 * メーターの現在の数値を表示するコンポーネント。
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
