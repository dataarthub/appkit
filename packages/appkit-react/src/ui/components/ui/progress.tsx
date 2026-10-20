'use client';

import * as React from 'react';
import { Progress as ProgressPrimitive } from '@base-ui/react/progress';

import { cn } from '../../lib/utils';

/**
 * Coordinates an accessible progress value and always appends a styled track/indicator.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered Progress composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose labels/value content inside Progress. The root always appends its own Track/Indicator after children; supplying another Track/Indicator adds a second bar rather than replacing the built-in one. Base UI owns range and indeterminate semantics. The host owns task progress. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Progress, ProgressTrack, ProgressIndicator, ProgressLabel, ProgressValue } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Progress value={45}><ProgressLabel>Upload</ProgressLabel><ProgressValue /></Progress>);
 * }
 * ```
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

/**
 * Renders the background track for a progress indicator.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ProgressTrack composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose labels/value content inside Progress. The root always appends its own Track/Indicator after children; supplying another Track/Indicator adds a second bar rather than replacing the built-in one. Base UI owns range and indeterminate semantics. The host owns task progress. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Progress, ProgressTrack, ProgressIndicator, ProgressLabel, ProgressValue } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Progress value={45}><ProgressLabel>Upload</ProgressLabel><ProgressValue /></Progress>);
 * }
 * ```
 */
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

/**
 * Renders the fill element driven by the surrounding progress context.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ProgressIndicator composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose labels/value content inside Progress. The root always appends its own Track/Indicator after children; supplying another Track/Indicator adds a second bar rather than replacing the built-in one. Base UI owns range and indeterminate semantics. The host owns task progress. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Progress, ProgressTrack, ProgressIndicator, ProgressLabel, ProgressValue } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Progress value={45}><ProgressLabel>Upload</ProgressLabel><ProgressValue /></Progress>);
 * }
 * ```
 */
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

/**
 * Provides the accessible label of a progress display.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ProgressLabel composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose labels/value content inside Progress. The root always appends its own Track/Indicator after children; supplying another Track/Indicator adds a second bar rather than replacing the built-in one. Base UI owns range and indeterminate semantics. The host owns task progress. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Progress, ProgressTrack, ProgressIndicator, ProgressLabel, ProgressValue } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Progress value={45}><ProgressLabel>Upload</ProgressLabel><ProgressValue /></Progress>);
 * }
 * ```
 */
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

/**
 * Renders the formatted progress value from context.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ProgressValue composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Compose labels/value content inside Progress. The root always appends its own Track/Indicator after children; supplying another Track/Indicator adds a second bar rather than replacing the built-in one. Base UI owns range and indeterminate semantics. The host owns task progress. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Progress, ProgressTrack, ProgressIndicator, ProgressLabel, ProgressValue } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Progress value={45}><ProgressLabel>Upload</ProgressLabel><ProgressValue /></Progress>);
 * }
 * ```
 */
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
