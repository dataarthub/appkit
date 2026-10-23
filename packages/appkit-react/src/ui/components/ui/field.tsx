'use client';

import * as React from 'react';
import { useMemo } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Field as FieldPrimitive } from '@base-ui/react/field';
import { Fieldset as FieldsetPrimitive } from '@base-ui/react/fieldset';

import { cn } from '../../lib/utils';
import { Separator } from './separator';

// ============================================================================
// FieldSet (Fieldset.Root)
// ============================================================================

/**
 * Groups related form fields using the Base UI fieldset root.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered FieldSet composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Label, Control, Description, Error and Validity require the surrounding Field context. FieldSet/Legend provide related-field semantics. FieldError prefers truthy children; otherwise it deduplicates errors by message and returns null when empty. These wrappers do not persist form values.
 * @example
 * ```tsx
 * import { FieldSet, FieldLegend, FieldGroup, Field, FieldLabel, FieldControl, FieldDescription, FieldError } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<FieldSet><FieldLegend>Contact</FieldLegend><FieldGroup><Field name="email"><FieldLabel>Email</FieldLabel><FieldControl type="email" /><FieldDescription>Used for replies</FieldDescription><FieldError /></Field></FieldGroup></FieldSet>);
 * }
 * ```
 */
function FieldSet({ className, ...props }: FieldsetPrimitive.Root.Props) {
  return (
    <FieldsetPrimitive.Root
      data-slot='field-set'
      className={cn(
        'gap-4 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3 flex flex-col',
        className,
      )}
      {...props}
    />
  );
}

// ============================================================================
// FieldLegend (Fieldset.Legend)
// ============================================================================

/**
 * Labels the fieldset with legend or compact label styling.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling. Wrapper defaults: variant='legend'.
 * @returns The rendered FieldLegend composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Label, Control, Description, Error and Validity require the surrounding Field context. FieldSet/Legend provide related-field semantics. FieldError prefers truthy children; otherwise it deduplicates errors by message and returns null when empty. These wrappers do not persist form values. variant defaults to legend; label selects smaller typography.
 * @example
 * ```tsx
 * import { FieldSet, FieldLegend, FieldGroup, Field, FieldLabel, FieldControl, FieldDescription, FieldError } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<FieldSet><FieldLegend>Contact</FieldLegend><FieldGroup><Field name="email"><FieldLabel>Email</FieldLabel><FieldControl type="email" /><FieldDescription>Used for replies</FieldDescription><FieldError /></Field></FieldGroup></FieldSet>);
 * }
 * ```
 */
function FieldLegend({
  className,
  variant = 'legend',
  ...props
}: FieldsetPrimitive.Legend.Props & { /**
 * Visual treatment from the declared variant union; changing it does not alter host action semantics.
 */
/**
 * Visual treatment from the declared variant union; changing it does not alter host action semantics.
 */
variant?: 'legend' | 'label' }) {
  return (
    <FieldsetPrimitive.Legend
      data-slot='field-legend'
      data-variant={variant}
      className={cn(
        'mb-1.5 font-medium data-[variant=label]:text-sm data-[variant=legend]:text-base',
        className,
      )}
      {...props}
    />
  );
}

// ============================================================================
// FieldGroup
// ============================================================================

/**
 * Lays out a vertical group of fields and nested field groups.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered FieldGroup composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Label, Control, Description, Error and Validity require the surrounding Field context. FieldSet/Legend provide related-field semantics. FieldError prefers truthy children; otherwise it deduplicates errors by message and returns null when empty. These wrappers do not persist form values.
 * @example
 * ```tsx
 * import { FieldSet, FieldLegend, FieldGroup, Field, FieldLabel, FieldControl, FieldDescription, FieldError } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<FieldSet><FieldLegend>Contact</FieldLegend><FieldGroup><Field name="email"><FieldLabel>Email</FieldLabel><FieldControl type="email" /><FieldDescription>Used for replies</FieldDescription><FieldError /></Field></FieldGroup></FieldSet>);
 * }
 * ```
 */
function FieldGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='field-group'
      className={cn(
        'gap-5 data-[slot=checkbox-group]:gap-3 [&>[data-slot=field-group]]:gap-4 group/field-group @container/field-group flex w-full flex-col',
        className,
      )}
      {...props}
    />
  );
}

// ============================================================================
// Field (Field.Root)
// Primtive Field Component (was FieldRoot)
// ============================================================================

