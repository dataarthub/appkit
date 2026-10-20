import {defineConfig} from 'vitest/config';
import react from '@vitejs/plugin-react';
import {readFileSync, readdirSync} from 'node:fs';
import path from 'node:path';
const root = process.cwd();
function tests(dir: string): string[] {
  return readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? tests(file) : /\.(test|spec)\.tsx?$/.test(file) ? [file] : [];
  });
}
export default defineConfig({root, plugins: [react()], test: {
  include: tests(path.join(root, 'src')).filter(file => /from\s*['"]vitest['"]/.test(readFileSync(file, 'utf8'))),
  environment: 'node', maxWorkers: 2,
}});
