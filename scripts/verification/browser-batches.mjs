import {runGuarded} from '../lib/guarded-process.mjs';

// Share Vite startup between viewports of the same theme. Only one theme runs at
// a time; the guard bounds the combined RSS of both viewport projects and children.
const groups = [['light-desktop', 'light-mobile'], ['dark-desktop', 'dark-mobile']];
const batchSize = 2;
export async function runBrowserBatches(files, {root, node = process.execPath, memoryLimitMiB, run = runGuarded, log = console.log} = {}) {
  if (!files.length) throw Error('Empty browser selection is not a successful test');
  const total = Math.ceil(files.length / batchSize) * groups.length;
  let completed = 0;
  for (const projects of groups) {
    for (let offset = 0; offset < files.length; offset += batchSize) {
      const batch = files.slice(offset, offset + batchSize);
      const label = `${projects.join(' + ')} ${offset + 1}-${offset + batch.length}/${files.length}`;
      log(`Starting Storybook batch ${completed + 1}/${total}: ${label}; combined process-tree budget ${memoryLimitMiB} MiB.`);
      const started = Date.now();
      const result = await run(node, [
        '--max-old-space-size=1536', `${root}node_modules/vitest/vitest.mjs`, 'run',
        '--config', `${root}packages/appkit-react/vitest.storybook.config.ts`,
        ...projects.map(project => `--project=${project}`), ...batch,
      ], {cwd: root, memoryLimitMiB, timeoutMs: 600_000});
      if (!result.ok) throw Error(result.reason ?? `Storybook failed (${result.code ?? result.signal}).`);
      completed++;
      log(`Storybook batch ${completed}/${total} completed: ${label}; ${(Date.now() - started) / 1000}s; combined peak ${result.peakMiB} MiB.`);
    }
  }
}
