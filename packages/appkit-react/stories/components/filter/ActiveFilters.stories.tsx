import type { Meta, StoryObj } from '@storybook/react-vite';
import { ActiveFilters } from '../../../src/tools/components/filter/active-filters';
import { CollectionSchema } from '../../../src/tools/components/filter/filter-types';

const meta: Meta<typeof ActiveFilters> = {
  title: 'Components/ActiveFilters',
  component: ActiveFilters,
  tags: ['autodocs'],
  argTypes: {
    onRemove: { action: 'removed' },
    onClearAll: { action: 'clearAll' },
  },
};

export default meta;
type Story = StoryObj<typeof ActiveFilters>;

const sampleSchema: CollectionSchema = {
  name: { type: 'string', label: '名前' },
  age: { type: 'number', label: '年齢' },
  department: { type: 'enum', enum: ['営業部', '開発部', '人事部'], label: '部署' },
  active: { type: 'boolean', label: '有効' },
  createdAt: { type: 'date', label: '作成日' },
};

export const Basic: Story = {
  args: {
    schema: sampleSchema,
    values: {
      name: '山田',
      department: '営業部',
      active: true,
    },
  },
};

export const WithRangeAndDates: Story = {
  args: {
    schema: sampleSchema,
    values: {
      name: '佐藤',
      age: { min: 20, max: 35 },
      createdAt: { min: new Date('2026-01-01'), max: new Date('2026-03-31') },
    },
  },
};

export const Empty: Story = {
  args: {
    schema: sampleSchema,
    values: {},
  },
};
