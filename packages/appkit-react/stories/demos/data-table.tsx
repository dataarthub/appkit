import { DataTable } from '../../src/tools/data-table';

const rows = [
  { id: 'a', name: '東京 / Tokyo', amount: 100 },
  { id: 'b', name: '大阪 / Osaka', amount: 200 },
];
/** Read-only table shared by docs and Storybook. */
export default function DataTableDemo() {
  return (
    <DataTable
      data={rows}
      columns={[
        { accessorKey: 'name', header: '名前 / Name' },
        { accessorKey: 'amount', header: '金額 / Amount' },
      ]}
    />
  );
}
