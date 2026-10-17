/**
 * @fileoverview JSON Schema Detail Page Component
 *
 * JSON Schema から詳細表示/編集フォームを自動生成します。
 *
 * @module components/schema/SchemaDetailPage
 */
import * as React from 'react';
import type { Control, DefaultValues, FieldValues, Path, UseFormReturn } from 'react-hook-form';
import { useForm } from 'react-hook-form';
import { createAjvResolver, type SchemaFormValidationOptions } from '../../lib/schema/ajv';
import { ChevronDown, ExternalLink } from 'lucide-react';

import type { JSONSchema, JSONSchemaProperty } from '../../lib/schema/types';
import { inferWidget } from '../../lib/schema/json-schema';
import { RHFForm, AutoFormField, PREFECTURE_OPTIONS, type RelatedFieldConfig } from '../ui/form';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Label } from '../ui/label';

// =============================================================================
// Types
// =============================================================================

type DetailMode = 'view' | 'edit';
type GroupDisplay = 'heading' | 'card' | 'dropdown';
type GroupLayout = 'full' | 'column';

type SchemaDetailPageProps<TFieldValues extends FieldValues> = {
  /** Shared form renders fields only; the host owns submission and validation. */
  form?: UseFormReturn<TFieldValues>;
  /** Opt into JSON Schema validation for a standalone form. */
  validation?: SchemaFormValidationOptions;
  /** JSON Schema */
  schema: JSONSchema;
  /** 表示モード */
  mode: DetailMode;
  /** 初期値 */
  values?: Partial<TFieldValues>;
  /** デフォルト値 */
  defaultValues?: DefaultValues<TFieldValues>;
  /** 送信ボタンのラベル */
  submitLabel?: 'create' | 'update';
  /** 送信時のコールバック */
  onSubmit?: (values: TFieldValues) => void | Promise<void>;
  /** キャンセル時のコールバック */
  onCancel?: () => void;
  /** 削除時のコールバック */
  onDelete?: () => void;
  /** 編集ボタンクリック時のコールバック */
  onEdit?: () => void;
  /** 編集ボタンを表示するか */
  showEditButton?: boolean;
  /** グループの表示方法 */
  groupDisplay?: GroupDisplay;
  /** グループのレイアウト */
  groupLayout?: GroupLayout;
  /** 列の最小幅 */
  columnMinWidth?: number;
  /** 列の最大幅 */
  columnMaxWidth?: number;
  /** リレーション設定 */
  relations?: Record<string, RelatedFieldConfig>;
  /** 関連スキーマへのジャンプ時のコールバック */
  onJumpToSchema?: (collectionName: string) => void;
  /** 追加CSS */
  className?: string;
  /** アクションボタンを非表示にするか */
  hideActions?: boolean;
};

type GroupedProperties = Array<{
  name?: string;
  properties: Array<[string, JSONSchemaProperty]>;
}>;

const SYSTEM_FIELD_NAMES = new Set(['id', 'created_at', 'updated_at', 'createdAt', 'updatedAt']);

// =============================================================================
// Utilities
// =============================================================================

function groupProperties(schema: JSONSchema): GroupedProperties {
  const groups: GroupedProperties = [];
  const groupIndex = new Map<string, number>();

  if (!schema.properties) return groups;

  for (const [key, prop] of Object.entries(schema.properties)) {
    const groupName = prop['x-ui']?.layout?.section ?? '';
    const index = groupIndex.get(groupName);
    if (index === undefined) {
      groupIndex.set(groupName, groups.length);
      groups.push({ name: groupName || undefined, properties: [[key, prop]] });
    } else {
      groups[index].properties.push([key, prop]);
    }
  }

  return groups;
}

function isImageLike(value: unknown) {
  if (typeof File !== 'undefined' && value instanceof File) {
    return value.type.startsWith('image/');
  }
  if (typeof value === 'string') {
    if (value.startsWith('data:image/')) return true;
    return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(value);
  }
  return false;
}

