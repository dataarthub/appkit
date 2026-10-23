import {runGuarded} from '../lib/guarded-process.mjs';

const projects = ['light-desktop', 'light-mobile', 'dark-desktop', 'dark-mobile'];
const batchSize = 6;
export async function runBrowserBatches(files, {root, node = process.execPath, memoryLimitMiB, run = runGuarded, log = console.log} = {}) {
  if (!files.length) throw Error('Empty browser selection is not a successful test');
  const batches = [];
  for (const project of projects) {
    for (let offset = 0; offset < files.length; offset += batchSize) {
      batches.push({project, offset, batch: files.slice(offset, offset + batchSize)});
    }
  }
  let completed = 0;
  for (const {project, offset, batch} of batches) {
    const label = `${project} ${offset + 1}-${offset + batch.length}/${files.length}`;
    log(`Starting Storybook batch ${completed + 1}/${batches.length}: ${label}; combined process-tree budget ${memoryLimitMiB} MiB.`);
    const started = Date.now();
    const result = await run(node, [
      '--max-old-space-size=1024', `${root}node_modules/vitest/vitest.mjs`, 'run',
      '--config', `${root}packages/appkit-react/vitest.storybook.config.ts`,
      `--project=${project}`, ...batch,
    ], {cwd: root, memoryLimitMiB, timeoutMs: 600_000});
    if (!result.ok) throw Error(result.reason ?? `Storybook failed (${result.code ?? result.signal}).`);
    completed++;
    log(`Storybook batch ${completed}/${batches.length} completed: ${label}; ${(Date.now() - started) / 1000}s; combined peak ${result.peakMiB} MiB.`);
  }
}
