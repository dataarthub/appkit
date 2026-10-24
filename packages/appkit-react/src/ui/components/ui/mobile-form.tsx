/** Mobile-sized native and Base UI form controls with linked labels and Appkit variants. */

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

/**
 * Native form attributes and a stable selector for MobileForm.
 * @remarks Inherited native or primitive props keep their upstream types and behavior; this declaration documents only the wrapper-owned options.
 * @see MobileForm
 */
export interface MobileFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  /**
   * Stable data-testid assigned to the rendered control/container; omitted means no selector.
   */
  testId?: string;
}

/**
 * Renders a mobile-spaced native form without adding a form-state provider.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered MobileForm composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. The host owns submit effects and values. Input/Select use the caller id or React useId and append -description for help/errors; error text takes precedence over helperText. testId targets the control/form/button. MobileInput uses Base UI Input directly, not Appkit Input numeric normalization. MobileButton loading disables it and replaces icon with a spinner. FAB label forces extended styling even if extended=false; an icon-only FAB needs an accessible name. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { MobileForm, MobileFormSection, MobileInput, MobileSelect, MobileButton, FAB } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<><MobileForm onSubmit={event => event.preventDefault()}><MobileFormSection title="Contact"><MobileInput label="Name" /><MobileSelect label="Method" defaultValue="email" options={[{ value: "email", label: "Email" }]} /><MobileButton type="submit">Save</MobileButton></MobileFormSection></MobileForm><FAB icon={<span>+</span>} label="Create" /></>);
 * }
 * ```
 */
function MobileForm({
  ref,
  className,
  testId,
  ...props
}: React.PropsWithoutRef<MobileFormProps> & React.RefAttributes<HTMLFormElement>) {
  return (
    <form
      ref={ref}
      data-slot='mobile-form'
      data-testid={testId}
      className={cn('space-y-4 px-4 pb-safe', className)}
      {...props}
    />
  );
}
MobileForm.displayName = 'MobileForm';

// ============================================================================
// Mobile Form Section
// ============================================================================

/**
 * Native div attributes and optional section heading/description.
 * @remarks Inherited native or primitive props keep their upstream types and behavior; this declaration documents only the wrapper-owned options.
 * @see MobileFormSection
 */
export interface MobileFormSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Optional section heading rendered before its content.
   */
  title?: string;
  /**
   * Supporting text displayed by the owning component.
   */
  description?: string;
}

/**
 * Groups mobile form controls under an optional title and description.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered MobileFormSection composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. The host owns submit effects and values. Input/Select use the caller id or React useId and append -description for help/errors; error text takes precedence over helperText. testId targets the control/form/button. MobileInput uses Base UI Input directly, not Appkit Input numeric normalization. MobileButton loading disables it and replaces icon with a spinner. FAB label forces extended styling even if extended=false; an icon-only FAB needs an accessible name. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { MobileForm, MobileFormSection, MobileInput, MobileSelect, MobileButton, FAB } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<><MobileForm onSubmit={event => event.preventDefault()}><MobileFormSection title="Contact"><MobileInput label="Name" /><MobileSelect label="Method" defaultValue="email" options={[{ value: "email", label: "Email" }]} /><MobileButton type="submit">Save</MobileButton></MobileFormSection></MobileForm><FAB icon={<span>+</span>} label="Create" /></>);
 * }
 * ```
 */
function MobileFormSection({
  ref,
  title,
  description,
  className,
  children,
  ...props
}: React.PropsWithoutRef<MobileFormSectionProps> & React.RefAttributes<HTMLDivElement>) {
  return (
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
  );
}
MobileFormSection.displayName = 'MobileFormSection';

// ============================================================================
// Mobile Input (uses @base-ui/react Input)
// ============================================================================

/**
 * Base UI input attributes with required visible label and linked helper/error content.
 * @remarks Inherited native or primitive props keep their upstream types and behavior; this declaration documents only the wrapper-owned options.
 * @see MobileInput
 */
export interface MobileInputProps extends React.ComponentProps<typeof InputPrimitive> {
  /**
   * Visible control/option text or content; does not perform persistence or validation.
   */
  label: string;
  /**
   * Error text displayed and used to mark the control invalid; the host supplies validation results.
   */
  error?: string;
  /**
   * Supporting text linked through aria-describedby when no error is present.
   */
  helperText?: string;
  /**
   * Leading visual content; provide an accessible name separately when it is the only button content.
   */
  icon?: React.ReactNode;
  /**
   * Stable data-testid assigned to the rendered control/container; omitted means no selector.
   */
  testId?: string;
}

