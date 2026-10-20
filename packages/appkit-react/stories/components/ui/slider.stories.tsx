import type { Meta, StoryObj } from '@storybook/react-vite';
import { Slider } from '../../../src/tools/components/ui/slider';

const meta = {
  title: 'UI/Slider',
  component: Slider,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    defaultValue: [50],
    max: 100,
    step: 1,
    className: 'w-[300px]',
  },
};

export const WithRange: Story = {
  args: {
    defaultValue: [25, 75],
    max: 100,
    step: 1,
    className: 'w-[300px]',
  },
};

export const CustomStep: Story = {
  args: {
    defaultValue: [50],
    max: 100,
    step: 10,
    className: 'w-[300px]',
  },
};

export const Disabled: Story = {
  args: {
    defaultValue: [50],
    max: 100,
    step: 1,
    disabled: true,
    className: 'w-[300px]',
  },
};

export const Volume: Story = {
  render: () => (
    <div className='w-[300px] space-y-2'>
      <label className='text-sm font-medium'>Volume</label>
      <Slider defaultValue={[70]} max={100} step={1} />
    </div>
  ),
};

export const PriceRange: Story = {
  render: () => (
    <div className='w-[300px] space-y-2'>
      <div className='flex justify-between text-sm'>
        <label className='font-medium'>Price Range</label>
        <span className='text-muted-foreground'>$250 - $750</span>
      </div>
      <Slider defaultValue={[250, 750]} max={1000} step={50} />
    </div>
  ),
};
