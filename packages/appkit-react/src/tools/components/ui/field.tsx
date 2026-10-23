import * as React from 'react';
import { Field, FieldLabel, FieldControl, FieldError, FieldDescription, FieldGroup, FieldLegend, FieldSeparator, FieldSet, FieldContent, FieldTitle, FieldValidity, cn } from "../../../ui";
import { Textarea } from './textarea';
import { Checkbox } from './checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { CollectionSchema, resolveFilterField, FilterFieldSpec } from '../filter/filter-types';
import type { JSONSchemaProperty } from '../../lib/schema/types';
import { extractUIConfig } from '../../lib/schema/json-schema';
type FieldInputProps = any;

type FieldInputType = 'text' | 'number' | 'password' | 'email' | 'select' | 'textarea' | 'checkbox';

const fieldInputTypes = new Set<FieldInputType>([
  'text',
  'number',
  'password',
  'email',
  'select',
  'textarea',
  'checkbox',
]);

const toFieldInputType = (value?: string): FieldInputType | undefined => {
  if (!value) return undefined;
  return fieldInputTypes.has(value as FieldInputType) ? (value as FieldInputType) : undefined;
};

// ============================================================================
// SMART FIELD IMPLEMENTATION
// ============================================================================

/**
 * FieldFactory プロパティ
 *
 * プリミティブな `Field` コンポーネントの高レベルラッパー用プロパティ。
 * スキーマ定義やレイアウト設定を受け取り、ラベル、エラー、入力コンポーネントを自動構成します。
 */
export interface FieldFactoryProps extends Omit<
  React.ComponentPropsWithoutRef<typeof Field>,
  'children'
> {
  children?: React.ReactNode | ((props: FieldInputProps | undefined) => React.ReactNode);
  /**
   * AI/E2E Test用の安定ID / Stable test identifier for AI and E2E tests
   *
   * Also generates derived IDs for error messages: `{testId}-error`
   * @example testId="email-field" → data-testid="email-field" + error id="email-field-error"
   */
  testId?: string;

  /**
   * 表示ラベル / Display label
   *
   * Override schema label or set manually.
   */
  label?: string;

  /**
   * ラベルの位置 / Label position
   * - "top": Label above input (vertical layout)
   * - "left": Label left of input (horizontal layout)
   * - "responsive": Vertical on narrow containers, horizontal on wider ones
   * - "none": No label displayed
   * @default "top"
   */
  labelPosition?: 'top' | 'left' | 'responsive' | 'none';

  /**
   * ラベルの固定幅（leftポジション時） / Fixed width for label (when position is left)
   *
   * Useful for alignment in left-label layouts.
   */
  labelWidth?: string | number;

  /**
   * 重複ラベルを表示（position="none"時） / Show overlapping label
   *
   * Displays a small label on the top border when main label is hidden (position="none").
   * @default false
   */
  overlappingLabel?: boolean;

  /**
   * 未選択時にラベルをプレースホルダーとして表示フラグ
   * Show label as placeholder when the field value is empty.
   */
  showPlaceholderOnAll?: boolean;

  /** 詳細説明 / Description text */
  description?: string | React.ReactNode;

  /** エラーメッセージ / Error message */
  error?: string | React.ReactNode;

  /** 必須フラグ / Required flag */
  required?: boolean;

  /**
   * 入力タイプ（自動生成用） / Input type
   *
   * If children are not provided, Field will auto-generate an input based on this type.
   * Derived from schema if provided.
   */
  type?: FieldInputType;

  /**
   * 選択肢（type="select"用） / Options
   *
   * Required if type is 'select'. Derived from schema enum if provided.
   */
  options?: { label: string; value: string }[];

  /**
   * 入力コンポーネント用Props / Props for inner input
   *
   * Passed directly to the auto-generated input component (Input, Select, Checkbox, etc).
   */

  inputProps?: FieldInputProps;

  /**
   * JSON Schema プロパティ (推奨)
   *
   * Pass a JSON Schema property to auto-configure field from x-ui metadata.
   */
  jsonSchema?: JSONSchemaProperty;

  /**
   * スキーマ（自動設定用） / Collection Schema (Legacy)
   *
   * Pass a centralized schema definition to auto-configure label, type, options, and behaviors.
   * @deprecated Use jsonSchema prop instead
   */
  schema?: CollectionSchema;

  /**
   * スキーマ内のフィールド名 / Field Name
   *
   * Key in the schema to lookup configuration from.
   * @deprecated Use jsonSchema prop instead
   */
  field?: string | FilterFieldSpec;
}

/**
 * FieldFactory (旧 Field)
 *
 * フォームコントロールのための汎用ラッパーコンポーネント。
 * ラベル、エラーメッセージ、説明文、レイアウト（垂直/水平）を一括で処理します。
 * スキーマ (`CollectionSchema`) を渡すことで、型やラベルを自動設定することも可能です。
 *
 * @example
 * ```tsx
 * // 基本的な使い方
 * <FieldFactory label="メールアドレス" type="email" required>
 *   <Input />
 * </FieldFactory>
 *
 * // スキーマからの自動生成
 * <FieldFactory schema={userSchema} field="email" inputProps={{ placeholder: "user@example.com" }} />
 * ```
 */
