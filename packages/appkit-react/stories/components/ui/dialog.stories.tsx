import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '../../../src/tools/components/ui/dialog';
import { Button } from '../../../src/tools/components/ui/button';
import { Input } from '../../../src/tools/components/ui/input';
import { Label } from '../../../src/tools/components/ui/label';

const meta = {
  title: 'UI/Dialog',
  component: Dialog,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button variant='outline'>Open Dialog</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dialog Title</DialogTitle>
          <DialogDescription>
            This is a dialog description that provides additional context.
          </DialogDescription>
        </DialogHeader>
        <div className='py-4'>
          <p>Dialog content goes here.</p>
        </div>
      </DialogContent>
    </Dialog>
  ),
};

export const WithForm: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button>Edit Profile</Button>} />
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className='grid gap-4 py-4'>
          <div className='grid grid-cols-4 items-center gap-4'>
            <Label htmlFor='name' className='text-right'>
              Name
            </Label>
            <Input id='name' defaultValue='Pedro Duarte' className='col-span-3' />
          </div>
          <div className='grid grid-cols-4 items-center gap-4'>
            <Label htmlFor='username' className='text-right'>
              Username
            </Label>
            <Input id='username' defaultValue='@peduarte' className='col-span-3' />
          </div>
        </div>
        <DialogFooter>
          <Button type='submit'>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const CustomWidth: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button>Large Dialog</Button>} />
      <DialogContent className='max-w-[800px]'>
        <DialogHeader>
          <DialogTitle>Large Dialog</DialogTitle>
          <DialogDescription>This dialog has a custom width.</DialogDescription>
        </DialogHeader>
        <div className='py-4'>
          <p>This dialog is wider than the default dialog.</p>
        </div>
      </DialogContent>
    </Dialog>
  ),
};
