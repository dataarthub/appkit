/**
 * DataTable module exports.
 *
 * Provides a feature-rich data table component with:
 * - Sorting (single and multi-column)
 * - Pagination
 * - Column visibility and reordering
 * - Row selection
 * - State persistence via Zustand
 * - Multiple layout variants
 * - Declarative column definition helpers
 *
 * @example
 * ```tsx
 * import { DataTable, createColumnsFromHeads } from '@alneas/appkit-react/tools/data-table';
 *
 * const heads = [
 *   { field: 'name', text: '名前', type: 'String' },
 *   { field: 'date', text: '日付', type: 'Date' },
 * ];
 *
 * const columns = createColumnsFromHeads(heads);
 *
 * <DataTable columns={columns} data={data} variant="toolbar" />
 * ```
 */

// DataTable component and variants
export {
  DataTable,
  DataTableViewOptions,
  DataTablePagination,
  DataTablePaginationCompact,
} from './data-table';
export type { DataTableProps, DataTableVariant } from './data-table';

// TableView compound components
export { TableView, useTableCompoundContext } from './table-compound';
export type {
  TableCompoundContextValue,
  TableViewRootProps,
  TableViewToolbarProps,
  TableViewSearchInputProps,
  TableViewContentProps,
  TableViewBodySlotProps,
  TableViewFooterProps,
} from './table-compound';

// Re-export ColumnDef from @tanstack/react-table for convenience
export { dataTableFeatures } from './table-engine';
export type {
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  PaginationState,
  Row,
  Table as DataTableInstance,
  SortingFn,
} from './table-engine';

// DataTableView wrapper (with Filter + useFind)
export { DataTableView } from './data-table-view';
export type { DataTableViewProps, PaginationMode, FilterMode } from './data-table-view';

// Table utilities
export {
  getNestedValue,
  cellGenerators,
  createColumnsFromHeads,
  timeSort,
  trimmedSort,
  joinValues,
  filterDataByMongoQuery,
} from './table-utils';
export type { KV, CellType, TableHeadBase, CreateColumnsOptions } from './table-utils';

// Table store for persistence
export { useDataTableStore, defaultSettings } from './table-store';
export type { TableSettings, SavedView } from './table-store';

// Saved views menu
export { SavedViewsMenu } from './saved-views-menu';
export type { SavedViewsMenuProps } from './saved-views-menu';

// Config
export * from './config';

// Editable cells
export { EditableToggle, EditableSelect, EditableText } from './editable-cells';
export type { EditableCellProps, EditableSelectProps } from './editable-cells';

// Schema-driven column generation
export {
  schemaToTableHeads,
  getSchemaLabels,
  getSchemaRequired,
  getSchemaDefaults,
  getSchemaColumnVisibility,
} from './schema-columns';
export type {
  XUIExtension,
  SchemaProperty,
  JSONSchemaWithUI,
  SchemaToColumnsOptions,
} from './schema-columns';

// ResourceDataTable and BaseResourcePage
export { ResourceDataTable } from './ResourceDataTable';
export type {
  ResourceDataTableProps,
  DataTableParams,
  RowData,
  SchemaLike,
  SchemaProperty as ResourceDataTableSchemaProperty,
} from './ResourceDataTable';
export { BaseResourcePage } from './BaseResourcePage';
export type { BaseResourcePageProps } from './BaseResourcePage';