function getFileLabel(value: unknown) {
  if (typeof File !== 'undefined' && value instanceof File) {
    return value.name;
  }
  if (typeof value === 'string') {
    return value.split('_').pop() ?? value;
  }
  return 'File';
}

function getRelatedDisplayValue(value: unknown, relation: RelatedFieldConfig) {
  const valueField = relation.valueField ?? 'id';
  const item = relation.data.find((entry) => String(entry[valueField]) === String(value));
  if (!item) {
    return relation.inputDisplay === 'text' ? '-' : undefined;
  }
  const label = item[relation.displayField];
  const labelText = label === undefined || label === null ? '' : String(label);
  const valueText = value === undefined || value === null ? '' : String(value);
  const displayMode = relation.inputDisplay ?? 'key';

  if (displayMode === 'text') return labelText || valueText;
  if (displayMode === 'both') {
    return labelText ? `${valueText} - ${labelText}` : valueText;
  }
  return valueText;
}

// =============================================================================
// File Display Component
// =============================================================================

function FileDisplay({ value }: { value: unknown }) {
  const [objectUrl, setObjectUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof File !== 'undefined' && value instanceof File) {
      const url = URL.createObjectURL(value);
      queueMicrotask(() => {
        setObjectUrl(url);
      });
      return () => URL.revokeObjectURL(url);
    }
    queueMicrotask(() => {
      setObjectUrl(null);
    });
    return undefined;
  }, [value]);

  if (!value) {
    return <div className='text-sm text-muted-foreground'>-</div>;
  }

  const isImage = isImageLike(value);
  const src = objectUrl ?? (typeof value === 'string' ? value : null);
  const label = getFileLabel(value);

  if (isImage && src) {
    return <img src={src} alt={label} className='h-28 w-auto rounded-md border object-contain' />;
  }

  if (src) {
    return (
      <a href={src} target='_blank' rel='noreferrer' className='text-sm underline'>
        {label}
      </a>
    );
  }

  return <div className='text-sm text-muted-foreground'>{label}</div>;
}

// =============================================================================
// Display Value Formatter
// =============================================================================

function toDisplayValue(
  value: unknown,
  prop: JSONSchemaProperty,
  relation?: RelatedFieldConfig,
): React.ReactNode {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  if (relation) {
    const displayValue = getRelatedDisplayValue(value, relation);
    if (displayValue !== undefined) return displayValue;
  }

  const widget = inferWidget(prop);

  if (widget === 'prefecture') {
    const match = PREFECTURE_OPTIONS.find((option) => option.value === value);
    return match?.label ?? String(value);
  }

  if (widget === 'select') {
    const xui = prop['x-ui'];
    let options = xui?.options;
    if (!options && prop.enum) {
      options = prop.enum.map((v) => ({ value: v as string | number, label: String(v) }));
    }
    if (options) {
      const match = options.find(
        (option: { value: string | number; label: string }) => option.value === value,
      );
      if (match) return match.label;
    }
    return String(value);
  }

  if (prop.type === 'boolean') {
    return value ? 'はい' : 'いいえ';
  }

  if (prop.type === 'object' && typeof value === 'object') {
    return <pre className='text-xs'>{JSON.stringify(value, null, 2)}</pre>;
  }

  if (value instanceof Date) {
    return value.toLocaleString();
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '-';
    // Display as list for better readability
    return (
      <ul className='list-disc list-inside space-y-0.5'>
        {value.map((item, index) => (
          <li key={index} className='text-sm'>
            {String(item)}
          </li>
        ))}
      </ul>
    );
  }

  return String(value);
}

function buildLabel(name: string, prop: JSONSchemaProperty, required: boolean) {
  const xui = prop['x-ui'];
  const base = xui?.label || prop.title || name;
  return required ? base : `${base} (任意)`;
}

