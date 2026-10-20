'use client';

import * as React from 'react';
import { OTPInput, OTPInputContext } from 'input-otp';

import { cn } from '../../lib/utils';
import { Minus } from 'lucide-react';

/**
 * Coordinates a single OTP input and its visual character slots.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered InputOTP composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. InputOTPSlot reads input-otp context and its index must be within maxLength. Missing context/out-of-range slots render no character. containerClassName styles the outer OTP container, className the input. spellCheck defaults to false but remaining props can override it. The host owns verification and expiry.
 * @example
 * ```tsx
 * import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<InputOTP maxLength={4} aria-label="Verification code"><InputOTPGroup><InputOTPSlot index={0} /><InputOTPSlot index={1} /></InputOTPGroup><InputOTPSeparator /><InputOTPGroup><InputOTPSlot index={2} /><InputOTPSlot index={3} /></InputOTPGroup></InputOTP>);
 * }
 * ```
 */
function InputOTP({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<typeof OTPInput> & {
  /**
   * Additional classes applied to the outer input-otp container rather than its input.
   */
  containerClassName?: string;
}) {
  return (
    <OTPInput
      data-slot='input-otp'
      containerClassName={cn(
        'cn-input-otp flex items-center has-disabled:opacity-50',
        containerClassName,
      )}
      spellCheck={false}
      className={cn('disabled:cursor-not-allowed', className)}
      {...props}
    />
  );
}

/**
 * Lays out adjacent OTP slots as a visually joined group.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered InputOTPGroup composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. InputOTPSlot reads input-otp context and its index must be within maxLength. Missing context/out-of-range slots render no character. containerClassName styles the outer OTP container, className the input. spellCheck defaults to false but remaining props can override it. The host owns verification and expiry.
 * @example
 * ```tsx
 * import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<InputOTP maxLength={4} aria-label="Verification code"><InputOTPGroup><InputOTPSlot index={0} /><InputOTPSlot index={1} /></InputOTPGroup><InputOTPSeparator /><InputOTPGroup><InputOTPSlot index={2} /><InputOTPSlot index={3} /></InputOTPGroup></InputOTP>);
 * }
 * ```
 */
function InputOTPGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='input-otp-group'
      className={cn(
        'has-aria-invalid:ring-destructive/20 dark:has-aria-invalid:ring-destructive/40 has-aria-invalid:border-destructive rounded-lg has-aria-invalid:ring-[3px] flex items-center',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Displays one zero-based slot from the surrounding OTP input context.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered InputOTPSlot composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. InputOTPSlot reads input-otp context and its index must be within maxLength. Missing context/out-of-range slots render no character. containerClassName styles the outer OTP container, className the input. spellCheck defaults to false but remaining props can override it. The host owns verification and expiry.
 * @example
 * ```tsx
 * import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<InputOTP maxLength={4} aria-label="Verification code"><InputOTPGroup><InputOTPSlot index={0} /><InputOTPSlot index={1} /></InputOTPGroup><InputOTPSeparator /><InputOTPGroup><InputOTPSlot index={2} /><InputOTPSlot index={3} /></InputOTPGroup></InputOTP>);
 * }
 * ```
 */
function InputOTPSlot({
  index,
  className,
  ...props
}: React.ComponentProps<'div'> & {
  /**
   * Zero-based index into the surrounding OTP context slots; choose an index smaller than maxLength.
   */
  index: number;
}) {
  const inputOTPContext = React.useContext(OTPInputContext);
  const { char, hasFakeCaret, isActive } = inputOTPContext?.slots[index] ?? {};

  return (
    <div
      data-slot='input-otp-slot'
      data-active={isActive}
      className={cn(
        'dark:bg-input/30 border-input data-[active=true]:border-ring data-[active=true]:ring-ring/50 data-[active=true]:aria-invalid:ring-destructive/20 dark:data-[active=true]:aria-invalid:ring-destructive/40 aria-invalid:border-destructive data-[active=true]:aria-invalid:border-destructive size-8 border-y border-r text-sm transition-all outline-none first:rounded-l-lg first:border-l last:rounded-r-lg data-[active=true]:ring-[3px] relative flex items-center justify-center data-[active=true]:z-10',
        className,
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className='pointer-events-none absolute inset-0 flex items-center justify-center'>
          <div className='animate-caret-blink bg-foreground h-4 w-px duration-1000 bg-foreground h-4 w-px' />
        </div>
      )}
    </div>
  );
}

/**
 * Renders a visual separator between OTP slot groups.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered InputOTPSeparator composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. InputOTPSlot reads input-otp context and its index must be within maxLength. Missing context/out-of-range slots render no character. containerClassName styles the outer OTP container, className the input. spellCheck defaults to false but remaining props can override it. The host owns verification and expiry.  children are replaced by the fixed minus icon.
 * @example
 * ```tsx
 * import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<InputOTP maxLength={4} aria-label="Verification code"><InputOTPGroup><InputOTPSlot index={0} /><InputOTPSlot index={1} /></InputOTPGroup><InputOTPSeparator /><InputOTPGroup><InputOTPSlot index={2} /><InputOTPSlot index={3} /></InputOTPGroup></InputOTP>);
 * }
 * ```
 */
function InputOTPSeparator({ ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='input-otp-separator'
      className="[&_svg:not([class*='size-'])]:size-4 flex items-center"
      role='separator'
      {...props}
    >
      <Minus />
    </div>
  );
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };
