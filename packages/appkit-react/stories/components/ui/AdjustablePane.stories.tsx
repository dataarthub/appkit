import type { Meta, StoryObj } from '@storybook/react-vite';
import { AdjustablePane } from '../../../src/tools/components/ui/adjustable-pane';
import { useState } from 'react';
import { Button } from '../../../src/tools/components/ui/button';

const meta: Meta<typeof AdjustablePane> = {
  title: 'Components/UI/AdjustablePane',
  component: AdjustablePane,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof AdjustablePane>;

const Template = (args: any) => {
  const [open, setOpen] = useState(true);

  return (
    <div className='h-screen w-full bg-slate-100 flex flex-col'>
      <div className='p-4 border-b bg-white flex justify-between items-center'>
        <h1 className='font-bold'>Main Dashboard</h1>
        <Button onClick={() => setOpen(!open)}>{open ? 'Close' : 'Open'} Pane</Button>
      </div>
      <div className='flex-1 overflow-hidden'>
        <AdjustablePane
          {...args}
          open={open}
          onClose={() => setOpen(false)}
          main={
            <div className='p-10 text-slate-400'>
              <p>This is the main content area.</p>
              <div className='mt-4 grid grid-cols-3 gap-4'>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className='h-32 bg-white border rounded-lg shadow-sm' />
                ))}
              </div>
            </div>
          }
        >
          <div className='space-y-4'>
            <h2 className='text-lg font-semibold'>Pane Content</h2>
            <p className='text-sm text-muted-foreground'>
              You can drag the handle to resize this pane.
            </p>
            <div className='space-y-2'>
              <div className='h-4 w-full bg-muted rounded' />
              <div className='h-4 w-3/4 bg-muted rounded' />
              <div className='h-4 w-5/6 bg-muted rounded' />
            </div>
          </div>
        </AdjustablePane>
      </div>
    </div>
  );
};

export const RightSide: Story = {
  render: (args: any) => <Template {...args} side='right' />,
};

export const BottomSide: Story = {
  render: (args: any) => <Template {...args} side='bottom' initialSize={40} />,
};
