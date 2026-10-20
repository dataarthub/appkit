import { expect, waitFor } from 'storybook/test';
import { mswLoader } from './msw';
import type { Preview } from '@storybook/react-vite';
import { ThemeProvider } from '../src/ui/theme';
import './styles.css';
import { StoryQueryProvider } from '../stories/providers';
import { SynchronizeThemeGlobals } from './theme-globals';

export default {
  loaders: [mswLoader],
  initialGlobals: { theme: 'system', palette: 'default' },
  globalTypes: {
    palette: { toolbar: { icon: 'paintbrush', items: ['default', 'blue', 'green', 'rose', 'orange', 'future'] } },
    theme: { toolbar: { icon: 'circlehollow', items: ['light', 'dark', 'system'] } },
  },
  parameters: { a11y: { test: 'error' }, controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } } },
  afterEach: async ({ parameters, globals }) => {
    if (!parameters.verification?.ownsTheme) {
      const mode = globals.theme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : globals.theme;
      await waitFor(() => expect(document.documentElement).toHaveClass(mode));
    }
  },
  decorators: [(Story, context) => (
    <StoryQueryProvider key={context.id}>{context.parameters.verification?.ownsTheme ? <div className="bg-background text-foreground min-h-screen p-4"><Story /></div> : <ThemeProvider defaultTheme={context.globals.theme} defaultColorTheme={context.globals.palette} colorThemeStorageKey="appkit-storybook-palette" storageKey="appkit-storybook-theme" key={context.globals.theme}>
      <SynchronizeThemeGlobals mode={context.globals.theme} palette={context.globals.palette} />
      <div className="bg-background text-foreground min-h-screen p-4"><Story /></div>
    </ThemeProvider>}</StoryQueryProvider>
  )],
} satisfies Preview;
