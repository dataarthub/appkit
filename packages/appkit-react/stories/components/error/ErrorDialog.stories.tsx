import type { Meta, StoryObj } from '@storybook/react-vite';
import { ErrorDialog } from '../../../src/tools/components/error/ErrorDialog';
import { useErrorStore } from '../../../src/tools/lib/state/error-store';
import { AppError } from '../../../src/tools/lib/error';
import { Button } from '../../../src/tools/components/ui/button';

const meta = {
  title: 'Components/Error/ErrorDialog',
  component: ErrorDialog,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ErrorDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Control the open state explicitly.
 */
export const Controlled: Story = {
  args: {
    error: new AppError('auth/user-not-found', 'アカウントが見つかりません', {
      severity: 'error',
    }),
    open: true,
    primaryActionLabel: 'OK',
  },
};

/**
 * Display a secondary action.
 */
export const WithSecondaryAction: Story = {
  args: {
    error: new AppError('error/timeout', '操作がタイムアウトしました', {
      severity: 'warning',
    }),
    open: true,
    primaryActionLabel: '再試行',
    secondaryActionLabel: 'キャンセル',
  },
};

/**
 * Display errors through the shared store.
 */
export const Playground: Story = {
  render: () => {
    const { addError, clearErrors } = useErrorStore();

    const showDialog = () => {
      addError(
        new AppError('auth/wrong-password', 'パスワードが間違っています', {
          displayMode: 'dialog',
          severity: 'error',
        }),
      );
    };

    return (
      <div className='flex flex-col gap-4'>
        <div className='flex gap-2'>
          <Button onClick={showDialog} variant='destructive'>
            Show Error Dialog
          </Button>
          <Button onClick={clearErrors} variant='ghost'>
            Clear
          </Button>
        </div>
        <ErrorDialog />
      </div>
    );
  },
};
