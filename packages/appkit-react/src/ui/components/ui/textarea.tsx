import * as React from 'react';

import { cn } from '../../lib/utils';

/**
 * Native textarea attributes plus a stable selector; labels are supplied separately.
 * @remarks Inherited native or primitive props keep their upstream types and behavior; this declaration documents only the wrapper-owned options.
 * @see Textarea
 */
export interface TextareaProps extends React.ComponentProps<'textarea'> {
  /**
   * Stable data-testid assigned to the rendered control/container; omitted means no selector.
   */
  testId?: string;
}

/**
 * Renders a native multiline text input with Appkit styling and optional test ID.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered Textarea composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. testId maps to data-testid. Native textarea value/defaultValue/onChange semantics apply; this wrapper adds no debouncing or validation. No label prop is supported: use Label/htmlFor or an accessible name. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Textarea, Label } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<><Label htmlFor="notes">Notes</Label><Textarea id="notes" testId="notes" rows={4} /></>);
 * }
 * ```
 */
function Textarea({
  ref,
  className,
  testId,
  ...props
}: React.PropsWithoutRef<TextareaProps> & React.RefAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      ref={ref}
      data-slot='textarea'
      data-testid={testId}
      className={cn(
        'border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 disabled:bg-input/50 dark:disabled:bg-input/80 rounded-lg border bg-transparent px-2.5 py-2 text-base transition-colors focus-visible:ring-[3px] aria-invalid:ring-[3px] md:text-sm placeholder:text-muted-foreground flex field-sizing-content min-h-16 w-full outline-none disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
Textarea.displayName = 'Textarea';

export { Textarea };
