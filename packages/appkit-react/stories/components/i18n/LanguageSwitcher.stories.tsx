import type { Meta, StoryObj } from '@storybook/react-vite';
import { LanguageSwitcher } from '../../../src/tools/components/i18n/LanguageSwitcher';

const meta = {
  title: 'I18n/LanguageSwitcher',
  component: LanguageSwitcher,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} as Meta<typeof LanguageSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
