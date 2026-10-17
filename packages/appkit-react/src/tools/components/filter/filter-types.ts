/**
 * @fileoverview フィルターコンポーネントの型定義
 *
 * スキーマベースのフィールド型推論とMongoDBスタイルのフィルター出力を提供します。
 *
 * @module filter/filter-types
 */

import type { Locale } from 'date-fns';

// =============================================================================
// Schema Types
// =============================================================================

/**
 * フィールドのデータ型
 * Field data types
 */
export type FilterFieldType = 'string' | 'number' | 'boolean' | 'date' | 'array' | 'enum';

/**
 * フィールドスキーマ定義
 * Schema definition for a single field
 *
 * @typedef {Object} FieldSchema
 * @property {FieldType} type - フィールドの型 / Field data type
 * @property {string[]} [enum] - enum型の選択肢 / Enum options
 * @property {string} [label] - 表示ラベル / Display label
 */
export interface FieldSchema {
  /** フィールドの型 / Field data type */
  type: FilterFieldType;
  /** enum型の選択肢 / Available options for enum type */
  enum?: readonly string[];
  /** 表示ラベル / Display label for the field */
  label?: string;
}

/**
 * コレクションスキーマ
 * Schema definition for a collection/table
 *
 * @example
 * const userSchema: CollectionSchema = {
 *   name: { type: 'string', label: '名前' },
 *   age: { type: 'number', label: '年齢' },
 *   isActive: { type: 'boolean', label: '有効' },
 *   status: { type: 'enum', enum: ['active', 'inactive'], label: '状態' },
 * };
 */
export type CollectionSchema = Record<string, FieldSchema>;

// =============================================================================
// Filter Field Types
// =============================================================================

/**
 * フィルター演算子
 * Filter operators for different behaviors
 *
 * @typedef {'eq' | 'contains' | 'startsWith' | 'endsWith' | 'range'} FilterOperator
 * - `eq`: 完全一致 / Exact match
 * - `contains`: 部分一致 / Partial match (for strings)
 * - `startsWith`: 前方一致 / Starts with (for strings)
 * - `endsWith`: 後方一致 / Ends with (for strings)
 * - `range`: 範囲指定 / Range (for numbers and dates)
 */
export type FilterOperator = 'eq' | 'contains' | 'startsWith' | 'endsWith' | 'range';

/**
 * フィルターオプション（select/radio/checkbox用）
 * Option for select, radio, and checkbox filters
 */
export interface FilterOption {
  /** 値 / Value */
  value: string | number;
  /** 表示ラベル / Display label */
  label: string;
}

/**
 * フィルターフィールド設定
 * Detailed configuration for a filter field
 *
 * @typedef {Object} FilterFieldConfig
 * @property {string} field - DBフィールド名 / Database field name
 * @property {FilterOperator} [operator] - 演算子のオーバーライド / Override default operator
 * @property {string} [label] - ラベルのオーバーライド / Override schema label
 * @property {FilterOption[]} [options] - 選択肢 / Options for enum/array
 * @property {string} [placeholder] - プレースホルダー / Placeholder text
 * @property {any} [defaultValue] - デフォルト値 / Default value
 */
export interface FilterFieldConfig {
  /** DBフィールド名 / Database field name */
  field: string;
  /** フィールド型のオーバーライド / Override field type */
  type?: FilterFieldType;
  /** 演算子のオーバーライド / Override default operator */
  operator?: FilterOperator;
  /** ラベルのオーバーライド / Override schema label */
  label?: string;
  /** 選択肢（enum/array用） / Options for enum/array types */
  options?: FilterOption[];
  /** プレースホルダー / Placeholder text */
  placeholder?: string;
  defaultValue?: FilterValue;
  /** デバウンスのディレイ時間 (ms) / Debounce delay in milliseconds */
  debounceMs?: number;
  /** ラベルの位置 / Label position override */
  labelPosition?: 'top' | 'left' | 'responsive' | 'none';
  /** ラベルの固定幅 / Fixed width override */
  labelWidth?: string | number;
  /** 上部境界にラベルを表示 / Overlapping label override */
  overlappingLabel?: boolean;
  /** 未選択時にラベルをプレースホルダーとして表示フラグ / Show label as placeholder when the field value is empty */
  showPlaceholderOnAll?: boolean;
  /** クラス名 / Additional CSS classes for the input */
  className?: string;
}

