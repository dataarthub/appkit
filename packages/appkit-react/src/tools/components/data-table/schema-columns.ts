/**
 * @fileoverview Schema-driven column generation utilities
 *
 * Converts JSON Schema with x-ui extensions to TableHeadBase format
 * for use with createColumnsFromHeads.
 *
 * @module data-table/schema-columns
 */

import type { JSONSchema, JSONSchemaProperty } from '../../lib/schema/types';
import type { TableHeadBase, CellType } from './table-utils';

/**
 * JSON Schema x-ui extension interface
 */
export interface XUIExtension {
  label?: string;
  hidden?: boolean;
  widget?: string;
  placeholder?: string;
  help?: string;
  options?: Record<string | number, string> | { label: string; value: string | number }[];
  suffix?: string;
  prefix?: string;
  // Table-specific
  columnWidth?: number;
  sortable?: boolean;
  filterable?: boolean;
  // Cell display
  format?: string;
  link?: {
    to: string;
    params?: Record<string, string>;
  };
  badge?: {
    colors: Record<string, string>;
  };
}

/**
 * JSON Schema property with extensions
 */
export interface SchemaProperty extends Omit<JSONSchemaProperty, 'type' | 'x-ui' | 'x-db' | 'x-codelist' | 'items'> {
  type?: string | string[];
  'x-ui'?: XUIExtension;
  'x-db'?: Record<string, unknown> | JSONSchemaProperty['x-db'];
  'x-codelist'?: { id: string; labelField?: string };
  items?: SchemaProperty | { $ref: string };
}

/**
 * JSON Schema with x-ui extensions
 */
export interface JSONSchemaWithUI extends Omit<JSONSchema, 'type' | 'properties' | '$defs'> {
  type?: string | string[];
  properties?: Record<string, SchemaProperty>;
  $defs?: Record<string, JSONSchemaWithUI>;
}

/**
 * Options for schema-to-columns conversion
 */
export interface SchemaToColumnsOptions {
  /** Fields to include (if omitted, all fields are included) */
  include?: string[];
  /** Fields to exclude */
  exclude?: string[];
  /** If true, include all fields including hidden ones (use with getSchemaColumnVisibility) */
  showAll?: boolean;
  /** Custom overrides for specific fields */
  overrides?: Record<string, Partial<TableHeadBase>>;
  /** Options maps for enum/codelist fields */
  optionsMaps?: Record<string, Record<string | number, string>>;
}

/**
 * Map JSON Schema type/format to CellType
 */
function mapSchemaTypeToCellType(prop: SchemaProperty): CellType {
  const { type, format } = prop;
  const widget = prop['x-ui']?.widget;

  // Widget-based mapping
  if (widget === 'checkbox') return 'Boolean' as CellType;
  if (widget === 'date') return 'Date';
  if (widget === 'time') return 'Time';

  // Format-based mapping
  if (format === 'date') return 'Date';
  if (format === 'date-time') return 'Date';
  if (format === 'time') return 'Time';

  // Type-based mapping
  const types = Array.isArray(type) ? type : [type];
  if (!prop.enum && (types.includes('number') || types.includes('integer'))) return 'Number';
  if (types.includes('boolean')) return 'Boolean' as CellType;
  if (type === 'array') return 'Array';

  // Enum mapping
  if (prop.enum) return 'Option';

  // Default
  return 'String';
}

/**
 * JSON Schemaのプロパティ定義をTableHeadBase配列に変換する
 * Convert JSON Schema properties to TableHeadBase array
 *
 * @param schema - x-ui拡張を含むJSONスキーマ / JSON Schema with x-ui extensions
 * @param options - 変換オプション / Conversion options
 * @returns TableHeadBase定義の配列 / Array of TableHeadBase definitions
 *
 * @example
 * ```tsx
 * import { schemaToTableHeads, createColumnsFromHeads } from '@alneas/appkit-react/tools/data-table';
 * const schema = { type: 'object', properties: { name: { type: 'string', title: 'Name' } } };
 *
 * const heads = schemaToTableHeads(schema, {
 *   include: ['name', 'email', 'phone', 'is_customer', 'is_vendor'],
 *   optionsMaps: {
 *     type: { customer: '顧客', vendor: '仕入先' }
 *   }
 * });
 *
 * const columns = createColumnsFromHeads(heads);
 * ```
 */
