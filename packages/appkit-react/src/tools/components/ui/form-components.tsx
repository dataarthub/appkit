import * as React from 'react';
import { Controller, FieldPath, FieldValues, Control, useWatch, Path } from 'react-hook-form';
import { FieldControl, FieldFactory } from './field';
import { Input } from './input';
import { Textarea } from './textarea';
import { Checkbox } from './checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Button } from './button';
import { Badge } from './badge-components';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './dialog';

import { inferWidget } from '../../lib/schema/json-schema';
import {
  COUNTRIES,
  SUBDIVISIONS,
  SUBDIVISION_ALIASES,
  POSTAL_PATTERNS,
  getSubdivisions,
  formatJapanesePostalCode,
} from '../../lib/schema/geo-data';
import type { JSONSchemaProperty } from '../../lib/schema/types';
import { PREFECTURE_OPTIONS } from './form-helpers';
import { SearchableSelectInput } from './searchable-select-input';

/**
 * Base UI Form Primitive + Field Wrappers
 *
 * Base UI の `Form` プリミティブと、`field.tsx` で定義された `Field` ラッパーコンポーネントをまとめたオブジェクトです。
 * `<Form.Root>` でフォーム全体を囲み、`<Form.Field>` で各フィールドを定義します。
 *
 * @example
 * ```tsx
 * <Form.Root onSubmit={...}>
 *   <Form.Field>
 *     <Form.Label>Email</Form.Label>
 *     <Form.Control><Input /></Form.Control>
 *     <Form.Error />
 *   </Form.Field>
 * </Form.Root>
 * ```
 */
// =============================================================================
// Helpers & Types for Smart Logic
// =============================================================================

/**
 * Configuration for relation-based form fields in AutoFormField.
 * Used when a field represents a foreign key to another collection.
 */
export interface RelatedFieldConfig {
  /** The human-readable name of the field to display when showing labels */
  displayField: string;
  /** The field name to use as the value (e.g., 'team_id'). If omitted, 'id' is often assumed. */
  valueField?: string;
  /** The source data for the relation (array of items) */
  data: Array<Record<string, unknown>>;
  /**
   * How to display the field:
   * - 'key': (default) Only show the ID input
   * - 'text': Only show the label (read-only)
   * - 'both': Show both the ID input and the label (stacked vertically)
   */
  inputDisplay?: 'key' | 'text' | 'both';
  /**
   * Visual style for the label part (only when inputDisplay is 'both' or 'text'):
   * - 'input' (default): Shows a read-only Input component with border/background
   * - 'label': Shows a plain text label (better for non-editable confirmation)
   */
  inputVariant?: 'input' | 'label';
  /**
   * Search interaction mode:
   * - 'dialog' (default): Opens a modal dialog for searching
   * - 'rightpane': Opens a side pane for searching
   */
  searchMode?: 'dialog' | 'rightpane';
  /** Array of field names to include in the search filtering. */
  searchFields?: string[];
  /** Custom title for the search dialog. */
  searchTitle?: string;
  /** If true, verifies that the entered ID exists in the data and shows 'Not found' if missing. */
  validateKey?: boolean;
}

// Legacy Prefecture Options (Copied for compatibility)

const DATETIME_LOCAL_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{3})?)?$/;
const AUDIT_FIELD_NAMES = new Set(['created_at', 'updated_at', 'createdAt', 'updatedAt']);

