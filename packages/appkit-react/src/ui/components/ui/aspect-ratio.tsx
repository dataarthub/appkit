import * as React from 'react';
import { cn } from '../../lib/utils';

/**
 * Constrains a div to a caller-supplied width-to-height ratio using CSS.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered AspectRatio composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. ratio is a positive width divided by height (for example 16 / 9), with no fallback or runtime validation. The wrapper sets --ratio in its style; a caller-supplied style replaces that object because native props are spread afterward.
 * @example
 * ```tsx
 * import { AspectRatio } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<AspectRatio ratio={16 / 9}><div>Preview</div></AspectRatio>);
 * }
 * ```
 */
function AspectRatio({
  ratio,
  className,
  ...props
}: React.ComponentProps<'div'> & { /**
 * Required positive width/height aspect ratio (for example 16/9); no default or runtime validation is supplied.
 */
/**
 * Required positive width/height aspect ratio (for example 16/9); no default or runtime validation is supplied.
 */
ratio: number }) {
  return (
    <div
      data-slot='aspect-ratio'
      style={
        {
          '--ratio': ratio,
        } as React.CSSProperties
      }
      className={cn('relative aspect-(--ratio)', className)}
      {...props}
    />
  );
}

export { AspectRatio };
