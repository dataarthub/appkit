import type { Meta, StoryObj } from '@storybook/react-vite';
import { ErrorInline } from '../../../src/tools/components/error/ErrorInline';
import { AppError } from '../../../src/tools/lib/error';

const meta = {
  title: 'Components/Error/ErrorInline',
  component: ErrorInline,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ErrorInline>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Display a basic error message.
 */
export const Default: Story = {
  args: {
    message: 'メールアドレスの形式が正しくありません',
    severity: 'error',
  },
};

/**
 * Display a warning message.
 */
export const Warning: Story = {
  args: {
    message: 'パスワードが弱すぎます',
    severity: 'warning',
  },
};

/**
 * Display an informational message.
 */
export const Info: Story = {
  args: {
    message: '確認メールを送信しました',
    severity: 'info',
  },
};

/**
 * Display an AppError instance.
 */
export const WithAppError: Story = {
  args: {
    error: new AppError('auth/invalid-email', '無効なメールアドレス形式です', {
      severity: 'error',
    }),
  },
};

/**
 * Display a localized Firebase Auth error code.
 */
export const WithErrorCode: Story = {
  args: {
    code: 'auth/user-not-found',
  },
};

/**
 * Display a message without an icon.
 */
export const WithoutIcon: Story = {
  args: {
    message: 'このフィールドは必須です',
    severity: 'error',
    hideIcon: true,
  },
};

/**
 * Display a fatal error.
 */
export const Critical: Story = {
  args: {
    message: '致命的なエラーが発生しました',
    severity: 'critical',
  },
};
