import type { StoryObj } from '@storybook/react-vite';
import { SmartSidebar } from '../../../src/tools/components/sidebar/SmartSidebar';
import { Home, Users, Settings, Mail, Calendar, FileText, BarChart } from 'lucide-react';
import { TooltipProvider } from '../../../src/tools/components/ui/tooltip';

const meta = {
  title: 'Sidebar/SmartSidebar',
  component: SmartSidebar,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story: any) => (
      <TooltipProvider>
        <div className='flex h-screen w-full'>
          <Story />
          <main className='flex-1 p-8'>
            <h1 className='text-2xl font-bold'>Main Content</h1>
            <p className='mt-4 text-muted-foreground'>Sidebar is persistent. Try collapsing it.</p>
          </main>
        </div>
      </TooltipProvider>
    ),
  ],
} as any;

export default meta;
type Story = StoryObj<typeof meta>;

const mockGroups = [
  {
    title: 'General',
    items: [
      { icon: <Home />, label: 'Dashboard', path: '/' },
      { icon: <Users />, label: 'Users', path: '/users' },
      { icon: <Calendar />, label: 'Calendar', path: '/calendar' },
    ],
  },
  {
    title: 'Communication',
    items: [
      { icon: <Mail />, label: 'Messages', path: '/messages', extra: <span>12</span> },
      { icon: <FileText />, label: 'Documents', path: '/docs' },
    ],
  },
  {
    title: 'Analytics',
    items: [
      { icon: <BarChart />, label: 'Reports', path: '/reports' },
      { icon: <Settings />, label: 'Settings', path: '/settings' },
    ],
  },
];

export const Default: Story = {
  args: {
    groups: mockGroups,
    activePath: '/',
    onNavigate: (path: string) => console.log('Navigate to:', path),
  },
};

export const Collapsed: Story = {
  args: {
    groups: mockGroups,
    activePath: '/users',
    collapsed: true,
    onNavigate: (path: string) => console.log('Navigate to:', path),
  },
};

export const WithCustomHeader: Story = {
  args: {
    groups: mockGroups,
    activePath: '/dashboard',
    header: () => (
      <div className='p-4 flex items-center gap-2'>
        <div className='h-8 w-8 rounded bg-primary' />
        <span className='font-bold'>Pro Edition</span>
      </div>
    ),
  },
};
