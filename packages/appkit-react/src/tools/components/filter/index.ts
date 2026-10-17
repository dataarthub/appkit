/**
 * フィルターモジュール。
 *
 * スキーマベースのフィルタリングUIとクエリビルダーを提供します。
 *
 * @example
 * // With UI component
 * import { SchemaFilter, CollectionSchema } from '@alneas/appkit-react/tools/filter';
 *
 * const schema: CollectionSchema = {
 *   name: { type: 'string', label: '名前' },
 *   age: { type: 'number', label: '年齢' },
 * };
 *
 * <SchemaFilter
 *   schema={schema}
 *   fields={['name', { field: 'age', operator: 'range' }]}
 *   onChange={(filter) => console.log(filter)}
 * />
 *
 * @example
 * // Headless (query builder only)
 * import { useFilter } from '@alneas/appkit-react/tools/filter';
 *
 * const { filter, setField } = useFilter({
 *   schema,
 *   fields: ['name', 'status'],
 * });
 */

// Types
export type {
  FilterFieldType,
  FieldSchema,
  CollectionSchema,
  FilterOperator,
  FilterOption,
  FilterFieldConfig,
  FilterFieldSpec,
  RangeValue,
  FilterValue,
  FilterValues,
  FilterResult,
  ResolvedFilterField,
  UseFilterOptions,
  FilterProps,
} from './filter-types';

// Helper functions
export { getDefaultOperator, resolveFilterField } from './filter-types';

// Hook
export { useFilter, createFieldsFromSchema, valueToQuery } from './use-filter';
export type { UseFilterReturn } from './use-filter';

// Components
export {
  FilterText,
  FilterNumber,
  FilterSelect,
  FilterDate,
  FilterCheckbox,
  FilterRadio,
  FilterInput,
} from './filter-inputs';

export { SchemaFilter } from './filter';

export { QueryBuilderFilter } from './query-builder';
export type { QueryCondition, QueryBuilderFilterProps } from './query-builder';

export { ActiveFilters } from './active-filters';
export type { ActiveFiltersProps } from './active-filters';
