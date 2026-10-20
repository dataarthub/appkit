/**
 * @fileoverview DataTable component with sorting, pagination, and persistence
 *
 * A feature-rich data table built on TanStack Table with:
 * - Three layout variants: default, toolbar, minimal
 * - Single and multi-column sorting
 * - Column reordering via drag-and-drop
 * - Column visibility toggle
 * - Settings persistence via Zustand store
 * - Row selection and click handling
 * - Server-side pagination/sorting support
 *
 * @module data-table/data-table
 */

import * as React from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  ColumnOrderState,
  PaginationState,
  flexRender,
  useTable,
  dataTableFeatures,
  Table as TableInstance,
  Header,
} from './table-engine';
import * as m from '../../paraglide/messages.js';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { cn } from "../../lib/utils";
import { Button, buttonVariants } from '../ui/button';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Settings2,
  GripVertical,
  Plus,
  ChevronUp,
  ChevronDown,
  Filter as FilterIcon,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from '../ui/dropdown-menu';

import { useDataTableStore } from './table-store';

// =============================================================================
// Types
// =============================================================================

/**
 * テーブルレイアウトのバリアント
 * Table layout variants
 */
export type DataTableVariant = 'default' | 'toolbar' | 'minimal';

// =============================================================================
// Sortable Header Component
// =============================================================================

interface DataTableColumnHeaderProps<
  TData extends object,
  TValue,
> extends React.HTMLAttributes<HTMLTableCellElement> {
  header: Header<TData, TValue>;
  enableColumnOrdering?: boolean;
  enableMultiSort?: boolean;
  sortIndex?: number;
}

function DataTableColumnHeader<TData extends object, TValue>({
  header,
  enableColumnOrdering = true,
  enableMultiSort = false,
  sortIndex,
}: DataTableColumnHeaderProps<TData, TValue>) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: header.column.id,
    disabled: !enableColumnOrdering,
  });

  const canSort = header.column.getCanSort();
  const sortDirection = header.column.getIsSorted();
  const isSorted = sortDirection !== false;
  const SortLabel = canSort && typeof header.column.columnDef.header !== 'function' ? 'button' : 'span';

  const style: React.CSSProperties = enableColumnOrdering
    ? {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.8 : 1,
        zIndex: isDragging ? 1 : 0,
        position: 'relative',
        cursor: 'move',
      }
    : {};

  const handleSort = (e: React.MouseEvent) => {
    if (!canSort || (e.target as HTMLElement).closest('button, input, select, [role=checkbox]')) return;
    if (enableMultiSort && e.shiftKey) {
      header.column.toggleSorting(undefined, true);
    } else {
      header.column.toggleSorting();
    }
  };

  return (
    <TableHead
      ref={enableColumnOrdering ? setNodeRef : undefined}
      style={style}
      aria-sort={canSort ? (sortDirection === 'asc' ? 'ascending' : sortDirection === 'desc' ? 'descending' : 'none') : undefined}
      className={cn(
        'bg-primary/10 text-primary font-bold border-b border-primary/20',
        canSort && 'cursor-pointer select-none hover:bg-primary/20 transition-colors',
      )}
      onClick={canSort ? handleSort : undefined}
    >
      {enableColumnOrdering && !header.isPlaceholder && <button
        type='button' ref={setActivatorNodeRef} {...attributes} {...listeners}
        aria-label={`Reorder column ${header.column.id}`}
        className='inline-flex h-6 w-6 items-center justify-center cursor-grab'
      ><GripVertical className='h-3 w-3' aria-hidden='true' /></button>}
      {header.isPlaceholder ? null : (
        <span className='inline-flex items-center gap-1'>
          <SortLabel className={cn(isSorted && 'font-semibold')}
            {...(SortLabel === 'button' ? { type: 'button' as const, onClick: (event: React.MouseEvent) => {
              event.stopPropagation();
              header.column.toggleSorting(undefined, enableMultiSort && event.shiftKey);
            } } : {})}
          >
            {flexRender(header.column.columnDef.header, header.getContext())}
          </SortLabel>
          {/* Only show sort indicator when column is actively sorted */}
          {isSorted && (
            <span className='inline-flex items-center text-xs'>
              {sortDirection === 'asc' ? (
                <ChevronUp className='h-3.5 w-3.5' />
              ) : (
                <ChevronDown className='h-3.5 w-3.5' />
              )}
              {enableMultiSort && sortIndex !== undefined && sortIndex >= 0 && (
                <span className='text-[10px] ml-0.5'>{sortIndex + 1}</span>
              )}
            </span>
          )}
        </span>
      )}
    </TableHead>
  );
}

