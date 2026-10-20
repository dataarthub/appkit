import type { Preview } from '@storybook/react-vite';
import { ThemeProvider } from '../src/ui/theme';
import './styles.css';
import { StoryQueryProvider } from '../stories/providers';

export default {
  initialGlobals: { theme: 'light' },
  globalTypes: {
    theme: { toolbar: { icon: 'circlehollow', items: ['light', 'dark', 'system'] } },
  },
  parameters: { controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } } },
  decorators: [(Story, context) => (
    <StoryQueryProvider key={context.id}><ThemeProvider defaultTheme={context.globals.theme} storageKey="appkit-storybook-theme" key={context.globals.theme}>
      <div className="bg-background text-foreground min-h-screen p-4"><Story /></div>
    </ThemeProvider></StoryQueryProvider>
  )],
} satisfies Preview;
