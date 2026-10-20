import { cn } from '../../lib/utils';
import { Loader2Icon } from 'lucide-react';

/**
 * Renders an animated loader icon with a status role and Loading accessible label.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered Spinner composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. SVG props may override the default role/aria-label. This icon does not manage asynchronous work or disable adjacent controls.
 * @example
 * ```tsx
 * import { Spinner } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Spinner aria-label="Loading documents" />);
 * }
 * ```
 */
function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <Loader2Icon
      role='status'
      aria-label='Loading'
      className={cn('size-4 animate-spin', className)}
      {...props}
    />
  );
}

export { Spinner };
