import type { Meta, StoryObj } from '@storybook/react-vite';
import { Popover, PopoverContent, PopoverTrigger } from '../../../src/tools/components/ui/popover';
import { Button } from '../../../src/tools/components/ui/button';

const meta = {
  title: 'UI/Popover',
  component: Popover,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger render={<Button variant='outline'>Open Popover</Button>} />
      <PopoverContent>
        <div className='grid gap-4'>
          <div className='space-y-2'>
            <h4 className='font-medium leading-none'>Dimensions</h4>
            <p className='text-sm text-muted-foreground'>Set the dimensions for the layer.</p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  ),
};

export const WithForm: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger render={<Button variant='outline'>Settings</Button>} />
      <PopoverContent className='w-80'>
        <div className='grid gap-4'>
          <div className='space-y-2'>
            <h4 className='font-medium leading-none'>Settings</h4>
            <p className='text-sm text-muted-foreground'>Adjust your preferences.</p>
          </div>
          <div className='grid gap-2'>
            <div className='grid grid-cols-3 items-center gap-4'>
              <label htmlFor='width'>Width</label>
              <input
                id='width'
                defaultValue='100%'
                className='col-span-2 h-8 px-3 border rounded-md'
              />
            </div>
            <div className='grid grid-cols-3 items-center gap-4'>
              <label htmlFor='height'>Height</label>
              <input
                id='height'
                defaultValue='25px'
                className='col-span-2 h-8 px-3 border rounded-md'
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  ),
};
