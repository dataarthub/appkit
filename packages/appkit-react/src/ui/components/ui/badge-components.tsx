import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { type VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/utils';
import { badgeVariants } from './badge-variants';

/**
 * Renders a compact status or tag using a span or a caller-supplied render element.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling. Wrapper defaults: variant='default'.
 * @returns The rendered Badge composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. variant defaults to default. render follows Base UI useRender composition and must accept the merged props; no asChild adapter is provided. A badge has no built-in interaction or dismissal.
 * @example
 * ```tsx
 * import { Badge } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Badge variant="secondary">Draft</Badge>);
 * }
 * ```
 */
function Badge({
  className,
  variant = 'default',
  render,
  ...props
}: useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>(
      {
        className: cn(badgeVariants({ className, variant })),
      },
      props,
    ),
    render,
    state: {
      slot: 'badge',
      variant,
    },
  });
}

export { Badge };
