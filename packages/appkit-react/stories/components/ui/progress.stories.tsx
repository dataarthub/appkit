import type { Meta, StoryObj } from '@storybook/react-vite';
import { Progress } from '../../../src/tools/components/ui/progress';
import { useEffect, useState } from 'react';

const meta = {
  title: 'UI/Progress',
  component: Progress,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  args: { 'aria-label': 'File upload progress' },
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: 50,
    className: 'w-[300px]',
  },
};

export const Zero: Story = {
  args: {
    value: 0,
    className: 'w-[300px]',
  },
};

export const Complete: Story = {
  args: {
    value: 100,
    className: 'w-[300px]',
  },
};

export const Animated: Story = {
  args: {} as any,
  render: () => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
      const timer = setInterval(() => {
        setProgress((oldProgress) => {
          if (oldProgress === 100) {
            return 0;
          }
          const diff = Math.random() * 10;
          return Math.min(oldProgress + diff, 100);
        });
      }, 500);

      return () => {
        clearInterval(timer);
      };
    }, []);

    return <Progress aria-label="File upload progress" value={progress} className='w-[300px]' />;
  },
};

export const Multiple: Story = {
  args: {} as any,
  render: () => (
    <div className='space-y-4 w-[300px]'>
      <div className='space-y-2'>
        <div className='flex justify-between text-sm'>
          <span>Upload 1</span>
          <span>25%</span>
        </div>
        <Progress aria-label="Upload 1" value={25} />
      </div>
      <div className='space-y-2'>
        <div className='flex justify-between text-sm'>
          <span>Upload 2</span>
          <span>66%</span>
        </div>
        <Progress aria-label="Upload 2" value={66} />
      </div>
      <div className='space-y-2'>
        <div className='flex justify-between text-sm'>
          <span>Upload 3</span>
          <span>100%</span>
        </div>
        <Progress aria-label="Upload 3" value={100} />
      </div>
    </div>
  ),
};
