import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  useTable,
  dataTableFeatures,
  type ColumnDef,
} from '../../../src/tools/components/data-table/table-engine';
import { DataTable } from '../../../src/tools/components/data-table/data-table';
import { TableView } from '../../../src/tools/components/data-table/table-compound';
import { createColumnsFromHeads, TableHeadBase } from '../../../src/tools/components/data-table/table-utils';
import { Checkbox } from '../../../src/tools/components/ui/checkbox';
import { Button } from '../../../src/tools/components/ui/button';
import { Input } from '../../../src/tools/components/ui/input';

// =============================================================================
// Sample Data Types
// =============================================================================

type Payment = {
  id: string;
  amount: number;
  status: 'pending' | 'processing' | 'success' | 'failed';
  email: string;
};

type Employee = {
  id: number;
  name: string;
  department: string;
  birthday: string;
  startTime: string;
  tags: string[];
};

// =============================================================================
// Sample Data
// =============================================================================

const paymentData: Payment[] = [
  { id: '728ed52f', amount: 100, status: 'pending', email: 'm@example.com' },
  { id: '489e1d42', amount: 125, status: 'processing', email: 'example@gmail.com' },
  { id: 'a1b2c3d4', amount: 250, status: 'success', email: 'user@domain.com' },
  { id: 'e5f6g7h8', amount: 50, status: 'failed', email: 'test@test.com' },
  ...Array.from({ length: 46 }).map((_, i) => ({
    id: `id-${i}`,
    amount: Math.floor(Math.random() * 1000),
    status: (['pending', 'processing', 'success', 'failed'] as const)[
      Math.floor(Math.random() * 4)
    ],
    email: `user${i}@example.com`,
  })),
];

const employeeData: Employee[] = [
  {
    id: 1,
    name: '山田太郎',
    department: '営業部',
    birthday: '1990-05-15',
    startTime: '9:00',
    tags: ['リーダー', 'フルタイム'],
  },
  {
    id: 2,
    name: '佐藤花子',
    department: '開発部',
    birthday: '1985-12-01',
    startTime: '10:30',
    tags: ['エンジニア'],
  },
  {
    id: 3,
    name: '鈴木一郎',
    department: '営業部',
    birthday: '1995-03-22',
    startTime: '9:15',
    tags: ['新人'],
  },
  {
    id: 4,
    name: '高橋美咲',
    department: '人事部',
    birthday: '1988-08-08',
    startTime: '8:45',
    tags: ['マネージャー', 'フルタイム'],
  },
  {
    id: 5,
    name: '田中健二',
    department: '開発部',
    birthday: '1992-11-30',
    startTime: '11:00',
    tags: ['エンジニア', 'リモート'],
  },
];

// =============================================================================
// Column Definitions
// =============================================================================

const paymentColumns: ColumnDef<Payment>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label='Select all'
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label='Select row'
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'email', header: 'Email' },
  {
    accessorKey: 'amount',
    header: () => <div className='text-right'>Amount</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('amount'));
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);
      return <div className='text-right font-medium'>{formatted}</div>;
    },
  },
];

// Using createColumnsFromHeads helper
const employeeHeads: TableHeadBase[] = [
  { field: 'name', text: '氏名', type: 'String' },
  { field: 'department', text: '部署', type: 'String' },
  { field: 'birthday', text: '生年月日', type: 'Date' },
  { field: 'startTime', text: '出勤時刻', type: 'TimeString' },
  { field: 'tags', text: 'タグ', type: 'Array' },
];

const employeeColumns = createColumnsFromHeads(employeeHeads);

// =============================================================================
// Meta
// =============================================================================

