import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { ThemeProvider } from '../../src/ui/theme';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Label, Badge, Alert, AlertTitle, AlertDescription, Popover, PopoverTrigger, PopoverContent, PopoverTitle, PopoverDescription } from '../../src/ui';
import { expectReadableTheme, textTokenPairs } from './theme-contrast';
import { expectNoHorizontalOverflow, expectUsableControl } from './geometry';

function ThemeExample({ palette, mode }: { palette: string; mode: 'light' | 'dark' }) {
  const key = `verification-${palette}-${mode}`;
  return <ThemeProvider key={key} defaultTheme={mode} defaultColorTheme={palette}
    storageKey={`${key}-mode`} colorThemeStorageKey={`${key}-palette`} spacingThemeStorageKey={`${key}-spacing`}>
    <main className='space-y-4 max-w-xl' aria-label={`${palette} ${mode} theme`}>
      <h1 className='text-xl font-semibold'>{palette} / {mode}</h1>
      <Card><CardHeader><CardTitle>Project settings</CardTitle><CardDescription>Review your workspace preferences.</CardDescription></CardHeader>
        <CardContent className='space-y-3'><Label htmlFor={`${key}-name`}>Project name</Label><Input id={`${key}-name`} defaultValue='Appkit' />
          <div className='flex flex-wrap gap-2'><Button>Save changes</Button><Button variant='secondary'>Cancel</Button><Button variant='destructive'>Delete</Button></div>
          <Badge>Active</Badge>
        </CardContent>
      </Card>
      <Alert><AlertTitle>Changes saved</AlertTitle><AlertDescription>Your project is ready.</AlertDescription></Alert>
      <Alert variant='destructive'><AlertTitle>Review required</AlertTitle><AlertDescription>Resolve the project warning.</AlertDescription></Alert>
      <Popover><PopoverTrigger render={<Button variant='outline' />}>Theme details</PopoverTrigger><PopoverContent><PopoverTitle>Theme details</PopoverTitle><PopoverDescription>Readable overlay text.</PopoverDescription></PopoverContent></Popover>
      <div className='grid grid-cols-2 gap-2' aria-label='Text token samples'>
        {textTokenPairs.map(([background, foreground]) => <div key={background} className='rounded p-2 text-sm' style={{ backgroundColor: `var(--${background})`, color: `var(--${foreground})` }}>{background}</div>)}
      </div>
    </main>
  </ThemeProvider>;
}
const meta = {
  title: 'Verification/Theme contrast', component: ThemeExample,
  parameters: { verification: { ownsTheme: true }, a11y: { test: 'error' }, docs: { description: { component: 'Every shipped palette in light and dark mode, rendered by the public @alneas/appkit-react/ui/theme ThemeProvider with separate storage keys. Public @alneas/appkit-react/ui controls use explicit Appkit styles. Browser assertions require WCAG AA normal-text contrast for each semantic text pair, including alpha compositing and browser OKLCH conversion.' } } },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await waitFor(() => {
      const root = document.documentElement;
      expect(root).toHaveClass(args.mode);
      expect(root).not.toHaveClass(args.mode === 'dark' ? 'light' : 'dark');
      for (const palette of ['blue', 'green', 'rose', 'orange', 'future']) {
        expect(root.classList.contains(`theme-${palette}`), `palette ${palette}`).toBe(palette === args.palette);
      }
    });
    expectReadableTheme();
    const input = canvas.getByRole('textbox', { name: 'Project name' });
    await userEvent.clear(input); await userEvent.type(input, 'Readable project');
    expect(input).toHaveValue('Readable project');
    const trigger = canvas.getByRole('button', { name: 'Theme details' });
    trigger.scrollIntoView({ block: 'center' }); expectUsableControl(trigger);
    await userEvent.click(trigger);
    const overlay = await within(document.body).findByRole('dialog');
    expect(overlay).toHaveTextContent('Readable overlay text.');
    expectNoHorizontalOverflow();
  },
} satisfies Meta<typeof ThemeExample>;
export default meta;
type Story = StoryObj<typeof meta>;
export const DefaultLight: Story = { args: { palette: 'default', mode: 'light' } };
export const DefaultDark: Story = { args: { palette: 'default', mode: 'dark' } };
export const BlueLight: Story = { args: { palette: 'blue', mode: 'light' } };
export const BlueDark: Story = { args: { palette: 'blue', mode: 'dark' } };
export const GreenLight: Story = { args: { palette: 'green', mode: 'light' } };
export const GreenDark: Story = { args: { palette: 'green', mode: 'dark' } };
export const RoseLight: Story = { args: { palette: 'rose', mode: 'light' } };
export const RoseDark: Story = { args: { palette: 'rose', mode: 'dark' } };
export const OrangeLight: Story = { args: { palette: 'orange', mode: 'light' } };
export const OrangeDark: Story = { args: { palette: 'orange', mode: 'dark' } };
export const FutureLight: Story = { args: { palette: 'future', mode: 'light' } };
export const FutureDark: Story = { args: { palette: 'future', mode: 'dark' } };
