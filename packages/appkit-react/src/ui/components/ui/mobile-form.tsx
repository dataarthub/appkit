/**
 * モバイル最適化フォームコンポーネント
 *
 * shadcn/ui パターンに準拠:
 * - CVA でバリアント管理
 * - @base-ui/react プリミティブ使用
 * - テーマトークン使用
 * - testId prop 対応
 */

import * as React from 'react';
import { Input as InputPrimitive } from '@base-ui/react/input';
import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';

import { cn } from '../../lib/utils';
import { mobileButtonVariants, fabVariants } from './mobile-form-variants';

// ============================================================================
// Mobile Form Container
// ============================================================================

export interface MobileFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  testId?: string;
}

const MobileForm = React.forwardRef<HTMLFormElement, MobileFormProps>(
  ({ className, testId, ...props }, ref) => (
    <form
      ref={ref}
      data-slot='mobile-form'
      data-testid={testId}
      className={cn('space-y-4 px-4 pb-safe', className)}
      {...props}
    />
  ),
);
MobileForm.displayName = 'MobileForm';

// ============================================================================
// Mobile Form Section
// ============================================================================

export interface MobileFormSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
}

const MobileFormSection = React.forwardRef<HTMLDivElement, MobileFormSectionProps>(
  ({ title, description, className, children, ...props }, ref) => (
    <div
      ref={ref}
      data-slot='mobile-form-section'
      className={cn('space-y-3', className)}
      {...props}
    >
      {(title || description) && (
        <div className='space-y-1'>
          {title && <h3 className='text-sm font-medium text-foreground'>{title}</h3>}
          {description && <p className='text-xs text-muted-foreground'>{description}</p>}
        </div>
      )}
      <div className='space-y-3'>{children}</div>
    </div>
  ),
);
MobileFormSection.displayName = 'MobileFormSection';

// ============================================================================
// Mobile Input (uses @base-ui/react Input)
// ============================================================================

export interface MobileInputProps extends React.ComponentProps<typeof InputPrimitive> {
  label: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  testId?: string;
}

const MobileInput = React.forwardRef<HTMLInputElement, MobileInputProps>(
  ({ label, error, helperText, icon, className, testId, ...props }, ref) => {
    const generatedId = React.useId();
    const controlId = props.id ?? generatedId;
    const descriptionId = controlId + '-description';
    // Exclude children from the void element
    const {
      children: _children,
      ...restProps
    } = props as MobileInputProps & {
      children?: React.ReactNode;
      };

    return (
      <div className='space-y-1.5' data-slot='mobile-input-wrapper'>
        <label htmlFor={controlId} className='text-sm font-medium text-foreground'>{label}</label>
        <div className='relative'>
          {icon && (
            <div className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground'>
              {icon}
            </div>
          )}
          <InputPrimitive
            ref={ref}
            data-slot='mobile-input'
            data-testid={testId}
            aria-invalid={!!error}
            className={cn(
              // Base styles
              'w-full h-12 px-4 text-base rounded-lg border bg-background',
              'transition-colors outline-none',
              // Focus
              'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
              // Error
              'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
              'aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 aria-invalid:ring-[3px]',
              // Disabled
              'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
              // Placeholder
              'placeholder:text-muted-foreground',
              // Icon padding
              icon && 'pl-10',
              className,
            )}
            {...restProps}
            id={controlId}
            aria-describedby={[props['aria-describedby'], (error || helperText) && descriptionId].filter(Boolean).join(' ') || undefined}
          />
        </div>
        {error && <p id={descriptionId} className='text-xs text-destructive'>{error}</p>}
        {helperText && !error && <p id={descriptionId} className='text-xs text-muted-foreground'>{helperText}</p>}
      </div>
    );
  },
);
MobileInput.displayName = 'MobileInput';

// ============================================================================
// Mobile Select
// ============================================================================

export interface MobileSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: Array<{ value: string; label: string }>;
  error?: string;
  placeholder?: string;
  testId?: string;
}

const MobileSelect = React.forwardRef<HTMLSelectElement, MobileSelectProps>(
  ({ label, options, error, placeholder, className, testId, ...props }, ref) => {
    const generatedId = React.useId();
    const controlId = props.id ?? generatedId;
    const descriptionId = controlId + '-description';
    return (
    <div className='space-y-1.5' data-slot='mobile-select-wrapper'>
      <label htmlFor={controlId} className='text-sm font-medium text-foreground'>{label}</label>
      <select
        ref={ref}
        data-slot='mobile-select'
        data-testid={testId}
        aria-invalid={!!error}
        className={cn(
          // Base
          'w-full h-12 px-4 text-base rounded-lg border bg-background appearance-none',
          'transition-colors outline-none',
          // Focus
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          // Error
          'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
          'aria-invalid:border-destructive aria-invalid:ring-[3px]',
          // Disabled
          'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
        id={controlId}
        aria-describedby={[props['aria-describedby'], error && descriptionId].filter(Boolean).join(' ') || undefined}
      >
        {placeholder && (
          <option value='' disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p id={descriptionId} className='text-xs text-destructive'>{error}</p>}
    </div>
  );
  },
);
MobileSelect.displayName = 'MobileSelect';

// ============================================================================
// Mobile Button (CVA variants + @base-ui/react Button)
// ============================================================================

export interface MobileButtonProps
  extends ButtonPrimitive.Props, VariantProps<typeof mobileButtonVariants> {
  loading?: boolean;
  icon?: React.ReactNode;
  testId?: string;
}

const MobileButton = React.forwardRef<HTMLElement, MobileButtonProps>(
  ({ className, variant, size, loading, icon, disabled, children, testId, ...props }, ref) => {
    const isDisabled = disabled || loading;

    return (
      <ButtonPrimitive
        ref={ref}
        data-slot='mobile-button'
        data-testid={testId}
        data-loading={loading || undefined}
        aria-busy={loading || undefined}
        disabled={isDisabled}
        className={typeof className === 'function' ? state => cn(mobileButtonVariants({ variant, size }), className(state)) : cn(mobileButtonVariants({ variant, size, className }))}
        {...props}
      >
        {loading ? <Loader2 className='animate-spin' aria-hidden='true' /> : icon}
        {children}
      </ButtonPrimitive>
    );
  },
);
MobileButton.displayName = 'MobileButton';

// ============================================================================
// Floating Action Button (FAB)
// ============================================================================

export interface FABProps extends ButtonPrimitive.Props, VariantProps<typeof fabVariants> {
  icon: React.ReactNode;
  label?: string;
  testId?: string;
}

const FAB = React.forwardRef<HTMLElement, FABProps>(
  ({ icon, label, position, extended, className, testId, ...props }, ref) => (
    <ButtonPrimitive
      ref={ref}
      data-slot='fab'
      data-testid={testId}
      className={typeof className === 'function' ? state => cn(fabVariants({ position, extended: extended || !!label }), className(state)) : cn(fabVariants({ position, extended: extended || !!label, className }))}
      {...props}
    >
      {icon}
      {(extended || label) && label && <span className='font-medium'>{label}</span>}
    </ButtonPrimitive>
  ),
);
FAB.displayName = 'FAB';

// ============================================================================
// Exports
// ============================================================================

export { MobileForm, MobileFormSection, MobileInput, MobileSelect, MobileButton, FAB };
