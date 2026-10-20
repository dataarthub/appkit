import type { Meta, StoryObj } from '@storybook/react-vite';
import { EditableTable } from '../../../src/tools/components/editable-table/editable-table';
import { Input } from '../../../src/tools/components/ui/input';
import { useState } from 'react';

const meta: Meta<typeof EditableTable> = {
  title: 'Components/EditableTable/EditableTable',
  component: EditableTable,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof EditableTable>;

const columns = [
  {
    key: 'item_name',
    label: '品名',
    width: '300px',
    render: (row: any, _index: number, update: any) => (
      <Input
        value={row.item_name}
        onChange={(e) => update('item_name', e.target.value)}
        className='h-8'
      />
    ),
  },
  {
    key: 'quantity',
    label: '数量',
    width: '100px',
    align: 'right' as const,
    render: (row: any, _index: number, update: any) => (
      <Input
        type='number'
        value={row.quantity}
        onChange={(e) => update('quantity', Number(e.target.value))}
        className='h-8 text-right'
      />
    ),
  },
  {
    key: 'price',
    label: '単価',
    width: '120px',
    align: 'right' as const,
    render: (row: any, _index: number, update: any) => (
      <Input
        type='number'
        value={row.price}
        onChange={(e) => update('price', Number(e.target.value))}
        className='h-8 text-right'
      />
    ),
  },
];

const Template = (args: any) => {
  const [data, setData] = useState([
    { id: '1', item_name: 'ボルト M8', quantity: 100, price: 50 },
    { id: '2', item_name: 'ナット M8', quantity: 100, price: 30 },
  ]);

  const handleUpdate = (index: number, key: string, value: any) => {
    const newData = [...data];
    newData[index] = { ...newData[index], [key]: value };
    setData(newData);
  };

  const handleAdd = () => {
    setData([...data, { id: Math.random().toString(), item_name: '', quantity: 0, price: 0 }]);
  };

  const handleRemove = (index: number) => {
    setData(data.filter((_, i) => i !== index));
  };

  return (
    <div className='w-[800px] border p-4 rounded-lg bg-background'>
      <EditableTable
        {...args}
        data={data}
        columns={columns.map((col) => ({
          ...col,
          render: (row: any, index: number) =>
            col.render(row, index, (key: string, val: any) => handleUpdate(index, key, val)),
        }))}
        onAddRow={handleAdd}
        onRemove={handleRemove}
      />
    </div>
  );
};

export const Default: Story = {
  render: (args: any) => <Template {...args} />,
};

export const SmallZoom: Story = {
  render: (args: any) => <Template {...args} zoomLevel={80} />,
};
