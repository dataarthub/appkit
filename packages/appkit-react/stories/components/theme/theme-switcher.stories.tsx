import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { SynchronizeThemeGlobals } from '../../../.storybook/theme-globals';
import { ThemeSwitcherGroup } from '../../../src/tools/components/theme/theme-switcher';
import { ThemeProvider } from '../../../src/tools/components/theme/theme-provider';

const meta = {
  title: 'Components/ThemeSwitcher',
  component: ThemeSwitcherGroup,
  parameters: {
    layout: 'centered',
    verification: { ownsTheme: true },
  },
  decorators: [
    (Story, context) => (
      <ThemeProvider defaultTheme={context.globals.theme} defaultColorTheme={context.globals.palette}
        storageKey={`${context.id}-mode`} colorThemeStorageKey={`${context.id}-palette`} spacingThemeStorageKey={`${context.id}-spacing`}>
        <SynchronizeThemeGlobals mode={context.globals.theme} palette={context.globals.palette} />
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
    className: 'flex flex-wrap gap-4',
  },
  play: async ({ canvasElement, globals }) => {
    const canvas = within(canvasElement);
    const mode = canvas.getByRole('combobox', { name: 'Mode' });
    const color = canvas.getByRole('combobox', { name: 'Color' });
    const density = canvas.getByRole('combobox', { name: 'Density' });
    const root = document.documentElement;
    const resolved = (value: string) => value === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : value;
    await waitFor(() => {
      expect(mode).toHaveValue(globals.theme);
      expect(color).toHaveValue(globals.palette);
      expect(root).toHaveClass(resolved(globals.theme));
      expect(globals.palette === 'default' ? !Array.from(root.classList).some(value => value.startsWith('theme-')) : root.classList.contains(`theme-${globals.palette}`)).toBe(true);
    });
    await expect(density).toBeVisible();
    const nextMode = resolved(globals.theme) === 'dark' ? 'light' : 'dark';
    await userEvent.selectOptions(mode, nextMode);
    await waitFor(() => { expect(mode).toHaveValue(nextMode); expect(root).toHaveClass(nextMode); });
    await userEvent.selectOptions(mode, 'system');
    await waitFor(() => { expect(mode).toHaveValue('system'); expect(root).toHaveClass(resolved('system')); });
    await userEvent.selectOptions(color, 'blue');
    await waitFor(() => { expect(color).toHaveValue('blue'); expect(root).toHaveClass('theme-blue'); });
    await userEvent.selectOptions(color, 'green');
    await waitFor(() => { expect(color).toHaveValue('green'); expect(root).toHaveClass('theme-green'); expect(root).not.toHaveClass('theme-blue'); });
    await userEvent.selectOptions(density, 'compact');
    await waitFor(() => { expect(density).toHaveValue('compact'); expect(root).toHaveClass('spacing-compact'); });
    // Restore selected globals so the displayed result agrees with the toolbar.
    await userEvent.selectOptions(mode, globals.theme);
    await userEvent.selectOptions(color, globals.palette);
    await userEvent.selectOptions(density, 'normal');
    await waitFor(() => {
      expect(mode).toHaveValue(globals.theme);
      expect(color).toHaveValue(globals.palette);
      expect(root).toHaveClass(resolved(globals.theme));
      expect(root).toHaveClass('spacing-normal');
    });
  },
};
