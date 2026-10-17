import * as React from 'react';
import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group';
import { Radio as RadioPrimitive } from '@base-ui/react/radio';
import { CheckCircleIcon } from 'lucide-react';

import { cn } from '../../lib/utils';
import { Label } from './label';

/**
 * RadioCardGroup Component
 * カードスタイルのラジオグループコンポーネント
 */
const RadioCardGroup = React.forwardRef<HTMLDivElement, RadioGroupPrimitive.Props>(
  ({ className, ...props }, ref) => {
    return (
      <RadioGroupPrimitive
        ref={ref}
        data-slot='radio-card-group'
        className={cn('grid gap-2', className)}
        {...props}
      />
    );
  },
);
RadioCardGroup.displayName = 'RadioCardGroup';

/**
 * RadioCardItem Component
 * カードスタイルのラジオアイテムコンポーネント
 */
const RadioCardItem = React.forwardRef<
  HTMLButtonElement,
  RadioPrimitive.Root.Props & {
    label?: React.ReactNode;
    detail?: React.ReactNode;
  }
>(({ className, children, label, detail, ...props }, ref) => {
  return (
    <RadioPrimitive.Root
      ref={ref}
      data-slot='radio-card-item'
      className={cn(
        'group/radio-card relative flex cursor-pointer rounded-lg px-4 py-3 shadow-sm border border-input bg-card text-card-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 aria-checked:border-primary aria-checked:bg-primary/5',
        className,
      )}
      {...props}
    >
      <div className='flex w-full items-center justify-between'>
        <div className='flex items-center'>
          <div className='text-sm text-left'>
            {label && (
              <Label className='font-medium cursor-pointer block text-foreground group-aria-checked/radio-card:text-primary'>
                {label}
              </Label>
            )}
            {detail && (
              <span className='text-xs text-muted-foreground block mt-0.5 group-aria-checked/radio-card:text-primary/80'>
                {detail}
              </span>
            )}
            {children}
          </div>
        </div>
        <RadioPrimitive.Indicator className='shrink-0 text-primary ml-2'>
          <CheckCircleIcon className='h-5 w-5' />
        </RadioPrimitive.Indicator>
      </div>
    </RadioPrimitive.Root>
  );
});
RadioCardItem.displayName = 'RadioCardItem';

export { RadioCardGroup, RadioCardItem };
