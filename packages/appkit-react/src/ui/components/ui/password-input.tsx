import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';

import { cn } from '../../lib/utils';
import { Input, type InputProps } from './input';

/**
 * Wraps Input with a local visibility toggle that switches password/text presentation.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered PasswordInput composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. The ref targets the input, className styles the input, and the toggle starts hidden (type=password). Caller props spread after the computed type can override it. disabled also disables the toggle; readOnly does not. Visibility state is local and does not validate, authenticate or store credentials. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { PasswordInput, Label } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<><Label htmlFor="password">Password</Label><PasswordInput id="password" autoComplete="current-password" /></>);
 * }
 * ```
 */
const PasswordInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);

    return (
      <div className='relative'>
        <Input
          type={showPassword ? 'text' : 'password'}
          className={cn('pr-10', className)}
          ref={ref}
          {...props}
        />
        <button
          type='button'
          onClick={() => setShowPassword((prev) => !prev)}
          className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
          aria-pressed={showPassword}
          disabled={props.disabled}
        >
          {showPassword ? (
            <EyeOff className='h-4 w-4 text-muted-foreground' aria-hidden='true' />
          ) : (
            <Eye className='h-4 w-4 text-muted-foreground' aria-hidden='true' />
          )}
          <span className='sr-only'>{showPassword ? 'Hide password' : 'Show password'}</span>
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = 'PasswordInput';

export { PasswordInput };
