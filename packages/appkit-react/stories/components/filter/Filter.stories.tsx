import type { Meta, StoryObj } from '@storybook/react-vite';
import { SchemaFilter } from '../../../src/tools/components/filter/filter';
import { CollectionSchema } from '../../../src/tools/components/filter/filter-types';

const meta: Meta<typeof SchemaFilter> = {
  title: 'Components/Filter',
  component: SchemaFilter,
  tags: ['autodocs'],
  argTypes: {
    layout: {
      control: 'radio',
      options: ['inline', 'grid'],
    },
    autoApply: {
      control: 'boolean',
    },
    labelPosition: {
      control: 'radio',
      options: ['top', 'left', 'none'],
    },
    labelWidth: {
      control: 'text',
    },
    overlappingLabel: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof SchemaFilter>;

const userSchema: CollectionSchema = {
  name: { type: 'string', label: '名前' },
  age: { type: 'number', label: '年齢' },
  status: { type: 'enum', enum: ['active', 'inactive'], label: '状態' },
  role: { type: 'enum', enum: ['admin', 'user', 'manager'], label: 'ロール' },
  createdAt: { type: 'date', label: '作成日' },
  isActive: { type: 'boolean', label: '有効' },
};

export const Basic: Story = {
  args: {
    schema: userSchema,
    fields: ['name', 'status', 'isActive'],
    onChange: (filter: unknown) => console.log('Filter changed:', filter),
  },
};

export const Grid: Story = {
  args: {
    schema: userSchema,
    fields: ['name', 'age', 'status', 'role', 'createdAt', 'isActive'],
    layout: 'grid',
    onChange: (filter: unknown) => console.log('Filter changed:', filter),
  },
};

export const WithOperators: Story = {
  args: {
    schema: userSchema,
    fields: [
      { field: 'name', operator: 'contains', label: '名前（含む）' },
      { field: 'age', operator: 'range', label: '年齢範囲' },
      { field: 'createdAt', operator: 'range', label: '作成日範囲' },
      'status',
    ],
    layout: 'grid',
    onChange: (filter: unknown) => console.log('Filter changed:', filter),
  },
};

export const ManualApply: Story = {
  args: {
    schema: userSchema,
    fields: ['name', 'status'],
    autoApply: false,
    applyLabel: '検索',
    resetLabel: 'クリア',
    onChange: (filter: unknown) => console.log('Filter applied:', filter),
  },
};

export const CustomFields: Story = {
  args: {
    fields: [
      { field: 'search', type: 'string', label: '全文検索', placeholder: 'キーワードを入力...' },
      {
        field: 'category',
        type: 'enum',
        label: 'カテゴリ',
        options: [
          { value: 'electronics', label: '家電' },
          { value: 'clothing', label: '衣類' },
          { value: 'books', label: '本' },
        ],
      },
      { field: 'price', type: 'number', operator: 'range', label: '価格' },
    ],
    onChange: (filter: unknown) => console.log('Filter changed:', filter),
  },
};

export const LeftLabels: Story = {
  args: {
    schema: userSchema,
    fields: ['name', 'age', 'status'],
    labelPosition: 'left',
    labelWidth: '100px',
    onChange: (filter: unknown) => console.log('Filter changed:', filter),
  },
};

export const OverlappingLabels: Story = {
  args: {
    schema: userSchema,
    fields: ['name', 'age', 'status'],
    labelPosition: 'none',
    overlappingLabel: true,
    onChange: (filter: unknown) => console.log('Filter changed:', filter),
  },
};

export const Debounced: Story = {
  args: {
    schema: userSchema,
    fields: ['name', 'age'],
    debounceMs: 800,
    onChange: (filter: unknown) => console.log('Debounced Filter changed (800ms):', filter),
  },
};