function formatDateTimeLocalValue(value: unknown): string {
  if (value == null || value === '') return '';

  if (typeof value === 'string' && DATETIME_LOCAL_PATTERN.test(value)) {
    return value;
  }

  const date = value instanceof Date ? value : new Date(value as string | number);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

const toInputValue = (value: unknown, inputType?: string) => {
  if (inputType === 'datetime-local') {
    return formatDateTimeLocalValue(value);
  }
  return (value ?? '') as string | number;
};

function resolveWidget(widget: string): { widget: string; fixedCountry?: string } {
  const fixedCountry = SUBDIVISION_ALIASES[widget];
  if (fixedCountry) {
    return { widget: 'subdivision', fixedCountry };
  }
  return { widget };
}

function getSelectOptions(
  prop: JSONSchemaProperty,
): Array<{ value: string | number; label: string }> {
  const xui = prop['x-ui'];
  if (xui?.widget === 'prefecture' && !xui?.useIsoCode) {
    return PREFECTURE_OPTIONS;
  }
  if (xui?.options?.length) {
    return xui.options;
  }
  if (prop.enum?.length) {
    return prop.enum.map((value) => ({ value: value as string | number, label: String(value) }));
  }
  return [];
}

function hasNumericOption(options: Array<{ value: string | number }>) {
  return options.some((option) => typeof option.value === 'number');
}

function parseSelectValue(value: string, options: Array<{ value: string | number }>) {
  if (!hasNumericOption(options)) return value;
  const numeric = Number(value);
  return Number.isNaN(numeric) ? value : numeric;
}

function getRelationValueField(relation: RelatedFieldConfig) {
  return relation.valueField ?? 'id';
}

function getRelationLabelField(relation: RelatedFieldConfig) {
  return relation.displayField;
}

function getRelationItem(relation: RelatedFieldConfig, value: unknown) {
  if (value === undefined || value === null || value === '') return undefined;
  const valueField = getRelationValueField(relation);
  return relation.data.find((item) => String(item[valueField]) === String(value));
}

function getRelationLabel(relation: RelatedFieldConfig, value: unknown) {
  const item = getRelationItem(relation, value);
  if (!item) return undefined;
  const displayField = getRelationLabelField(relation);
  return item[displayField];
}

function getRelationSearchFields(relation: RelatedFieldConfig) {
  if (relation.searchFields?.length) return relation.searchFields;
  return [getRelationLabelField(relation), getRelationValueField(relation)];
}

interface ArrayFieldEditorProps {
  value: unknown[];
  onChange: (next: unknown[]) => void;
  itemType: string;
  disabled?: boolean;
  readOnly?: boolean;
}

function ArrayFieldEditor({
  value,
  onChange,
  itemType,
  disabled,
  readOnly,
}: ArrayFieldEditorProps) {
  const [newItemValue, setNewItemValue] = React.useState('');

  const handleRemoveItem = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleMoveItem = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= value.length) return;
    const updated = [...value];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    onChange(updated);
  };

  const handleAddItemWithValue = () => {
    if (!newItemValue.trim()) return;
    const valueToAdd =
      itemType === 'integer' || itemType === 'number' ? Number(newItemValue) : newItemValue;
    onChange([...value, valueToAdd]);
    setNewItemValue('');
  };

  return (
    <div className='space-y-3'>
      <div className='flex flex-wrap gap-2'>
        {value.length === 0 ? (
          <span className='text-sm text-muted-foreground'>（アイテムなし）</span>
        ) : (
          value.map((item, index) => (
            <Badge
              key={index}
              variant='outline'
              className='pl-3 pr-1.5 py-1 gap-1.5 text-sm rounded-sm'
            >
              {!disabled && !readOnly && value.length > 1 && (
                <span className='flex flex-col -my-0.5 mr-0.5'>
                  <button
                    type='button'
                    onClick={() => handleMoveItem(index, -1)}
                    disabled={index === 0}
                    className='text-[10px] leading-none text-muted-foreground hover:text-foreground disabled:opacity-30'
                  >
                    ▲
                  </button>
                  <button
                    type='button'
                    onClick={() => handleMoveItem(index, 1)}
                    disabled={index === value.length - 1}
                    className='text-[10px] leading-none text-muted-foreground hover:text-foreground disabled:opacity-30'
                  >
                    ▼
                  </button>
                </span>
              )}
              <span>{item === null || item === undefined ? '' : String(item)}</span>
              {!disabled && !readOnly && (
                <button
                  type='button'
                  onClick={() => handleRemoveItem(index)}
                  className='ml-0.5 rounded-full p-0.5 hover:bg-muted transition-colors'
                >
                  <span className='text-xs text-muted-foreground hover:text-foreground'>✕</span>
                </button>
              )}
            </Badge>
          ))
        )}
      </div>
      {!disabled && !readOnly && (
        <div className='flex items-center gap-2'>
          <Input
            type={itemType === 'integer' || itemType === 'number' ? 'number' : 'text'}
            value={newItemValue}
            onChange={(e) => setNewItemValue(e.target.value)}
            placeholder='新しいアイテムを入力...'
            className='flex-1 h-8'
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddItemWithValue();
              }
            }}
          />
          <Button type='button' variant='outline' size='sm' onClick={handleAddItemWithValue}>
            追加
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * AutoFormField (自動連携フォームフィールド)
 *
 * React Hook Form の `Controller` と `FieldFactory` を統合した高機能フィールドコンポーネントです。
 * 以下の2つのモードで動作します。
 *
 * 1. **マニュアルモード**: `label`, `type`, `description` などの props を直接指定して使用します。
 *    標準的なフォーム作成に適しています。
 *
 * 2. **スキーマモード**: `jsonSchema` prop を渡すことで、スキーマ定義に基づいてウィジェット（入力UI）を自動決定します。
 *    国選択、都道府県、リレーション検索などの複雑な UI もスキーマの `x-ui` 定義から自動生成されます。
 *
 * @example
 * ```tsx
 * // 1. マニュアルモード
 * <AutoFormField
 *   control={form.control}
 *   name="email"
 *   label="メールアドレス"
 *   type="email"
 *   description="公開されません"
 * />
 *
 * // 2. スキーマモード
 * <AutoFormField
 *   control={form.control}
 *   name="address.country"
 *   jsonSchema={schema.properties.country} // { type: "string", "x-ui": { widget: "country" } }
 * />
 * ```
 *
 * 入力には `control` / `name` に加えて、`FieldFactory` の props を受け取ります。
 * `relation` はリレーション検索設定、`showPlaceholderOnAll` はプレースホルダー表示挙動を制御します。
 * `isCreate` は新規作成フォームであることを示し、`id` フィールドの自動的なロック（読み取り専用化）を防ぎます。
 */
