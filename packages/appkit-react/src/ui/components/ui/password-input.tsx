import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';

import { cn } from '../../lib/utils';
import { Input, type InputProps } from './input';

/**
 * PasswordInput コンポーネント
 *
 * パスワード表示/非表示の切り替え機能がついた入力フィールドです。
 * 右側に Eye/EyeOff アイコンが表示され、クリックすることで type 属性が
 * "password" と "text" の間で切り替わります。
 *
 * @example
 * ```tsx
 * <PasswordInput placeholder="パスワードを入力" />
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
