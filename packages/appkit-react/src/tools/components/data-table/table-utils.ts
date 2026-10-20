/**
 * @fileoverview Table utility functions for DataTable component
 *
 * Provides:
 * - `getNestedValue` - Access nested object properties via dot notation
 * - `cellGenerators` - Pre-built cell formatters for common types
 * - `createColumnsFromHeads` - Create column definitions declaratively
 * - `timeSort`, `trimmedSort` - Custom sorting functions
 *
 * @module data-table/table-utils
 */

import { ColumnDef, Row, SortingFn } from './table-engine';
import { formatDate, formatTime, getAge } from "../../lib/date-utils";

// =============================================================================
// Types
// =============================================================================

/**
 * 汎用キーバリューオブジェクト型
 * Generic key-value object type for table row data
 * @typedef {Record<string, unknown>} KV
 */

export type KV = Record<string, unknown>;

/**
 * セルタイプの種類
 * Available cell generator types
 * @typedef {'Date' | 'Time' | 'TimeString' | 'Age' | 'Option' | 'String' | 'Array'} CellType
 */
export type CellType =
  | 'Date'
  | 'Time'
  | 'TimeString'
  | 'Age'
  | 'Option'
  | 'String'
  | 'Array'
  | 'Boolean'
  | 'Number';

/**
 * テーブルヘッダーの基本定義
 * Base type for table column header definitions
 *
 * @typedef {Object} TableHeadBase
 * @property {string} field - カラムの一意識別子 / Unique column identifier
 * @property {string} text - ヘッダーの表示テキスト / Display text for the column header
 * @property {string} [id] - ソート/クエリ用のDBフィールド名 / Database field name for sorting
 * @property {CellType} [type] - セルタイプ / Logical cell type, defaults to "String"
 * @property {Record<string | number, string>} [options] - Optionタイプ用のマッピング / Options mapping
 * @property {Function} [accessorFn] - カスタムアクセサー関数 / Custom accessor function
 * @property {Function} [cell] - カスタムセルレンダラー / Custom cell renderer
 * @property {boolean} [enableSorting] - ソートを有効にするか / Enable sorting for this column
 */
export type TableHeadBase = {
  /** カラムの一意識別子 / Unique column identifier */
  field: string;
  /** ヘッダーの表示テキスト / Display text for the column header */
  text: string;
  /** ソート/クエリ用のDBフィールド名（省略時はfieldと同じ） / Optional database field name for sorting/querying */
  id?: string;
  /** セルタイプ（省略時は"String"） / Logical cell type, defaults to "String" */
  type?: CellType;
  /** Optionタイプ用のオプションマッピング / Options mapping for Option-type cells */
  options?: Record<string | number, string>;
  /** カスタムアクセサー関数 / Optional accessor function */
  accessorFn?: (row: KV) => unknown;
  /** カスタムセルレンダラー / Optional custom cell renderer */
  cell?: (row: KV) => React.ReactNode;
  /** ソートを無効にするか / Disable sorting for this column */
  enableSorting?: boolean;
  /** インライン編集を有効にする / Enable inline editing for this column */
  editable?: boolean;
};

/**
 * Compatibility options for {@link createColumnsFromHeads}.
 * @remarks Only arraySeparator is currently consumed; locale and timezone do not affect generated cells.
 * @see createColumnsFromHeads
 */
