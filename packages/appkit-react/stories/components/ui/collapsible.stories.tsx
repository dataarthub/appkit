import type { Meta, StoryObj } from '@storybook/react-vite';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../../../src/tools/components/ui/collapsible';
import { Button } from '../../../src/tools/components/ui/button';
import { ChevronsUpDown } from 'lucide-react';
import React from 'react';

const meta = {
  title: 'UI/Collapsible',
  component: Collapsible,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Collapsible>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className='w-[350px] space-y-2'>
        <div className='flex items-center justify-between space-x-4 px-4'>
          <h4 className='text-sm font-semibold'>@peduarte starred 3 repositories</h4>
          <CollapsibleTrigger
            render={
              <Button variant='ghost' size='sm' className='w-9 p-0'>
                <ChevronsUpDown className='h-4 w-4' />
                <span className='sr-only'>Toggle</span>
              </Button>
            }
          />
        </div>
        <div className='rounded-md border px-4 py-3 font-mono text-sm'>
          @base-ui/react/collapsible
        </div>
        <CollapsibleContent className='space-y-2'>
          <div className='rounded-md border px-4 py-3 font-mono text-sm'>packages/appkit-react</div>
          <div className='rounded-md border px-4 py-3 font-mono text-sm'>src/components/ui</div>
        </CollapsibleContent>
      </Collapsible>
    );
  },
};
