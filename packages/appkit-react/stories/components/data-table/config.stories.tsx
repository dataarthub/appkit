import type { Meta, StoryObj } from '@storybook/react-vite';
import { createColumns, ColumnConfig } from '../../../src/tools/components/data-table/config';
import { DataTable } from '../../../src/tools/components/data-table/data-table';
import { Mail, Phone, MapPin } from 'lucide-react';

const meta = {
  title: 'UI/DataTableConfig',
  component: DataTable,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof DataTable>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockData = [
  {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    status: 'active',
    amount: 1500.5,
    date: '2023-10-01T10:00:00Z',
    type: 'admin',
    contactType: 'email',
  },
  {
    id: 2,
    name: 'Jane Smith',
    email: 'jane@example.com',
    status: 'inactive',
    amount: 2300.75,
    date: '2023-10-05T14:30:00Z',
    type: 'user',
    contactType: 'phone',
  },
  {
    id: 3,
    name: 'Bob Wilson',
    email: 'bob@example.com',
    status: 'pending',
    amount: 0,
    date: '2023-10-10T09:15:00Z',
    type: 'user',
    contactType: 'location',
  },
];

const config: ColumnConfig[] = [
  { field: 'select', text: 'Select', type: 'pick' },
  { field: 'id', text: 'ID', type: 'integer' },
  { field: 'name', text: 'Name', type: 'text' },
  {
    field: 'status',
    text: 'Status',
    type: 'badge',
    colorMap: {
      active: 'bg-green-500 text-white',
      inactive: 'bg-gray-500 text-white',
      pending: 'bg-yellow-500 text-white',
    },
  },
  { field: 'amount', text: 'Amount', type: 'float(2)' },
  { field: 'date', text: 'Date', type: 'date' },
  {
    field: 'contactType',
    text: 'Contact',
    type: 'icon',
    iconMap: {
      email: Mail,
      phone: Phone,
      location: MapPin,
    },
    colorMap: {
      email: 'text-blue-500',
      phone: 'text-green-500',
      location: 'text-red-500',
    },
  },
  [
    { field: 'type', text: 'Type' },
    { field: 'email', text: 'Email' },
  ],
];

const columns = createColumns(config);

export const Default: Story = {
  args: {} as any,
  render: () => <DataTable columns={columns as any} data={mockData as any} />,
};
