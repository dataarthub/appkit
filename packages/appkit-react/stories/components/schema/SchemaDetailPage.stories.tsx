import type { StoryObj } from '@storybook/react-vite';
import { SchemaDetailPage } from '../../../src/tools/components/schema/SchemaDetailPage';
import type { JSONSchema } from '../../../src/tools/lib/schema/types';

const meta = {
  title: 'Schema/SchemaDetailPage',
  component: SchemaDetailPage,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} as any;

export default meta;
type Story = StoryObj<typeof meta>;

const schema: JSONSchema = {
  type: 'object',
  title: 'Customer Info',
  properties: {
    first_name: {
      type: 'string',
      title: 'First Name',
      'x-ui': { label: 'First Name', group: 'Personal' },
    },
    last_name: {
      type: 'string',
      title: 'Last Name',
      'x-ui': { label: 'Last Name', group: 'Personal' },
    },
    email: {
      type: 'string',
      format: 'email',
      title: 'Email',
      'x-ui': { label: 'Email', group: 'Contact' },
    },
    phone: {
      type: 'string',
      format: 'phone',
      title: 'Phone',
      'x-ui': { label: 'Phone', group: 'Contact' },
    },
    bio: {
      type: 'string',
      title: 'Biography',
      'x-ui': { label: 'Biography', widget: 'textarea', group: 'More' },
    },
    newsletter: {
      type: 'boolean',
      title: 'Subscribe to newsletter',
      'x-ui': { label: 'Subscribe to newsletter', group: 'More' },
    },
  },
};

const mockValues = {
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@example.com',
  phone: '090-1234-5678',
  bio: 'A passionate developer from Tokyo.',
  newsletter: true,
};

export const ViewMode: Story = {
  args: {
    schema,
    mode: 'view',
    values: mockValues,
  },
};

export const EditMode: Story = {
  args: {
    schema,
    mode: 'edit',
    values: mockValues,
    onSubmit: (vals: any) => console.log('Submitted:', vals),
  },
};

export const GroupedByCard: Story = {
  args: {
    schema,
    mode: 'view',
    values: mockValues,
    groupDisplay: 'card',
  },
};

export const GroupedByDropdown: Story = {
  args: {
    schema,
    mode: 'view',
    values: mockValues,
    groupDisplay: 'dropdown',
  },
};
