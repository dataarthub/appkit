import type { StoryObj } from '@storybook/react-vite';
import { AutoFormField, Form } from '../../../src/tools/components/ui/form';
import { useForm } from 'react-hook-form';

const meta = {
  title: 'UI/AutoFormField',
  component: AutoFormField,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story: any) => (
      <div className='w-[400px]'>
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
} as any;

export default meta;
type Story = StoryObj<typeof meta>;

const Template = (args: any) => {
  const form = useForm({
    defaultValues: {
      [args.name]: args.defaultValue ?? '',
    },
  });
  return (
    <Form.Root onSubmit={(e) => e.preventDefault()}>
      <AutoFormField {...(args as any)} control={form.control} />
    </Form.Root>
  );
};

export const ManualInput: Story = {
  render: (args: any) => <Template {...args} />,
  args: {
    name: 'username',
    label: 'Username',
    placeholder: 'Enter username',
    description: 'This is a manual description',
    required: true,
  } as any,
};

export const ManualSelect: Story = {
  render: (args: any) => <Template {...args} />,
  args: {
    name: 'role',
    label: 'Role',
    children: (
      <select className='border p-2 rounded'>
        <option value='admin'>Admin</option>
        <option value='user'>User</option>
      </select>
    ),
  } as any,
};

export const SchemaInput: Story = {
  render: (args: any) => <Template {...args} />,
  args: {
    name: 'email',
    jsonSchema: {
      type: 'string',
      format: 'email',
      title: 'Email Address',
      description: 'We will not share your email.',
    },
  } as any,
};

export const SchemaCountry: Story = {
  render: (args: any) => <Template {...args} />,
  args: {
    name: 'country',
    jsonSchema: {
      type: 'string',
      'x-ui': {
        widget: 'country',
        placeholder: 'Select your country',
      },
    },
  } as any,
};

export const Relation: Story = {
  render: (args: any) => <Template {...args} />,
  args: {
    name: 'customerId',
    label: 'Customer',
    relation: {
      displayField: 'name',
      data: [
        { id: 'c1', name: 'Company A' },
        { id: 'c2', name: 'Company B' },
      ],
      inputDisplay: 'both',
      searchTitle: 'Select Customer',
      valueField: 'id',
    },
  } as any,
};
