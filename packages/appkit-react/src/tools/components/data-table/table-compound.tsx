/**
 * @fileoverview Table Compound Components (TableView)
 *
 * 合成可能なデータテーブルUIコンポーネント群。
 * プリセットの `<DataTable>` では対応しきれないツールバーの独自ボタン追加や
 * 独自フィルター、カスタムフッターのレイアウトを可能にします。
 *
 * @module data-table/table-compound
 */

/* eslint-disable react-refresh/only-export-components */

import * as React from 'react';
import {
  type Table as TableInstance,
  type Header,
  type Row,
  type Cell,
  flexRender,
} from './table-engine';
import { cn } from "../../lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Input } from '../ui/input';
import { DataTableViewOptions, DataTablePagination, DataTablePaginationCompact } from './data-table';
import * as m from '../../paraglide/messages.js';

// =============================================================================
// Context
// =============================================================================

export interface TableCompoundContextValue<TData extends object = any> {
  table: TableInstance<TData>;
  onRowClick?: (row: Row<TData>, event: React.MouseEvent) => void;
  selectedRowClassName?: string;
}

const TableCompoundContext = React.createContext<TableCompoundContextValue | null>(null);

/**
 * TableCompound のコンテキストを取得するフック
 */
export function useTableCompoundContext<TData extends object = any>(): TableCompoundContextValue<TData> {
  const context = React.useContext(TableCompoundContext);
  if (!context) {
    throw new Error('TableView compound components must be used within a <TableView.Root>');
  }
  return context as TableCompoundContextValue<TData>;
}

// =============================================================================
// Root
// =============================================================================

export interface TableViewRootProps<TData extends object> extends React.HTMLAttributes<HTMLDivElement> {
  table: TableInstance<TData>;
  onRowClick?: (row: Row<TData>, event: React.MouseEvent) => void;
  selectedRowClassName?: string;
  children: React.ReactNode;
}

/**
 * テーブルのルートコンポーネント
 */
export function TableViewRoot<TData extends object>({
  table,
  onRowClick,
  selectedRowClassName,
  children,
  className,
  ...props
}: TableViewRootProps<TData>) {
  const contextValue = React.useMemo<TableCompoundContextValue<TData>>(
    () => ({ table, onRowClick, selectedRowClassName }),
    [table, onRowClick, selectedRowClassName],
  );

  return (
    <TableCompoundContext.Provider value={contextValue}>
      <div className={cn('space-y-4 w-full', className)} {...props}>
        {children}
      </div>
    </TableCompoundContext.Provider>
  );
}

// =============================================================================
// Toolbar
// =============================================================================

export interface TableViewToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

/**
 * テーブルのツールバーコンテナ
 */
export function TableViewToolbar({ className, children, ...props }: TableViewToolbarProps) {
  return (
    <div
      className={cn('flex flex-wrap items-center justify-between gap-3', className)}
      {...props}
    >
      {children}
    </div>
  );
}

// =============================================================================
// Search Input Slot
// =============================================================================

export interface TableViewSearchInputProps extends Omit<React.ComponentProps<typeof Input>, 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
}

/**
 * 検索入力欄
 */
export function TableViewSearchInput({
  placeholder,
  value: propValue,
  onChange,
  className,
  ...props
}: TableViewSearchInputProps) {
  const { table } = useTableCompoundContext();
  const globalFilter = propValue ?? (table.store.state.globalFilter as string) ?? '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (onChange) {
      onChange(val);
    } else {
      table.setGlobalFilter(val);
    }
  };

  return (
    <Input
      placeholder={placeholder ?? m.common_actions_search()}
      value={globalFilter}
      onChange={handleChange}
      className={cn('h-9 w-full max-w-[280px]', className)}
      {...props}
    />
  );
}

// =============================================================================
// View Options (Column Visibility)
// =============================================================================

/**
 * 列表示切替ドロップダウン
 */
export function TableViewOptionsSlot({ className }: { className?: string }) {
  const { table } = useTableCompoundContext();
  return (
    <div className={className}>
      <DataTableViewOptions table={table} />
    </div>
  );
}

// =============================================================================
// Content & Table Body
// =============================================================================