export const AutoFormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  control,
  name,
  relation,
  showPlaceholderOnAll,
  isCreate,
  ...props
}: {
  control: Control<TFieldValues>;
  name: TName;
  relation?: RelatedFieldConfig;
  showPlaceholderOnAll?: boolean;
  isCreate?: boolean;
} & React.ComponentProps<typeof FieldFactory>) => {
  // State for Relation Search
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  const property = props.jsonSchema;
  const xui = property?.['x-ui'] || {};

  // Smart Watch Logic (Only if schema is present)
  const dependsOnField = xui.dependsOn as Path<TFieldValues> | undefined;
  const countryField = xui.countryField as Path<TFieldValues> | undefined;

  const watchedDependsOn = useWatch({
    control,
    name: dependsOnField as Path<TFieldValues>,
    disabled: !dependsOnField,
  });
  const watchedCountry = useWatch({
    control,
    name: countryField as Path<TFieldValues>,
    disabled: !countryField,
  });

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        let controlNode: React.ComponentProps<typeof FieldFactory>['children'] = props.children;

        // If schema is present and no children provided, try to infer smart widget
        if (property && !controlNode) {
          const rawWidget = inferWidget(property);
          const { widget, fixedCountry } = resolveWidget(rawWidget);
          const placeholder = xui.placeholder || property.description;
          const selectOptions = getSelectOptions(property);
          const normalizedFieldName = String(name);
          const isUnitField =
            normalizedFieldName === 'unit' ||
            normalizedFieldName === 'unit_code' ||
            normalizedFieldName.endsWith('.unit') ||
            normalizedFieldName.endsWith('.unit_code');
          const allowCustomSelect = Boolean(xui.allowCustom || isUnitField);
          const labelText = xui?.label || property.title || String(name);

          const isAuditField = AUDIT_FIELD_NAMES.has(normalizedFieldName);
          const isImmutableIdField =
            !isCreate &&
            normalizedFieldName === 'id' &&
            field.value !== undefined &&
            field.value !== null &&
            field.value !== '';

          const disabled = Boolean(xui.disabled || props.disabled);
          const readOnly = Boolean(
            xui.readOnly || property.readOnly || isAuditField || isImmutableIdField,
          );

          // Default Input
          controlNode = (
            <Input
              type='text'
              placeholder={placeholder}
              disabled={disabled}
              readOnly={readOnly}
              {...field}
              value={toInputValue(field.value)}
            />
          );

          switch (widget) {
            case 'email':
              controlNode = (
                <Input
                  type='email'
                  placeholder={placeholder}
                  disabled={disabled}
                  readOnly={readOnly}
                  {...field}
                  value={toInputValue(field.value)}
                />
              );
              break;
            case 'password':
              controlNode = (
                <Input
                  type='password'
                  placeholder={placeholder}
                  disabled={disabled}
                  readOnly={readOnly}
                  {...field}
                  value={toInputValue(field.value)}
                />
              );
              break;
            case 'number':
              controlNode = (
                <Input
                  type='number'
                  placeholder={placeholder}
                  disabled={disabled}
                  readOnly={readOnly}
                  {...field}
                  value={field.value ?? ''}
                  onChange={(event) => {
                    const val = event.target.value;
                    field.onChange(val === '' ? '' : Number(val));
                  }}
                />
              );
              break;
            case 'date':
              controlNode = (
                <Input
                  type='date'
                  disabled={disabled}
                  readOnly={readOnly}
                  {...field}
                  value={toInputValue(field.value)}
                />
              );
              break;
            case 'time':
              controlNode = (
                <Input
                  type='time'
                  step={1}
                  placeholder={placeholder ?? 'HH:MM:SS'}
                  disabled={disabled}
                  readOnly={readOnly}
                  {...field}
                  value={toInputValue(field.value)}
                />
              );
              break;
            case 'datetime-local':
              controlNode = (
                <Input
                  type='datetime-local'
                  disabled={disabled}
                  readOnly={readOnly}
                  {...field}
                  value={toInputValue(field.value, 'datetime-local')}
                />
              );
              break;
            case 'checkbox':
              controlNode = (
                <Checkbox
                  disabled={disabled}
                  checked={Boolean(field.value)}
                  onCheckedChange={(checked: boolean | 'indeterminate') =>
                    field.onChange(Boolean(checked))
                  }
                />
              );
              break;
            case 'country':
              controlNode = (
                <Select
                  disabled={disabled}
                  value={
                    field.value === undefined || field.value === null || field.value === ''
                      ? undefined
                      : String(field.value)
                  }
                  onValueChange={field.onChange}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        showPlaceholderOnAll ? (placeholder ?? '国を選択') : (placeholder ?? '選択')
                      }
                    >
                      {(val: string | number | undefined | null) => {
                        if (
                          showPlaceholderOnAll &&
                          (val === undefined || val === null || val === '')
                        ) {
                          return (
                            <span className='text-muted-foreground'>
                              {placeholder ?? '国を選択'}
                            </span>
                          );
                        }
                        const match = COUNTRIES.find((c) => c.value === val);
                        return match ? match.label : (val as string | null);
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country.value} value={country.value}>
                        {country.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
              break;
            case 'subdivision': {
              const countryCode = fixedCountry || (watchedDependsOn as string) || undefined;
              const subdivisionOptions = countryCode
                ? getSubdivisions(countryCode)
                : Object.values(SUBDIVISIONS).flat();

              controlNode = (
                <Select
                  disabled={disabled}
                  value={
                    field.value === undefined || field.value === null || field.value === ''
                      ? undefined
                      : String(field.value)
                  }
                  onValueChange={field.onChange}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        showPlaceholderOnAll
                          ? (placeholder ?? '地域を選択')
                          : (placeholder ?? '選択')
                      }
                    >
                      {(val: string | number | undefined | null) => {
                        if (
                          showPlaceholderOnAll &&
                          (val === undefined || val === null || val === '')
                        ) {
                          return (
                            <span className='text-muted-foreground'>
                              {placeholder ?? '地域を選択'}
                            </span>
                          );
                        }
                        const match = subdivisionOptions.find((sub) => sub.value === val);
                        return match ? match.label : (val as string | null);
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {subdivisionOptions.map((sub) => (
                      <SelectItem key={sub.value} value={sub.value}>
                        {sub.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
              break;
            }
            case 'postalcode': {
              const postalCountry = (watchedCountry as string) || fixedCountry || 'JP';
              const postalConfig = POSTAL_PATTERNS[postalCountry];

              controlNode = (
                <Input
                  type='text'
                  inputMode='numeric'
                  placeholder={placeholder ?? postalConfig?.example}
                  disabled={disabled}
                  readOnly={readOnly}
                  {...field}
                  value={toInputValue(field.value)}
                  onBlur={(e) => {
                    if (postalCountry === 'JP') {
                      const formatted = formatJapanesePostalCode(e.target.value);
                      if (formatted !== e.target.value) {
                        field.onChange(formatted);
                      }
                    }
                    field.onBlur();
                  }}
                />
              );
              break;
            }
            case 'select':
              if (allowCustomSelect) {
                const dataAccessConfig = xui.searchSource
                  ? {
                      collection: xui.searchSource.collection,
                      idField: xui.searchSource.idField,
                      labelField: xui.searchSource.labelField,
                      descriptionField: xui.searchSource.descriptionField,
                      baseFilter: xui.searchSource.baseFilter,
                      limit: xui.searchSource.limit,
                      createEnabled: xui.searchSource.createEnabled,
                    }
                  : undefined;

                controlNode = (
                  <SearchableSelectInput
                    value={
                      field.value === undefined || field.value === null ? '' : String(field.value)
                    }
                    options={selectOptions.map((option) => ({
                      value: option.value,
                      label: String(option.label),
                    }))}
                    placeholder={placeholder ?? labelText}
                    disabled={disabled}
                    readOnly={readOnly}
                    inputRef={field.ref}
                    onBlur={field.onBlur}
                    allowCustomValue={true}
                    matchByLabel={true}
                    matchByValue={true}
                    debounceMs={
                      typeof xui.searchDebounceMs === 'number' ? xui.searchDebounceMs : 300
                    }
                    minSearchLength={
                      typeof xui.searchMinLength === 'number' ? xui.searchMinLength : 1
                    }
                    noOptionsMessage={
                      typeof xui.noOptionsMessage === 'string' ? xui.noOptionsMessage : undefined
                    }
                    createDialogTitle={
                      typeof xui.createDialogTitle === 'string' ? xui.createDialogTitle : undefined
                    }
                    createIdLabel={
                      typeof xui.createIdLabel === 'string' ? xui.createIdLabel : undefined
                    }
                    createNameLabel={
                      typeof xui.createNameLabel === 'string' ? xui.createNameLabel : undefined
                    }
                    dataAccessConfig={dataAccessConfig}
                    onValueChange={(raw) => {
                      const matchedByLabel = selectOptions.find(
                        (option) => String(option.label) === raw,
                      );
                      const resolvedValue = matchedByLabel ? String(matchedByLabel.value) : raw;
                      field.onChange(
                        raw === '' ? '' : parseSelectValue(resolvedValue, selectOptions),
                      );
                    }}
                  />
                );
              } else {
                controlNode = (
                  <Select
                    disabled={disabled}
                    value={
                      field.value === undefined || field.value === null || field.value === ''
                        ? undefined
                        : String(field.value)
                    }
                    onValueChange={(value) =>
                      field.onChange(value ? parseSelectValue(value, selectOptions) : '')
                    }
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          showPlaceholderOnAll
                            ? (placeholder ?? labelText)
                            : (placeholder ?? '選択')
                        }
                      >
                        {(val: string | number | undefined | null) => {
                          if (
                            showPlaceholderOnAll &&
                            (val === undefined || val === null || val === '')
                          ) {
                            return (
                              <span className='text-muted-foreground'>
                                {placeholder ?? labelText}
                              </span>
                            );
                          }
                          const match = selectOptions.find(
                            (option) => String(option.value) === String(val),
                          );
                          return match ? match.label : (val as string | null);
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {selectOptions.map((option) => (
                        <SelectItem key={String(option.value)} value={String(option.value)}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );
              }
              break;
            case 'textarea':
              controlNode = (
                <FieldControl render={<Textarea
                  placeholder={placeholder}
                  disabled={disabled}
                  readOnly={readOnly}
                  {...field}
                  value={toInputValue(field.value)}
                  style={{ minHeight: xui.style?.minHeight }}
                />} />
              );
              break;
            case 'array': {
              // Display array as a list of items
              const arrayValue: unknown[] = Array.isArray(field.value) ? field.value : [];
              const items = property.items as JSONSchemaProperty | undefined;
              const itemType = Array.isArray(items?.type)
                ? (items?.type[0] ?? 'string')
                : (items?.type ?? 'string');

              controlNode = (
                <ArrayFieldEditor
                  value={arrayValue}
                  onChange={field.onChange}
                  itemType={itemType}
                  disabled={disabled}
                  readOnly={readOnly}
                />
              );
              break;
            }
          }

          // Relation Logic
          const hasRelation = Boolean(relation);
          if (hasRelation && relation) {
            const relationValueField = getRelationValueField(relation);
            const relationLabelField = getRelationLabelField(relation);
            const relationLabel = getRelationLabel(relation, field.value);
            const relationInputDisplay = relation.inputDisplay ?? 'key';
            const relationInputVariant = relation.inputVariant ?? 'input';
            const relationSearchMode = relation.searchMode ?? 'dialog';
            const relationHasValue =
              field.value !== undefined && field.value !== null && field.value !== '';
            const relationItem = getRelationItem(relation, field.value);
            const relationMissing = relation.validateKey && relationHasValue && !relationItem;
            const relationNumeric = relation.data.some(
              (item: Record<string, unknown>) => typeof item[relationValueField] === 'number',
            );
            const searchFields = getRelationSearchFields(relation);
            const searchResults = searchQuery
              ? relation.data.filter((item: Record<string, unknown>) => {
                  const lowerQuery = searchQuery.toLowerCase();
                  return searchFields.some((fieldName: string) => {
                    const value = item[fieldName];
                    if (value === undefined || value === null) return false;
                    return String(value).toLowerCase().includes(lowerQuery);
                  });
                })
              : [];

            const keyInput = (
              <Input
                type='text'
                placeholder={placeholder}
                disabled={disabled}
                readOnly={readOnly}
                {...field}
                value={toInputValue(field.value)}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  const val = event.target.value;
                  const parsed = relationNumeric && val !== '' ? Number(val) : val;
                  field.onChange(parsed);
                }}
              />
            );

            const labelInput = (
              <Input
                type='text'
                placeholder={placeholder}
                disabled={disabled}
                readOnly={true} // Label is always readOnly in relation
                value={relationLabel ? String(relationLabel) : ''}
              />
            );

            const relationHeader = relation.searchTitle ?? labelText;

            const resultsList = (
              <div className='max-h-96 overflow-y-auto space-y-2 pr-2'>
                {!searchQuery ? (
                  <div className='text-sm text-muted-foreground p-4 text-center'>
                    検索キーワードを入力してください
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className='text-sm text-muted-foreground p-4 text-center'>結果なし</div>
                ) : (
                  searchResults.map((item: Record<string, unknown>) => {
                    const keyValue = item[relationValueField];
                    const displayValue = item[relationLabelField];
                    return (
                      <button
                        key={String(keyValue)}
                        type='button'
                        className='w-full text-left rounded-md px-3 py-2 text-sm hover:bg-accent'
                        onClick={() => {
                          field.onChange(keyValue);
                          setSearchOpen(false);
                        }}
                      >
                        <div className='font-medium'>{String(displayValue)}</div>
                        <div className='text-xs text-muted-foreground'>{String(keyValue)}</div>
                      </button>
                    );
                  })
                )}
              </div>
            );

            const searchPanel = (
              <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
                <DialogTrigger
                  render={<Button type='button' variant='outline' size='sm' disabled={disabled} />}
                >
                  検索
                </DialogTrigger>
                <DialogContent
                  className={
                    relationSearchMode === 'rightpane'
                      ? 'left-auto right-0 top-0 translate-x-0 translate-y-0 h-full max-w-md w-full rounded-none border-l'
                      : ''
                  }
                >
                  <DialogHeader>
                    <DialogTitle>{relationHeader}</DialogTitle>
                  </DialogHeader>
                  <div className='space-y-4'>
                    <Input
                      placeholder='検索...'
                      value={searchQuery}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        setSearchQuery(event.target.value)
                      }
                    />
                    {resultsList}
                  </div>
                </DialogContent>
              </Dialog>
            );

            controlNode = (
              <div className='space-y-2'>
                <div className='flex items-center gap-2'>
                  {relationInputDisplay === 'text' ? labelInput : keyInput}
                  {searchPanel}
                </div>
                {relationInputDisplay === 'both' && relationInputVariant === 'label' ? (
                  <div className='text-sm font-medium text-muted-foreground px-1'>
                    {relationLabel ? String(relationLabel) : ''}
                  </div>
                ) : relationInputDisplay === 'both' ? (
                  <div className='max-w-sm'>
                    <Input
                      type='text'
                      readOnly
                      value={relationLabel ? String(relationLabel) : ''}
                    />
                  </div>
                ) : null}
                {relationInputDisplay === 'text' ? (
                  <input type='hidden' {...field} value={toInputValue(field.value)} />
                ) : null}
                {relationMissing ? (
                  <p className='text-sm text-destructive'>見つかりません</p>
                ) : null}
              </div>
            );
          }
        }

        return (
          <FieldFactory
            {...props}
            // If schema is present but field spec is missing, default to the form field name
            field={props.schema && !props.field ? name : props.field}
            // If we are trying to just pass field to inputProps in legacy mode, we do it here
            // But if we generated controlNode (Smart Mode), we already spread ...field into it.
            // However, FieldFactory might ALSO render an input if we didn't pass children.
            // If we generated controlNode, we pass it as children.
            // If props.children was passed, we use that.
            inputProps={
              !controlNode ? { ...props.inputProps, ...field } : { name, ...props.inputProps }
            }
            // Pass error message derived from fieldState
            error={fieldState.error?.message}
            invalid={fieldState.invalid}
          >
            {controlNode}
          </FieldFactory>
        );
      }}
    />
  );
};
AutoFormField.displayName = 'AutoFormField';