const fieldVariants = cva('data-[invalid]:text-destructive gap-2 group/field flex w-full', {
  variants: {
    /**
     * Axis used to join/group controls or arrange field content.
     * Accepted values: vertical, horizontal, responsive.
     * @defaultValue 'vertical'
     * @see fieldVariants
     */
    orientation: {
      vertical: 'flex-col [&>*]:w-full [&>.sr-only]:w-auto',
      horizontal:
        'flex-row items-center [&>[data-slot=field-label]]:w-24 [&>[data-slot=field-label]]:shrink-0 [&>[data-slot=field-label]]:text-right has-[>[data-slot=field-content]]:items-start has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
      responsive:
        'flex-row items-center [&>[data-slot=field-label]]:w-24 [&>[data-slot=field-label]]:shrink-0 [&>[data-slot=field-label]]:text-right has-[>[data-slot=field-content]]:items-start has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px max-sm:flex-col max-sm:[&>*]:w-full max-sm:[&>[data-slot=field-label]]:w-full max-sm:[&>[data-slot=field-label]]:text-left',
    },
  },
  defaultVariants: {
    orientation: 'vertical',
  },
});

/**
 * Coordinates one field control, label, description and validation state.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling. Wrapper defaults: orientation='vertical'.
 * @returns The rendered Field composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Label, Control, Description, Error and Validity require the surrounding Field context. FieldSet/Legend provide related-field semantics. FieldError prefers truthy children; otherwise it deduplicates errors by message and returns null when empty. These wrappers do not persist form values. The ref prop forwards to the rendered control or container declared by the component ref type. orientation defaults to vertical; horizontal/responsive change layout rather than field validation.
 * @example
 * ```tsx
 * import { FieldSet, FieldLegend, FieldGroup, Field, FieldLabel, FieldControl, FieldDescription, FieldError } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<FieldSet><FieldLegend>Contact</FieldLegend><FieldGroup><Field name="email"><FieldLabel>Email</FieldLabel><FieldControl type="email" /><FieldDescription>Used for replies</FieldDescription><FieldError /></Field></FieldGroup></FieldSet>);
 * }
 * ```
 */
function Field({
  ref,
  className,
  orientation = 'vertical',
  ...props
}: React.PropsWithoutRef<FieldPrimitive.Root.Props & VariantProps<typeof fieldVariants>> &
  React.RefAttributes<HTMLDivElement>) {
  return (
    <FieldPrimitive.Root
      ref={ref}
      data-slot='field'
      data-orientation={orientation}
      className={cn(fieldVariants({ orientation }), className)}
      {...props}
    />
  );
}
Field.displayName = 'Field';

// ============================================================================
// FieldContent
// ============================================================================

/**
 * Groups the textual content adjacent to a field control.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered FieldContent composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Label, Control, Description, Error and Validity require the surrounding Field context. FieldSet/Legend provide related-field semantics. FieldError prefers truthy children; otherwise it deduplicates errors by message and returns null when empty. These wrappers do not persist form values.
 * @example
 * ```tsx
 * import { FieldSet, FieldLegend, FieldGroup, Field, FieldLabel, FieldControl, FieldDescription, FieldError } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<FieldSet><FieldLegend>Contact</FieldLegend><FieldGroup><Field name="email"><FieldLabel>Email</FieldLabel><FieldControl type="email" /><FieldDescription>Used for replies</FieldDescription><FieldError /></Field></FieldGroup></FieldSet>);
 * }
 * ```
 */
function FieldContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='field-content'
      className={cn('gap-0.5 group/field-content flex flex-1 flex-col leading-snug', className)}
      {...props}
    />
  );
}

// ============================================================================
// FieldLabel (Field.Label)
// ============================================================================

/**
 * Associates a visible label with its Base UI field control.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered FieldLabel composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Label, Control, Description, Error and Validity require the surrounding Field context. FieldSet/Legend provide related-field semantics. FieldError prefers truthy children; otherwise it deduplicates errors by message and returns null when empty. These wrappers do not persist form values. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { FieldSet, FieldLegend, FieldGroup, Field, FieldLabel, FieldControl, FieldDescription, FieldError } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<FieldSet><FieldLegend>Contact</FieldLegend><FieldGroup><Field name="email"><FieldLabel>Email</FieldLabel><FieldControl type="email" /><FieldDescription>Used for replies</FieldDescription><FieldError /></Field></FieldGroup></FieldSet>);
 * }
 * ```
 */
