import * as React from 'react';
import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';

import { cn } from '../../lib/utils';
import { buttonVariants } from './button-variants';

/**
 * Base UI button props plus Appkit loading/test selectors and CVA variants.
 * @remarks Inherited native or primitive props keep their upstream types and behavior; this declaration documents only the wrapper-owned options.
 * @see Button
 */
export interface ButtonProps
  extends ButtonPrimitive.Props, VariantProps<typeof buttonVariants> {
  /**
   * Stable data-testid assigned to the rendered control/container; omitted means no selector.
   */
  testId?: string;
  /**
   * Shows the loading spinner and disables activation when true; omitted means not loading. This does not manage an asynchronous task.
   */
  loading?: boolean;
}

/**
 * Renders a Base UI button with Appkit variants, a stable test ID and an optional loading spinner.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered Button composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. loading disables the button through disabled || loading and adds aria-busy/data-loading; omission means no spinner. The wrapper does not start or complete asynchronous work. variant and size use buttonVariants defaults (default). Base UI render composition is supported; there is no asChild prop. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Button } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Button loading={false} testId="save-draft" onClick={() => console.log("Save requested")}>Save draft</Button>);
 * }
 * ```
 */
const Button = React.forwardRef<HTMLElement, ButtonProps>(
  ({ className, variant, size, testId, loading, disabled, children, ...props }, ref) => {
    const isDisabled = disabled || loading;

    return (
      <ButtonPrimitive
        ref={ref}
        data-slot='button'
        data-testid={testId}
        data-loading={loading || undefined}
        data-destructive={variant === 'destructive' || undefined}
        aria-busy={loading || undefined}
        disabled={isDisabled}
        className={typeof className === 'function' ? state => cn(buttonVariants({ variant, size }), className(state)) : cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {loading && (
          <Loader2 className='mr-2 h-4 w-4 animate-spin' aria-hidden='true' />
        )}
        {children}
      </ButtonPrimitive>
    );
  },
);
Button.displayName = 'Button';

export { Button };
