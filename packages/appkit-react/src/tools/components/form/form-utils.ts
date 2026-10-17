/**
 * @fileoverview Drizzle ORM のカラム定義に基づくフォームユーティリティ
 *
 * Provides:
 * - Default value inference from Drizzle column config
 * - Column grouping for form layout generation
 *
 * @module components/form/form-utils
 */

// =============================================================================
// Default Value Inference
// =============================================================================

/**
 * Drizzle ORM のカラム定義からデフォルト値を推論する
 * Infers a default value based on a Drizzle column definition
 *
 * @param column - Drizzle カラム定義オブジェクト / Drizzle column definition with `.config`
 * @param _fieldName - フィールド名（将来の拡張用） / Field name (reserved for future use)
 * @returns デフォルト値 / Default value appropriate for the column type
 *
 * @example
 * ```ts
 * // PgArray → []
 * getDefaultValueForColumn({ config: { columnType: 'PgArray' } }, 'tags');
 *
 * // PgInteger → null
 * getDefaultValueForColumn({ config: { columnType: 'PgInteger' } }, 'quantity');
 *
 * // PgBoolean → false
 * getDefaultValueForColumn({ config: { columnType: 'PgBoolean' } }, 'active');
 * ```
 */
export function getDefaultValueForColumn(
  column: Record<string, unknown>,
  _fieldName: string,
): unknown {
  const config = column?.config as Record<string, unknown> | undefined;
  if (!config) return '';

  // If column has a default value, use it
  if (config.default !== undefined) {
    return config.default;
  }

  const columnType = config.columnType as string | undefined;

  // Check if it's an array field - return empty array
  if (columnType === 'PgArray') {
    return [];
  }

  // Check if it's an enum field
  if (columnType === 'PgEnumColumn') {
    const enumConfig = config.enum as Record<string, unknown> | undefined;
    const enumValues = enumConfig?.enumValues as string[] | undefined;
    if (enumValues?.length) {
      return enumValues[0];
    }
    return '';
  }

  // Check if it's a numeric field: default to null (empty)
  if (
    columnType === 'PgSmallInt' ||
    columnType === 'PgInteger' ||
    columnType === 'PgBigInt53' ||
    columnType === 'PgNumeric'
  ) {
    return null;
  }

  // For string fields, return empty string
  if (columnType === 'PgVarchar' || columnType === 'PgText' || columnType === 'PgChar') {
    return '';
  }

  // For boolean fields, return false
  if (columnType === 'PgBoolean') {
    return false;
  }

  // Default to empty string
  return '';
}

// =============================================================================
// Column Grouping
// =============================================================================

/** カラムエントリ（キーとメタデータのペア） */
export interface ColumnEntry {
  key: string;
  column: Record<string, unknown>;
}

/** グループ化されたカラムのマップ */
export type GroupedColumns = Record<string, ColumnEntry[]>;

/**
 * カラムをメタデータの `group` プロパティに基づいてグループ化する
 * Groups columns by their `group` metadata property
 *
 * @param columnMetadata - カラムメタデータマップ / Column metadata map (key → metadata)
 * @param columnDefinitions - Drizzle カラム定義マップ / Drizzle column definitions (key → column def)
 * @param isEditMode - 編集モードかどうか / Whether in edit mode (hides auto-generated IDs)
 * @returns グループ名をキーとしたカラム配列のマップ / Map of group name → column entries
 *
 * @example
 * ```ts
 * const groups = groupColumnsByGroup(schema.columnMetadata, schema.columnDefinitions, false);
 * // { '基本情報': [...], '詳細': [...] }
 * ```
 */
export function groupColumnsByGroup(
  columnMetadata: Record<string, Record<string, unknown>>,
  columnDefinitions: Record<string, Record<string, unknown>>,
  isEditMode: boolean = false,
): GroupedColumns {
  const groups: GroupedColumns = {};

  Object.entries(columnMetadata).forEach(([key, column]) => {
    // Handle ID field: show only if not serial and in create mode
    if (key === 'id') {
      const columnDef = columnDefinitions[key];
      const config = columnDef?.config as Record<string, unknown> | undefined;
      const columnType = config?.columnType as string | undefined;
      const isAutoId = columnType?.includes('Serial') || columnType === 'PgUUID';
      if (isAutoId || isEditMode) {
        return; // Skip auto-generated IDs or ID in edit mode
      }
    }

    // Determine group
    const group = (column.group as string) || '一般';
    if (!groups[group]) {
      groups[group] = [];
    }

    groups[group].push({ key, column });
  });

  return groups;
}

/**
 * カラムをグループ化せず、単一グループとして返す
 * Returns all columns in a single flat group
 *
 * @param columnMetadata - カラムメタデータマップ / Column metadata map
 * @param columnDefinitions - Drizzle カラム定義マップ / Drizzle column definitions
 * @param isEditMode - 編集モードかどうか / Whether in edit mode
 * @param groupLabel - グループ名 / Label for the single group (defaults to 'フォーム項目')
 * @returns 単一グループのカラム配列のマップ / Map with single group containing all columns
 *
 * @example
 * ```ts
 * const columns = groupColumnsUngrouped(schema.columnMetadata, schema.columnDefinitions);
 * // { 'フォーム項目': [...all columns] }
 * ```
 */
export function groupColumnsUngrouped(
  columnMetadata: Record<string, Record<string, unknown>>,
  columnDefinitions: Record<string, Record<string, unknown>>,
  isEditMode: boolean = false,
  groupLabel: string = 'フォーム項目',
): GroupedColumns {
  const result: ColumnEntry[] = [];

  Object.entries(columnMetadata).forEach(([key, column]) => {
    // Handle ID field: show only if not serial and in create mode
    if (key === 'id') {
      const columnDef = columnDefinitions[key];
      const config = columnDef?.config as Record<string, unknown> | undefined;
      const columnType = config?.columnType as string | undefined;
      const isAutoId = columnType?.includes('Serial') || columnType === 'PgUUID';
      if (isAutoId || isEditMode) {
        return;
      }
    }

    result.push({ key, column });
  });

  return { [groupLabel]: result };
}