function FieldFactory({
  ref,
  testId,
  label,
  children,
  labelPosition,
  labelWidth,
  overlappingLabel,
  showPlaceholderOnAll,
  description,
  error,
  required,
  className,
  type,
  options,
  inputProps,
  jsonSchema,
  schema,
  field,
  // Capture orientation if passed to force it, otherwise derive from labelPosition
  orientation,
  ...props
}: React.PropsWithoutRef<FieldFactoryProps> & React.RefAttributes<HTMLDivElement>) {
  // Resolve props from schema if provided
  const resolvedProps = {
    label,
    type,
    options,
    labelPosition,
    labelWidth,
    overlappingLabel,
    showPlaceholderOnAll,
    inputProps,
    description,
  };

  // NEW: JSON Schema resolution (preferred)
  if (jsonSchema) {
    const fieldName = (inputProps?.name as string) || '';
    const config = extractUIConfig(jsonSchema, fieldName, []);

    resolvedProps.label = label || config.label;

    resolvedProps.type = type || toFieldInputType(config.type);
    resolvedProps.options =
      options ||
      config.options?.map((o) => ({
        label: o.label,
        value: String(o.value),
      }));

    const xui = jsonSchema['x-ui'] || {};
    resolvedProps.labelPosition = labelPosition || (xui.layout?.section ? 'top' : 'top');
    resolvedProps.overlappingLabel = overlappingLabel;

    if (config.placeholder || xui.prefix || xui.suffix) {
      resolvedProps.inputProps = {
        ...inputProps,
        placeholder: config.placeholder,
      };
    }

    if (!description && config.help) {
      resolvedProps.description = config.help;
    }
  }
  // Legacy: CollectionSchema resolution
  else if (schema && field) {
    const spec = typeof field === 'string' ? field : field;
    const resolved = resolveFilterField(spec, schema);

    // Map resolved filter field to Field props
    resolvedProps.label = label || resolved.label;
    resolvedProps.labelPosition = labelPosition || resolved.labelPosition || 'top';
    resolvedProps.labelWidth = labelWidth || resolved.labelWidth;
    resolvedProps.overlappingLabel =
      overlappingLabel !== undefined ? overlappingLabel : resolved.overlappingLabel;

    // Map types
    if (!type) {
      switch (resolved.type) {
        case 'number':
          resolvedProps.type = 'number';
          break;
        case 'boolean':
          resolvedProps.type = 'checkbox';
          break;
        case 'enum':
          resolvedProps.type = 'select';
          break;
        case 'date':
          resolvedProps.type = 'text';
          break; // Placeholder for date
        default:
          resolvedProps.type = 'text';
      }
    }

    // Map options
    if (!options && resolved.options) {
      resolvedProps.options = resolved.options.map((o) => ({
        label: o.label,
        value: String(o.value),
      }));
    }

    // Map placeholder
    if (resolved.placeholder) {
      resolvedProps.inputProps = { ...inputProps, placeholder: resolved.placeholder };
    }
  }

  const {
    label: effectiveLabel,
    type: effectiveType,
    options: effectiveOptions,
    labelPosition: effectiveLabelPositionProp = 'top',
    labelWidth: effectiveLabelWidth,
    overlappingLabel: effectiveOverlappingLabel = false,
    inputProps: effectiveInputProps,
    description: effectiveDescription,
  } = resolvedProps;

  const isNone = effectiveLabelPositionProp === 'none';
  const isOverlapping = isNone && effectiveOverlappingLabel;
  const isCheckbox = effectiveType === 'checkbox';
  const isResponsive = effectiveLabelPositionProp === 'responsive';

  // Map labelPosition to orientation
  // Checkbox is always horizontal row effectively in new design, but let's handle it custom
  const effectiveLabelPosition = isCheckbox ? 'left' : effectiveLabelPositionProp;
  const effectiveIsLeft = effectiveLabelPosition === 'left' || isResponsive;

  // Derive orientation from labelPosition
  const derivedOrientation =
    orientation || (isResponsive ? 'responsive' : effectiveIsLeft ? 'horizontal' : 'vertical');

  // Auto-generate input if Children is missing and Type is present
  const renderInput = () => {
    if (typeof children === 'function') {
      return <FieldControl render={children(effectiveInputProps) as React.ReactElement} />;
    }
    if (children) {
      // If children is a React component (not a native element), render it directly
      // without FieldControl to avoid Base UI's onChange interception which causes
      // errors with custom onChange handlers (e.g. FilterInput).
      // FieldControl is only needed for native input elements.
      const childElement = children as React.ReactElement;
      if (typeof childElement?.type === 'function' || typeof childElement?.type === 'object') {
        return childElement;
      }
      return <FieldControl render={childElement} />;
    }

    switch (effectiveType) {
      case 'select':
        // Select: FieldControl should wrap the Select Root (or be passed via render)
        // Pattern: <Field.Control render={<Select.Root ... />} />
        return (
          <FieldControl
            render={
              <Select
                {...effectiveInputProps}
                value={effectiveInputProps?.value === null ? undefined : effectiveInputProps?.value}
                defaultValue={effectiveInputProps?.defaultValue as string | undefined}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      resolvedProps.showPlaceholderOnAll ? resolvedProps.label : undefined
                    }
                  >
                    {resolvedProps.showPlaceholderOnAll &&
                    (effectiveInputProps?.value === undefined ||
                      effectiveInputProps?.value === null ||
                      effectiveInputProps?.value === '') ? (
                      <span className='text-muted-foreground'>{resolvedProps.label}</span>
                    ) : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {effectiveOptions?.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />
        );
      case 'textarea':
        return <FieldControl render={<Textarea {...effectiveInputProps} />} />;
      case 'checkbox':
        return <FieldControl render={<Checkbox {...effectiveInputProps} />} />;
      default:
        // Use FieldControl directly as the input, applying the Input styles manually
        return (
          <FieldControl
            type={effectiveType}
            className={cn(
              'dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 disabled:bg-input/50 dark:disabled:bg-input/80 h-8 rounded-lg border bg-transparent px-2.5 py-1 text-base transition-colors file:h-6 file:text-sm file:font-medium focus-visible:ring-[3px] aria-invalid:ring-[3px] md:text-sm file:text-foreground placeholder:text-muted-foreground w-full min-w-0 outline-none file:inline-flex file:border-0 file:bg-transparent disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
            )}
            {...effectiveInputProps}
          />
        );
    }
  };

  return (
    <Field
      ref={ref}
      data-testid={testId}
      orientation={derivedOrientation}
      className={cn(isOverlapping && 'relative mt-1', className)}
      {...props}
    >
      {/* Overlapping Label (Pre-label absolute) */}
      {isOverlapping && effectiveLabel && (
        <div className='absolute -top-1.5 left-2 px-1 bg-background z-10 pointer-events-none'>
          <span
            className={cn(
              'text-[10px] font-medium leading-none text-muted-foreground uppercase',
              required && "after:content-['*'] after:ml-0.5 after:text-destructive",
            )}
          >
            {effectiveLabel}
          </span>
        </div>
      )}

      {/* Normal Label (Top or Left handled by FieldRoot orientation) - Render here if NOT checkbox */}
      {effectiveLabel && !isNone && !isCheckbox && (
        <FieldLabel
          className={cn(required && "after:content-['*'] after:ml-0.5 after:text-destructive")}
          style={
            effectiveIsLeft && effectiveLabelWidth ? { width: effectiveLabelWidth } : undefined
          }
        >
          {effectiveLabel}
        </FieldLabel>
      )}

      {/* Input Control */}
      {/* FieldControl is now handled inside renderInput to support different wrappers (e.g. SelectTrigger) */}

      {effectiveIsLeft && !isCheckbox ? (
        /* Horizontal Layout needs Content Wrapper if there's description/error? */
        /* erp Field horizontal: [&>[data-slot=field-label]]:flex-auto has-[>[data-slot=field-content]]:items-start */
        /* So we should wrap input + desc + error in FieldContent if horizontal */
        <FieldContent>
          {renderInput() as React.ReactElement}
          {effectiveDescription &&
            !error &&
            (typeof effectiveDescription === 'string' ? (
              <FieldDescription>{effectiveDescription}</FieldDescription>
            ) : (
              effectiveDescription
            ))}
          {error && (typeof error === 'string' ? <FieldError>{error}</FieldError> : error)}
        </FieldContent>
      ) : (
        /* Vertical or Checkbox */
        <>
          {renderInput() as React.ReactElement}

          {/* For Checkbox, Label comes AFTER the control */}
          {isCheckbox && effectiveLabel && !isNone && (
            <FieldLabel
              className={cn(required && "after:content-['*'] after:ml-0.5 after:text-destructive")}
            >
              {effectiveLabel}
            </FieldLabel>
          )}

          {effectiveDescription &&
            !error &&
            (typeof effectiveDescription === 'string' ? (
              <FieldDescription>{effectiveDescription}</FieldDescription>
            ) : (
              effectiveDescription
            ))}
          {error && (typeof error === 'string' ? <FieldError>{error}</FieldError> : error)}
        </>
      )}
    </Field>
  );
}
FieldFactory.displayName = 'FieldFactory';

export { Field, FieldLabel, FieldControl, FieldError, FieldDescription, FieldGroup, FieldLegend, FieldSeparator, FieldSet, FieldContent, FieldTitle, FieldValidity, FieldFactory };