// =============================================================================
// DataTable Props
// =============================================================================

/**
 * DataTableProps
 * DataTableのプロップス
 *
 * ## AI/Automation Features
 * - `testId`: Container element
 * - Pattern: `{testId}`, rows: `{testId}-row-{id}`, pagination: `{testId}-pagination`
 */
export interface DataTableProps<TData extends object, TValue> {
  /** AI/E2E Test用の安定ID / Stable test identifier */
  testId?: string;
  /** 列定義 / Column definitions */
  columns: ColumnDef<TData, TValue>[];
  /** データ配列 / Data array */
  data: TData[];
  /** テーブルレイアウトのバリアント / Table layout variant */
  variant?: DataTableVariant;
  /** ツールバー用カスタムフィルターコンテンツ / Custom filter content for toolbar */
  filterContent?: React.ReactNode;
  /** 設定永続化用キー（Zustandストアで使用） / Storage key for persisting settings */
  storageKey?: string;
  /** 全カラムをデフォルトでソート可能にする / Enable sorting on all columns by default */
  enableSortingByDefault?: boolean;
  /** 複数カラムソートを有効化 / Enable multi-column sorting */
  enableMultiSort?: boolean;
  /** 行番号カラムを表示 / Show row number column */
  showRowNumber?: boolean;
  /** アイテム総数（表示用） / Total item count for display */
  itemCount?: number;
  /** 追加ボタンのコールバック / Callback for floating add button */
  onAdd?: () => void;
  /** 総ページ数（手動ページネーション時） / Total page count for manual pagination */
  pageCount?: number;
  /** 総行数（手動ページネーション時） / Total row count for manual pagination */
  rowCount?: number;
  /**
   * ページ変更時のコールバック / Pagination change callback
   * 操作による変更要求時に通知。初期マウント・props同期では通知しません。
   */
  onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void;
  /** ソートの変更要求時のコールバック（初期マウント・props同期では通知しない） / Requested sorting change */
  onSortingChange?: (sorting: SortingState) => void;
  /** フィルタ変更時のコールバック / Filter change callback */
  onColumnFiltersChange?: (filters: ColumnFiltersState) => void;
  /** 行クリック時のコールバック / Row click callback */
  onRowClick?: (rowId: string | number) => void;
  /** 選択変更時のコールバック / Selection change callback */
  onSelectionChange?: (selectedRows: TData[]) => void;
  /** 行ID用フィールド名 / Row ID field name */
  rowIdField?: string;
  /** サーバーサイドページネーション / Server-side pagination */
  manualPagination?: boolean;
  /** サーバーサイドソート / Server-side sorting */
  manualSorting?: boolean;
  /** サーバーサイドフィルタ / Server-side filtering */
  manualFiltering?: boolean;
  /** フィルタ対象カラム / Filter column name */
  filterColumn?: string;
  /** ページサイズのオプション / Page size options */
  pageSizeOptions?: number[];
  /** ソート推移のオプション（外部制御用） / Sorting state for controlled mode */
  sorting?: SortingState;
  /**
   * 現在のページネーション（外部制御用） / Pagination state for controlled mode
   * 指定時はページ自動リセット（autoResetPageIndex）を無効化します。
   */
  pagination?: PaginationState;
  /** 列の並べ替え有効化 / Enable column reordering */
  enableColumnOrdering?: boolean;
  /** コンテナのクラス名 / Container class name */
  containerClassName?: string;
  /** テーブルのクラス名 / Table class name */
  tableClassName?: string;
  /** フィルターのレイアウトモード / Filter layout mode */
  filterLayout?: 'inline' | 'panel';
  /** フィルターパネルの初期開閉状態 / Default open state of the filter panel */
  defaultFilterOpen?: boolean;
  /** アクティブフィルター表示用のコンテンツ / Custom active filters component or node */
  activeFiltersContent?: React.ReactNode;
}

