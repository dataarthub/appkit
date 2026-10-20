import { SidebarProvider } from '../../../src/tools/components/sidebar/sidebar';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Header } from '../../../src/tools/components/header/header';
import { Home, User, Settings, LogOut, Bell, Search } from 'lucide-react';

const meta = {
  decorators: [(Story) => <SidebarProvider><Story /></SidebarProvider>],
  title: 'Components/Header',
  component: Header,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    menuPosition: {
      control: 'radio',
      options: ['left', 'right'],
    },
  },
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

const defaultArgs = {
  title: 'My Application',
  logo: (
    <div className='h-8 w-8 bg-background rounded-md flex items-center justify-center font-bold text-primary'>
      L
    </div>
  ),
  onLogout: () => console.log('onLogout'),
  navItems: [
    { label: 'Dashboard', href: '#' },
    { label: 'Projects', href: '#', active: true },
    { label: 'Tasks', href: '#' },
    { label: 'Reports', href: '#' },
  ],
  menuItems: [
    { label: 'Home', icon: <Home className='w-4 h-4' />, onClick: () => console.log('menu:home') },
    {
      label: 'Profile',
      icon: <User className='w-4 h-4' />,
      onClick: () => console.log('menu:profile'),
    },
    {
      label: 'Settings',
      icon: <Settings className='w-4 h-4' />,
      onClick: () => console.log('menu:settings'),
    },
    {
      label: 'Logout',
      icon: <LogOut className='w-4 h-4' />,
      onClick: () => console.log('menu:logout'),
    },
  ],
  user: {
    name: 'John Doe',
    email: 'john@example.com',
  },
  userMenuItems: [
    { label: 'Profile', onClick: () => console.log('user:profile') },
    { label: 'Settings', onClick: () => console.log('user:settings') },
  ],
};

export const Default: Story = {
  args: {
    ...defaultArgs,
  },
};

export const MenuLeft: Story = {
  args: {
    ...defaultArgs,
    menuPosition: 'left',
  },
};

export const NoLogo: Story = {
  args: {
    ...defaultArgs,
    logo: undefined,
  },
};

export const NoUser: Story = {
  args: {
    ...defaultArgs,
    user: undefined,
  },
};

export const FullFeatures: Story = {
  args: {
    ...defaultArgs,
    actions: (
      <div className='flex items-center gap-2'>
        <button className='p-2 hover:bg-white/10 rounded-full'>
          <Search className='w-4 h-4' />
        </button>
        <button className='p-2 hover:bg-white/10 rounded-full'>
          <Bell className='w-4 h-4' />
        </button>
      </div>
    ),
  },
};

export const MobileView: Story = {
  args: {
    ...defaultArgs,
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};
