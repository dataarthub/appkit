import type { StoryObj } from '@storybook/react-vite';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarRail,
  SidebarInset,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from '../../../src/tools/components/sidebar/sidebar';
import { Home, Settings, Users, Inbox, Calendar } from 'lucide-react';

const meta = {
  title: 'Sidebar/Sidebar (Primitive)',
  component: Sidebar,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story: any) => (
      <SidebarProvider defaultOpen={true}>
        <Story />
        <SidebarInset className='p-4'>
          <header className='flex h-12 items-center gap-2 border-b px-4'>
            <SidebarTrigger />
          </header>
          <div className='flex flex-1 flex-col gap-4 p-4'>
            <div className='grid auto-rows-min gap-4 md:grid-cols-3'>
              <div className='aspect-video rounded-xl bg-muted/50' />
              <div className='aspect-video rounded-xl bg-muted/50' />
              <div className='aspect-video rounded-xl bg-muted/50' />
            </div>
            <div className='min-h-[100vh] flex-1 rounded-xl bg-muted/50' />
          </div>
        </SidebarInset>
      </SidebarProvider>
    ),
  ],
} as any;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args: any) => (
    <Sidebar {...args}>
      <SidebarHeader>
        <div className='flex items-center gap-2 px-2 py-1'>
          <div className='flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground'>
            <span className='text-xs font-bold'>M</span>
          </div>
          <span className='text-sm font-semibold'>Mappy Inc</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive tooltip='Home'>
                  <Home />
                  <span>Home</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip='Inbox'>
                  <Inbox />
                  <span>Inbox</span>
                  <span className='ml-auto text-xs text-muted-foreground'>12</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip='Calendar'>
                  <Calendar />
                  <span>Calendar</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip='Users'>
                  <Users />
                  <span>Team Members</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip='Settings'>
                  <Settings />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className='p-2 text-xs text-muted-foreground'>v1.0.0</div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  ),
};

export const Floating: Story = {
  args: {
    variant: 'floating',
  },
  render: Default.render as any,
};

export const Inset: Story = {
  args: {
    variant: 'inset',
  },
  render: Default.render as any,
};
