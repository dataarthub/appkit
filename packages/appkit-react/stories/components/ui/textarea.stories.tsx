import type { Meta, StoryObj } from '@storybook/react-vite';
import { Textarea } from '../../../src/tools/components/ui/textarea';

const meta = {
  title: 'UI/Textarea',
  component: Textarea,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Type your message here...',
  },
};

export const WithValue: Story = {
  args: {
    defaultValue: 'This is a pre-filled textarea with some initial content.',
  },
};

export const Disabled: Story = {
  args: {
    placeholder: 'This textarea is disabled',
    disabled: true,
  },
};

export const WithRows: Story = {
  args: {
    placeholder: 'Textarea with 10 rows',
    rows: 10,
  },
};

export const WithLabel: Story = {
  render: () => (
    <div className='flex flex-col gap-2 w-[400px]'>
      <label htmlFor='message' className='text-sm font-medium'>
        Message
      </label>
      <Textarea id='message' placeholder='Type your message here...' />
    </div>
  ),
};
