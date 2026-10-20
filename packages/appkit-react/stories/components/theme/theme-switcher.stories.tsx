import type { Meta, StoryObj } from '@storybook/react-vite';
import { ThemeSwitcherGroup } from '../../../src/tools/components/theme/theme-switcher';
import { ThemeProvider } from '../../../src/tools/components/theme/theme-provider';

const meta = {
  title: 'Components/ThemeSwitcher',
  component: ThemeSwitcherGroup,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story: any) => (
      <ThemeProvider defaultTheme='light' storageKey='vite-ui-theme'>
        <div className='p-4 bg-background min-h-[100px] flex items-center justify-center'>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof ThemeSwitcherGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    className: 'flex gap-4',
  },
};