export function schemaToTableHeads(
  schema: JSONSchemaWithUI,
  options: SchemaToColumnsOptions = {},
): TableHeadBase[] {
  const { include, exclude = [], showAll = false, overrides = {}, optionsMaps = {} } = options;
  const properties = schema.properties || {};

  // Determine which fields to process
  let fields = Object.keys(properties);

  if (include) {
    // Use specified order
    fields = include.filter((f) => properties[f]);
  } else if (!showAll) {
    // Filter out hidden fields (unless showAll is true)
    fields = fields.filter((field) => {
      const prop = properties[field];
      return !prop['x-ui']?.hidden;
    });
  }

  // Apply exclusions
  fields = fields.filter((f) => !exclude.includes(f));

  return fields.map((field) => {
    const prop = properties[field];
    const xui = prop['x-ui'] || {};
    const override = overrides[field] || {};

    // Determine options from enum or codelist
    let fieldOptions: Record<string | number, string> | undefined;

    if (optionsMaps[field]) {
      fieldOptions = optionsMaps[field];
    } else if (xui.options) {
      fieldOptions = Array.isArray(xui.options) ? Object.fromEntries(xui.options.map(option => [option.value, option.label])) : xui.options;
    } else if (prop.enum) {
      // Auto-generate options from enum
      fieldOptions = prop.enum.reduce(
        (acc, val) => {
          if (typeof val === 'string' || typeof val === 'number') acc[val] = String(val);
          return acc;
        },
        {} as Record<string | number, string>,
      );
    }

    const head: TableHeadBase = {
      field,
      text: xui.label || prop.title || prop.description || field,
      type: mapSchemaTypeToCellType(prop),
      options: fieldOptions,
      enableSorting: xui.sortable !== false,
      ...override,
    };

    return head;
  });
}

/**
 * スキーマからフィールドラベルを取得する
 * Get field labels from schema
 *
 * @param schema - JSONスキーマ / JSON Schema
 * @param fields - 取得するフィールド（省略時は全フィールド）/ Fields to get (optional)
 * @returns フィールド名とラベルのマッピング / Field name to label mapping
 */
export function getSchemaLabels(
  schema: JSONSchemaWithUI,
  fields?: string[],
): Record<string, string> {
  const properties = schema.properties || {};
  const targetFields = fields || Object.keys(properties);

  return targetFields.reduce(
    (acc, field) => {
      const prop = properties[field];
      if (prop) {
        acc[field] = prop['x-ui']?.label || prop.title || prop.description || field;
      }
      return acc;
    },
    {} as Record<string, string>,
  );
}

/**
 * スキーマから必須フィールドを取得する
 * Get required fields from schema
 */
export function getSchemaRequired(schema: JSONSchemaWithUI): string[] {
  return schema.required || [];
}

/**
 * スキーマからデフォルト値を取得する
 * Get field default values from schema
 */
export function getSchemaDefaults(schema: JSONSchemaWithUI): Record<string, unknown> {
  const properties = schema.properties || {};

  return Object.entries(properties).reduce(
    (acc, [field, prop]) => {
      if (prop.default !== undefined) {
        acc[field] = prop.default;
      }
      return acc;
    },
    {} as Record<string, unknown>,
  );
}

/**
 * スキーマから列の初期表示状態を取得する
 * Get initial column visibility state based on x-ui.hidden
 *
 * Use with DataTable's column visibility feature to show/hide columns.
 * Hidden columns (x-ui.hidden: true) will be false (not visible by default).
 *
 * @param schema - JSONスキーマ / JSON Schema
 * @param alwaysHide - 常に非表示にするフィールド / Fields to always hide (e.g., ['id', 'organization_id'])
 * @returns カラム可視性の初期状態 / Initial visibility state { [field]: boolean }
 *
 * @example
 * ```tsx
 * const visibility = getSchemaColumnVisibility(schema, ['id', 'organization_id']);
 * // { id: false, organization_id: false, name: true, email: true, ... }
 *
 * <DataTable
 *   columns={columns}
 *   data={data}
 *   initialColumnVisibility={visibility}
 * />
 * ```
 */
export function getSchemaColumnVisibility(
  schema: JSONSchemaWithUI,
  alwaysHide: string[] = ['id', 'organization_id', 'created_at', 'updated_at'],
): Record<string, boolean> {
  const properties = schema.properties || {};

  return Object.entries(properties).reduce(
    (acc, [field, prop]) => {
      const isHidden = prop['x-ui']?.hidden === true || alwaysHide.includes(field);
      acc[field] = !isHidden;
      return acc;
    },
    {} as Record<string, boolean>,
  );
}