const meta = {
  title: 'DataTable/DataTable',
  component: DataTable,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof DataTable>;

export default meta;
type Story = StoryObj<typeof meta>;

// =============================================================================
// Stories
// =============================================================================

/**
 * Default variant with standard layout
 */
export const Default: Story = {
  args: {
    columns: paymentColumns as ColumnDef<object, unknown>[],
    data: paymentData as object[],
  },
};

/**
 * Minimal variant - just table and pagination, no toolbar
 */
export const Minimal: Story = {
  args: {
    columns: paymentColumns as ColumnDef<object, unknown>[],
    data: paymentData as object[],
    variant: 'minimal',
  },
};

/**
 * Toolbar variant - setagaya-front style with toolbar above table
 */
export const Toolbar: Story = {
  args: {
    columns: paymentColumns as ColumnDef<object, unknown>[],
    data: paymentData as object[],
    variant: 'toolbar',
    itemCount: paymentData.length,
  },
};

/**
 * Toolbar variant with custom filter content
 */
export const ToolbarWithFilterContent: Story = {
  args: {
    columns: paymentColumns as ColumnDef<object, unknown>[],
    data: paymentData as object[],
    variant: 'toolbar',
    itemCount: paymentData.length,
    filterContent: (
      <div className='flex gap-2'>
        <Input placeholder='Search...' className='h-8 w-40' />
        <Button variant='outline' size='sm'>
          Filter
        </Button>
      </div>
    ),
  },
};

/**
 * Using createColumnsFromHeads helper for declarative column definitions
 */
export const WithColumnHelper: Story = {
  args: {
    columns: employeeColumns as ColumnDef<object, unknown>[],
    data: employeeData as object[],
    variant: 'toolbar',
    itemCount: employeeData.length,
    showRowNumber: true,
  },
};

/**
 * Multi-column sorting enabled - hold Shift+click to add secondary sort
 */
export const MultiSort: Story = {
  args: {
    columns: paymentColumns as ColumnDef<object, unknown>[],
    data: paymentData as object[],
    enableMultiSort: true,
  },
};

/**
 * With row numbers column
 */
export const WithRowNumbers: Story = {
  args: {
    columns: paymentColumns as ColumnDef<object, unknown>[],
    data: paymentData as object[],
    showRowNumber: true,
  },
};

/**
 * With floating add button
 */
export const WithAddButton: Story = {
  args: {
    columns: paymentColumns as ColumnDef<object, unknown>[],
    data: paymentData as object[],
    variant: 'toolbar',
    onAdd: () => alert('Add clicked!'),
    itemCount: paymentData.length,
  },
};

/**
 * With storage key for persisting settings
 */
export const WithPersistence: Story = {
  args: {
    columns: paymentColumns as ColumnDef<object, unknown>[],
    data: paymentData as object[],
    storageKey: 'storybook-demo-table',
  },
};

/**
 * Full featured example combining multiple options
 */
export const FullFeatured: Story = {
  args: {
    columns: employeeColumns as ColumnDef<object, unknown>[],
    data: employeeData as object[],
    variant: 'toolbar',
    itemCount: employeeData.length,
    showRowNumber: true,
    enableMultiSort: true,
    storageKey: 'storybook-full-featured-table',
    onAdd: () => alert('Add employee!'),
    filterContent: (
      <div className='flex gap-2'>
        <Input placeholder='名前で検索...' className='h-8 w-40' />
        <Button variant='outline' size='sm'>
          絞り込み
        </Button>
      </div>
    ),
  },
};

/**
 * Compound Component example (TableView)
 */
export const CustomTableViewCompound: StoryObj = {
  render: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [globalFilter, setGlobalFilter] = React.useState('');
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [rowSelection, setRowSelection] = React.useState({});

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const table = useTable({
    features: dataTableFeatures,
      data: employeeData,
      columns: employeeColumns as ColumnDef<Employee, any>[],
      state: {
        globalFilter,
        rowSelection,
      },
      enableRowSelection: true,
      onRowSelectionChange: setRowSelection,
      onGlobalFilterChange: setGlobalFilter,
    });

    return (
      <TableView.Root table={table}>
        <TableView.Toolbar>
          <div className="flex items-center gap-2">
            <TableView.SearchInput placeholder="社員名・部署で検索..." />
            {/* 案件固有のカスタムボタンスロット */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => alert(`選択件数: ${Object.keys(rowSelection).length}件をエクスポートします`)}
            >
              CSVエクスポート
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => alert('新規社員追加ダイアログを開きます')}>
              + 新規追加
            </Button>
            <TableView.ViewOptions />
          </div>
        </TableView.Toolbar>

        <TableView.Content bordered>
          <TableView.Header />
          <TableView.Body />
        </TableView.Content>

        <TableView.Footer>
          <TableView.SelectedCount />
          <TableView.Pagination />
        </TableView.Footer>
      </TableView.Root>
    );
  },
};