/**
 * Renders a labeled large-touch input with generated IDs and linked helper/error text.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered MobileInput composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. The host owns submit effects and values. Input/Select use the caller id or React useId and append -description for help/errors; error text takes precedence over helperText. testId targets the control/form/button. MobileInput uses Base UI Input directly, not Appkit Input numeric normalization. MobileButton loading disables it and replaces icon with a spinner. FAB label forces extended styling even if extended=false; an icon-only FAB needs an accessible name. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { MobileForm, MobileFormSection, MobileInput, MobileSelect, MobileButton, FAB } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<><MobileForm onSubmit={event => event.preventDefault()}><MobileFormSection title="Contact"><MobileInput label="Name" /><MobileSelect label="Method" defaultValue="email" options={[{ value: "email", label: "Email" }]} /><MobileButton type="submit">Save</MobileButton></MobileFormSection></MobileForm><FAB icon={<span>+</span>} label="Create" /></>);
 * }
 * ```
 */
function MobileInput({
  ref,
  label,
  error,
  helperText,
  icon,
  className,
  testId,
  ...props
}: React.PropsWithoutRef<MobileInputProps> & React.RefAttributes<HTMLInputElement>) {
  const generatedId = React.useId();
  const controlId = props.id ?? generatedId;
  const descriptionId = controlId + '-description';
  // Exclude children from the void element
  const { children: _children, ...restProps } = props as MobileInputProps & {
    children?: React.ReactNode;
  };

  return (
    <div className='space-y-1.5' data-slot='mobile-input-wrapper'>
      <label htmlFor={controlId} className='text-sm font-medium text-foreground'>
        {label}
      </label>
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
          aria-describedby={
            [props['aria-describedby'], (error || helperText) && descriptionId]
              .filter(Boolean)
              .join(' ') || undefined
          }
        />
      </div>
      {error && (
        <p id={descriptionId} className='text-xs text-destructive'>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={descriptionId} className='text-xs text-muted-foreground'>
          {helperText}
        </p>
      )}
    </div>
  );
}
MobileInput.displayName = 'MobileInput';

// ============================================================================
// Mobile Select
// ============================================================================

/**
 * Native select attributes with required label and option data.
 * @remarks Inherited native or primitive props keep their upstream types and behavior; this declaration documents only the wrapper-owned options.
 * @see MobileSelect
 */
export interface MobileSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /**
   * Visible control/option text or content; does not perform persistence or validation.
   */
  label: string;
  /**
   * Native option entries in display order; each value must be a stable unique string and label is its visible text.
   */
  options: Array<{ /**
 * Identity for this choice within the surrounding group; provide a distinct stable string.
 */
  /**
   * Identity for this choice within the surrounding group; provide a distinct stable string.
   */
  value: string; /**
 * Visible control/option text or content; does not perform persistence or validation.
 */
  /**
   * Visible control/option text or content; does not perform persistence or validation.
   */
  label: string }>;
  /**
   * Error text displayed and used to mark the control invalid; the host supplies validation results.
   */
  error?: string;
  /**
   * Text displayed while no value is selected/entered; omitted means no placeholder.
   */
  placeholder?: string;
  /**
   * Stable data-testid assigned to the rendered control/container; omitted means no selector.
   */
  testId?: string;
}

/**
 * Renders a labeled native select with generated IDs and linked error text.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered MobileSelect composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. The host owns submit effects and values. Input/Select use the caller id or React useId and append -description for help/errors; error text takes precedence over helperText. testId targets the control/form/button. MobileInput uses Base UI Input directly, not Appkit Input numeric normalization. MobileButton loading disables it and replaces icon with a spinner. FAB label forces extended styling even if extended=false; an icon-only FAB needs an accessible name. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { MobileForm, MobileFormSection, MobileInput, MobileSelect, MobileButton, FAB } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<><MobileForm onSubmit={event => event.preventDefault()}><MobileFormSection title="Contact"><MobileInput label="Name" /><MobileSelect label="Method" defaultValue="email" options={[{ value: "email", label: "Email" }]} /><MobileButton type="submit">Save</MobileButton></MobileFormSection></MobileForm><FAB icon={<span>+</span>} label="Create" /></>);
 * }
 * ```
 */
function MobileSelect({
  ref,
  label,
  options,
  error,
  placeholder,
  className,
  testId,
  ...props
}: React.PropsWithoutRef<MobileSelectProps> & React.RefAttributes<HTMLSelectElement>) {
  const generatedId = React.useId();
  const controlId = props.id ?? generatedId;
  const descriptionId = controlId + '-description';
  return (
    <div className='space-y-1.5' data-slot='mobile-select-wrapper'>
      <label htmlFor={controlId} className='text-sm font-medium text-foreground'>
        {label}
      </label>
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
        aria-describedby={
          [props['aria-describedby'], error && descriptionId].filter(Boolean).join(' ') || undefined
        }
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
      {error && (
        <p id={descriptionId} className='text-xs text-destructive'>
          {error}
        </p>
      )}
    </div>
  );
}
MobileSelect.displayName = 'MobileSelect';

// ============================================================================
// Mobile Button (CVA variants + @base-ui/react Button)
// ============================================================================

/**
 * Base UI button attributes with mobile variants, loading state and optional icon.
 * @remarks Inherited native or primitive props keep their upstream types and behavior; this declaration documents only the wrapper-owned options.
 * @see MobileButton
 */
