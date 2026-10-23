import {runGuarded} from '../lib/guarded-process.mjs';

const groups = [['light-desktop', 'light-mobile'], ['dark-desktop', 'dark-mobile']];
const batchSize = 2;
export async function runBrowserBatches(files, {root, node = process.execPath, memoryLimitMiB, run = runGuarded, log = console.log} = {}) {
  if (!files.length) throw Error('Empty browser selection is not a successful test');
  const batches = [];
  for (const group of groups) {
    for (let offset = 0; offset < files.length; offset += batchSize) {
      // Cold Vite startup plus two browsers exceeded the Linux RSS ceiling. Run
      // the first viewport batches separately, then share startup for later files.
      const selections = offset === 0 ? group.map(project => [project]) : [group];
      for (const projects of selections) batches.push({projects, offset, batch: files.slice(offset, offset + batchSize)});
    }
  }
  let completed = 0;
  for (const {projects, offset, batch} of batches) {
    const label = `${projects.join(' + ')} ${offset + 1}-${offset + batch.length}/${files.length}`;
    log(`Starting Storybook batch ${completed + 1}/${batches.length}: ${label}; combined process-tree budget ${memoryLimitMiB} MiB.`);
    const started = Date.now();
    const result = await run(node, [
      '--max-old-space-size=1024', `${root}node_modules/vitest/vitest.mjs`, 'run',
      '--config', `${root}packages/appkit-react/vitest.storybook.config.ts`,
      ...projects.map(project => `--project=${project}`), ...batch,
    ], {cwd: root, memoryLimitMiB, timeoutMs: 600_000});
    if (!result.ok) throw Error(result.reason ?? `Storybook failed (${result.code ?? result.signal}).`);
    completed++;
    log(`Storybook batch ${completed}/${batches.length} completed: ${label}; ${(Date.now() - started) / 1000}s; combined peak ${result.peakMiB} MiB.`);
  }
}
