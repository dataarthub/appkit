import type { Meta, StoryObj } from '@storybook/react-vite';
import { ScrollArea } from '../../../src/tools/components/ui/scroll-area';
import { Separator } from '../../../src/tools/components/ui/separator';
import React from 'react';

const meta = {
  title: 'UI/ScrollArea',
  component: ScrollArea,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ScrollArea>;

export default meta;
type Story = StoryObj<typeof meta>;

const tags = Array.from({ length: 50 }).map((_, i, a) => `v1.2.0-beta.${a.length - i}`);

export const Default: Story = {
  render: () => (
    <ScrollArea className='h-72 w-48 rounded-md border'>
      <div className='p-4'>
        <h4 className='mb-4 text-sm font-medium leading-none'>Tags</h4>
        {tags.map((tag) => (
          <React.Fragment key={tag}>
            <div className='text-sm'>{tag}</div>
            <Separator className='my-2' />
          </React.Fragment>
        ))}
      </div>
    </ScrollArea>
  ),
};

export const Horizontal: Story = {
  render: () => (
    <ScrollArea className='w-96 whitespace-nowrap rounded-md border'>
      <div className='flex w-max space-x-4 p-4'>
        {Array.from({ length: 10 }).map((_, i) => (
          <figure key={i} className='shrink-0'>
            <div className='overflow-hidden rounded-md'>
              <div className='bg-muted h-[200px] w-[150px]' />
            </div>
            <figcaption className='pt-2 text-xs text-muted-foreground'>
              Photo by <span className='font-semibold text-foreground'>Artist {i + 1}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </ScrollArea>
  ),
};
