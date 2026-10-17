import React, { useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

export interface EditableTableColumn<T> {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  /** Render function for custom cell content, like inputs */
  render?: (item: T, index: number) => React.ReactNode;
  width?: string;
  cellClassName?: string;
  headerClassName?: string;
  /** Whether the cell contains an input and should remove padding */
  isEditable?: boolean;
}

export interface EditableTableProps<T> {
  columns: EditableTableColumn<T>[];
  data: T[];
  emptyMessage?: string;
  onRemove?: (index: number) => void;
  onAddRow?: () => void;
  getRowKey?: (item: T, index: number) => string;
  renderRowActions?: (item: T, index: number) => React.ReactNode;
  renderExtraRow?: (item: T, index: number) => React.ReactNode;
  className?: string;
  isWrapped?: boolean;
  zoomLevel?: number; // 0: 100%, 1: 90%, 2: 80%, 3: 70%, 4: 60%
  onRowBlur?: (index: number) => void;
}

/**
 * キーボードナビゲーションに対応した、インライン編集可能なテーブルコンポーネント。
 */
export function EditableTable<T extends Record<string, any>>({
  columns,
  data,
  emptyMessage = 'データがありません',
  onRemove,
  onAddRow,
  getRowKey = (_, index) => `row-${index}`,
  renderRowActions,
  renderExtraRow,
  className = '',
  isWrapped = false,
  zoomLevel = 0,
  onRowBlur,
}: EditableTableProps<T>) {
  const tableRef = useRef<HTMLTableElement>(null);
  const onAddRowRef = useRef(onAddRow);
  useEffect(() => {
    onAddRowRef.current = onAddRow;
  });
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((id) => clearTimeout(id));
      timers.clear();
    };
  }, []);

  const isWithinSearchableSelectPortal = (node: EventTarget | Node | null) => {
    if (!(node instanceof HTMLElement)) return false;
    return Boolean(node.closest('[data-searchable-select-portal="true"]'));
  };

  // Handle keyboard navigation
  useEffect(() => {
    const table = tableRef.current;
    if (!table) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      if (!activeElement || !table.contains(activeElement)) return;

      // Don't trigger if user is composing text (IME)
      if (e.isComposing) return;

      // Check if we're in an input/textarea/select
      const isInput =
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'SELECT' ||
        activeElement.getAttribute('role') === 'combobox';

      if (!isInput) return;

      const input = activeElement as HTMLElement;
      const cell = input.closest('td');
      if (!cell) return;

      const row = cell.closest('tr');
      if (!row) return;

      const tbody = row.closest('tbody');
      if (!tbody) return;

      const allRows = Array.from(tbody.querySelectorAll('tr:not([class*="extra"])'));
      const currentRowIndex = allRows.indexOf(row);
      const allCells = Array.from(row.querySelectorAll('td'));
      const currentCellIndex = allCells.indexOf(cell);

      let targetCell: HTMLElement | null = null;

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          if (currentCellIndex < allCells.length - 1) {
            targetCell = allCells[currentCellIndex + 1];
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (currentCellIndex > 0) {
            targetCell = allCells[currentCellIndex - 1];
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (currentRowIndex < allRows.length - 1) {
            const nextRow = allRows[currentRowIndex + 1];
            const nextRowCells = Array.from(nextRow.querySelectorAll('td'));
            if (nextRowCells[currentCellIndex]) {
              targetCell = nextRowCells[currentCellIndex];
            }
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (currentRowIndex > 0) {
            const prevRow = allRows[currentRowIndex - 1];
            const prevRowCells = Array.from(prevRow.querySelectorAll('td'));
            if (prevRowCells[currentCellIndex]) {
              targetCell = prevRowCells[currentCellIndex];
            }
          }
          break;
        case 'Enter':
          if (activeElement.tagName !== 'TEXTAREA' && !e.shiftKey) {
            e.preventDefault();
            const isLastRow = currentRowIndex === allRows.length - 1;
            const isLastCell = currentCellIndex >= allCells.length - 1;
            const scheduleTimeout = (cb: () => void, ms: number) => {
              const timerId = setTimeout(() => {
                timersRef.current.delete(timerId);
                cb();
              }, ms);
              timersRef.current.add(timerId);
            };

            scheduleTimeout(() => {
              if (currentCellIndex < allCells.length - 1) {
                targetCell = allCells[currentCellIndex + 1];
              } else if (currentRowIndex < allRows.length - 1) {
                const nextRow = allRows[currentRowIndex + 1];
                const nextRowCells = Array.from(nextRow.querySelectorAll('td'));
                if (nextRowCells[0]) {
                  targetCell = nextRowCells[0];
                }
              } else if (isLastRow && isLastCell && onAddRowRef.current) {
                onAddRowRef.current();
                scheduleTimeout(() => {
                  const newRows = Array.from(tbody.querySelectorAll('tr:not([class*="extra"])'));
                  const newLastRow = newRows[newRows.length - 1];
                  if (newLastRow) {
                    const firstInput = newLastRow.querySelector(
                      'input, textarea, select, [role="combobox"]',
                    ) as HTMLElement;
                    if (firstInput) {
                      firstInput.focus();
                      if (firstInput instanceof HTMLInputElement && firstInput.type !== 'number') {
                        firstInput.select();
                      }
                    }
                  }
                }, 100);
              }
              if (targetCell) {
                const nextInput = targetCell.querySelector(
                  'input, textarea, select, [role="combobox"]',
                ) as HTMLElement;
                if (nextInput) {
                  nextInput.focus();
                  if (nextInput instanceof HTMLInputElement && nextInput.type !== 'number') {
                    nextInput.select();
                  }
                }
              }
            }, 50);
          }
          return;
        case 'Tab':
          return;
      }

      if (targetCell) {
        const nextInput = targetCell.querySelector(
          'input, textarea, select, [role="combobox"]',
        ) as HTMLElement;
        if (nextInput) {
          nextInput.focus();
          if (nextInput instanceof HTMLInputElement && nextInput.type !== 'number') {
            nextInput.select();
          }
        }
      }
    };

    table.addEventListener('keydown', handleKeyDown);
    return () => table.removeEventListener('keydown', handleKeyDown);
  }, [columns, data]);

  const wrapClass = isWrapped
    ? '[&_td]:whitespace-normal [&_td_*]:whitespace-normal [&_th]:whitespace-normal'
    : '[&_td]:whitespace-nowrap [&_th]:whitespace-nowrap';

  const zoomClasses = [
    '', // 0: 100%
    '[&_td]:text-[0.85rem] [&_th]:text-[0.85rem] [&_td_*]:text-[0.85rem] [&_button]:h-7 [&_input]:h-7 [&_select]:h-7', // 1: 85%
    '[&_td]:text-[0.75rem] [&_th]:text-[0.75rem] [&_td_*]:text-[0.75rem] [&_button]:h-6 [&_input]:h-6 [&_select]:h-6', // 2: 75%
    '[&_td]:text-[0.65rem] [&_th]:text-[0.65rem] [&_td_*]:text-[0.65rem] [&_button]:h-5 [&_input]:h-5 [&_select]:h-5', // 3: 65%
    '[&_td]:text-[0.55rem] [&_th]:text-[0.55rem] [&_td_*]:text-[0.55rem] [&_button]:h-4 [&_input]:h-4 [&_select]:h-4', // 4: 55%
  ];
  const zoomClass = zoomClasses[Math.min(zoomLevel, zoomClasses.length - 1)] || '';

  return (
    <div className={`${className} ${wrapClass} ${zoomClass} overflow-x-auto`}>
      <Table ref={tableRef}>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={`px-2 py-1 h-auto border border-border align-middle ${col.headerClassName || ''}`}
                style={{
                  textAlign: col.align || 'center',
                  verticalAlign: 'middle',
                  minWidth: col.width,
                }}
              >
                {col.label}
              </TableHead>
            ))}
            {renderRowActions && <TableHead className='px-2 py-1 h-auto'></TableHead>}
            {onRemove && <TableHead className='px-2 py-1 h-auto'></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length + (renderRowActions ? 1 : 0) + (onRemove ? 1 : 0)}
                className='h-24 text-center'
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((item, index) => {
              const rowKey = getRowKey(item, index);
              return (
                <React.Fragment key={rowKey}>
                  <TableRow
                    className='hover:bg-muted/50'
                    onBlur={(e: React.FocusEvent<HTMLTableRowElement>) => {
                      if (!onRowBlur) return;

                      const currentTarget = e.currentTarget;
                      const nextTarget = e.relatedTarget;

                      if (currentTarget.contains(nextTarget as Node | null)) return;
                      if (isWithinSearchableSelectPortal(nextTarget)) return;

                      window.setTimeout(() => {
                        if (!currentTarget.isConnected) return;

                        const active = document.activeElement;
                        if (currentTarget.contains(active)) return;
                        if (isWithinSearchableSelectPortal(active)) return;

                        onRowBlur(index);
                      }, 0);
                    }}
                  >
                    {columns.map((col) => {
                      const cellContent = (col.render ? col.render(item, index) : item[col.key]) as React.ReactNode;
                      const isEditable =
                        col.isEditable !== undefined ? col.isEditable : !!col.render;

                      return (
                        <TableCell
                          key={col.key}
                          className={`text-sm border border-border ${isEditable || col.cellClassName ? 'p-0' : 'px-2 py-1'} ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : ''} ${col.cellClassName || ''}`}
                        >
                          <div className={isEditable ? 'w-full h-full' : ''}>{cellContent}</div>
                        </TableCell>
                      );
                    })}
                    {renderRowActions && (
                      <TableCell className='px-1 py-1 text-center'>
                        {renderRowActions(item, index)}
                      </TableCell>
                    )}
                    {onRemove && (
                      <TableCell className='px-1 py-1 text-center'>
                        <Button
                          type='button'
                          variant='destructive'
                          size='sm'
                          className='h-6 w-6 p-0'
                          onClick={() => onRemove(index)}
                        >
                          <Trash2 className='h-3 w-3' />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                  {renderExtraRow && (
                    <TableRow key={`${rowKey}-extra`} className='bg-muted/50 hover:bg-muted/50'>
                      <TableCell
                        colSpan={columns.length + (renderRowActions ? 1 : 0) + (onRemove ? 1 : 0)}
                        className='px-4 py-2'
                      >
                        {renderExtraRow(item, index)}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
