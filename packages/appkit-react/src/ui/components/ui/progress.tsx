'use client';

import * as React from 'react';
import { Progress as ProgressPrimitive } from '@base-ui/react/progress';

import { cn } from '../../lib/utils';

/**
 * プログレスバーコンポーネント
 *
 * 進捗状況を視覚的に表示。
 */
const Progress = React.forwardRef<HTMLDivElement, ProgressPrimitive.Root.Props>(
  ({ className, children, value, ...props }, ref) => (
    <ProgressPrimitive.Root
      ref={ref}
      value={value}
      data-slot='progress'
      className={cn('flex flex-wrap gap-3', className)}
      {...props}
    >
      {children}
      <ProgressTrack>
        <ProgressIndicator />
      </ProgressTrack>
    </ProgressPrimitive.Root>
  ),
);
Progress.displayName = 'Progress';

const ProgressTrack = React.forwardRef<HTMLDivElement, ProgressPrimitive.Track.Props>(
  ({ className, ...props }, ref) => (
    <ProgressPrimitive.Track
      ref={ref}
      className={cn(
        'bg-muted h-1 rounded-full relative flex w-full items-center overflow-x-hidden',
        className,
      )}
      data-slot='progress-track'
      {...props}
    />
  ),
);
ProgressTrack.displayName = 'ProgressTrack';

const ProgressIndicator = React.forwardRef<HTMLDivElement, ProgressPrimitive.Indicator.Props>(
  ({ className, ...props }, ref) => (
    <ProgressPrimitive.Indicator
      ref={ref}
      data-slot='progress-indicator'
      className={cn('bg-primary h-full transition-all', className)}
      {...props}
    />
  ),
);
ProgressIndicator.displayName = 'ProgressIndicator';

const ProgressLabel = React.forwardRef<HTMLSpanElement, ProgressPrimitive.Label.Props>(
  ({ className, ...props }, ref) => (
    <ProgressPrimitive.Label
      ref={ref}
      className={cn('text-sm font-medium', className)}
      data-slot='progress-label'
      {...props}
    />
  ),
);
ProgressLabel.displayName = 'ProgressLabel';

const ProgressValue = React.forwardRef<HTMLSpanElement, ProgressPrimitive.Value.Props>(
  ({ className, ...props }, ref) => (
    <ProgressPrimitive.Value
      ref={ref}
      className={cn('text-muted-foreground ml-auto text-sm tabular-nums', className)}
      data-slot='progress-value'
      {...props}
    />
  ),
);
ProgressValue.displayName = 'ProgressValue';

export { Progress, ProgressTrack, ProgressIndicator, ProgressLabel, ProgressValue };
