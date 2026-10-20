import type { StorybookConfig } from '@storybook/react-vite';
import { fileURLToPath } from 'node:url';

export default {
  stories: ['../stories/**/*.stories.tsx'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y', '@storybook/addon-vitest'],
  staticDirs: ['../public'],
  framework: {
    name: '@storybook/react-vite',
    options: { builder: { viteConfigPath: fileURLToPath(new URL('./vite.config.ts', import.meta.url)) } },
  },
  core: { disableTelemetry: true },
} satisfies StorybookConfig;
