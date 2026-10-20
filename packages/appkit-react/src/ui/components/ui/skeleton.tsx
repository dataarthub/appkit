import { cn } from '../../lib/utils';

/**
 * Renders a pulsing placeholder surface while the host loads content.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered Skeleton composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Supply width/height or size classes; there is no built-in content measurement or loading-state detection. The host decides when to replace the placeholder and supplies accessible loading context.
 * @example
 * ```tsx
 * import { Skeleton } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Skeleton className="h-6 w-40" aria-hidden="true" />);
 * }
 * ```
 */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='skeleton'
      className={cn('bg-muted rounded-md animate-pulse', className)}
      {...props}
    />
  );
}

export { Skeleton };