function shouldRenderProperty(
  name: string,
  property: JSONSchemaProperty,
  value: unknown,
  mode: DetailMode,
) {
  if (property['x-ui']?.hidden) return false;
  if (mode !== 'edit') return true;
  if (!SYSTEM_FIELD_NAMES.has(name)) return true;

  const isReadOnly = Boolean(property.readOnly || property['x-ui']?.readOnly);
  if (!isReadOnly) return true;

  return !(value === undefined || value === null || value === '');
}

// =============================================================================
// Field Display Component
// =============================================================================

function PropertyDisplay({
  name,
  property,
  value,
  required,
  relation,
  onJump,
}: {
  name: string;
  property: JSONSchemaProperty;
  value: unknown;
  required: boolean;
  relation?: RelatedFieldConfig;
  onJump?: (collection: string) => void;
}) {
  const displayValue = toDisplayValue(value, property, relation);
  const widget = inferWidget(property);
  const isFile = widget === 'file' || property.format === 'uri';
  const collectionName = property['x-ui']?.searchSource?.collection;

  return (
    <div className='space-y-1'>
      <div className='flex items-center gap-2'>
        <Label className='text-xs uppercase tracking-wide text-muted-foreground'>
          {buildLabel(name, property, required)}
        </Label>
        {collectionName && onJump && (
          <button
            type='button'
            onClick={() => onJump(collectionName)}
            className='text-primary hover:text-primary/80 transition-colors'
            title={`${collectionName} スキーマへジャンプ`}
          >
            <ExternalLink className='w-3 h-3' />
          </button>
        )}
      </div>
      {isFile && typeof value === 'string' ? (
        <FileDisplay value={value} />
      ) : (
        <div className='text-sm whitespace-pre-wrap'>{displayValue}</div>
      )}
    </div>
  );
}

// =============================================================================
// Column Layout Hook
// =============================================================================

function useColumnCount(minWidth?: number, maxWidth?: number) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [columnCount, setColumnCount] = React.useState<number | undefined>(undefined);

  React.useEffect(() => {
    if (!ref.current) return;
    if (!minWidth && !maxWidth) return;

    const clampColumnCount = (count: number) => Math.max(1, Math.floor(count));
    const getCount = (width: number) => {
      const minBased = minWidth ? clampColumnCount(width / minWidth) : 1;
      if (!maxWidth) return minBased;
      const maxBased = clampColumnCount(Math.ceil(width / maxWidth));
      return Math.max(minBased, maxBased);
    };

    const element = ref.current;
    setColumnCount(getCount(element.getBoundingClientRect().width));

    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setColumnCount(getCount(entry.contentRect.width));
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [minWidth, maxWidth]);

  return { ref, columnCount };
}

// =============================================================================
// Properties Section Component
// =============================================================================

