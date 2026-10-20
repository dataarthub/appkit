import type { StoryObj } from '@storybook/react-vite';
import { FormStepper } from '../../../src/tools/components/form/FormStepper';
import type { JSONSchema } from '../../../src/tools/lib/schema/types';

const meta = {
  title: 'Form/FormStepper',
  component: FormStepper,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} as any;

export default meta;
type Story = StoryObj<typeof meta>;

const multiStepSchema: JSONSchema = {
  type: 'object',
  title: 'UserRegistration',
  'x-steps': [
    { name: 'profile', title: 'Profile', description: 'Basic information' },
    { name: 'contact', title: 'Contact', description: 'Contact details' },
    { name: 'preferences', title: 'Preferences', description: 'Your preferences' },
  ],
  properties: {
    // Step 1: Profile
    first_name: { type: 'string', title: 'First Name', 'x-ui': { label: 'First Name', step: 1 } },
    last_name: { type: 'string', title: 'Last Name', 'x-ui': { label: 'Last Name', step: 1 } },
    birthday: {
      type: 'string',
      format: 'date',
      title: 'Birthday',
      'x-ui': { label: 'Birthday', step: 1 },
    },
    bio: { type: 'string', title: 'Bio', 'x-ui': { label: 'Bio', widget: 'textarea', step: 1 } },

    // Step 2: Contact
    email: { type: 'string', format: 'email', title: 'Email', 'x-ui': { label: 'Email', step: 2 } },
    phone: { type: 'string', format: 'phone', title: 'Phone', 'x-ui': { label: 'Phone', step: 2 } },
    zip_code: { type: 'string', title: 'ZIP Code', 'x-ui': { label: 'ZIP Code', step: 2 } },
    address: { type: 'string', title: 'Address', 'x-ui': { label: 'Address', step: 2 } },

    // Step 3: Preferences
    newsletter: {
      type: 'boolean',
      title: 'Subscribe to newsletter',
      'x-ui': { label: 'Subscribe to newsletter', step: 3 },
    },
    language: {
      type: 'string',
      title: 'Preferred Language',
      enum: ['en', 'ja'],
      'x-ui': {
        label: 'Preferred Language',
        widget: 'select',
        step: 3,
        options: [
          { label: 'English', value: 'en' },
          { label: '日本語', value: 'ja' },
        ],
      },
    },
    theme: {
      type: 'string',
      title: 'Theme',
      enum: ['light', 'dark', 'system'],
      'x-ui': {
        label: 'Theme',
        widget: 'select',
        step: 3,
        options: [
          { label: 'Light', value: 'light' },
          { label: 'Dark', value: 'dark' },
          { label: 'System', value: 'system' },
        ],
      },
    },
  },
  required: ['first_name', 'last_name', 'email'],
};

const defaultValues = {
  first_name: '',
  last_name: '',
  email: '',
};

export const Default: Story = {
  args: {
    schema: multiStepSchema,
    defaultValues,
    onSubmit: (vals: any) => console.log('Submitted:', vals),
    onCancel: () => console.log('Cancelled'),
  },
};

export const WithInitialValues: Story = {
  args: {
    schema: multiStepSchema,
    defaultValues: {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      newsletter: true,
      language: 'en',
    },
    onSubmit: (vals: any) => console.log('Submitted:', vals),
  },
};

export const SavingState: Story = {
  args: {
    schema: multiStepSchema,
    defaultValues,
    saveStatus: 'saving',
    onSubmit: (vals: any) => console.log('Submitted:', vals),
  },
};

export const NarrowContainer: Story = {
  args: {
    schema: multiStepSchema,
    defaultValues,
    maxWidth: '2xl',
    onSubmit: (vals: any) => console.log('Submitted:', vals),
  },
};
