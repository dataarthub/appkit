import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { playwright } from '@vitest/browser-playwright';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root,
  plugins: [react(), tailwindcss()],
  test: {
    maxWorkers: 1,
    fileParallelism: false,
    projects: (['light', 'dark'] as const).map(colorScheme => ({
      extends: true,
      plugins: [storybookTest({ configDir: `${root}.storybook` })],
      test: {
        name: `storybook-${colorScheme}`,
        setupFiles: ['.storybook/vitest.setup.ts'],
        testTimeout: 30_000,
        maxWorkers: 1,
        browser: {
          enabled: true,
          headless: true,
          provider: playwright({ contextOptions: { colorScheme } }),
          instances: [
            { browser: 'chromium', name: `${colorScheme}-desktop`, viewport: { width: 1280, height: 900 } },
            { browser: 'chromium', name: `${colorScheme}-mobile`, viewport: { width: 390, height: 844 } },
          ],
        },
      },
    })),
  },
});
