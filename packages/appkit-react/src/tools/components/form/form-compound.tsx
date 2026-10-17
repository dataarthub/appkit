/**
 * @fileoverview Form Compound Components
 *
 * 合成可能なフォームUIコンポーネント群。
 * プリセットの `<FormView>` では対応しきれない複雑なレイアウトや
 * 案件固有のUIスロット挿入を可能にします。
 *
 * @module form/form-compound
 */

/* eslint-disable react-refresh/only-export-components */

import * as React from 'react';
import {
  useFormContext,
  FormProvider,
  type UseFormReturn,
  type FieldValues,
  type SubmitHandler,
} from 'react-hook-form';
import { cn } from "../../lib/utils";
import { Button } from '../ui/button';
import { FormContainer, type FormContainerWidth } from './form-container';
import { FormActionBar, type SaveStatus } from './form-action-bar';
import { FormGrid, type GridColumns } from './form-grid';
import { AutoFormField, type RelatedFieldConfig } from '../ui/form';
import type { JSONSchema, JSONSchemaProperty } from '../../lib/schema/types';

// =============================================================================
// Context
// =============================================================================

export interface FormCompoundContextValue {
  schema?: JSONSchema;
  mode?: 'create' | 'edit' | 'view';
  disabled?: boolean;
  relations?: Record<string, RelatedFieldConfig>;
}

const FormCompoundContext = React.createContext<FormCompoundContextValue>({});

/**
 * FormCompound のコンテキストを取得するフック
 */
export const useFormCompoundContext = () => React.useContext(FormCompoundContext);

// =============================================================================
// Form Root
// =============================================================================

export interface FormRootProps<TFieldValues extends FieldValues = FieldValues>
  extends Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> {
  form: UseFormReturn<TFieldValues>;
  onSubmit?: SubmitHandler<TFieldValues>;
  schema?: JSONSchema;
  mode?: 'create' | 'edit' | 'view';
  disabled?: boolean;
  relations?: Record<string, RelatedFieldConfig>;
  children: React.ReactNode;
}

/**
 * フォームのルートコンポーネント
 */
export function FormRoot<TFieldValues extends FieldValues = FieldValues>({
  form,
  onSubmit,
  schema,
  mode = 'edit',
  disabled = false,
  relations,
  children,
  className,
  ...props
}: FormRootProps<TFieldValues>) {
  const contextValue = React.useMemo<FormCompoundContextValue>(
    () => ({ schema, mode, disabled, relations }),
    [schema, mode, disabled, relations],
  );

  const handleSubmit = onSubmit ? form.handleSubmit(onSubmit) : undefined;

  return (
    <FormProvider {...form}>
      <FormCompoundContext.Provider value={contextValue}>
        <form onSubmit={handleSubmit} className={cn('space-y-6', className)} {...props}>
          {children}
        </form>
      </FormCompoundContext.Provider>
    </FormProvider>
  );
}

// =============================================================================
// Form Container
// =============================================================================

export interface FormContainerSlotProps extends React.HTMLAttributes<HTMLDivElement> {
  maxWidth?: FormContainerWidth;
}

/**
 * フォームの中央揃えコンテナ
 */
export function FormContainerSlot({
  maxWidth = '4xl',
  className,
  children,
  ...props
}: FormContainerSlotProps) {
  return (
    <FormContainer maxWidth={maxWidth} className={className} {...props}>
      {children}
    </FormContainer>
  );
}

// =============================================================================
// Form Section (Card / Group)
// =============================================================================

export interface FormSectionProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: 'card' | 'plain';
  headerAction?: React.ReactNode;
}

/**
 * フォームのグループ・セクション枠
 */