function PropertiesSection({
  properties,
  mode,
  values,
  control,
  required,
  columnMinWidth,
  columnMaxWidth,
  enableColumns = true,
  relations,
  onJumpToSchema,
  submitLabel,
}: {
  properties: Array<[string, JSONSchemaProperty]>;
  mode: DetailMode;
  values?: Record<string, unknown>;
  control: Control<FieldValues>;
  required: string[];
  columnMinWidth?: number;
  columnMaxWidth?: number;
  enableColumns?: boolean;
  relations?: Record<string, RelatedFieldConfig>;
  onJumpToSchema?: (collectionName: string) => void;
  submitLabel?: 'create' | 'update';
}) {
  const { ref, columnCount } = useColumnCount(columnMinWidth, columnMaxWidth);
  const visibleProperties = properties.filter(([name, property]) =>
    shouldRenderProperty(name, property, values?.[name], mode),
  );

  return (
    <div
      ref={enableColumns ? ref : undefined}
      className={enableColumns ? 'columns-1 [column-gap:1.5rem]' : 'space-y-4'}
      style={enableColumns ? { columnCount } : undefined}
    >
      {visibleProperties.map(([name, property]) => (
        <div key={name} className='mb-4 break-inside-avoid'>
          {mode === 'edit' ? (
            <AutoFormField
              name={name as Path<FieldValues>}
              jsonSchema={property}
              control={control}
              required={required.includes(name)}
              relation={relations?.[name]}
              isCreate={submitLabel === 'create'}
            />
          ) : (
            <PropertyDisplay
              name={name}
              property={property}
              value={values?.[name]}
              required={required.includes(name)}
              relation={relations?.[name]}
              onJump={onJumpToSchema}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// SchemaDetailPage Component
// =============================================================================

/**
 * JSON Schema から詳細表示/編集フォームを自動生成
 *
 * @example
 * ```tsx
 * <SchemaDetailPage
 *   schema={userSchema}
 *   mode="edit"
 *   values={userData}
 *   onSubmit={(values) => saveUser(values)}
 * />
 * ```
 */
export function SchemaDetailPage<TFieldValues extends FieldValues>({
  schema,
  form: sharedForm,
  validation,
  mode,
  values,
  defaultValues,
  submitLabel = 'update',
  onSubmit,
  onCancel,
  onDelete,
  onEdit,
  showEditButton = false,
  groupDisplay,
  groupLayout = 'full',
  columnMinWidth,
  columnMaxWidth,
  relations,
  onJumpToSchema,
  className,
  hideActions = false,
}: SchemaDetailPageProps<TFieldValues>) {
  const formRef = React.useRef<HTMLFormElement | null>(null);
  const internalForm = useForm<TFieldValues>({
    resolver: validation ? createAjvResolver<TFieldValues>(schema, validation) : undefined,
    defaultValues: (defaultValues ?? values ?? {}) as DefaultValues<TFieldValues>,
  });

  const form = sharedForm ?? internalForm;
  const { dirtyFields } = form.formState;
  React.useEffect(() => {
    if (!sharedForm && values) internalForm.reset(values as TFieldValues, { keepDirtyValues: true });
  }, [values, internalForm, sharedForm]);
  void dirtyFields; // Subscribe so background refreshes retain dirty inputs.
  const required = schema.required || [];
  const groups = groupDisplay
    ? groupProperties(schema)
    : [{ name: undefined, properties: Object.entries(schema.properties || {}) }];

  const { ref: groupRef, columnCount: groupColumnCount } = useColumnCount(
    groupLayout === 'column' ? columnMinWidth : undefined,
    groupLayout === 'column' ? columnMaxWidth : undefined,
  );

  const renderProperties = (group: GroupedProperties[number]) => (
    <PropertiesSection
      properties={group.properties}
      mode={mode}
      values={values as Record<string, unknown> | undefined}
      control={form.control as Control<FieldValues>}
      required={required}
      columnMinWidth={columnMinWidth}
      columnMaxWidth={columnMaxWidth}
      enableColumns={groupLayout === 'full'}
      relations={relations}
      onJumpToSchema={onJumpToSchema}
      submitLabel={submitLabel}
    />
  );

  const renderGroup = (group: GroupedProperties[number], index: number) => {
    const title = group.name ?? '詳細';

    if (groupDisplay === 'card') {
      return (
        <Card key={`${group.name ?? 'group'}-${index}`} className='break-inside-avoid'>
          {group.name ? (
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-semibold'>{group.name}</CardTitle>
            </CardHeader>
          ) : null}
          <CardContent className={group.name ? '' : 'pt-6'}>{renderProperties(group)}</CardContent>
        </Card>
      );
    }

    if (groupDisplay === 'dropdown') {
      return (
        <Collapsible
          key={`${group.name ?? 'group'}-${index}`}
          defaultOpen
          className='break-inside-avoid'
        >
          <CollapsibleTrigger
            render={
              <button
                type='button'
                className='flex w-full items-center justify-between text-sm font-semibold'
              />
            }
          >
            <span>{title}</span>
            <ChevronDown className='h-4 w-4 opacity-60 transition-transform data-[state=open]:rotate-180' />
          </CollapsibleTrigger>
          <CollapsibleContent className='mt-4'>{renderProperties(group)}</CollapsibleContent>
        </Collapsible>
      );
    }

    if (!groupDisplay) {
      return (
        <React.Fragment key={`${group.name ?? 'group'}-${index}`}>
          {renderProperties(group)}
        </React.Fragment>
      );
    }

    return (
      <section key={`${group.name ?? 'group'}-${index}`} className='space-y-4 break-inside-avoid'>
        {group.name ? <h3 className='text-sm font-semibold'>{group.name}</h3> : null}
        {renderProperties(group)}
      </section>
    );
  };

  const content =
    groupLayout === 'column' ? (
      <div
        ref={groupRef}
        className='columns-1 [column-gap:1.5rem]'
        style={{ columnCount: groupColumnCount }}
      >
        {groups.map((group, index) => (
          <div key={`${group.name ?? 'group'}-${index}`} className='mb-6'>
            {renderGroup(group, index)}
          </div>
        ))}
      </div>
    ) : (
      <div className='space-y-8'>{groups.map((group, index) => renderGroup(group, index))}</div>
    );

  if (sharedForm && mode === 'edit') return <div className={className}>{content}
    {!hideActions && onSubmit && <div className='flex flex-wrap items-center gap-3'>
      <Button type='submit'>{submitLabel === 'create' ? '作成' : '更新'}</Button>
      {onCancel && <Button type='button' variant='outline' onClick={onCancel}>キャンセル</Button>}
      {onDelete && <Button type='button' variant='destructive' onClick={onDelete}>削除</Button>}
    </div>}
  </div>;

  return (
    <div className={className}>
      {mode === 'edit' ? (
        <RHFForm {...form}>
          <form
            ref={formRef}
            onSubmit={form.handleSubmit((data) => onSubmit?.(data))}
            className='space-y-8'
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
              const target = event.target as HTMLElement | null;
              if (!target) return;
              if (target.tagName === 'TEXTAREA') return;
              if (target.tagName !== 'INPUT' && target.tagName !== 'SELECT') return;
              event.preventDefault();
              const formElement = formRef.current;
              if (!formElement) return;
              const focusable = Array.from(
                formElement.querySelectorAll<HTMLElement>(
                  'input, select, textarea, button, [tabindex]:not([tabindex="-1"])',
                ),
              ).filter((el) => !el.hasAttribute('disabled'));
              const currentIndex = focusable.indexOf(target);
              if (currentIndex === -1) return;
              const next = focusable[currentIndex + 1];
              if (next) next.focus();
            }}
          >
            {content}
            {!hideActions && onSubmit && (
              <div className='flex flex-wrap items-center gap-3'>
                <Button type='submit'>{submitLabel === 'create' ? '作成' : '更新'}</Button>
                {onCancel ? (
                  <Button type='button' variant='outline' onClick={onCancel}>
                    キャンセル
                  </Button>
                ) : null}
                {onDelete ? (
                  <Button type='button' variant='destructive' onClick={onDelete}>
                    削除
                  </Button>
                ) : null}
              </div>
            )}
          </form>
        </RHFForm>
      ) : (
        <div className='space-y-8'>
          {content}
          {(showEditButton || onCancel || onDelete) && (
            <div className='flex flex-wrap items-center gap-3'>
              {showEditButton ? (
                <Button type='button' onClick={onEdit}>
                  編集
                </Button>
              ) : null}
              {onCancel ? (
                <Button type='button' variant='outline' onClick={onCancel}>
                  戻る
                </Button>
              ) : null}
              {onDelete ? (
                <Button type='button' variant='destructive' onClick={onDelete}>
                  削除
                </Button>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
