import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
  ToastProvider,
  ToastViewport,
} from '../../../src/tools/components/ui/toast';
import { Button } from '../../../src/tools/components/ui/button';
import React from 'react';

const meta = {
  title: 'UI/Toast',
  component: Toast,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {} as any,
  render: () => (
    <ToastProvider>
      <div className='flex flex-col gap-4 w-[400px]'>
        <Toast {...({} as any)}>
          <div className='grid gap-1'>
            <ToastTitle>Scheduled: Catch up</ToastTitle>
            <ToastDescription>Friday, February 10, 2023 at 5:57 PM</ToastDescription>
          </div>
          <ToastAction>Undo</ToastAction>
          <ToastClose />
        </Toast>

        <Toast className='bg-destructive text-destructive-foreground' {...({} as any)}>
          <div className='grid gap-1'>
            <ToastTitle>Error</ToastTitle>
            <ToastDescription>Something went wrong. Please try again.</ToastDescription>
          </div>
          <ToastClose />
        </Toast>
      </div>
      <ToastViewport />
    </ToastProvider>
  ),
};

export const WithInteractiveTrigger: Story = {
  args: {} as any,
  render: () => {
    const [open, setOpen] = React.useState(false);
    return (
      <ToastProvider>
        <Button onClick={() => setOpen(true)}>Show Toast</Button>
        <Toast open={open} onOpenChange={setOpen} {...({} as any)}>
          <div className='grid gap-1'>
            <ToastTitle>Notification</ToastTitle>
            <ToastDescription>This is a toast notification.</ToastDescription>
          </div>
          <ToastClose />
        </Toast>
        <ToastViewport />
      </ToastProvider>
    );
  },
};
