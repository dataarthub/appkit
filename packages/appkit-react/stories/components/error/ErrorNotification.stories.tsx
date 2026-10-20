import type { StoryObj } from '@storybook/react-vite';
import { ErrorNotification } from '../../../src/tools/components/error/ErrorNotification';
import { useErrorStore } from '../../../src/tools/lib/state/error-store';
import { AppError } from '../../../src/tools/lib/error';
import { useEffect } from 'react';
import { Button } from '../../../src/tools/components/ui/button';

const meta = {
  title: 'Error/ErrorNotification',
  component: ErrorNotification,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} as any;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Interact with error notifications.
 */
export const Playground: Story = {
  render: () => {
    const { addError, clearErrors } = useErrorStore();

    const showError = () => {
      addError(
        new AppError('error/test', 'テストエラーメッセージ', {
          displayMode: 'notification',
          severity: 'error',
        }),
        { autoDismiss: 5000 },
      );
    };

    const showWarning = () => {
      addError(
        new AppError('warning/test', 'テスト警告メッセージ', {
          displayMode: 'notification',
          severity: 'warning',
        }),
        { autoDismiss: 5000 },
      );
    };

    const showInfo = () => {
      addError(
        new AppError('info/test', '情報メッセージ', {
          displayMode: 'notification',
          severity: 'info',
        }),
        { autoDismiss: 5000 },
      );
    };

    return (
      <div className='flex flex-col gap-4'>
        <div className='flex gap-2'>
          <Button onClick={showError} variant='destructive'>
            Show Error
          </Button>
          <Button onClick={showWarning} variant='outline'>
            Show Warning
          </Button>
          <Button onClick={showInfo} variant='secondary'>
            Show Info
          </Button>
          <Button onClick={clearErrors} variant='ghost'>
            Clear All
          </Button>
        </div>
        <ErrorNotification position='top-right' />
      </div>
    );
  },
};

/**
 * Place notifications at the top right.
 */
export const TopRight: Story = {
  args: {
    position: 'top-right',
  },
  render: (args: any) => {
    const { addError } = useErrorStore();

    useEffect(() => {
      addError(
        new AppError('auth/user-not-found', 'アカウントが見つかりません', {
          displayMode: 'notification',
          severity: 'error',
        }),
      );
    }, [addError]);

    return <ErrorNotification {...args} />;
  },
};

/**
 * Place notifications at the top left.
 */
export const TopLeft: Story = {
  args: {
    position: 'top-left',
  },
  render: (args: any) => {
    const { addError } = useErrorStore();

    useEffect(() => {
      addError(
        new AppError('error/network', 'ネットワークエラーが発生しました', {
          displayMode: 'notification',
          severity: 'error',
        }),
      );
    }, [addError]);

    return <ErrorNotification {...args} />;
  },
};
