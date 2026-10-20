import type { Meta, StoryObj } from '@storybook/react-vite';
import { ToggleGroup, ToggleGroupItem } from '../../../src/tools/components/ui/toggle-group';

const meta = {
  title: 'UI/ToggleGroup',
  component: ToggleGroup,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ToggleGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {
  render: () => (
    <ToggleGroup>
      <ToggleGroupItem value='left'>Left</ToggleGroupItem>
      <ToggleGroupItem value='center'>Center</ToggleGroupItem>
      <ToggleGroupItem value='right'>Right</ToggleGroupItem>
    </ToggleGroup>
  ),
};

export const Multiple: Story = {
  render: () => (
    <ToggleGroup>
      <ToggleGroupItem value='bold'>
        <strong>B</strong>
      </ToggleGroupItem>
      <ToggleGroupItem value='italic'>
        <em>I</em>
      </ToggleGroupItem>
      <ToggleGroupItem value='underline'>
        <u>U</u>
      </ToggleGroupItem>
    </ToggleGroup>
  ),
};

export const Outline: Story = {
  render: () => (
    <ToggleGroup>
      <ToggleGroupItem value='xs'>XS</ToggleGroupItem>
      <ToggleGroupItem value='s'>S</ToggleGroupItem>
      <ToggleGroupItem value='m'>M</ToggleGroupItem>
      <ToggleGroupItem value='l'>L</ToggleGroupItem>
      <ToggleGroupItem value='xl'>XL</ToggleGroupItem>
    </ToggleGroup>
  ),
};

export const WithDefaultValue: Story = {
  render: () => (
    <ToggleGroup defaultValue={['center']}>
      <ToggleGroupItem value='left'>Left</ToggleGroupItem>
      <ToggleGroupItem value='center'>Center</ToggleGroupItem>
      <ToggleGroupItem value='right'>Right</ToggleGroupItem>
      <ToggleGroupItem value='justify'>Justify</ToggleGroupItem>
    </ToggleGroup>
  ),
};

export const Disabled: Story = {
  render: () => (
    <ToggleGroup disabled>
      <ToggleGroupItem value='left'>Left</ToggleGroupItem>
      <ToggleGroupItem value='center'>Center</ToggleGroupItem>
      <ToggleGroupItem value='right'>Right</ToggleGroupItem>
    </ToggleGroup>
  ),
};
