/**
 * @fileoverview DataTableView - DBフェッチ付きデータテーブルラッパー
 *
 * Filter, useFind, DataTableを組み合わせたオールインワンコンポーネント。
 * サーバーサイドページネーション/ソートに対応。
 *
 * @module data-table/data-table-view
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import { ColumnDef, SortingState } from './table-engine';
import { Search, RefreshCw } from 'lucide-react';
import { cn } from "../../lib/utils";
import { useFind, useUpdate } from "../../lib/data-access/react-query";
import { Filter as FilterType, QueryOptions } from "../../lib/data-access/types";
import {
  SchemaFilter,
  useFilter,
  CollectionSchema,
  FilterFieldSpec,
  type FilterValues,
} from "../filter";
import { Button } from '../ui/button';
import { DataTable, DataTableProps } from './data-table';
import { TableHeadBase, createColumnsFromHeads, KV, getNestedValue } from './table-utils';
import { EditableToggle, EditableSelect } from './editable-cells';
import { SavedViewsMenu } from './saved-views-menu';
import { useDataTableStore, defaultSettings } from './table-store';

// =============================================================================
// Types
// =============================================================================

/**
 * ページネーションモード
 * Pagination mode
 */
export type PaginationMode = 'client' | 'server';

/**
 * フィルターモード
 * Filter mode - auto applies on change, manual requires search button
 */
export type FilterMode = 'auto' | 'manual';

type EditableMeta = {
  editable?: boolean;
  field: string;
  type: string;
  options?: Record<string, string>;
};

/**
 * DataTableViewProps
 * DataTableViewのプロパティ
 *
 * DBフェッチ付きデータテーブルラッパーコンポーネント。
 *
 * ## AI/Automation Features
 * - `testId`: Container element
 * - `data-status`: loading | error | empty | ready
 * - `data-row-count`: Number of displayed rows
 *
 * @template T - データの型 / Data type
 */
export interface DataTableViewProps<T extends object> {
  /** AI/E2E Test用の安定ID / Stable test identifier */
  testId?: string;

  /** コレクション/テーブル名 / Collection or table name */
  collection: string;

  /** フィルター型推論用スキーマ / Schema for filter type inference */
  schema?: CollectionSchema;

  /** 列定義（ColumnDef配列またはTableHeadBase配列） / Column definitions */
  columns: ColumnDef<T, unknown>[] | TableHeadBase[];

  /** フィルターフィールド指定 / Filter field specifications */
  filterFields?: FilterFieldSpec[];

  /** デフォルトフィルター / Default filter values */
  defaultFilter?: FilterType;

  /** クエリオプション（ソート、populate等） / Query options */
  queryOptions?: QueryOptions;

  /** クエリ有効化フラグ / Enable query flag */
  enabled?: boolean;

  // --- Pagination Mode ---

  /** ページネーションモード / Pagination mode (client or server) */
  paginationMode?: PaginationMode;

  /** 総レコード数（サーバーサイド時必須） / Total row count for server-side pagination */
  totalCount?: number;

  /** デフォルトページサイズ / Default page size */
  defaultPageSize?: number;

  // --- Filter Mode ---

  /** フィルターモード / Filter mode (auto or manual) */
  filterMode?: FilterMode;

  /** リフレッシュボタンを表示 / Show refresh button */
  showRefreshButton?: boolean;

  // --- DataTable Props (Passthrough) ---

  /** テーブルレイアウトのバリアント / Table layout variant */
  variant?: DataTableProps<T, unknown>['variant'];

  /** 設定永続化用キー / Storage key for persisting settings */
  storageKey?: string;

  /** 全カラムをソート可能にする / Enable sorting on all columns */
  enableSortingByDefault?: boolean;

  /** 複数カラムソートを有効化 / Enable multi-column sorting */
  enableMultiSort?: boolean;

  /** 行番号カラムを表示 / Show row number column */
  showRowNumber?: boolean;

  /** 追加ボタンのコールバック / Callback for add button */
  onAdd?: () => void;

  /** 行クリック時のコールバック / Row click callback */
  onRowClick?: (row: T) => void;

  /** 行ID用フィールド名 / Row ID field name */
  rowIdField?: string;

  /** 列の並べ替え有効化 / Enable column reordering */
  enableColumnOrdering?: boolean;

  /** フィルターレイアウト / Filter layout */
  filterLayout?: 'inline' | 'grid';

  /** ローディング時のカスタム表示 / Custom loading display */
  loadingContent?: React.ReactNode;

  /** エラー時のカスタム表示 / Custom error display */
  errorContent?: (error: Error) => React.ReactNode;

  /** データ空時のカスタム表示 / Custom empty state display */
  emptyContent?: React.ReactNode;