/**
 * フィルターフィールド指定
 * Filter field specification - simple string or detailed config
 *
 * @typedef {string | FilterFieldConfig} FilterFieldSpec
 *
 * @example
 * // Simple: field name only (uses schema defaults)
 * 'name'
 *
 * @example
 * // Detailed: with operator override
 * { field: 'age', operator: 'range', label: '年齢範囲' }
 */
export type FilterFieldSpec = string | FilterFieldConfig;

// =============================================================================
// Filter Value Types
// =============================================================================

/**
 * 範囲値（number/date用）
 * Range value for number and date filters
 */
export interface RangeValue<T = number | Date> {
  /** 最小値 / Minimum value */
  min?: T;
  /** 最大値 / Maximum value */
  max?: T;
}

/**
 * フィルター値のユニオン型
 * Union type for all possible filter values
 */
export type FilterValue =
  | string
  | number
  | boolean
  | Date
  | string[]
  | number[]
  | (string | number)[]
  | RangeValue<number>
  | RangeValue<Date>
  | null
  | undefined;

/**
 * フィルター値のマップ
 * Map of field names to filter values
 */
export type FilterValues = Record<string, FilterValue>;

// =============================================================================
// MongoDB Filter Output Types
// =============================================================================

/**
 * MongoDBスタイルのフィルターオブジェクト
 * MongoDB-style filter object for use with useFind
 */
export type FilterResult = Record<string, unknown>;

/**
 * 解決済みフィルターフィールド（内部用）
 * Resolved filter field with all properties filled
 * @internal
 */
export interface ResolvedFilterField {
  /** フィールド名 / Field name */
  field: string;
  /** 表示ラベル / Display label */
  label: string;
  /** フィールド型 / Field type from schema */
  type: FilterFieldType;
  /** 演算子 / Operator to use */
  operator: FilterOperator;
  /** 選択肢 / Options for enum/array */
  options?: FilterOption[];
  /** プレースホルダー / Placeholder */
  placeholder?: string;
  defaultValue?: FilterValue;
  /** 解決済みデバウンスのディレイ時間 (ms) / Resolved debounce delay in milliseconds */
  debounceMs?: number;
  /** 解決済みラベル位置 / Resolved label position */
  labelPosition: 'top' | 'left' | 'responsive' | 'none';
  /** 解決済みラベル幅 / Resolved label width */
  labelWidth?: string | number;
  /** 解決済み重複ラベルフラグ / Resolved overlapping label flag */
  overlappingLabel?: boolean;
  /** 未選択時にラベルを表示フラグ / Resolved show placeholder on all flag */
  showPlaceholderOnAll?: boolean;
  /** クラス名 / Additional CSS classes for the input */
  className?: string;
}

// =============================================================================
// Hook Options
// =============================================================================

/**
 * useFilterフックのオプション
 * Options for the useFilter hook
 */
export interface UseFilterOptions {
  /** コレクションスキーマ / Collection schema for type inference */
  schema?: CollectionSchema;
  /** フィルターフィールド指定 / Filter field specifications */
  fields: FilterFieldSpec[];
  /** デフォルト値 / Default values for fields */
  defaultValues?: FilterValues;
  /** 変更時のコールバック / Callback when filter changes */
  onChange?: (filter: FilterResult) => void;
  /** グローバルデバウンス時間 (ms) / Global debounce delay in milliseconds */
  debounceMs?: number;
}