export function FormSection({
  title,
  description,
  variant = 'card',
  headerAction,
  className,
  children,
  ...props
}: FormSectionProps) {
  if (variant === 'plain') {
    return (
      <div className={cn('space-y-4', className)} {...props}>
        {(title || description || headerAction) && (
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div>
              {title && <h3 className="text-base font-semibold leading-none">{title}</h3>}
              {description && (
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
              )}
            </div>
            {headerAction && <div>{headerAction}</div>}
          </div>
        )}
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm space-y-4',
        className,
      )}
      {...props}
    >
      {(title || description || headerAction) && (
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div>
            {title && <h3 className="text-base font-semibold leading-none">{title}</h3>}
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

// =============================================================================
// Form Grid
// =============================================================================

export interface FormGridSlotProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: GridColumns;
}

/**
 * フォームのレスポンシブグリッド
 */
export function FormGridSlot({ columns = 2, className, children, ...props }: FormGridSlotProps) {
  return (
    <FormGrid columns={columns} className={className} {...props}>
      {children}
    </FormGrid>
  );
}

// =============================================================================
// Form Field Wrapper
// =============================================================================

export interface FormFieldProps {
  name: string;
  schema?: JSONSchemaProperty;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  relation?: RelatedFieldConfig;
  className?: string;
}

/**
 * 個別フィールドラッパー。各JSON SchemaプロパティをAutoFormFieldへ渡します。
 */
export function FormField({
  name,
  schema: propSchema,
  label,
  placeholder,
  disabled: propDisabled,
  relation: propRelation,
}: FormFieldProps) {
  const { control } = useFormContext();
  const context = useFormCompoundContext();

  const effectiveDisabled = propDisabled ?? context.disabled ?? false;
  const effectiveRelation = propRelation ?? context.relations?.[name];

  const fieldSchema = React.useMemo(() => {
    const rawSchema: JSONSchemaProperty =
      propSchema ?? (context.schema?.properties?.[name] as JSONSchemaProperty) ?? { type: 'string' };
    const s = { ...rawSchema };
    if (label) s.title = label;
    if (placeholder) {
      s['x-ui'] = { ...s['x-ui'], placeholder };
    }
    return s as any;
  }, [propSchema, context.schema, name, label, placeholder]);

  return (
    <AutoFormField
      name={name}
      control={control}
      jsonSchema={fieldSchema}
      disabled={effectiveDisabled}
      relation={effectiveRelation}
    />
  );
}

// =============================================================================
// Auto Fields by Schema
// =============================================================================

export interface FormAutoFieldsProps {
  schema?: JSONSchema;
  filter?: (fieldName: string, property: JSONSchemaProperty) => boolean;
  columns?: GridColumns;
}

/**
 * スキーマ定義に従って自動で全フィールドを展開するコンポーネント
 */
export function FormAutoFields({ schema: propSchema, filter, columns = 2 }: FormAutoFieldsProps) {
  const context = useFormCompoundContext();
  const schema = propSchema ?? context.schema;

  if (!schema?.properties) return null;

  const entries = Object.entries(schema.properties).filter(([key, prop]) => {
    if (filter) return filter(key, prop);
    return true;
  });

  return (
    <FormGridSlot columns={columns}>
      {entries.map(([key, prop]) => (
        <FormField key={key} name={key} schema={prop} />
      ))}
    </FormGridSlot>
  );
}

// =============================================================================
// Action Bar & Buttons
// =============================================================================

export interface FormActionBarSlotProps {
  primaryLabel?: string;
  secondaryLabel?: string;
  isSubmitting?: boolean;
  saveStatus?: SaveStatus;
  sticky?: boolean;
  onPrimary?: () => void;
  onSecondary?: () => void;
  tertiaryAction?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

/**
 * フォームアクションバー
 */
export function FormActionBarSlot({
  primaryLabel = '保存',
  secondaryLabel = 'キャンセル',
  isSubmitting,
  saveStatus,
  sticky = false,
  onPrimary,
  onSecondary,
  tertiaryAction,
  className,
}: FormActionBarSlotProps) {
  return (
    <FormActionBar
      primaryLabel={primaryLabel}
      secondaryLabel={secondaryLabel}
      primaryDisabled={isSubmitting}
      saveStatus={saveStatus}
      sticky={sticky}
      onPrimary={onPrimary}
      onSecondary={onSecondary}
      tertiaryAction={tertiaryAction}
      className={className}
    />
  );
}

export interface FormSubmitButtonProps extends React.ComponentProps<typeof Button> {
  label?: React.ReactNode;
  loadingLabel?: React.ReactNode;
}

/**
 * 送信ボタン
 */
export function FormSubmitButton({
  label = '保存',
  loadingLabel = '保存中...',
  disabled,
  children,
  ...props
}: FormSubmitButtonProps) {
  const {
    formState: { isSubmitting },
  } = useFormContext();

  return (
    <Button type="submit" disabled={isSubmitting || disabled} {...props}>
      {isSubmitting ? loadingLabel : (label ?? children)}
    </Button>
  );
}

// =============================================================================
// Compound Export Object
// =============================================================================

export const FormCompound = {
  Root: FormRoot,
  Container: FormContainerSlot,
  Section: FormSection,
  Grid: FormGridSlot,
  Field: FormField,
  AutoFields: FormAutoFields,
  ActionBar: FormActionBarSlot,
  SubmitButton: FormSubmitButton,
};
