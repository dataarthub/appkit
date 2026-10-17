import * as React from 'react';
import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox';
import { CheckIcon } from 'lucide-react';

import { cn } from '../../lib/utils';

/**
 * Checkbox component props
 * チェックボックスコンポーネントのプロップス
 */
export interface CheckboxProps extends CheckboxPrimitive.Root.Props {
  /**
   * AI/E2E Test用の安定ID / Stable test identifier for AI and E2E tests
   * @example testId="agree-terms" → data-testid="agree-terms"
   */
  testId?: string;
}

/**
 * Checkbox Component
 * チェックボックスコンポーネント
 */
const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ className, testId, ...props }, ref) => (
    <CheckboxPrimitive.Root
      ref={ref}
      data-slot='checkbox'
      data-testid={testId}
      className={cn(
        'border-input dark:bg-input/30 data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary data-checked:border-primary aria-invalid:aria-checked:border-primary aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 flex size-4 items-center justify-center rounded-[4px] border transition-colors group-has-disabled/field:opacity-50 focus-visible:ring-[3px] aria-invalid:ring-[3px] peer relative shrink-0 outline-none after:absolute after:-inset-x-3 after:-inset-y-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot='checkbox-indicator'
        className='[&>svg]:size-3.5 grid place-content-center text-current transition-none'
      >
        <CheckIcon />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  ),
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
