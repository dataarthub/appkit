/**
 * @fileoverview フィルター状態管理フック
 *
 * ヘッドレスなフィルター状態管理とMongoDBスタイルのクエリ生成を提供します。
 * UI無しでもクエリビルダーとして使用できます。
 *
 * @module filter/use-filter
 */

import { useState, useMemo, useCallback, useEffect, useEffectEvent, useRef } from 'react';
import {
  CollectionSchema,
  FilterResult,
  FilterFieldSpec,
  FilterValue,
  FilterValues,
  RangeValue,
  ResolvedFilterField,
  resolveFilterField,
  UseFilterOptions,
} from './filter-types';

// =============================================================================
// Types
// =============================================================================

/**
 * useFilterフックの戻り値
 * Return type for the useFilter hook
 */
export interface UseFilterReturn {
  /** 現在のフィルター値 / Current filter values */
  values: FilterValues;
  /** MongoDBスタイルのフィルターオブジェクト / MongoDB-style filter object */
  filter: FilterResult;
  /** 解決済みフィールド定義 / Resolved field definitions */
  fields: ResolvedFilterField[];
  /** 単一フィールドの値を設定 / Set value for a single field */
  setField: (field: string, value: FilterValue) => void;
  /** 複数フィールドの値を設定 / Set multiple field values */
  setValues: (values: Partial<FilterValues>) => void;
  /** フィルターをリセット / Reset filter to defaults */
  reset: () => void;
  /** フィルターが空かどうか / Check if filter is empty */
  isEmpty: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * フィルター値をMongoDBスタイルのクエリに変換する
 * Converts a filter value to MongoDB-style query format
 *
 * @param {ResolvedFilterField} field - フィールド定義 / Field definition
 * @param {FilterValue} value - フィルター値 / Filter value
 * @returns {unknown} MongoDBクエリ値 / MongoDB query value
 */
export function valueToQuery(field: ResolvedFilterField, value: FilterValue): unknown {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  const { type, operator } = field;

  // Boolean: return as-is
  if (type === 'boolean') {
    return value;
  }

  // Array type (checkbox multi): use $in
  if (type === 'array' && Array.isArray(value)) {
    if (value.length === 0) return undefined;
    return { $in: value };
  }

  // String operators: use $regex
  if (type === 'string' && typeof value === 'string') {
    if (!value.trim()) return undefined;

    if (operator === 'contains') {
      return { $regex: value, $options: 'i' };
    }
    if (operator === 'startsWith') {
      return { $regex: `^${value}`, $options: 'i' };
    }
    if (operator === 'endsWith') {
      return { $regex: `${value}$`, $options: 'i' };
    }
    // If 'eq', it falls through to the default exact match at the end
  }

  // Range operator for number/date
  if (
    operator === 'range' &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  ) {
    const range = value as RangeValue<number | Date>;
    const query: Record<string, unknown> = {};
    if (range.min !== undefined && range.min !== null) {
      query.$gte = range.min;
    }
    if (range.max !== undefined && range.max !== null) {
      query.$lte = range.max;
    }
    return Object.keys(query).length > 0 ? query : undefined;
  }

  // Default: exact match
  return value;
}

/**
 * フィルター値が空かどうかを判定する
 * Checks if a filter value is considered empty
 *
 * @param {FilterValue} value - フィルター値 / Filter value
 * @returns {boolean} 空の場合true / True if empty
 */
function isValueEmpty(value: FilterValue): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'object' && !(value instanceof Date)) {
    const range = value as RangeValue<unknown>;
    return range.min === undefined && range.max === undefined;
  }
  return false;
}

/**
 * デフォルト値マップを構築する
 * Builds the default values map from field definitions
 *
 * @param {ResolvedFilterField[]} fields - フィールド定義 / Field definitions
 * @param {FilterValues} [userDefaults] - ユーザー指定のデフォルト値 / User-provided defaults
 * @returns {FilterValues} デフォルト値マップ / Default values map
 */
function buildDefaultValues(
  fields: ResolvedFilterField[],
  userDefaults?: FilterValues,
): FilterValues {
  const defaults: FilterValues = {};

  for (const field of fields) {
    defaults[field.field] = field.defaultValue ?? userDefaults?.[field.field] ?? undefined;
  }

  return { ...defaults, ...userDefaults };
}

// =============================================================================
// Hook
// =============================================================================

/**
 * フィルター状態管理フック
 * Headless hook for managing filter state and generating MongoDB queries
 *
 * スキーマから型を推論し、MongoDBスタイルのフィルターオブジェクトを生成します。
 * UI無しでクエリビルダーとして使用することもできます。
 *
 * @remarks Filter changes call the latest committed onChange callback. Replacing only
 * the callback does not replay an unchanged filter; deep-equal queries are deduplicated.
 *
 * @param {UseFilterOptions} options - フックオプション / Hook options
 * @returns {UseFilterReturn} フィルター状態とアクション / Filter state and actions
 *
 * @example
 * // Basic usage with schema
 * const { filter, values, setField, reset } = useFilter({
 *   schema: userSchema,
 *   fields: ['name', 'age', 'status'],
 * });
 *
 * // Use filter with useFind
 * const { data } = useFind('users', filter);
 *
 * @example
 * // With operator overrides
 * const { filter } = useFilter({
 *   schema: userSchema,
 *   fields: [
 *     'name',
 *     { field: 'age', operator: 'range' },
 *     { field: 'createdAt', operator: 'range' },
 *   ],
 * });
 *
 * @example
 * // Headless query builder (no UI)
 * const { filter, setField } = useFilter({
 *   fields: [
 *     { field: 'status', operator: 'eq' },
 *   ],
 * });
 * setField('status', 'active');
 * // filter = { status: 'active' }
 */
