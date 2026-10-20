import type { Meta, StoryObj } from '@storybook/react-vite';
import { SearchAndCreatePane } from '../../../src/tools/components/pane/SearchAndCreatePane';
import { CollectionSchema } from '../../../src/tools/components/filter/filter-types';

const schema: CollectionSchema = {
  name: { type: 'string', label: '名前' },
  email: { type: 'string', label: 'メールアドレス' },
  role: { type: 'enum', enum: ['admin', 'user'], label: 'ロール' },
};

const meta: Meta<typeof SearchAndCreatePane> = {
  title: 'Components/Pane/SearchAndCreatePane',
  component: SearchAndCreatePane,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof SearchAndCreatePane>;

export const Default: Story = {
  args: {
    schema,
    isOpen: true,
    onClose: () => console.log('Close clicked'),
    onSearch: async () => [
      { id: '1', name: '田中 太郎', email: 'tanaka@example.com', role: 'admin' },
      { id: '2', name: '佐藤 次郎', email: 'sato@example.com', role: 'user' },
    ],
    onItemSelect: (item: any) => console.log('Selected:', item),
    onCreateNew: (formData: any) => console.log('Create new:', formData),
  },
  render: (args: any) => (
    <div className='w-[400px] border p-4 rounded-lg bg-background'>
      <SearchAndCreatePane {...args} />
    </div>
  ),
};

export const WithJunctionFields: Story = {
  args: {
    ...Default.args,
    junctionFields: [
      { name: 'memo', label: '備考', type: 'text' },
      { name: 'quantity', label: '数量', type: 'number' },
    ],
  },
  render: (args: any) => (
    <div className='w-[400px] border p-4 rounded-lg bg-background'>
      <SearchAndCreatePane {...args} />
    </div>
  ),
};
