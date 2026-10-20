import type { Meta, StoryObj } from '@storybook/react-vite';
import { Separator } from '../../../src/tools/components/ui/separator';

const meta = {
  title: 'UI/Separator',
  component: Separator,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: () => (
    <div className='w-[300px]'>
      <div className='space-y-1'>
        <h4 className='text-sm font-medium leading-none'>Radix Primitives</h4>
        <p className='text-sm text-muted-foreground'>An open-source UI component library.</p>
      </div>
      <Separator className='my-4' />
      <div className='flex h-5 items-center space-x-4 text-sm'>
        <div>Blog</div>
        <Separator orientation='vertical' />
        <div>Docs</div>
        <Separator orientation='vertical' />
        <div>Source</div>
      </div>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className='flex h-20 items-center space-x-4'>
      <div>Item 1</div>
      <Separator orientation='vertical' />
      <div>Item 2</div>
      <Separator orientation='vertical' />
      <div>Item 3</div>
    </div>
  ),
};

export const InCard: Story = {
  render: () => (
    <div className='w-[350px] border rounded-lg p-6 space-y-4'>
      <div className='space-y-1'>
        <h3 className='text-lg font-semibold'>Account Settings</h3>
        <p className='text-sm text-muted-foreground'>Manage your account preferences</p>
      </div>
      <Separator />
      <div className='space-y-2'>
        <h4 className='text-sm font-medium'>Profile</h4>
        <p className='text-sm text-muted-foreground'>Update your profile information</p>
      </div>
      <Separator />
      <div className='space-y-2'>
        <h4 className='text-sm font-medium'>Security</h4>
        <p className='text-sm text-muted-foreground'>Manage security settings</p>
      </div>
    </div>
  ),
};