export interface MobileButtonProps
  extends ButtonPrimitive.Props, VariantProps<typeof mobileButtonVariants> {
  /**
   * Shows the loading spinner and disables activation when true; omitted means not loading. This does not manage an asynchronous task.
   */
  loading?: boolean;
  /**
   * Leading visual content; provide an accessible name separately when it is the only button content.
   */
  icon?: React.ReactNode;
  /**
   * Stable data-testid assigned to the rendered control/container; omitted means no selector.
   */
  testId?: string;
}

/**
 * Renders a large-touch Base UI button with optional loading spinner or leading icon.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered MobileButton composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. The host owns submit effects and values. Input/Select use the caller id or React useId and append -description for help/errors; error text takes precedence over helperText. testId targets the control/form/button. MobileInput uses Base UI Input directly, not Appkit Input numeric normalization. MobileButton loading disables it and replaces icon with a spinner. FAB label forces extended styling even if extended=false; an icon-only FAB needs an accessible name. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { MobileForm, MobileFormSection, MobileInput, MobileSelect, MobileButton, FAB } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<><MobileForm onSubmit={event => event.preventDefault()}><MobileFormSection title="Contact"><MobileInput label="Name" /><MobileSelect label="Method" defaultValue="email" options={[{ value: "email", label: "Email" }]} /><MobileButton type="submit">Save</MobileButton></MobileFormSection></MobileForm><FAB icon={<span>+</span>} label="Create" /></>);
 * }
 * ```
 */
function MobileButton({
  ref,
  className,
  variant,
  size,
  loading,
  icon,
  disabled,
  children,
  testId,
  ...props
}: React.PropsWithoutRef<MobileButtonProps> & React.RefAttributes<HTMLElement>) {
  const isDisabled = disabled || loading;

  return (
    <ButtonPrimitive
      ref={ref}
      data-slot='mobile-button'
      data-testid={testId}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      disabled={isDisabled}
      className={
        typeof className === 'function'
          ? (state) => cn(mobileButtonVariants({ variant, size }), className(state))
          : cn(mobileButtonVariants({ variant, size, className }))
      }
      {...props}
    >
      {loading ? <Loader2 className='animate-spin' aria-hidden='true' /> : icon}
      {children}
    </ButtonPrimitive>
  );
}
MobileButton.displayName = 'MobileButton';

// ============================================================================
// Floating Action Button (FAB)
// ============================================================================

/**
 * Base UI button attributes and fixed-position floating-action styling.
 * @remarks Inherited native or primitive props keep their upstream types and behavior; this declaration documents only the wrapper-owned options.
 * @see FAB
 */
export interface FABProps extends ButtonPrimitive.Props, VariantProps<typeof fabVariants> {
  /**
   * Required visual content in the floating action button; provide aria-label for icon-only use.
   */
  icon: React.ReactNode;
  /**
   * Optional visible text; a truthy label forces extended styling even when extended=false.
   */
  label?: string;
  /**
   * Stable data-testid assigned to the rendered control/container; omitted means no selector.
   */
  testId?: string;
}

/**
 * Renders a fixed floating action button that expands when label content is supplied.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered FAB composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. The host owns submit effects and values. Input/Select use the caller id or React useId and append -description for help/errors; error text takes precedence over helperText. testId targets the control/form/button. MobileInput uses Base UI Input directly, not Appkit Input numeric normalization. MobileButton loading disables it and replaces icon with a spinner. FAB label forces extended styling even if extended=false; an icon-only FAB needs an accessible name. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { MobileForm, MobileFormSection, MobileInput, MobileSelect, MobileButton, FAB } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<><MobileForm onSubmit={event => event.preventDefault()}><MobileFormSection title="Contact"><MobileInput label="Name" /><MobileSelect label="Method" defaultValue="email" options={[{ value: "email", label: "Email" }]} /><MobileButton type="submit">Save</MobileButton></MobileFormSection></MobileForm><FAB icon={<span>+</span>} label="Create" /></>);
 * }
 * ```
 */
function FAB({
  ref,
  icon,
  label,
  position,
  extended,
  className,
  testId,
  ...props
}: React.PropsWithoutRef<FABProps> & React.RefAttributes<HTMLElement>) {
  return (
    <ButtonPrimitive
      ref={ref}
      data-slot='fab'
      data-testid={testId}
      className={
        typeof className === 'function'
          ? (state) =>
              cn(fabVariants({ position, extended: extended || !!label }), className(state))
          : cn(fabVariants({ position, extended: extended || !!label, className }))
      }
      {...props}
    >
      {icon}
      {(extended || label) && label && <span className='font-medium'>{label}</span>}
    </ButtonPrimitive>
  );
}
FAB.displayName = 'FAB';

// ============================================================================
// Exports
// ============================================================================

export { MobileForm, MobileFormSection, MobileInput, MobileSelect, MobileButton, FAB };
