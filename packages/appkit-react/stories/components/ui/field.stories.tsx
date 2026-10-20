import type { Meta, StoryObj } from '@storybook/react-vite';
import { FieldFactory as Field } from '../../../src/tools/components/ui/field';

const meta = {
  title: 'UI/Field',
  component: Field,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    labelPosition: {
      control: 'radio',
      options: ['top', 'left', 'none'],
    },
    type: {
      control: 'select',
      options: ['text', 'number', 'email', 'password', 'textarea', 'checkbox', 'select'],
    },
  },
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AutoText: Story = {
  args: {
    label: 'Username',
    type: 'text',
    inputProps: { placeholder: 'Enter username...' },
    description: 'Your public display name.',
  },
};

export const AutoNumber: Story = {
  args: {
    label: 'Age',
    type: 'number',
    inputProps: { min: 0, max: 120 },
  },
};

export const AutoSelect: Story = {
  args: {
    label: 'Role',
    type: 'select',
    options: [
      { label: 'Admin', value: 'admin' },
      { label: 'User', value: 'user' },
      { label: 'Guest', value: 'guest' },
    ],
    inputProps: { placeholder: 'Select a role' },
    labelPosition: 'left',
    labelWidth: '100px',
  },
};

export const AutoCheckbox: Story = {
  args: {
    label: 'I agree to terms',
    type: 'checkbox',
    description: 'Read our privacy policy.',
  },
};

export const AutoTextarea: Story = {
  args: {
    label: 'Bio',
    type: 'textarea',
    inputProps: { placeholder: 'Tell us about yourself...', rows: 4 },
  },
};

export const ManualChild: Story = {
  args: {
    label: 'Manual Input',
    children: <input className='border p-2 rounded' placeholder='Native input...' />,
    description: 'This uses a manual child instead of type prop.',
  },
};
