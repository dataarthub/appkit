import * as React from 'react';
import { Input as InputPrimitive } from '@base-ui/react/input';
import { normalizeNumericInput, getNextNumericValue } from '../../lib/ime-utils';

import { cn } from '../../lib/utils';

/**
 * Input component props
 * テキスト入力コンポーネントのプロップス
 */
export interface InputProps extends React.ComponentProps<typeof InputPrimitive> {
  /**
   * AI/E2E Test用の安定ID / Stable test identifier for AI and E2E tests
   */
  testId?: string;
}

/**
 * Input Component
 * テキスト入力コンポーネント
 *
 * `type="number"` が指定された場合、以下の高度な挙動が自動的に適用されます：
 * - IMEの強制切り替え防止 (`type="text"` としてレンダリング)
 * - 全角数字から半角数字への自動変換および非数値文字の自動削除（コピペにも対応）
 * - キーボードの上下キー (\`ArrowUp\`/\`ArrowDown\`) による数値の増減
 * - モバイルでの数字キーボード表示 (\`inputMode="numeric"\`, \`pattern="[0-9\\.\\-]*"\`)
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, testId, ...props }, ref) => {
    // Explicitly exclude children from props since input is a void element
    const {
      children: _children,
      ...restProps
    } = props as InputProps & { children?: React.ReactNode };

    const isNumeric = type === 'number';
    const effectiveType = isNumeric ? 'text' : type;
    const inputMode = props.inputMode || (isNumeric ? 'numeric' : undefined);
    const pattern = props.pattern || (isNumeric ? '[0-9\\.\\-]*' : undefined);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (isNumeric && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        const direction = e.key === 'ArrowUp' ? 'up' : 'down';
        const step = parseFloat(String(props.step || '1'));
        const nextValue = getNextNumericValue(props.value as any, direction, step);

        // Create a synthetic event to trigger onChange if needed,
        // but since Input is often used with controlled value, we just need to call onChange if it exists.
        // However, most React apps use controlled components.
        // For uncontrolled ones, we'd need to set e.target.value.
        if (props.onChange) {
          const event = {
            target: {
              ...e.target,
              value: String(nextValue),
              name: props.name,
            },
            currentTarget: {
              ...e.currentTarget,
              value: String(nextValue),
              name: props.name,
            },
          } as any;
          props.onChange(event);
        }
      }
      props.onKeyDown?.(e as any);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isNumeric) {
        e.target.value = normalizeNumericInput(e.target.value);
      }
      props.onChange?.(e as any);
    };

    return (
      <InputPrimitive
        ref={ref}
        {...restProps}
        type={effectiveType}
        inputMode={inputMode}
        pattern={pattern}
        data-slot='input'
        data-testid={testId}
        onKeyDown={handleKeyDown}
        onChange={handleChange}
        className={cn(
          'dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 disabled:bg-input/50 dark:disabled:bg-input/80 h-8 rounded-lg border bg-background px-2.5 py-1 text-base transition-colors file:h-6 file:text-sm file:font-medium focus-visible:ring-[3px] aria-invalid:ring-[3px] md:text-sm file:text-foreground placeholder:text-muted-foreground w-full min-w-0 outline-none file:inline-flex file:border-0 file:bg-transparent disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
