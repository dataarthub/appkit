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
 * フォーム内で関連する入力フィールドをグループ化するためのコンテナ。
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
 * FieldSet グループのタイトル（見出し）を指定するコンポーネント。
 */
function FieldLegend({
  className,
  variant = 'legend',
  ...props
}: FieldsetPrimitive.Legend.Props & { variant?: 'legend' | 'label' }) {
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
 * 複数のフィールドをまとめて配置・整理するためのグループコンテナ。
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

const Field = React.forwardRef<
  HTMLDivElement,
  FieldPrimitive.Root.Props & VariantProps<typeof fieldVariants>
>(({ className, orientation = 'vertical', ...props }, ref) => {
  return (
    <FieldPrimitive.Root
      ref={ref}
      data-slot='field'
      data-orientation={orientation}
      className={cn(fieldVariants({ orientation }), className)}
      {...props}
    />
  );
});
Field.displayName = 'Field';

// ============================================================================
// FieldContent
// ============================================================================

/**
 * フィールド内のコントロールや説明、エラーメッセージを囲むコンテンツ領域。
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

const FieldLabel = React.forwardRef<HTMLLabelElement, FieldPrimitive.Label.Props>(
  ({ className, ...props }, ref) => {
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
  },
);
FieldLabel.displayName = 'FieldLabel';

// ============================================================================
// FieldTitle
// ============================================================================

/**
 * フィールドのタイトル（ラベル）用のコンポーネント。
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

const FieldDescription = React.forwardRef<HTMLParagraphElement, FieldPrimitive.Description.Props>(
  ({ className, ...props }, ref) => {
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
  },
);
FieldDescription.displayName = 'FieldDescription';

// ============================================================================
// FieldSeparator
// ============================================================================

/**
 * フォームセクションやフィールド間を区切るためのセパレーター（区切り線）。
 */
function FieldSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<'div'> & {
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

const FieldError = React.forwardRef<
  HTMLDivElement,
  FieldPrimitive.Error.Props & {
    errors?: Array<{ message?: string } | undefined>;
  }
>(({ className, children, errors, ...props }, ref) => {
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
});
FieldError.displayName = 'FieldError';

// ============================================================================
// FieldValidity (Field.Validity)
// ============================================================================

const FieldValidity = FieldPrimitive.Validity;

// ============================================================================
// FieldControl (Helper for Smart Field / Legacy)
// ============================================================================

const FieldControl = FieldPrimitive.Control;


export { Field, FieldLabel, FieldControl, FieldError, FieldDescription, FieldGroup, FieldLegend, FieldSeparator, FieldSet, FieldContent, FieldTitle, FieldValidity };
