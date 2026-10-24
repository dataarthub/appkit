import { fileURLToPath } from 'node:url';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { totalmem } from 'node:os';
import { selectStoryFiles } from './verification/story-selection.mjs';
import { runBrowserBatches } from './verification/browser-batches.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const budget = Math.min(3072, Math.floor(totalmem() / 1024 ** 2 / 3));
function stories(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? stories(file) : file.endsWith('.stories.tsx') ? [file] : [];
  }).sort();
}
const args = process.argv.slice(2);
const selection = process.env.APPKIT_STORY_FILES;
if (selection && args.length) throw Error('Choose one browser selection source');
const files = selectStoryFiles(root, stories(`${root}packages/appkit-react/stories`), selection ? ['--plan','environment'] : args,
  selection ? () => ({version:1,stories:JSON.parse(selection)}) : undefined);
if (!files.length) throw new Error('No Storybook stories found; refusing an empty pass.');
await runBrowserBatches(files, {root, memoryLimitMiB: budget});
