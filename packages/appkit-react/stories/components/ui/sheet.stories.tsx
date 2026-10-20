import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '../../../src/tools/components/ui/sheet';
import { Button } from '../../../src/tools/components/ui/button';
import { Input } from '../../../src/tools/components/ui/input';
import { Label } from '../../../src/tools/components/ui/label';

const meta = {
  title: 'UI/Sheet',
  component: Sheet,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    // @ts-expect-error - Storybook argTypes typing doesn't include custom prop.
    side: {
      control: 'select',
      options: ['top', 'right', 'bottom', 'left'],
      description: 'Side of the screen to slide in from',
      table: {
        defaultValue: { summary: 'right' },
      },
    },
  },
} satisfies Meta<typeof Sheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args: unknown) => (
    <Sheet>
      <SheetTrigger render={<Button variant='outline'>Open Sheet</Button>} />
      <SheetContent {...(args as any)}>
        <SheetHeader>
          <SheetTitle>Edit profile</SheetTitle>
          <SheetDescription>
            Make changes to your profile here. Click save when you're done.
          </SheetDescription>
        </SheetHeader>
        <div className='grid gap-4 py-4'>
          <div className='grid grid-cols-4 items-center gap-4'>
            <Label htmlFor='name' className='text-right'>
              Name
            </Label>
            <Input id='name' value='Pedro Duarte' className='col-span-3' />
          </div>
          <div className='grid grid-cols-4 items-center gap-4'>
            <Label htmlFor='username' className='text-right'>
              Username
            </Label>
            <Input id='username' value='@peduarte' className='col-span-3' />
          </div>
        </div>
        <SheetFooter>
          <SheetClose render={<Button type='button'>Save changes</Button>} />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
  args: {
    // @ts-expect-error - Storybook args typing doesn't include custom prop.
    side: 'right',
  },
};

export const SideLeft: Story = {
  ...Default,
  args: {
    // @ts-expect-error - Storybook args typing doesn't include custom prop.
    side: 'left',
  },
};

export const SideTop: Story = {
  ...Default,
  args: {
    // @ts-expect-error - Storybook args typing doesn't include custom prop.
    side: 'top',
  },
};

export const SideBottom: Story = {
  ...Default,
  args: {
    // @ts-expect-error - Storybook args typing doesn't include custom prop.
    side: 'bottom',
  },
};
