import { fileURLToPath } from 'node:url';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { totalmem } from 'node:os';
import { runGuarded } from './lib/guarded-process.mjs';

const projects = ['light-desktop', 'light-mobile', 'dark-desktop', 'dark-mobile'];
const root = fileURLToPath(new URL('../', import.meta.url));
const budget = Math.min(3072, Math.floor(totalmem() / 1024 ** 2 / 3));
function stories(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? stories(file) : file.endsWith('.stories.tsx') ? [file] : [];
  }).sort();
}
const files = stories(`${root}packages/appkit-react/stories`);
if (!files.length) throw new Error('No Storybook stories found; refusing an empty pass.');
// Each small batch gets a fresh Vite/Chromium process tree. All files run in all combinations.
let failed = false;
for (const project of projects) {
  for (let offset = 0; offset < files.length; offset += 6) {
    const batch = files.slice(offset, offset + 6);
    console.log(`Storybook ${project} ${offset + 1}-${offset + batch.length}/${files.length}: one worker; process-tree budget ${budget} MiB.`);
    const result = await runGuarded(process.execPath, [
      '--max-old-space-size=1536', `${root}node_modules/vitest/vitest.mjs`, 'run',
      '--config', `${root}packages/appkit-react/vitest.storybook.config.ts`, `--project=${project}`, ...batch,
    ], { cwd: root, memoryLimitMiB: budget });
    console.log(`${project} batch: peak ${result.peakMiB} MiB.`);
    if (!result.ok) {
      console.error(result.reason ?? `Storybook failed (${result.code ?? result.signal}).`);
      failed = true;
      break;
    }
  }
  if (failed) break;
}
if (failed) process.exitCode = 1;
