import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Keep Storybook separate from the library's declaration and packaging build.
export default defineConfig({ plugins: [react(), tailwindcss()] });
