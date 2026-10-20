import { SidebarProvider } from '../../../src/tools/components/sidebar/sidebar';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { Layout } from '../../../src/tools/components/ui/layout';
import { Header } from '../../../src/tools/components/header/header';

const meta = {
  decorators: [(Story) => <SidebarProvider><Story /></SidebarProvider>],
  title: 'Components/Layout',
  component: Layout,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  play: async ({ canvasElement }) => {
    const main = within(canvasElement).getByRole('main', { name: 'Main content' });
    await expect(main).toHaveAttribute('tabindex', '0');
  },
  argTypes: {
    headerPosition: {
      control: 'radio',
      options: ['top', 'right-of-sidebar'],
    },
    isLeftSidebarCollapsed: { control: 'boolean' },
    isRightPaneVisible: { control: 'boolean' },
  },
} satisfies Meta<typeof Layout>;

export default meta;
type Story = StoryObj<typeof meta>;

const SidebarContent = (_props: unknown) => (
  <div className='w-64 h-full bg-muted p-4 border-r'>
    <h2 className='font-bold mb-4'>Sidebar</h2>
    <ul className='space-y-2'>
      <li>Item 1</li>
      <li>Item 2</li>
      <li>Item 3</li>
    </ul>
  </div>
);

const HeaderContent = (
  <Header
    title='My App Header'
    logo={
      <div className='h-8 w-8 bg-blue-500 rounded text-white flex items-center justify-center font-bold'>
        L
      </div>
    }
    onLogout={() => console.log('logout')}
    navItems={[
      { label: 'Dashboard', href: '#', active: true },
      { label: 'Projects', href: '#' },
    ]}
  />
);

const MainContent = (
  <div className='p-8 space-y-4'>
    <h1 className='text-2xl font-bold'>Main Content</h1>
    <p>This is the main content area. It should scroll independently if needed.</p>
    {Array.from({ length: 20 }).map((_, i) => (
      <p key={i}>Paragraph {i + 1} with some filler text to demonstrate scrolling.</p>
    ))}
  </div>
);

const RightPaneContent = (
  <div className='p-4'>
    <h2 className='font-bold mb-2'>Details</h2>
    <p>Some details here.</p>
  </div>
);

export const DefaultTopHeader: Story = {
  args: {
    header: HeaderContent,
    leftSidebar: <SidebarContent />,
    children: MainContent,
    headerPosition: 'top',
  },
};

export const HeaderRightOfSidebar: Story = {
  args: {
    header: HeaderContent,
    leftSidebar: <SidebarContent />,
    children: MainContent,
    headerPosition: 'right-of-sidebar',
  },
};

export const WithRightPane: Story = {
  args: {
    header: HeaderContent,
    leftSidebar: <SidebarContent />,
    rightPane: RightPaneContent,
    children: MainContent,
    headerPosition: 'top',
  },
};

export const HeaderRightWithRightPane: Story = {
  args: {
    header: HeaderContent,
    leftSidebar: <SidebarContent />,
    rightPane: RightPaneContent,
    children: MainContent,
    headerPosition: 'right-of-sidebar',
  },
};
