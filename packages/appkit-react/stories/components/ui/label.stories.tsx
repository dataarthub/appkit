import type { Meta, StoryObj } from '@storybook/react-vite';
import { Label } from '../../../src/tools/components/ui/label';
import { Input } from '../../../src/tools/components/ui/input';

const meta = {
  title: 'UI/Label',
  component: Label,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Label',
  },
};

export const WithInput: Story = {
  render: () => (
    <div className='flex flex-col gap-2'>
      <Label htmlFor='email'>Email</Label>
      <Input id='email' type='email' placeholder='Email' />
    </div>
  ),
};

export const Required: Story = {
  render: () => (
    <div className='flex flex-col gap-2'>
      <Label htmlFor='password'>
        Password <span className='text-destructive'>*</span>
      </Label>
      <Input id='password' type='password' placeholder='Password' />
    </div>
  ),
};