// =============================================================================
// Component Props
// =============================================================================

/**
 * Filterコンポーネントのプロパティ
 * Props for the Filter component
 *
 * ## AI/Automation Features
 * - `testId`: Stable selector on container and buttons
 * - Pattern: `{testId}`, `{testId}-apply`, `{testId}-reset`
 */
export interface FilterProps extends UseFilterOptions {
  /** AI/E2E Test用の安定ID / Stable test identifier */
  testId?: string;
  /** レイアウト / Layout mode */
  layout?: 'inline' | 'grid';
  /** 自動適用 / Apply filter on every change */
  autoApply?: boolean;
  /** 変更時のコールバック / Callback when filter changes */
  onChange?: (filter: FilterResult) => void;
  /** 適用ボタンのラベル / Apply button label */
  applyLabel?: string;
  /** リセットボタンのラベル / Reset button label */
  resetLabel?: string;
  /** クラス名 / Additional CSS classes */
  className?: string;
  /** ラベルの位置 / Global label position */
  labelPosition?: 'top' | 'left' | 'responsive' | 'none';
  /** ラベルの固定幅（leftポジション時） / Global fixed width for label */
  labelWidth?: string | number;
  /** noneポジション時に上部境界にラベルを表示 / Global overlapping label setting */
  overlappingLabel?: boolean;
  /** 未選択時にラベルをプレースホルダーとして表示（グローバル設定） / Global show label as placeholder when empty setting */
  showPlaceholderOnAll?: boolean;
  /** 各入力要素に適用するクラス名（グローバル設定） / Global class for all inputs */
  inputClassName?: string;
  /** ロケール（日付ピッカー用） / Locale object (for date pickers) */
  locale?: Locale;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * スキーマ型からデフォルト演算子を取得する
 * Gets the default operator for a schema field type
 *
 * @param {FilterFieldType} type - フィールド型 / Field type
 * @returns {FilterOperator} デフォルト演算子 / Default operator
 *
 * - string → contains (部分一致)
 * - number → eq (完全一致)
 * - date → eq (完全一致)
 * - その他 → eq
 */
export function getDefaultOperator(type: FilterFieldType): FilterOperator {
  switch (type) {
    case 'string':
      return 'contains';
    case 'number':
    case 'date':
    case 'boolean':
    case 'enum':
    case 'array':
    default:
      return 'eq';
  }
}

/**
 * フィールド指定を解決済みフィールドに変換する
 * Resolves a field spec to a complete filter field definition
 *
 * @param {FilterFieldSpec} spec - フィールド指定 / Field specification
 * @param {CollectionSchema} [schema] - スキーマ / Collection schema
 * @returns {ResolvedFilterField} 解決済みフィールド / Resolved field
 */
export function resolveFilterField(
  spec: FilterFieldSpec,
  schema?: CollectionSchema,
): ResolvedFilterField {
  const fieldName = typeof spec === 'string' ? spec : spec.field;
  const config = typeof spec === 'string' ? ({} as FilterFieldConfig) : spec;
  const schemaField = schema?.[fieldName];

  const type: FilterFieldType = config.type || schemaField?.type || 'string';
  const defaultOperator = getDefaultOperator(type);

  // Build options from schema enum if not provided
  let options = config.options;
  if (!options && schemaField?.enum) {
    options = schemaField.enum.map((val) => ({ value: val, label: val }));
  }

  return {
    field: fieldName,
    label: config.label || schemaField?.label || fieldName,
    type,
    operator: config.operator || defaultOperator,
    options,
    placeholder: config.placeholder,
    defaultValue: config.defaultValue,
    debounceMs: config.debounceMs,
    labelPosition: config.labelPosition || 'responsive',
    labelWidth: config.labelWidth,
    overlappingLabel: config.overlappingLabel,
    showPlaceholderOnAll: config.showPlaceholderOnAll,
    className: config.className,
  };
}