export type CreateColumnsOptions = {
  /** Reserved compatibility option; currently ignored by createColumnsFromHeads. No locale default is applied here. */
  locale?: string;
  /** Reserved compatibility option; currently ignored by createColumnsFromHeads. No timezone default is applied here. */
  timezone?: string;
  /** Separator for joining array values; defaults to " / ". */
  arraySeparator?: string;
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * ドット記法でネストされた値を取得する
 * Retrieves a nested value from an object using a dot-notation path.
 *
 * @param {KV} obj - 走査するオブジェクト / The object to traverse
 * @param {string} path - ドット記法のパス / Dot-notation path (e.g., "user.profile.name")
 * @returns {unknown} 指定パスの値、存在しない場合はundefined / The value at the path
 *
 * @example
 * ```ts
 * import { getNestedValue } from '@alneas/appkit-react/tools/data-table';
 * const obj = { user: { profile: { name: 'John' } } };
 * getNestedValue(obj, 'user.profile.name'); // 'John'
 * getNestedValue(obj, 'user.email'); // undefined
 * ```
 */
export const getNestedValue = (obj: KV, path: string): unknown => {
  return path.split('.').reduce<unknown>((current, key) => {
    if (
      current &&
      typeof current === 'object' &&
      key !== '__proto__' &&
      key !== 'constructor' &&
      key !== 'prototype' &&
      Object.prototype.hasOwnProperty.call(current, key)
    ) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
};

// =============================================================================
// Cell Generators
// =============================================================================

/**
 * セルジェネレーター関数群
 * Cell generators for rendering different data types in table cells.
 * Each generator returns a function that takes a row and returns a formatted string.
 *
 * @example
 * ```ts
 * import { cellGenerators } from '@alneas/appkit-react/tools/data-table';
 * const rowData = { createdAt: new Date(2026, 0, 15) };
 * const dateCell = cellGenerators.Date('createdAt');
 * const formatted = dateCell(rowData);
 * ```
 */
export const cellGenerators = {
  /**
   * 日付値をローカライズされた日付文字列にフォーマットする
   * Formats a date value as localized date string.
   *
   * @param {string} field - データフィールド名 / Field name to access
   * @returns {(row: KV) => string} セルレンダラー関数 / Cell renderer function
   */
  Date:
    (field: string) =>
    (row: KV): string => {
      const value = getNestedValue(row, field);
      if (!value) return '';
      return formatDate(new Date(value as string | number | Date));
    },

  /**
   * タイムスタンプをローカライズされた時刻文字列にフォーマットする
   * Formats a timestamp as localized time string (HH:mm).
   *
   * @param {string} field - データフィールド名 / Field name to access
   * @returns {(row: KV) => string} セルレンダラー関数 / Cell renderer function
   */
  Time:
    (field: string) =>
    (row: KV): string => {
      const value = getNestedValue(row, field);
      if (!value) return '';
      return formatTime(new Date(value as string | number | Date));
    },

  /**
   * 時刻文字列（HH:mm）をそのまま表示する
   * Renders a time string (HH:mm) directly without conversion.
   *
   * @param {string} field - データフィールド名 / Field name to access
   * @returns {(row: KV) => string} セルレンダラー関数 / Cell renderer function
   */
  TimeString:
    (field: string) =>
    (row: KV): string => {
      const value = getNestedValue(row, field);
      return (value as string) || '';
    },

  /**
   * 生年月日から年齢を計算して表示する
   * Calculates and formats age from a birth date value.
   *
   * @param {string} field - 生年月日フィールド名 / Field name containing birth date
   * @returns {(row: KV) => string} セルレンダラー関数 / Cell renderer function
   */
  Age:
    (field: string) =>
    (row: KV): string => {
      const value = getNestedValue(row, field);
      if (!value) return '';
      const age = getAge(new Date(value as string | number | Date));
      return age !== null ? String(age) : '';
    },

  /**
   * オプションマッピングを使って値をラベルに変換する
   * Maps a value to its label using the provided options mapping.
   *
   * @param {string} field - データフィールド名 / Field name to access
   * @param {Record<string | number, string>} [options] - 値→ラベルのマッピング / Value to label mapping
   * @returns {(row: KV) => string} セルレンダラー関数 / Cell renderer function
   *
   * @example
   * ```ts
   * import { cellGenerators } from '@alneas/appkit-react/tools/data-table';
   * const statusCell = cellGenerators.Option('status', { 0: 'Pending', 1: 'Complete' });
   * const label = statusCell({ status: 1 }); // 'Complete'
   * ```
   */
  Option:
    (field: string, options?: Record<string | number, string>) =>
    (row: KV): string => {
      const value = getNestedValue(row, field);
      if (value === undefined || value === null) return '';
      if (options && (typeof value === 'string' || typeof value === 'number') && value in options) {
        return options[value];
      }
      return String(value);
    },

  /**
   * 文字列値を表示する（ネストフィールド対応）
   * Formats a string value, supporting nested field access.
   *
   * @param {string} field - データフィールド名 / Field name to access
   * @returns {(row: KV) => string} セルレンダラー関数 / Cell renderer function
   */
  /** Finite numeric values retain their numeric accessor for sorting. */
  Number: (field: string) => (row: KV): string => {
    const value = getNestedValue(row, field);
    return typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
  },
  String:
    (field: string) =>
    (row: KV): string => {
      const value = getNestedValue(row, field);
      return value?.toString() || '';
    },

  /**
   * 配列値をセパレータで結合する
   * Formats an array value by joining elements with a separator.
   *
   * @param {string} field - データフィールド名 / Field name to access
   * @param {string} [separator=' / '] - 結合文字 / Separator string
   * @returns {(row: KV) => string} セルレンダラー関数 / Cell renderer function
   */
  Array:
    (field: string, separator = ' / ') =>
    (row: KV): string => {
      const value = getNestedValue(row, field);
      return Array.isArray(value) && value.length ? value.join(separator) : '';
    },
};

// =============================================================================
// Custom Sorting Functions
// =============================================================================

/** 時刻文字列のパターン (H:mm or HH:mm) */
const timeRegex = /^(\d{1,2}):(\d{2})$/;

/**
 * 2つの時刻文字列を数値比較する
 * @param {string} a - 時刻文字列A
 * @param {string} b - 時刻文字列B
 * @returns {number | null} 比較結果 (負=a<b, 正=a>b, 0=等しい, null=比較不可)
 */
const compareTimeStrings = (a: string, b: string): number | null => {
  const aMatch = a.match(timeRegex);
  const bMatch = b.match(timeRegex);

  if (aMatch && bMatch) {
    const aH = parseInt(aMatch[1], 10);
    const aM = parseInt(aMatch[2], 10);
    const bH = parseInt(bMatch[1], 10);
    const bM = parseInt(bMatch[2], 10);

    if (aH !== bH) return aH - bH;
    return aM - bM;
  }
  return null;
};

/**
 * 時刻文字列用のカスタムソート関数
 * H:mm/HH:mm形式の時刻を正しく数値順にソートする。
 * 空の値は先頭に配置される。
 *
 * Custom sorting function for time strings (H:mm/HH:mm format).
 * Correctly sorts times numerically. Empty values are sorted first.
 *
 * @param {Row<KV>} rowA - 行A / Row A to compare
 * @param {Row<KV>} rowB - 行B / Row B to compare
 * @param {string} columnId - カラムID / Column ID to sort by
 * @returns {number} ソート順序 / Sort order (-1, 0, or 1)
 */
export const timeSort: SortingFn<KV> = (rowA: Row<KV>, rowB: Row<KV>, columnId: string): number => {
  const rawA = rowA.getValue(columnId);
  const rawB = rowB.getValue(columnId);

  let a = rawA === null || rawA === undefined ? '' : rawA;
  let b = rawB === null || rawB === undefined ? '' : rawB;

  if (typeof a === 'string') a = a.trim();
  if (typeof b === 'string') b = b.trim();

  const aEmpty = a === '';
  const bEmpty = b === '';

  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return -1;
  if (bEmpty) return 1;

  if (typeof a === 'string' && typeof b === 'string') {
    const timeComparison = compareTimeStrings(a, b);
    if (timeComparison !== null) return timeComparison;
  }

  if ((a as string) < (b as string)) return -1;
  if ((a as string) > (b as string)) return 1;
  return 0;
};

/**
 * トリム済み文字列用のカスタムソート関数
 * 空の値を一貫して処理する（空の値は先頭に配置）。
 *
 * Custom sorting function for trimmed strings.
 * Handles empty values consistently (empty values sorted first).
 *
 * @param {Row<KV>} rowA - 行A / Row A to compare
 * @param {Row<KV>} rowB - 行B / Row B to compare
 * @param {string} columnId - カラムID / Column ID to sort by
 * @returns {number} ソート順序 / Sort order (-1, 0, or 1)
 */
export const trimmedSort: SortingFn<KV> = (
  rowA: Row<KV>,
  rowB: Row<KV>,
  columnId: string,
): number => {
  const rawA = rowA.getValue(columnId);
  const rawB = rowB.getValue(columnId);

  let a = rawA === null || rawA === undefined ? '' : rawA;
  let b = rawB === null || rawB === undefined ? '' : rawB;

  if (typeof a === 'string') a = a.trim();
  if (typeof b === 'string') b = b.trim();

  const aEmpty = a === '';
  const bEmpty = b === '';

  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return -1;
  if (bEmpty) return 1;

  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }

  if ((a as string) < (b as string)) return -1;
  if ((a as string) > (b as string)) return 1;
  return 0;
};

// =============================================================================
// Column Creation Helper
// =============================================================================

/**
 * Creates table column definitions from declarative headers and built-in cell generators.
 * @param heads - Header definitions in display order; field selects a row path and id can
 * override the source path. Cell type defaults to String and sorting is enabled unless explicitly false.
 * @param options - Array formatting options; see {@link CreateColumnsOptions}. arraySeparator
 * defaults to " / "; locale and timezone are accepted but ignored by this function.
 * @returns A newly allocated column-definition array; each definition closes over its header configuration.
 * @remarks Date/Time cells receive only the field name and use their cell-generator defaults;
 * passing locale/timezone here does not change them. Custom head.cell receives the original row.
 * The generated JSX uses Appkit UI components; import Appkit CSS in the rendering host.
 * @example
 * ```tsx
 * import { createColumnsFromHeads } from '@alneas/appkit-react/tools/data-table';
 * import '@alneas/appkit-react/styles';
 * const columns = createColumnsFromHeads([
 *   { field: 'name', text: 'Name' },
 *   { field: 'birthday', text: 'Birthday', type: 'Date' },
 *   { field: 'status', text: 'Status', type: 'Option', options: { 0: 'Pending', 1: 'Done' } },
 * ], { arraySeparator: ', ' });
 * ```
 */
export const createColumnsFromHeads = (
  heads: TableHeadBase[],
  options?: CreateColumnsOptions,
): ColumnDef<KV>[] => {
  const { arraySeparator = ' / ' } = options || {};

  return heads.map((head) => {
    const dbField = head.id || head.field;
    const cellType = head.type || 'String';

    const columnDef: ColumnDef<KV> = {
      id: head.field,
      header: head.text,
      enableSorting: head.enableSorting !== false,
      accessorFn: (row: KV) => {
        const val = getNestedValue(row, dbField);
        if (val === null || val === undefined || val === '') return '';
        if (typeof val === 'string' && val.trim() === '') return '';
        return val;
      },
      sortFn: trimmedSort,
    };

    if (head.accessorFn) {
      columnDef.accessorFn = head.accessorFn;
    }

    if (head.cell) {
      columnDef.cell = ({ row }: { row: { original: KV } }) => head.cell!(row.original);
    } else if (cellType === 'Number') {
      const numericCell = cellGenerators.Number(dbField);
      columnDef.cell = ({ row }: { row: { original: KV } }) => numericCell(row.original);
      columnDef.sortFn = (a, b, id) => {
        const x = a.getValue(id), y = b.getValue(id);
        const xn = typeof x === 'number' && Number.isFinite(x);
        const yn = typeof y === 'number' && Number.isFinite(y);
        return xn && yn ? x - y : xn ? 1 : yn ? -1 : 0;
      };
    } else if (cellType === 'Date') {
      const dateCell = cellGenerators.Date(dbField);
      columnDef.cell = ({ row }: { row: { original: KV } }) => dateCell(row.original);
    } else if (cellType === 'Time') {
      const timeCell = cellGenerators.Time(dbField);
      columnDef.cell = ({ row }: { row: { original: KV } }) => timeCell(row.original);
    } else if (cellType === 'TimeString') {
      const timeStringCell = cellGenerators.TimeString(dbField);
      columnDef.cell = ({ row }: { row: { original: KV } }) => timeStringCell(row.original);
      columnDef.sortFn = timeSort;
    } else if (cellType === 'Age') {
      const ageCell = cellGenerators.Age(dbField);
      columnDef.cell = ({ row }: { row: { original: KV } }) => ageCell(row.original);
    } else if (cellType === 'Option') {
      const optionCell = cellGenerators.Option(dbField, head.options);
      columnDef.cell = ({ row }: { row: { original: KV } }) => optionCell(row.original);
    } else if (cellType === 'Boolean') {
      // Default boolean display (editable version handled in DataTableView)
      columnDef.cell = ({ row }: { row: { original: KV } }) => {
        const val = getNestedValue(row.original, dbField);
        return val ? '✓' : '-';
      };
    } else if (cellType === 'Array') {
      const arrayCell = cellGenerators.Array(dbField, arraySeparator);
      columnDef.cell = ({ row }: { row: { original: KV } }) => arrayCell(row.original);
    } else {
      const stringCell = cellGenerators.String(dbField);
      columnDef.cell = ({ row }: { row: { original: KV } }) => stringCell(row.original);
    }

    // Store metadata for editable columns (used by DataTableView)
    if (head.editable) {
      columnDef.meta = {
        editable: true,
        field: dbField,
        type: cellType,
        options: head.options,
      };
    }

    return columnDef;
  });
};

/**
 * 配列を指定のセパレータで結合する
 * Joins an array of strings with the specified separator.
 *
 * @param {string[]} [value] - 結合する文字列配列 / Array of strings to join
 * @param {string} [separator=' / '] - セパレータ / Separator string
 * @returns {string} 結合された文字列、空の場合は空文字列 / Joined string or empty string
 *
 * @example
 * ```ts
 * import { joinValues } from '@alneas/appkit-react/tools/data-table';
 * joinValues(['a', 'b', 'c']); // 'a / b / c'
 * joinValues(['a', 'b'], ', '); // 'a, b'
 * joinValues(); // ''
 * ```
 */
export const joinValues = (value?: string[], separator = ' / '): string =>
  value && value.length ? value.join(separator) : '';

/**
 * MongoDBスタイルのクエリを用いてローカルデータ配列をフィルタリングします（クライアントサイドフィルタリング用）。
 *
 * サポートする演算子:
 * - 完全一致 (値が等しい場合。日付の場合は日付のミリ秒値で比較)
 * - $regex (部分一致、前方一致、後方一致。$options: 'i' による大文字小文字無視をサポート)
 * - $gte, $lte, $gt, $lt (数値、日付の比較)
 * - $in (複数選択のいずれかに一致)
 * - $and (複数条件の論理積)
 * - $or (複数条件の論理和)
 *
 * @param data フィルタリング対象のデータ配列
 * @param query MongoDBスタイルのフィルターオブジェクト
 * @param schema コレクションスキーマ（オプショナル。型推論のために使用）
 * @returns フィルタリング後のデータ配列
 */
export function filterDataByMongoQuery<T extends Record<string, any>>(
  data: T[],
  query: Record<string, any>,
  schema?: any,
): T[] {
  if (!query || Object.keys(query).length === 0) {
    return data;
  }

  const matchRow = (row: T, subQuery: Record<string, any>): boolean => {
    for (const [key, val] of Object.entries(subQuery)) {
      if (key === '$and') {
        if (!Array.isArray(val)) continue;
        if (!val.every((q) => matchRow(row, q))) {
          return false;
        }
        continue;
      }
      if (key === '$or') {
        if (!Array.isArray(val)) continue;
        if (!val.some((q) => matchRow(row, q))) {
          return false;
        }
        continue;
      }

      const rowVal = getNestedValue(row, key);
      const schemaField = schema?.[key];
      const isDateField = schemaField?.type === 'date' || rowVal instanceof Date;

      if (val && typeof val === 'object' && !(val instanceof Date)) {
        // MongoDB-style operators
        for (const [op, opVal] of Object.entries(val)) {
          if (op === '$regex') {
            const regexVal = String(opVal);
            // Limit pattern length to prevent pathological regular expressions (ReDoS)
            if (regexVal.length > 256) return false;

            const rowStr = rowVal !== undefined && rowVal !== null ? String(rowVal) : '';
            const options = (val as any).$options || '';
            const caseInsensitive = options.includes('i');

            try {
              const regex = new RegExp(regexVal, caseInsensitive ? 'i' : '');
              if (!regex.test(rowStr)) return false;
            } catch (_e) {
              const normalizedRow = caseInsensitive ? rowStr.toLowerCase() : rowStr;
              const normalizedQuery = caseInsensitive ? regexVal.toLowerCase() : regexVal;
              if (!normalizedRow.includes(normalizedQuery)) return false;
            }
          } else if (op === '$options') {
            continue;
          } else if (op === '$in') {
            if (!Array.isArray(opVal)) return false;
            const rowArr = Array.isArray(rowVal) ? rowVal : [rowVal];
            const hasMatch = rowArr.some((r) =>
              opVal.some((q) => {
                if (isDateField && r && q) {
                  return new Date(r as any).getTime() === new Date(q as any).getTime();
                }
                return String(r) === String(q);
              }),
            );
            if (!hasMatch) return false;
          } else if (op === '$gte' || op === '$gt' || op === '$lte' || op === '$lt') {
            if (rowVal === undefined || rowVal === null || rowVal === '') return false;

            const compareRow = isDateField ? new Date(rowVal as any).getTime() : Number(rowVal);
            const compareQuery = isDateField ? new Date(opVal as any).getTime() : Number(opVal);

            if (isNaN(compareRow) || isNaN(compareQuery)) return false;

            if (op === '$gte' && !(compareRow >= compareQuery)) return false;
            if (op === '$gt' && !(compareRow > compareQuery)) return false;
            if (op === '$lte' && !(compareRow <= compareQuery)) return false;
            if (op === '$lt' && !(compareRow < compareQuery)) return false;
          }
        }
      } else {
        // Exact match
        if (rowVal === undefined || rowVal === null || rowVal === '') {
          if (val !== undefined && val !== null && val !== '') return false;
        } else if (isDateField && rowVal && val) {
          if (new Date(rowVal as any).getTime() !== new Date(val as any).getTime()) return false;
        } else {
          if (String(rowVal) !== String(val)) return false;
        }
      }
    }
    return true;
  };

  return data.filter((row) => matchRow(row, query));
}
