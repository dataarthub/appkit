import type { StoryObj } from '@storybook/react-vite';
import { EnhancedDetailPage } from '../../../src/tools/components/form/EnhancedDetailPage';
import type { JSONSchema } from '../../../src/tools/lib/schema/types';

const meta = {
  title: 'Form/EnhancedDetailPage',
  component: EnhancedDetailPage,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} as any;

export default meta;
type Story = StoryObj<typeof meta>;

const schema: JSONSchema = {
  type: 'object',
  title: 'CustomerProfile',
  properties: {
    first_name: {
      type: 'string',
      title: 'First Name',
      'x-ui': { label: 'First Name', width: 'medium' },
    },
    last_name: {
      type: 'string',
      title: 'Last Name',
      'x-ui': { label: 'Last Name', width: 'medium' },
    },
    email: {
      type: 'string',
      format: 'email',
      title: 'Email',
      'x-ui': { label: 'Email', width: 'long' },
    },
    phone: {
      type: 'string',
      format: 'phone',
      title: 'Phone',
      'x-ui': { label: 'Phone', width: 'medium' },
    },
    zip_code: { type: 'string', title: 'ZIP Code', 'x-ui': { label: 'ZIP Code', width: 'short' } },
    prefecture: {
      type: 'string',
      title: 'Prefecture',
      'x-ui': { label: 'Prefecture', widget: 'prefecture', width: 'short' },
    },
    address: { type: 'string', title: 'Address', 'x-ui': { label: 'Address', width: 'full' } },
    bio: {
      type: 'string',
      title: 'Biography',
      'x-ui': { label: 'Biography', widget: 'textarea', width: 'full' },
    },
    newsletter: {
      type: 'boolean',
      title: 'Subscribe to newsletter',
      'x-ui': { label: 'Subscribe to newsletter' },
    },
    // Advanced fields
    api_key: { type: 'string', title: 'API Key', 'x-ui': { label: 'API Key', advanced: true } },
    webhook_url: {
      type: 'string',
      title: 'Webhook URL',
      'x-ui': { label: 'Webhook URL', advanced: true },
    },
    debug_mode: {
      type: 'boolean',
      title: 'Debug Mode',
      'x-ui': { label: 'Debug Mode', advanced: true },
    },
  },
};

const mockValues = {
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@example.com',
  phone: '090-1234-5678',
  zip_code: '100-0001',
  prefecture: '東京都',
  address: '千代田区丸の内1-1-1',
  bio: 'A passionate developer from Tokyo.',
  newsletter: true,
  api_key: 'sk-test-xxx',
  webhook_url: 'https://example.com/webhook',
  debug_mode: false,
};

export const Default: Story = {
  args: {
    schema,
    mode: 'edit',
    values: mockValues,
    onSubmit: (vals: any) => console.log('Submitted:', vals),
  },
};

export const WithProgressiveDisclosure: Story = {
  args: {
    schema,
    mode: 'edit',
    values: mockValues,
    progressiveDisclosure: true,
    onSubmit: (vals: any) => console.log('Submitted:', vals),
  },
};

export const WithStickyActions: Story = {
  args: {
    schema,
    mode: 'edit',
    values: mockValues,
    stickyActions: true,
    saveStatus: 'idle',
    onSubmit: (vals: any) => console.log('Submitted:', vals),
    onCancel: () => console.log('Cancelled'),
    onDelete: () => console.log('Deleted'),
  },
};

export const ViewMode: Story = {
  args: {
    schema,
    mode: 'view',
    values: mockValues,
    showEditButton: true,
    stickyActions: true,
    onEdit: () => console.log('Edit clicked'),
  },
};

export const SavingState: Story = {
  args: {
    schema,
    mode: 'edit',
    values: mockValues,
    stickyActions: true,
    saveStatus: 'saving',
  },
};

export const NarrowContainer: Story = {
  args: {
    schema,
    mode: 'edit',
    values: mockValues,
    maxWidth: '2xl',
  },
};
