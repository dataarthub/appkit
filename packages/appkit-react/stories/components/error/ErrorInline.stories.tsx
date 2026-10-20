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
 * 基本的なエラーメッセージの表示
 */
export const Default: Story = {
  args: {
    message: 'メールアドレスの形式が正しくありません',
    severity: 'error',
  },
};

/**
 * 警告メッセージ
 */
export const Warning: Story = {
  args: {
    message: 'パスワードが弱すぎます',
    severity: 'warning',
  },
};

/**
 * 情報メッセージ
 */
export const Info: Story = {
  args: {
    message: '確認メールを送信しました',
    severity: 'info',
  },
};

/**
 * AppError オブジェクトから表示
 */
export const WithAppError: Story = {
  args: {
    error: new AppError('auth/invalid-email', '無効なメールアドレス形式です', {
      severity: 'error',
    }),
  },
};

/**
 * i18n エラーコードから表示 (Firebase Auth)
 */
export const WithErrorCode: Story = {
  args: {
    code: 'auth/user-not-found',
  },
};

/**
 * アイコンなし
 */
export const WithoutIcon: Story = {
  args: {
    message: 'このフィールドは必須です',
    severity: 'error',
    hideIcon: true,
  },
};

/**
 * 致命的エラー
 */
export const Critical: Story = {
  args: {
    message: '致命的なエラーが発生しました',
    severity: 'critical',
  },
};