  /** コンテナのクラス名 / Container class name */
  className?: string;

  /** テーブルのクラス名 / Table class name */
  tableClassName?: string;

  /** ページサイズのオプション / Page size options */
  pageSizeOptions?: number[];

  // --- Inline Edit ---

  /** インライン編集を有効化（editable:trueのカラムを編集可能に） / Enable inline editing for editable columns */
  enableInlineEdit?: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * TanStack TableのSortingStateをMongoDBソート形式に変換
 * Converts TanStack Table SortingState to MongoDB sort format
 */
function sortingStateToMongoSort(sorting: SortingState): Record<string, number> | undefined {
  if (!sorting || sorting.length === 0) return undefined;

  const result: Record<string, number> = {};
  for (const sort of sorting) {
    result[sort.id] = sort.desc ? -1 : 1;
  }
  return result;
}

// =============================================================================
// DataTableView Component
// =============================================================================

/**
 * DataTableView Component
 * DBフェッチ付きデータテーブルラッパー
 *
 * Data table wrapper with integrated DB fetching and filtering.
 * サーバーサイドページネーション/ソートに対応。
 *
 * ## AI/Automation Features
 * - `data-testid`: Container element
 * - `data-status`: loading | error | empty | ready
 * - `data-row-count`: Number of displayed rows
 *
 * @example With testId
 * ```tsx
 * <DataTableView
 *   testId="user-table"
 *   collection="users"
 *   schema={userSchema}
 *   columns={columns}
 * />
 * // Selector: [data-testid="user-table"][data-status="ready"]
 * ```
 */
export function DataTableView<T extends Record<string, unknown>>({
  testId,
  collection,
  schema,
  columns,
  filterFields,
  defaultFilter,
  queryOptions,
  enabled = true,
  paginationMode = 'client',
  totalCount,
  defaultPageSize = 10,
  filterMode = 'auto',
  showRefreshButton = false,
  variant = 'default',
  storageKey,
  enableSortingByDefault = true,
  enableMultiSort = false,
  showRowNumber = false,
  onAdd,
  onRowClick,
  rowIdField = 'id',
  enableColumnOrdering = true,
  filterLayout = 'inline',
  loadingContent,
  errorContent,
  emptyContent,
  className,
  tableClassName,
  pageSizeOptions,
  enableInlineEdit = false,
}: DataTableViewProps<T>) {
  const isServerSide = paginationMode === 'server';
  const isManualFilter = filterMode === 'manual';

  // Pagination state (for server-side)
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: defaultPageSize,
  });

  // Sorting state (for server-side)
  const [sorting, setSorting] = useState<SortingState>([]);

  // Store access for SavedViews
  const setTableSettings = useDataTableStore((state) => state.setTableSettings);

  const storedTableSettings = useDataTableStore((state) =>
    storageKey ? state.tables[storageKey] : undefined,
  );
  const currentTableSettings = useMemo(
    () => ({
      ...defaultSettings,
      ...storedTableSettings,
    }),
    [storedTableSettings],
  );
  const stableFilterFields = useMemo(() => filterFields || [], [filterFields]);

  // Applied filter state (for manual filter mode)
  // In manual mode, we only apply filter when user clicks search
  const [appliedFilter, setAppliedFilter] = useState<FilterType>(defaultFilter || {});


  const {
    filter: filterValues,
    values: currentFilterValues,
    fields: resolvedFilterFields,
    reset,
    isEmpty: isFilterEmpty,
    setValues: setFilterValues,
  } = useFilter({
    schema,
    fields: stableFilterFields,
    defaultValues: (defaultFilter ?? {}) as FilterValues,
  });

  // Build query options with pagination/sorting for server-side mode
  const effectiveQueryOptions = useMemo<QueryOptions>(() => {
    const base = { ...queryOptions };

    if (isServerSide) {
      // Server-side pagination
      base.skip = pagination.pageIndex * pagination.pageSize;
      base.limit = pagination.pageSize;

      // Server-side sorting
      const mongoSort = sortingStateToMongoSort(sorting);
      if (mongoSort) {
        base.sort = mongoSort;
      }
    }

    return base;
  }, [queryOptions, isServerSide, pagination, sorting]);

  // Merge default filter with current filter
  // In manual mode, use appliedFilter. In auto mode, use live filterValues
  const combinedFilter = useMemo(
    () => ({
      ...defaultFilter,
      ...(isManualFilter ? appliedFilter : filterValues),
    }),
    [defaultFilter, filterValues, appliedFilter, isManualFilter],
  );

  // Handle search button click (manual filter mode)
  const handleSearch = useCallback(() => {
    setAppliedFilter(filterValues);
    // Reset to first page on new search
    if (isServerSide) {
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }
  }, [filterValues, isServerSide]);

  // Fetch data from DB
  const { data, isLoading, error, refetch } = useFind<T>(
    collection,
    Object.keys(combinedFilter).length > 0 ? combinedFilter : undefined,
    effectiveQueryOptions,
    { enabled },
  );

  // Handle refresh button click directly without intermediate state
  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  // Update mutation for inline editing
  const updateMutation = useUpdate(collection);

  // Handle inline edit update
  const handleInlineUpdate = useCallback(
    async (rowId: string, field: string, value: unknown) => {
      await updateMutation.mutateAsync({
        id: rowId,
        data: { [field]: value },
      });
    },
    [updateMutation],
  );

  // Convert TableHeadBase[] to ColumnDef[] if needed

  const resolvedColumns: ColumnDef<T, unknown>[] = useMemo(() => {
    let cols: ColumnDef<KV, unknown>[];

    if (Array.isArray(columns) && columns.length > 0 && 'field' in columns[0]) {
      cols = createColumnsFromHeads(columns as TableHeadBase[]);
    } else {
      cols = columns as ColumnDef<KV, unknown>[];
    }

    // If inline edit is enabled, override cells for editable columns
    if (enableInlineEdit) {
      cols = cols.map((col) => {
        const meta = (col as ColumnDef<KV, unknown> & { meta?: EditableMeta }).meta;
        if (!meta?.editable) return col;

        const { field, type, options } = meta;

        // Override cell renderer with editable version
        return {
          ...col,
          cell: ({ row }: { row: { original: KV } }) => {
            const rowId = String(row.original[rowIdField] || row.original.id || row.original._id);
            const value = getNestedValue(row.original, field);

            if (type === 'Boolean') {
              return (
                <EditableToggle
                  rowId={rowId}
                  field={field}
                  value={value}
                  onUpdate={handleInlineUpdate}
                />
              );
            }

            if (type === 'Option' && options) {
              return (
                <EditableSelect
                  rowId={rowId}
                  field={field}
                  value={value}
                  options={options}
                  onUpdate={handleInlineUpdate}
                />
              );
            }

            // Default: return original cell
            const originalCell = (col as ColumnDef<KV, unknown>).cell;
            if (typeof originalCell === 'function') {
              const renderCell = originalCell as (context: {
                row: { original: KV };
              }) => React.ReactNode;
              return renderCell({ row });
            }
            return String(value ?? '');
          },
        };
      });
    }

    return cols as ColumnDef<T, unknown>[];
  }, [columns, enableInlineEdit, rowIdField, handleInlineUpdate]);

  // Handle row click
  const handleRowClick = useCallback(
    (rowId: string | number) => {
      if (!onRowClick || !data) return;
      const row = data.find((item) => String(item[rowIdField]) === String(rowId));
      if (row) onRowClick(row);
    },
    [onRowClick, data, rowIdField],
  );

  // Handle pagination change (server-side)
  const handlePaginationChange = useCallback(
    (newPagination: { pageIndex: number; pageSize: number }) => {
      setPagination(newPagination);
    },
    [],
  );

  // Handle sorting change (server-side)
  const handleSortingChange = useCallback(
    (newSorting: SortingState) => {
      setSorting(newSorting);
      // Reset to first page on sort change
      if (isServerSide) {
        setPagination((prev) => ({ ...prev, pageIndex: 0 }));
      }
    },
    [isServerSide],
  );

  // Calculate page count for server-side
  const pageCount =
    isServerSide && totalCount !== undefined
      ? Math.ceil(totalCount / pagination.pageSize)
      : undefined;

  // Loading state
  if (isLoading) {
    return (
      <div
        data-testid={testId}
        data-status='loading'
        className={cn('flex items-center justify-center p-8', className)}
      >
        {loadingContent || <div className='text-muted-foreground'>読み込み中...</div>}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        data-testid={testId}
        data-status='error'
        className={cn('flex items-center justify-center p-8 text-destructive', className)}
      >
        {errorContent ? errorContent(error) : <div>エラーが発生しました: {error.message}</div>}
      </div>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    const showFilter = filterFields && filterFields.length > 0;

    return (
      <div
        data-testid={testId}
        data-status='empty'
        data-row-count='0'
        className={cn('space-y-4', className)}
      >
        {showFilter && (
          <SchemaFilter
            testId={testId ? `${testId}-filter` : undefined}
            schema={schema}
            fields={filterFields}
            layout={filterLayout}
            onChange={() => {}}
          />
        )}
        <div className='flex items-center justify-center p-8 text-muted-foreground'>
          {emptyContent || 'データがありません'}
        </div>
      </div>
    );
  }

  // Filter content for toolbar variant
  const filterContent =
    filterFields && filterFields.length > 0 ? (
      <div className='flex flex-wrap items-end gap-4'>
        {resolvedFilterFields.map((field) => (
          <div key={field.field} className='flex flex-col gap-1'>
            {field.type !== 'boolean' && (
              <label className='text-sm font-medium text-foreground'>{field.label}</label>
            )}
            <SchemaFilter schema={schema} fields={[field.field]} onChange={() => {}} />
          </div>
        ))}
        {/* Search button (manual filter mode) */}
        {isManualFilter && (
          <Button variant='default' size='icon' onClick={handleSearch} title='検索'>
            <Search className='h-4 w-4' />
          </Button>
        )}

        {storageKey && (
          <SavedViewsMenu
            storageKey={storageKey}
            currentTableSettings={currentTableSettings}
            currentFilterValues={currentFilterValues}
            onApplyView={(settings, filters) => {
              setTableSettings(storageKey, settings);
              if (filters) {
                setFilterValues(filters as Partial<FilterValues>);
                if (isManualFilter) {
                  setAppliedFilter(filters as FilterType);
                }
              } else {
                reset();
                if (isManualFilter) {
                  setAppliedFilter({});
                }
              }
            }}
          />
        )}

        {/* Refresh button */}
        {showRefreshButton && (
          <Button variant='outline' size='icon' onClick={handleRefresh} title='更新'>
            <RefreshCw className='h-4 w-4' />
          </Button>
        )}
        {!isFilterEmpty && (
          <button onClick={reset} className='text-sm text-muted-foreground hover:text-foreground'>
            リセット
          </button>
        )}
      </div>
    ) : undefined;

  return (
    <div
      data-testid={testId}
      data-status='ready'
      data-row-count={data.length}
      className={cn('space-y-4', className)}
    >
      {' '}
      {/* Separate filter display (non-toolbar variants) */}
      {variant !== 'toolbar' && filterFields && filterFields.length > 0 && (
        <div className='flex flex-wrap items-end gap-4'>
          <SchemaFilter
            testId={testId ? `${testId}-filter` : undefined}
            schema={schema}
            fields={filterFields}
            defaultValues={(defaultFilter ?? {}) as FilterValues}
            layout={filterLayout}
            autoApply={!isManualFilter}
          />

          {storageKey && (
            <SavedViewsMenu
              storageKey={storageKey}
              currentTableSettings={currentTableSettings}
              currentFilterValues={currentFilterValues}
              onApplyView={(settings, filters) => {
                setTableSettings(storageKey, settings);
                if (filters) {
                  setFilterValues(filters as Partial<FilterValues>);
                  if (isManualFilter) {
                    setAppliedFilter(filters as FilterType);
                  }
                } else {
                  reset();
                  if (isManualFilter) {
                    setAppliedFilter({});
                  }
                }
              }}
            />
          )}

          {/* Search button (manual filter mode) */}
          {isManualFilter && (
            <Button
              testId={testId ? `${testId}-search` : undefined}
              variant='default'
              size='icon'
              onClick={handleSearch}
              title='検索'
            >
              <Search className='h-4 w-4' aria-hidden='true' />
            </Button>
          )}
          {/* Refresh button */}
          {showRefreshButton && (
            <Button
              testId={testId ? `${testId}-refresh` : undefined}
              variant='outline'
              size='icon'
              onClick={handleRefresh}
              title='更新'
            >
              <RefreshCw className='h-4 w-4' aria-hidden='true' />
            </Button>
          )}
        </div>
      )}
      <DataTable
        columns={resolvedColumns}
        data={data}
        variant={variant}
        filterContent={variant === 'toolbar' ? filterContent : undefined}
        storageKey={storageKey}
        enableSortingByDefault={enableSortingByDefault}
        enableMultiSort={enableMultiSort}
        showRowNumber={showRowNumber}
        itemCount={isServerSide ? totalCount : data.length}
        onAdd={onAdd}
        onRowClick={onRowClick ? handleRowClick : undefined}
        rowIdField={rowIdField}
        enableColumnOrdering={enableColumnOrdering}
        tableClassName={tableClassName}
        pageSizeOptions={pageSizeOptions}
        // Server-side mode props
        manualPagination={isServerSide}
        manualSorting={isServerSide}
        pageCount={pageCount}
        rowCount={totalCount}
        onPaginationChange={isServerSide ? handlePaginationChange : undefined}
        onSortingChange={isServerSide ? handleSortingChange : undefined}
      />
    </div>
  );
}
DataTableView.displayName = 'DataTableView';
