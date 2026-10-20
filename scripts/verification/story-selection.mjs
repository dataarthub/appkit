import {readFileSync} from 'node:fs';
import path from 'node:path';
export function selectStoryFiles(root, allFiles, args, load = file => JSON.parse(readFileSync(file, 'utf8'))) {
  if (!args.length) return allFiles;
  if (args.length !== 2 || args[0] !== '--plan') throw Error('Usage: test-storybook.mjs [--plan file]');
  const plan = load(args[1]);
  if (plan.version !== 1 || !Array.isArray(plan.stories) || !plan.stories.length) throw Error('Empty or invalid Storybook selection');
  const selected = new Set(plan.stories.map(file => path.resolve(root, file)));
  if (selected.size !== plan.stories.length || [...selected].some(file => !allFiles.includes(file))) throw Error('Unknown or duplicate selected story');
  return allFiles.filter(file => selected.has(file));
}