// =============================================================================
// DataTable Component
// =============================================================================

/**
 * データテーブルコンポーネント
 *
 * ソート、フィルタ、ページネーション、行選択、列並べ替えに対応した
 * 高機能なデータテーブル。TanStack Table を使用。
 *
 * ## 制御モード (Controlled Mode)
 * `sorting` と `pagination` プロップスを渡すことで、外部状態からテーブルを制御できます。
 * これにより、サーバーサイドソートとクライアントサイドページネーションといった
 * 柔軟な組み合わせが、共有ライブラリ側のロジックを変更せずに実現可能です。
 *
 * 補足:
 * - `pagination` を指定した場合、`manualPagination` が false でも `onPaginationChange` を通知します。
 * - `pagination` 指定時はデータ更新時の `pageIndex` 自動リセットを無効化します。
 *
 * @example 基本的な使い方 (Uncontrolled)
 * ```tsx
 * <DataTable columns={columns} data={data} />
 * ```
 *
 * @example 外部状態によるソート制御 (Controlled Sorting)
 * ```tsx
 * const [sorting, setSorting] = useState<SortingState>([]);
 * <DataTable
 *   columns={columns}
 *   data={data}
 *   sorting={sorting}
 *   onSortingChange={setSorting}
 *   manualSorting={true}
 * />
 * ```
 */