export interface TableViewContentProps extends React.HTMLAttributes<HTMLDivElement> {
  tableClassName?: string;
  bordered?: boolean;
}

/**
 * テーブル本体領域
 */
export function TableViewContent({
  bordered = true,
  tableClassName,
  className,
  children,
  ...props
}: TableViewContentProps) {
  return (
    <div
      className={cn(
        'relative w-full overflow-auto rounded-lg',
        bordered && 'border border-border',
        className,
      )}
      {...props}
    >
      <Table className={cn('w-full caption-bottom text-sm', tableClassName)}>
        {children ? (
          children
        ) : (
          <>
            <TableViewHeaderSlot />
            <TableViewBodySlot />
          </>
        )}
      </Table>
    </div>
  );
}

/**
 * テーブルヘッダー
 */
export function TableViewHeaderSlot({ className }: { className?: string }) {
  const { table } = useTableCompoundContext();

  return (
    <TableHeader className={cn('bg-muted/50 border-b border-border', className)}>
      {table.getHeaderGroups().map((headerGroup) => (
        <TableRow key={headerGroup.id} className="hover:bg-transparent">
          {headerGroup.headers.map((header: Header<any, any>) => (
            <TableHead key={header.id} className="font-semibold text-foreground">
              {header.isPlaceholder
                ? null
                : flexRender(header.column.columnDef.header, header.getContext())}
            </TableHead>
          ))}
        </TableRow>
      ))}
    </TableHeader>
  );
}

export interface TableViewBodySlotProps {
  emptyMessage?: React.ReactNode;
  className?: string;
}

/**
 * テーブルボディ
 */
export function TableViewBodySlot({ emptyMessage, className }: TableViewBodySlotProps) {
  const { table, onRowClick, selectedRowClassName } = useTableCompoundContext();
  const rows = table.getRowModel().rows;
  const colSpan = table.getAllColumns().length;

  return (
    <TableBody className={className}>
      {rows.length > 0 ? (
        rows.map((row: Row<any>) => {
          const isSelected = row.getIsSelected();
          return (
            <TableRow
              key={row.id}
              data-state={isSelected ? 'selected' : undefined}
              className={cn(
                onRowClick && 'cursor-pointer hover:bg-muted/60 transition-colors',
                isSelected && (selectedRowClassName ?? 'bg-primary/5 font-medium'),
              )}
              onClick={(e) => onRowClick?.(row, e)}
            >
              {row.getVisibleCells().map((cell: Cell<any, any>) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          );
        })
      ) : (
        <TableRow>
          <TableCell colSpan={colSpan} className="h-24 text-center text-muted-foreground">
            {emptyMessage ?? m.dataTable_noResults()}
          </TableCell>
        </TableRow>
      )}
    </TableBody>
  );
}

// =============================================================================
// Footer & Pagination
// =============================================================================

export interface TableViewFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

/**
 * テーブルフッターコンテナ
 */
export function TableViewFooter({ className, children, ...props }: TableViewFooterProps) {
  return (
    <div
      className={cn('flex flex-wrap items-center justify-between gap-3 pt-2', className)}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * ページネーションコントロール
 */
export function TableViewPaginationSlot({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { table } = useTableCompoundContext();

  if (compact) {
    return <DataTablePaginationCompact table={table} />;
  }

  return <DataTablePagination table={table} />;
}

/**
 * 選択中行数の表示
 */
export function TableViewSelectedCountSlot({ className }: { className?: string }) {
  const { table } = useTableCompoundContext();
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const totalCount = table.getFilteredRowModel().rows.length;

  if (selectedCount === 0) return null;

  return (
    <div className={cn('text-xs text-muted-foreground', className)}>
      {selectedCount} / {totalCount} 件選択中
    </div>
  );
}

// =============================================================================
// Export Object
// =============================================================================

export const TableView = {
  Root: TableViewRoot,
  Toolbar: TableViewToolbar,
  SearchInput: TableViewSearchInput,
  ViewOptions: TableViewOptionsSlot,
  Content: TableViewContent,
  Header: TableViewHeaderSlot,
  Body: TableViewBodySlot,
  Footer: TableViewFooter,
  Pagination: TableViewPaginationSlot,
  SelectedCount: TableViewSelectedCountSlot,
};