function FieldLabel({
  ref,
  className,
  ...props
}: React.PropsWithoutRef<FieldPrimitive.Label.Props> & React.RefAttributes<HTMLLabelElement>) {
  return (
    <FieldPrimitive.Label
      ref={ref}
      data-slot='field-label'
      className={cn(
        'has-data-checked:bg-primary/5 has-data-checked:border-primary dark:has-data-checked:bg-primary/10 gap-2 group-data-[disabled]/field:opacity-50 has-[>[data-slot=field]]:rounded-lg has-[>[data-slot=field]]:border [&>*]:data-[slot=field]:p-2.5 group/field-label peer/field-label flex w-fit leading-snug text-sm font-medium',
        'has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col',
        'data-[invalid]:text-destructive',
        className,
      )}
      {...props}
    />
  );
}
FieldLabel.displayName = 'FieldLabel';

// ============================================================================
// FieldTitle
// ============================================================================

/**
 * Styles label-like title content without creating a label association.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered FieldTitle composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Label, Control, Description, Error and Validity require the surrounding Field context. FieldSet/Legend provide related-field semantics. FieldError prefers truthy children; otherwise it deduplicates errors by message and returns null when empty. These wrappers do not persist form values.
 * @example
 * ```tsx
 * import { FieldSet, FieldLegend, FieldGroup, Field, FieldLabel, FieldControl, FieldDescription, FieldError } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<FieldSet><FieldLegend>Contact</FieldLegend><FieldGroup><Field name="email"><FieldLabel>Email</FieldLabel><FieldControl type="email" /><FieldDescription>Used for replies</FieldDescription><FieldError /></Field></FieldGroup></FieldSet>);
 * }
 * ```
 */
function FieldTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='field-label'
      className={cn(
        'gap-2 text-sm font-medium group-data-[disabled]/field:opacity-50 flex w-fit items-center leading-snug',
        className,
      )}
      {...props}
    />
  );
}

// ============================================================================
// FieldDescription (Field.Description)
// ============================================================================

/**
 * Provides descriptive text associated with the surrounding field.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered FieldDescription composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Label, Control, Description, Error and Validity require the surrounding Field context. FieldSet/Legend provide related-field semantics. FieldError prefers truthy children; otherwise it deduplicates errors by message and returns null when empty. These wrappers do not persist form values. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { FieldSet, FieldLegend, FieldGroup, Field, FieldLabel, FieldControl, FieldDescription, FieldError } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<FieldSet><FieldLegend>Contact</FieldLegend><FieldGroup><Field name="email"><FieldLabel>Email</FieldLabel><FieldControl type="email" /><FieldDescription>Used for replies</FieldDescription><FieldError /></Field></FieldGroup></FieldSet>);
 * }
 * ```
 */
function FieldDescription({
  ref,
  className,
  ...props
}: React.PropsWithoutRef<FieldPrimitive.Description.Props> &
  React.RefAttributes<HTMLParagraphElement>) {
  return (
    <FieldPrimitive.Description
      ref={ref}
      data-slot='field-description'
      className={cn(
        'text-muted-foreground text-left text-sm [[data-variant=legend]+&]:-mt-1.5 leading-normal font-normal group-has-[[data-orientation=horizontal]]/field:text-balance',
        'last:mt-0 nth-last-2:-mt-1',
        '[&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4',
        className,
      )}
      {...props}
    />
  );
}
FieldDescription.displayName = 'FieldDescription';

// ============================================================================
// FieldSeparator
// ============================================================================

/**
 * Draws a divider with optional centered text between field groups.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered FieldSeparator composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Label, Control, Description, Error and Validity require the surrounding Field context. FieldSet/Legend provide related-field semantics. FieldError prefers truthy children; otherwise it deduplicates errors by message and returns null when empty. These wrappers do not persist form values.
 * @example
 * ```tsx
 * import { FieldSet, FieldLegend, FieldGroup, Field, FieldLabel, FieldControl, FieldDescription, FieldError } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<FieldSet><FieldLegend>Contact</FieldLegend><FieldGroup><Field name="email"><FieldLabel>Email</FieldLabel><FieldControl type="email" /><FieldDescription>Used for replies</FieldDescription><FieldError /></Field></FieldGroup></FieldSet>);
 * }
 * ```
 */
function FieldSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<'div'> & {
  /**
   * Content rendered in the wrapper's child region.
   */
  children?: React.ReactNode;
}) {
  return (
    <div
      data-slot='field-separator'
      data-content={!!children}
      className={cn(
        '-my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2 relative',
        className,
      )}
      {...props}
    >
      <Separator className='absolute inset-0 top-1/2' />
      {children && (
        <span
          className='text-muted-foreground px-2 bg-background relative mx-auto block w-fit'
          data-slot='field-separator-content'
        >
          {children}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// FieldError (Field.Error)
// ============================================================================

/**
 * Renders supplied children or deduplicated error messages when content exists.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered FieldError composition, or null when it has no visible content.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Label, Control, Description, Error and Validity require the surrounding Field context. FieldSet/Legend provide related-field semantics. FieldError prefers truthy children; otherwise it deduplicates errors by message and returns null when empty. These wrappers do not persist form values. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { FieldSet, FieldLegend, FieldGroup, Field, FieldLabel, FieldControl, FieldDescription, FieldError } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<FieldSet><FieldLegend>Contact</FieldLegend><FieldGroup><Field name="email"><FieldLabel>Email</FieldLabel><FieldControl type="email" /><FieldDescription>Used for replies</FieldDescription><FieldError /></Field></FieldGroup></FieldSet>);
 * }
 * ```
 */
function FieldError({
  ref,
  className,
  children,
  errors,
  ...props
}: React.PropsWithoutRef<
  FieldPrimitive.Error.Props & {
    /**
     * Explicit validation messages; duplicate message strings are collapsed and missing/empty messages may yield no content.
     */
    errors?: Array<
      | {
          /**
           * Optional error message used for deduplication and display; missing messages do not render a list item.
           */
          /**
           * Optional error message used for deduplication and display; missing messages do not render a list item.
           */
          message?: string;
        }
      | undefined
    >;
  }
> &
  React.RefAttributes<HTMLDivElement>) {
  const content = useMemo(() => {
    if (children) {
      return children;
    }

    if (!errors?.length) {
      return null;
    }

    const uniqueErrors = [...new Map(errors.map((error) => [error?.message, error])).values()];

    if (uniqueErrors?.length == 1) {
      return uniqueErrors[0]?.message;
    }

    return (
      <ul className='ml-4 flex list-disc flex-col gap-1'>
        {uniqueErrors.map((error, index) => error?.message && <li key={index}>{error.message}</li>)}
      </ul>
    );
  }, [children, errors]);

  if (!content) {
    return null;
  }

  return (
    <FieldPrimitive.Error
      ref={ref}
      data-slot='field-error'
      className={cn('text-destructive text-sm font-normal', className)}
      {...props}
    >
      {content}
    </FieldPrimitive.Error>
  );
}
FieldError.displayName = 'FieldError';

// ============================================================================
// FieldValidity (Field.Validity)
// ============================================================================

/**
 * Exposes the surrounding Base UI field validity state to its child renderer.
 * @param props - Inherited primitive configuration, children and controlled/default state; the upstream prop type remains authoritative.
 * @returns The rendered FieldValidity composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Label, Control, Description, Error and Validity require the surrounding Field context. FieldSet/Legend provide related-field semantics. FieldError prefers truthy children; otherwise it deduplicates errors by message and returns null when empty. These wrappers do not persist form values.
 * @example
 * ```tsx
 * import { FieldSet, FieldLegend, FieldGroup, Field, FieldLabel, FieldControl, FieldDescription, FieldError } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<FieldSet><FieldLegend>Contact</FieldLegend><FieldGroup><Field name="email"><FieldLabel>Email</FieldLabel><FieldControl type="email" /><FieldDescription>Used for replies</FieldDescription><FieldError /></Field></FieldGroup></FieldSet>);
 * }
 * ```
 */
const FieldValidity = FieldPrimitive.Validity;

// ============================================================================
// FieldControl (Helper for Smart Field / Legacy)
// ============================================================================

/**
 * Renders a Base UI control bound to its surrounding field context.
 * @param props - Inherited primitive configuration, children and controlled/default state; the upstream prop type remains authoritative.
 * @returns The rendered FieldControl composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Label, Control, Description, Error and Validity require the surrounding Field context. FieldSet/Legend provide related-field semantics. FieldError prefers truthy children; otherwise it deduplicates errors by message and returns null when empty. These wrappers do not persist form values.
 * @example
 * ```tsx
 * import { FieldSet, FieldLegend, FieldGroup, Field, FieldLabel, FieldControl, FieldDescription, FieldError } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<FieldSet><FieldLegend>Contact</FieldLegend><FieldGroup><Field name="email"><FieldLabel>Email</FieldLabel><FieldControl type="email" /><FieldDescription>Used for replies</FieldDescription><FieldError /></Field></FieldGroup></FieldSet>);
 * }
 * ```
 */
const FieldControl = FieldPrimitive.Control;


export { Field, FieldLabel, FieldControl, FieldError, FieldDescription, FieldGroup, FieldLegend, FieldSeparator, FieldSet, FieldContent, FieldTitle, FieldValidity };