export function useFilter(options: UseFilterOptions): UseFilterReturn {
  const { schema, fields: fieldSpecs, defaultValues: userDefaults, onChange } = options;

  // Stabilize fieldSpecs to avoid unnecessary re-resolving
  const currentFieldSpecsStr = useMemo(() => JSON.stringify(fieldSpecs), [fieldSpecs]);
  const [stabilizedFieldSpecs, setStabilizedFieldSpecs] = useState(fieldSpecs);
  const [prevFieldSpecsStr, setPrevFieldSpecsStr] = useState(currentFieldSpecsStr);

  if (currentFieldSpecsStr !== prevFieldSpecsStr) {
    setStabilizedFieldSpecs(fieldSpecs);
    setPrevFieldSpecsStr(currentFieldSpecsStr);
  }

  // Resolve field specifications
  const resolvedFields = useMemo(() => {
    return stabilizedFieldSpecs.map((spec) => resolveFilterField(spec, schema));
  }, [stabilizedFieldSpecs, schema]);

  // Build default values
  const defaultValues = useMemo(() => {
    return buildDefaultValues(resolvedFields, userDefaults);
  }, [resolvedFields, userDefaults]);

  // Filter values state
  const [values, setValuesState] = useState<FilterValues>(defaultValues);

  // Sync state if userDefaults changes (from parent component)
  const prevUserDefaultsRef = useRef(userDefaults);
  useEffect(() => {
    if (JSON.stringify(userDefaults) !== JSON.stringify(prevUserDefaultsRef.current)) {
      setValuesState(buildDefaultValues(resolvedFields, userDefaults));
    }
    prevUserDefaultsRef.current = userDefaults;
  }, [userDefaults, resolvedFields]);

  // Generate MongoDB-style filter
  const rawFilter = useMemo(() => {
    const result: FilterResult = {};

    for (const field of resolvedFields) {
      const value = values[field.field];
      const queryValue = valueToQuery(field, value);

      if (queryValue !== undefined) {
        result[field.field] = queryValue;
      }
    }

    return result;
  }, [values, resolvedFields]);

  const filterJson = JSON.stringify(rawFilter);
  const filter = useMemo(() => {
    return JSON.parse(filterJson);
  }, [filterJson]);

  // Check if filter is empty
  const isEmpty = useMemo(() => {
    return resolvedFields.every((field) => isValueEmpty(values[field.field]));
  }, [values, resolvedFields]);

  const onFilterChange = useEffectEvent((nextFilter: FilterResult) => {
    onChange?.(nextFilter);
  });

  // Trigger onChange callback when filter changes, preventing loops with deep comparison ref
  const lastSentFilterRef = useRef<FilterResult>({});
  useEffect(() => {
    if (JSON.stringify(filter) !== JSON.stringify(lastSentFilterRef.current)) {
      lastSentFilterRef.current = filter;
      onFilterChange(filter);
    }
  }, [filter]);

  // Set single field value
  const setField = useCallback((field: string, value: FilterValue) => {
    setValuesState((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  // Set multiple field values
  const setValues = useCallback((newValues: Partial<FilterValues>) => {
    setValuesState((prev) => ({
      ...prev,
      ...newValues,
    }));
  }, []);

  // Reset to default values
  const reset = useCallback(() => {
    setValuesState(defaultValues);
  }, [defaultValues]);

  return {
    values,
    filter,
    fields: resolvedFields,
    setField,
    setValues,
    reset,
    isEmpty,
  };
}

// =============================================================================
// Utility Exports
// =============================================================================

/**
 * スキーマからフィルターフィールドを自動生成する
 * Auto-generates filter fields from a schema
 *
 * @param {CollectionSchema} schema - コレクションスキーマ / Collection schema
 * @param {string[]} [include] - 含めるフィールド / Fields to include (all if not specified)
 * @param {string[]} [exclude] - 除外するフィールド / Fields to exclude
 * @returns {FilterFieldSpec[]} フィルターフィールド配列 / Filter field specifications
 *
 * @example
 * const fields = createFieldsFromSchema(userSchema, ['name', 'age', 'status']);
 */
export function createFieldsFromSchema(
  schema: CollectionSchema,
  include?: string[],
  exclude?: string[],
): FilterFieldSpec[] {
  const keys = include || Object.keys(schema);
  const excludeSet = new Set(exclude || []);

  return keys.filter((key) => !excludeSet.has(key) && schema[key]).map((key) => key);
}
