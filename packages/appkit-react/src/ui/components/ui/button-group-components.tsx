import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { type VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/utils';
import { Separator } from './separator';
import { buttonGroupVariants } from './button-group-variants';

/**
 * Visually joins adjacent buttons in a labeled group.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ButtonGroup composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. orientation defaults to horizontal through buttonGroupVariants. This group provides styling and role=group, without roving focus or selection state. Text uses Base UI useRender composition; custom elements must accept merged props.
 * @example
 * ```tsx
 * import { ButtonGroup, ButtonGroupText, ButtonGroupSeparator, Button } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<ButtonGroup aria-label="Document actions"><ButtonGroupText>Draft</ButtonGroupText><Button>Save</Button><ButtonGroupSeparator /><Button>Preview</Button></ButtonGroup>);
 * }
 * ```
 */
function ButtonGroup({
  className,
  orientation,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof buttonGroupVariants>) {
  return (
    <div
      role='group'
      data-slot='button-group'
      data-orientation={orientation}
      className={cn(buttonGroupVariants({ orientation }), className)}
      {...props}
    />
  );
}

/**
 * Renders supplemental text or a custom render element inside a button group.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered ButtonGroupText composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. orientation defaults to horizontal through buttonGroupVariants. This group provides styling and role=group, without roving focus or selection state. Text uses Base UI useRender composition; custom elements must accept merged props.
 * @example
 * ```tsx
 * import { ButtonGroup, ButtonGroupText, ButtonGroupSeparator, Button } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<ButtonGroup aria-label="Document actions"><ButtonGroupText>Draft</ButtonGroupText><Button>Save</Button><ButtonGroupSeparator /><Button>Preview</Button></ButtonGroup>);
 * }
 * ```
 */
function ButtonGroupText({ className, render, ...props }: useRender.ComponentProps<'div'>) {
  return useRender({
    defaultTagName: 'div',
    props: mergeProps<'div'>(
      {
        className: cn(
          "bg-muted gap-2 rounded-lg border px-2.5 text-sm font-medium [&_svg:not([class*='size-'])]:size-4 flex items-center [&_svg]:pointer-events-none",
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: 'button-group-text',
    },
  });
}

/**
 * Separates adjacent button-group controls with a vertical separator by default.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling. Wrapper defaults: orientation='vertical'.
 * @returns The rendered ButtonGroupSeparator composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. orientation defaults to horizontal through buttonGroupVariants. This group provides styling and role=group, without roving focus or selection state. Text uses Base UI useRender composition; custom elements must accept merged props.
 * @example
 * ```tsx
 * import { ButtonGroup, ButtonGroupText, ButtonGroupSeparator, Button } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<ButtonGroup aria-label="Document actions"><ButtonGroupText>Draft</ButtonGroupText><Button>Save</Button><ButtonGroupSeparator /><Button>Preview</Button></ButtonGroup>);
 * }
 * ```
 */
function ButtonGroupSeparator({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot='button-group-separator'
      orientation={orientation}
      className={cn(
        'bg-input relative self-stretch data-[orientation=horizontal]:mx-px data-[orientation=horizontal]:w-auto data-[orientation=vertical]:my-px data-[orientation=vertical]:h-auto',
        className,
      )}
      {...props}
    />
  );
}

export { ButtonGroup, ButtonGroupSeparator, ButtonGroupText };
