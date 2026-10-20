import type { Meta, StoryObj } from '@storybook/react-vite';
import { Toggle } from '../../../src/tools/components/ui/toggle';

const meta = {
  title: 'UI/Toggle',
  component: Toggle,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'outline'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg'],
    },
  },
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Toggle',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Large',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled',
  },
};

export const WithIcon: Story = {
  render: () => (
    <div className='flex gap-2'>
      <Toggle aria-label='Toggle bold'>
        <strong>B</strong>
      </Toggle>
      <Toggle aria-label='Toggle italic'>
        <em>I</em>
      </Toggle>
      <Toggle aria-label='Toggle underline'>
        <u>U</u>
      </Toggle>
    </div>
  ),
};

export const Pressed: Story = {
  args: {
    defaultPressed: true,
    children: 'Pressed',
  },
};