export function DataTable<TData extends object, TValue>({
  columns,
  data,
  variant = 'default',
  filterContent,
  storageKey,
  enableSortingByDefault = true,
  enableMultiSort = false,
  showRowNumber = false,
  itemCount,
  onAdd,
  pageCount,
  rowCount,
  onPaginationChange,
  onSortingChange,
  onColumnFiltersChange,
  onRowClick,
  onSelectionChange,
  rowIdField = 'id',
  manualPagination = false,
  manualSorting = false,
  manualFiltering = false,
  filterColumn,
  sorting: controlledSorting,
  pagination: controlledPagination,
  enableColumnOrdering = true,
  containerClassName,
  tableClassName,
  pageSizeOptions = [10, 20, 30, 50, 100],
  filterLayout = 'inline',
  defaultFilterOpen = false,
  activeFiltersContent,
}: DataTableProps<TData, TValue>) {
  'use no memo';

  // Get persisted settings from store (must be called before any early returns)
  const getTableSettings = useDataTableStore((state) => state.getTableSettings);
  const setTableSettings = useDataTableStore((state) => state.setTableSettings);
  const hasHydrated = useDataTableStore((state) => state._hasHydrated);

  // SSR safety: Only render on client
  // useSyncExternalStore ensures we have a consistent value during hydration
  const mounted = React.useSyncExternalStore(
    React.useCallback(() => () => {}, []),
    () => true,
    () => false,
  );
  const [filterOpen, setFilterOpen] = React.useState(defaultFilterOpen);

  // Initialize state with default values (SSR-safe)
  const [localSorting, setLocalSorting] = React.useState<SortingState>(controlledSorting || []);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [localPagination, setLocalPagination] = React.useState<PaginationState>(
    controlledPagination || {
      pageIndex: 0,
      pageSize: 10,
    },
  );
  const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>(
    columns.map((c) => c.id || ((c as { accessorKey?: string }).accessorKey as string)),
  );
  const isPaginationControlled = controlledPagination !== undefined;
  const sorting = controlledSorting ?? localSorting;
  const pagination = controlledPagination ?? localPagination;
  const setSorting: React.Dispatch<React.SetStateAction<SortingState>> = (updater) => {
    const next = typeof updater === 'function' ? updater(sorting) : updater;
    if (controlledSorting === undefined) setLocalSorting(next);
    onSortingChange?.(next);
  };
  const setPagination: React.Dispatch<React.SetStateAction<PaginationState>> = (updater) => {
    const next = typeof updater === 'function' ? updater(pagination) : updater;
    if (controlledPagination === undefined) setLocalPagination(next);
    onPaginationChange?.(next);
  };
  const [settingsLoaded, setSettingsLoaded] = React.useState<string | null>(null);
  const columnIdListKey = React.useMemo(
    () => columns.map((c) => c.id || (c as { accessorKey?: string }).accessorKey || '').join('|'),
    [columns],
  );
  const validColumnIds = React.useMemo(
    () => new Set(columnIdListKey.split('|').filter(Boolean)),
    [columnIdListKey],
  );

  // Guarded render-time hydration, avoiding a stale-state effect render.
  const loadKey = storageKey ? JSON.stringify([storageKey, columnIdListKey, Boolean(controlledSorting), Boolean(controlledPagination)]) : null;
  if (hasHydrated && storageKey && settingsLoaded !== loadKey) {
    setSettingsLoaded(loadKey);
    const storedSettings = getTableSettings(storageKey);
    if (storedSettings) {
      if (!controlledSorting && storedSettings.sorting && storedSettings.sorting.length > 0) {
        // Filter out sorting for columns that no longer exist
        const validSorting = storedSettings.sorting.filter((s) => validColumnIds.has(s.id));
        if (validSorting.length > 0) {
          setLocalSorting(validSorting);
        }
      }
      if (
        storedSettings.columnVisibility &&
        Object.keys(storedSettings.columnVisibility).length > 0
      ) {
        // Filter out visibility for columns that no longer exist
        const validVisibility: Record<string, boolean> = {};
        for (const [key, value] of Object.entries(storedSettings.columnVisibility)) {
          if (validColumnIds.has(key)) {
            validVisibility[key] = value;
          }
        }
        if (Object.keys(validVisibility).length > 0) {
          setColumnVisibility(validVisibility);
        }
      }
      if (!controlledPagination && storedSettings.pageSize && storedSettings.pageSize !== 10) {
        setLocalPagination((prev) => ({ ...prev, pageSize: storedSettings.pageSize }));
      }
      if (storedSettings.columnOrder && storedSettings.columnOrder.length > 0) {
        // Filter out columns that no longer exist and add new columns
        const validStoredOrder = storedSettings.columnOrder.filter((id) => validColumnIds.has(id));
        const storedOrderSet = new Set(validStoredOrder);
        const newColumns = Array.from(validColumnIds).filter((id) => !storedOrderSet.has(id));
        const mergedOrder = [...validStoredOrder, ...newColumns];
        if (mergedOrder.length > 0) {
          setColumnOrder(mergedOrder);
        }
      }
    }
  }

  // Row number column definition (MUST be called before early return)
  const rowNumberColumn: ColumnDef<TData, TValue> = React.useMemo(
    () => ({
      id: 'rowNumber',
      header: 'No',
      enableSorting: false,
      cell: ({ row, table: tableInstance }) => {
        const paginationState = tableInstance.store.state.pagination;
        if (paginationState) {
          return paginationState.pageIndex * paginationState.pageSize + row.index + 1;
        }
        return row.index + 1;
      },
    }),
    [],
  );

  // Add row number column if requested (MUST be called before early return)
  const columnsWithRowNumber = React.useMemo(() => {
    const cols = showRowNumber ? [rowNumberColumn, ...columns] : columns;
    // Apply enableSortingByDefault to all columns that don't explicitly disable sorting
    if (enableSortingByDefault) {
      return cols.map((col) => ({
        ...col,
        enableSorting: col.enableSorting !== false,
      }));
    }
    return cols;
  }, [showRowNumber, columns, rowNumberColumn, enableSortingByDefault]);

  // Helper to extract nested ID safely (MUST be called before early return)
  const getRowId = React.useCallback(
    (originalRow: TData) => {
      if (!rowIdField) return undefined;
      // Simple dot notation support for id field

      return rowIdField.split('_').reduce<unknown>((obj, key) => {
        if (
          obj &&
          typeof obj === 'object' &&
          key !== '__proto__' &&
          key !== 'constructor' &&
          key !== 'prototype' &&
          Object.prototype.hasOwnProperty.call(obj, key)
        ) {
          return (obj as Record<string, unknown>)[key];
        }
        return undefined;
      }, originalRow as unknown);
    },
    [rowIdField],
  );

  // Persist settings to store (MUST be called before early return)
  React.useEffect(() => {
    if (storageKey && hasHydrated && settingsLoaded === loadKey) {
      setTableSettings(storageKey, {
        columnOrder,
        columnVisibility,
        sorting,
        pageSize: pagination.pageSize,
      });
    }
  }, [storageKey, columnOrder, columnVisibility, sorting, pagination.pageSize, setTableSettings, hasHydrated, settingsLoaded, loadKey]);

  React.useEffect(() => {
    if (manualFiltering && onColumnFiltersChange) {
      onColumnFiltersChange(columnFilters);
    }
  }, [columnFilters, manualFiltering, onColumnFiltersChange]);

  // Create table instance (MUST be called before early return)
  const table = useTable({
    features: dataTableFeatures,
    data,
    // Table 9 erases heterogeneous cell values to unknown at the table boundary.
    columns: columnsWithRowNumber as ColumnDef<TData>[],
    pageCount: manualPagination ? pageCount : undefined,
    rowCount: manualPagination ? rowCount : undefined,
    getRowId: rowIdField
      ? (originalRow, index) => {
          const id = rowIdField.split('_').reduce<unknown>((obj, key) => {
            if (obj && typeof obj === 'object' && key in (obj as Record<string, unknown>)) {
              return (obj as Record<string, unknown>)[key];
            }
            return undefined;
          }, originalRow as unknown);
          return id !== undefined ? String(id) : String(index);
        }
      : undefined,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
      columnOrder,
    },
    enableRowSelection: true,
    enableMultiSort,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    onColumnOrderChange: setColumnOrder,
    autoResetPageIndex: manualPagination || isPaginationControlled ? false : undefined,
    manualPagination,
    manualSorting,
    manualFiltering,
  });

  // Sync selection to parent (MUST be called before early return)
  React.useEffect(() => {
    if (onSelectionChange) {
      const selectedRows = table.getFilteredSelectedRowModel().rows.map((row) => row.original);
      onSelectionChange(selectedRows);
    }
  }, [rowSelection, table, onSelectionChange]);

  // DnD Sensors (MUST be called before early return)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Handle drag end callback (MUST be defined before early return)
  const handleDragEnd = React.useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setColumnOrder((order) => {
        const oldIndex = order.indexOf(active.id as string);
        const newIndex = order.indexOf(over.id as string);
        return arrayMove(order, oldIndex, newIndex);
      });
    }
  }, []);

  // Get sort index for multi-sort display (MUST be called before early return)
  const getSortIndex = React.useCallback(
    (columnId: string): number => {
      return sorting.findIndex((s) => s.id === columnId);
    },
    [sorting],
  );

  // Render table content (MUST be called before early return)
  const renderTable = React.useCallback(
    () => (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className={cn('rounded-md border', tableClassName)}>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <SortableContext
                  key={headerGroup.id}
                  items={columnOrder}
                  strategy={horizontalListSortingStrategy}
                >
                  <TableRow>
                    {headerGroup.headers.map((header) => (
                      <DataTableColumnHeader
                        key={header.id}
                        header={header}
                        enableColumnOrdering={enableColumnOrdering}
                        enableMultiSort={enableMultiSort}
                        sortIndex={getSortIndex(header.column.id)}
                      />
                    ))}
                  </TableRow>
                </SortableContext>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    onClick={() =>
                      onRowClick && onRowClick(getRowId(row.original) as string | number)
                    }
                    className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columnsWithRowNumber.length} className='h-24 text-center'>
                    {m.dataTable_noResults()}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DndContext>
    ),
    [
      sensors,
      handleDragEnd,
      table,
      columnsWithRowNumber,
      columnOrder,
      enableColumnOrdering,
      enableMultiSort,
      getSortIndex,
      onRowClick,
      getRowId,
      tableClassName,
    ],
  );

  // Render loading table during SSR - simple version to avoid hydration issues
  const renderLoadingTable = () => (
    <div className={cn('rounded-md border', tableClassName)}>
      <Table>
        <TableBody>
          <TableRow>
            <TableCell className='h-24 text-center'>
              <div className='text-muted-foreground'>Loading...</div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );

  // Variant: minimal - just table with pagination
  if (variant === 'minimal') {
    return (
      <div className={cn('space-y-4', containerClassName)}>
        {mounted ? renderTable() : renderLoadingTable()}
        <DataTablePagination table={table} pageSizeOptions={pageSizeOptions} />
      </div>
    );
  }

  // Variant: toolbar - setagaya-front style with toolbar above table
  if (variant === 'toolbar') {
    return (
      <div className={cn('relative h-full', containerClassName)}>
        {onAdd && (
          <div className='absolute left-0 top-0 w-full h-full z-10 pointer-events-none'>
            <div className='fixed right-4 bottom-10 pointer-events-auto'>
              <Button
                type='button'
                size='icon'
                aria-label='Add row'
                onClick={onAdd}
                className='w-12 h-12 rounded-full shadow-lg'
              >
                <Plus className='w-6 h-6' />
              </Button>
            </div>
          </div>
        )}
        <div className='relative h-full flex flex-col'>
          {/* Toolbar */}
          <div className='bg-muted p-2 rounded-t-md grid grid-cols-1 sm:grid-cols-[1fr_minmax(0,auto)_1fr] items-center gap-2'>
            {/* Center: Column settings + filter content */}
            <div className='flex flex-wrap justify-center items-center gap-2 sm:col-start-2 sm:col-end-3'>
              <DataTableViewOptions table={table} />
              {filterContent && filterLayout === 'inline' && filterContent}
              {filterContent && filterLayout === 'panel' && (
                <Button
                  type='button'
                  variant={filterOpen ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setFilterOpen(!filterOpen)}
                  className='h-8 gap-1.5'
                >
                  <FilterIcon className='h-4 w-4' />
                  <span>フィルター</span>
                </Button>
              )}
            </div>
            {/* Right: Pagination + count */}
            <div className='flex items-center gap-3 justify-center sm:justify-end sm:col-start-3 sm:col-end-4'>
              <DataTablePaginationCompact table={table} pageSizeOptions={pageSizeOptions} />
              {typeof itemCount === 'number' && (
                <span className='text-sm text-muted-foreground whitespace-nowrap'>
                  {`${itemCount.toLocaleString()} ${m.dataTable_items()}`}
                </span>
              )}
            </div>
          </div>
          {/* Filter Panel (Collapsible) */}
          {filterContent && filterLayout === 'panel' && (
            <div
              className={cn(
                'border-b transition-all duration-200 ease-in-out overflow-hidden bg-background',
                filterOpen ? 'max-h-[500px] p-4' : 'max-h-0 p-0 border-none',
              )}
            >
              {filterContent}
            </div>
          )}
          {/* Active Filters Display */}
          {activeFiltersContent && (
            <div className='bg-background px-4 py-1.5 border-b'>{activeFiltersContent}</div>
          )}
          {/* Table */}
          <div className='flex-1 overflow-auto'>
            {mounted ? renderTable() : renderLoadingTable()}
          </div>
        </div>
      </div>
    );
  }

  // Variant: default - current behavior
  return (
    <div className={cn('space-y-4', containerClassName)}>
      <div className='flex items-center justify-between'>
        <div className='flex items-center py-4'>
          {filterColumn && (
            <Input
              placeholder={m.dataTable_filterPlaceholder({ column: filterColumn })}
              value={(table.getColumn(filterColumn)?.getFilterValue() as string) ?? ''}
              onChange={(event) =>
                table.getColumn(filterColumn)?.setFilterValue(event.target.value)
              }
              className='max-w-sm'
            />
          )}
        </div>
        <DataTableViewOptions table={table} />
      </div>
      {activeFiltersContent && (
        <div className='border rounded-md bg-background px-3 py-1'>{activeFiltersContent}</div>
      )}
      {mounted ? renderTable() : renderLoadingTable()}
      <DataTablePagination table={table} pageSizeOptions={pageSizeOptions} />
      {onAdd && (
        <div className='fixed right-4 bottom-10 z-10'>
          <Button
            type='button'
            size='icon'
            onClick={onAdd}
            className='w-12 h-12 rounded-full shadow-lg'
          >
            <Plus className='w-6 h-6' />
          </Button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// View Options Component
// =============================================================================

interface DataTableViewOptionsProps<TData extends object> {
  table: TableInstance<TData>;
}

/**
 * テーブルの表示列を切り替える設定ドロップダウンメニューコンポーネント
 */
export function DataTableViewOptions<TData extends object>({ table }: DataTableViewOptionsProps<TData>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={buttonVariants({ variant: 'default', size: 'sm', className: 'h-8' })}
      >
        <Settings2 className='mr-2 h-4 w-4' />
        {m.dataTable_view()}
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-40'>
        <DropdownMenuGroup>
          <DropdownMenuLabel>{m.dataTable_toggleColumns()}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {table
            .getAllColumns()
            .filter((column) => typeof column.accessorFn !== 'undefined' && column.getCanHide())
            .map((column) => {
              return (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className='capitalize'
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {typeof column.columnDef.header === 'string'
                    ? column.columnDef.header
                    : column.id}
                </DropdownMenuCheckboxItem>
              );
            })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// =============================================================================
// Pagination Component (Full)
// =============================================================================

interface DataTablePaginationProps<TData extends object> {
  table: TableInstance<TData>;
  pageSizeOptions?: number[];
}

/**
 * テーブルの標準的なページネーションコントロールコンポーネント
 */
export function DataTablePagination<TData extends object>({
  table,
  pageSizeOptions = [10, 20, 30, 50, 100],
}: DataTablePaginationProps<TData>) {
  return (
    <div className='flex items-center justify-between px-2'>
      <div className='flex-1 text-sm text-muted-foreground'>
        {m.dataTable_rowsSelected({
          selected: table.getFilteredSelectedRowModel().rows.length,
          total: table.getFilteredRowModel().rows.length,
        })}
      </div>
      <div className='flex items-center space-x-6 lg:space-x-8'>
        <div className='flex items-center space-x-2'>
          <p className='text-sm font-medium'>{m.dataTable_rowsPerPage()}</p>
          <select
            aria-label={m.dataTable_rowsPerPage()}
            value={`${table.store.state.pagination.pageSize}`}
            onChange={(e) => {
              table.setPageSize(Number(e.target.value));
            }}
            className='h-8 w-fit min-w-16 rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
          >
            {pageSizeOptions.map((pageSize) => (
              <option key={pageSize} value={`${pageSize}`}>
                {pageSize}
              </option>
            ))}
          </select>
        </div>
        <div className='flex w-24 items-center justify-center text-sm font-medium'>
          {m.dataTable_page({
            current: table.store.state.pagination.pageIndex + 1,
            total: table.getPageCount(),
          })}
        </div>
        <div className='flex items-center space-x-2'>
          <Button
            variant='default'
            size='icon'
            className='hidden h-8 w-8 lg:flex hover:bg-primary/90'
            aria-label={m.dataTable_goToFirstPage()}
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className='sr-only'>{m.dataTable_goToFirstPage()}</span>
            <ChevronsLeft className='h-4 w-4' />
          </Button>
          <Button
            variant='default'
            size='icon'
            className='h-8 w-8 hover:bg-primary/90'
            aria-label={m.dataTable_goToPreviousPage()}
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className='sr-only'>{m.dataTable_goToPreviousPage()}</span>
            <ChevronLeft className='h-4 w-4' />
          </Button>
          <Button
            variant='default'
            size='icon'
            className='h-8 w-8 hover:bg-primary/90'
            aria-label={m.dataTable_goToNextPage()}
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className='sr-only'>{m.dataTable_goToNextPage()}</span>
            <ChevronRight className='h-4 w-4' />
          </Button>
          <Button
            variant='default'
            size='icon'
            className='hidden h-8 w-8 lg:flex hover:bg-primary/90'
            aria-label={m.dataTable_goToLastPage()}
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className='sr-only'>{m.dataTable_goToLastPage()}</span>
            <ChevronsRight className='h-4 w-4' />
          </Button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Pagination Component (Compact - for toolbar variant)
// =============================================================================

interface DataTablePaginationCompactProps<TData extends object> {
  table: TableInstance<TData>;
  pageSizeOptions?: number[];
}

/**
 * ツールバー等に配置するコンパクトなページネーションコントロールコンポーネント
 */
export function DataTablePaginationCompact<TData extends object>({
  table,
  pageSizeOptions = [10, 20, 30, 50, 100],
}: DataTablePaginationCompactProps<TData>) {
  const totalPages = table.getPageCount();

  return (
    <div className='flex items-center gap-1'>
      <select
            aria-label={m.dataTable_rowsPerPage()}
        value={`${table.store.state.pagination.pageSize}`}
        onChange={(e) => {
          table.setPageSize(Number(e.target.value));
        }}
        className='h-8 w-fit min-w-16 rounded-md border border-input bg-background px-2 py-1 text-sm'
      >
        {pageSizeOptions.map((pageSize) => (
          <option key={pageSize} value={`${pageSize}`}>
            {pageSize}
          </option>
        ))}
      </select>
      {totalPages > 1 && (
        <>
          <Button
            variant='default'
            size='icon'
            className='h-8 w-8 hover:bg-primary/90'
            aria-label={m.dataTable_goToFirstPage()}
            onClick={() => table.setPageIndex(0)}
            disabled={table.store.state.pagination.pageIndex === 0}
          >
            <ChevronsLeft className='h-4 w-4' />
          </Button>
          <Button
            variant='default'
            size='icon'
            className='h-8 w-8 hover:bg-primary/90'
            aria-label={m.dataTable_goToPreviousPage()}
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className='h-4 w-4' />
          </Button>
          <span className='text-sm text-muted-foreground whitespace-nowrap px-1'>
            {table.store.state.pagination.pageIndex + 1} / {totalPages}
          </span>
          <Button
            variant='default'
            size='icon'
            className='h-8 w-8 hover:bg-primary/90'
            aria-label={m.dataTable_goToNextPage()}
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className='h-4 w-4' />
          </Button>
          <Button
            variant='default'
            size='icon'
            className='h-8 w-8 hover:bg-primary/90'
            aria-label={m.dataTable_goToLastPage()}
            onClick={() => table.setPageIndex(totalPages - 1)}
            disabled={table.store.state.pagination.pageIndex === totalPages - 1}
          >
            <ChevronsRight className='h-4 w-4' />
          </Button>
        </>
      )}
    </div>
  );
}
