import * as React from 'react';
import { Input as InputPrimitive } from '@base-ui/react/input';
import { normalizeNumericInput, getNextNumericValue } from '../../lib/ime-utils';

import { cn } from '../../lib/utils';

/**
 * Base UI input props with a stable selector; numeric wrapper behavior is documented on Input.
 * @remarks Inherited native or primitive props keep their upstream types and behavior; this declaration documents only the wrapper-owned options.
 * @see Input
 */
export interface InputProps extends React.ComponentProps<typeof InputPrimitive> {
  /**
   * Stable data-testid assigned to the rendered control/container; omitted means no selector.
   */
  testId?: string;
}

/**
 * Renders a Base UI input with optional test ID and IME-aware numeric normalization.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered Input composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. No label prop is supported; use an associated Label or accessible name. type=number renders type=text, defaults inputMode to numeric and pattern to [0-9\.\-]*, normalizes fullwidth/nonnumeric input on change, and invokes the supplied onChange with the modified event. ArrowUp/ArrowDown derive the next value from props.value and step (default 1); min/max are not clamped by this wrapper. Numeric stepping requires a controlled value/onChange for reliable updates. Children are discarded. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { useState } from 'react';
 * import { Input, Label } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   const [quantity, setQuantity] = useState("1");
 *   return (<><Label htmlFor="quantity">Quantity</Label><Input id="quantity" type="number" value={quantity} onChange={event => setQuantity(event.target.value)} /></>);
 * }
 * ```
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
