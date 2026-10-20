import type { Meta, StoryObj } from '@storybook/react-vite';
import { ComposedChart } from '../../../src/tools/components/chart/ComposedChart';

const meta = {
  title: 'Chart/ComposedChart',
  component: ComposedChart,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ComposedChart>;

export default meta;
type Story = StoryObj<typeof meta>;

const data = [
  { name: 'Jan', value: 400, other: 240 },
  { name: 'Feb', value: 300, other: 139 },
  { name: 'Mar', value: 200, other: 980 },
  { name: 'Apr', value: 278, other: 390 },
  { name: 'May', value: 189, other: 480 },
];

export const Default: Story = {
  args: {
    data,
    xAxisKey: 'name',
    title: 'Monthly Revenue vs Sales',
    series: [
      { key: 'value', type: 'bar', color: 'hsl(var(--primary))' },
      { key: 'other', type: 'line', color: 'hsl(var(--secondary))' },
    ],
  },
};
