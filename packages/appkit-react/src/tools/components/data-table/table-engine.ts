import {
  tableFeatures,
  columnFilteringFeature, columnOrderingFeature, columnVisibilityFeature,
  globalFilteringFeature, rowPaginationFeature, rowSelectionFeature, rowSortingFeature,
  createFilteredRowModel, createPaginatedRowModel, createSortedRowModel,
  filterFns, sortFns,
} from '@tanstack/react-table';
import type {
  ColumnDef as NativeColumnDef, Row as NativeRow, Header as NativeHeader,
  Table as NativeTable, Cell as NativeCell, SortFn, RowData,
} from '@tanstack/react-table';

/** Native Table 9 features used by DataTable and TableView. Reuse for custom useTable instances. */
export const dataTableFeatures = tableFeatures({
  columnFilteringFeature, columnOrderingFeature, columnVisibilityFeature,
  globalFilteringFeature, rowPaginationFeature, rowSelectionFeature, rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  // Preserve support for named built-in functions in application-owned column definitions.
  filterFns, sortFns,
});

/** Column definition with DataTable's feature set. Table 9 uses sortFn, not sortingFn. */
export type ColumnDef<TData extends RowData, TValue = unknown> = NativeColumnDef<typeof dataTableFeatures, TData, TValue>;
/** Native Table 9 row with DataTable's features; methods must be called on the row. */
export type Row<TData extends RowData> = NativeRow<typeof dataTableFeatures, TData>;
export type Header<TData extends RowData, TValue> = NativeHeader<typeof dataTableFeatures, TData, TValue>;
/** Feature-bound table instance; publicly exported as DataTableInstance to avoid the UI Table name. */
export type Table<TData extends RowData> = NativeTable<typeof dataTableFeatures, TData>;
export type Cell<TData extends RowData, TValue> = NativeCell<typeof dataTableFeatures, TData, TValue>;
/** Comparator for a Table 9 column's sortFn option using this package's feature set. */
export type SortingFn<TData extends RowData> = SortFn<typeof dataTableFeatures, TData>;
export { flexRender, useTable } from '@tanstack/react-table';
export type { SortingState, ColumnFiltersState, ColumnVisibilityState as VisibilityState, ColumnOrderState, PaginationState } from '@tanstack/react-table';
