import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar, AvatarFallback, AvatarImage } from '../../../src/tools/components/ui/avatar';

const meta = {
  title: 'UI/Avatar',
  component: Avatar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithImage: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src='https://github.com/shadcn.png' alt='@shadcn' />
      <AvatarFallback>CN</AvatarFallback>
    </Avatar>
  ),
};

export const Fallback: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src='/broken-image.jpg' alt='@user' />
      <AvatarFallback>JD</AvatarFallback>
    </Avatar>
  ),
};

export const OnlyFallback: Story = {
  render: () => (
    <Avatar>
      <AvatarFallback>AB</AvatarFallback>
    </Avatar>
  ),
};

export const Multiple: Story = {
  render: () => (
    <div className='flex gap-2'>
      <Avatar>
        <AvatarImage src='https://github.com/shadcn.png' />
        <AvatarFallback>CN</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>XY</AvatarFallback>
      </Avatar>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className='flex items-end gap-4'>
      <Avatar className='h-8 w-8'>
        <AvatarFallback className='text-xs'>S</AvatarFallback>
      </Avatar>
      <Avatar className='h-12 w-12'>
        <AvatarFallback>M</AvatarFallback>
      </Avatar>
      <Avatar className='h-16 w-16'>
        <AvatarFallback className='text-lg'>L</AvatarFallback>
      </Avatar>
      <Avatar className='h-20 w-20'>
        <AvatarFallback className='text-xl'>XL</AvatarFallback>
      </Avatar>
    </div>
  ),
};
