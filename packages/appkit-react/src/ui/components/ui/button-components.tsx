import * as React from 'react';
import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';

import { cn } from '../../lib/utils';
import { buttonVariants } from './button-variants';

/**
 * Button component props
 * ボタンコンポーネントのプロップス
 */
export interface ButtonProps
  extends ButtonPrimitive.Props, VariantProps<typeof buttonVariants> {
  /**
   * AI/E2E Test用の安定ID / Stable test identifier for AI and E2E tests
   */
  testId?: string;
  /**
   * ローディング状態 / Loading state
   */
  loading?: boolean;
}

/**
 * Button Component
 * ボタンコンポーネント
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
