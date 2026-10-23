import assert from 'node:assert/strict';
import test from 'node:test';
import {runBrowserBatches} from './browser-batches.mjs';

test('paired batches execute each selected story in all four projects within the original budgets', async () => {
  const files = Array.from({length: 7}, (_, i) => `story-${i}.stories.tsx`);
  const coverage = [], logs = [];
  let calls = 0;
  await runBrowserBatches(files, {root: '/fixture/', node: '/node', memoryLimitMiB: 2048,
    log: line => logs.push(line),
    run: async (node, args, options) => {
      assert.equal(node, '/node');
      assert.equal(args[0], '--max-old-space-size=1024');
      assert.equal(options.memoryLimitMiB, 2048);
      assert.equal(options.timeoutMs, 600_000);
      const projects = args.filter(arg => arg.startsWith('--project=')).map(arg => arg.slice(10));
      const selected = args.filter(arg => arg.endsWith('.stories.tsx'));
      assert.equal(projects.length, calls % 5 < 2 ? 1 : 2);
      if (calls % 5 < 2) assert.deepEqual(selected, files.slice(0, 2));
      assert.ok(selected.length > 0 && selected.length <= 2);
      assert.match(logs.at(-1), /Starting Storybook/); // progress precedes execution
      for (const project of projects) for (const file of selected) coverage.push(`${project}:${file}`);
      calls++;
      return {ok: true, code: 0, peakMiB: 1024};
    }});
  assert.equal(calls, 10);
  const expected = ['light-desktop', 'light-mobile', 'dark-desktop', 'dark-mobile'].flatMap(project => files.map(file => `${project}:${file}`));
  assert.deepEqual(coverage.sort(), expected.sort());
  assert.equal(logs.filter(line => /completed/.test(line)).length, 10);
});

test('a failed test or memory guard stops subsequent batches and cannot produce a pass', async () => {
  for (const failed of [{ok: false, code: 7}, {ok: false, code: 0, reason: 'Browser memory budget exceeded'}]) {
    let calls = 0;
    await assert.rejects(runBrowserBatches(['one.stories.tsx'], {root: '/fixture/', node: '/node', memoryLimitMiB: 3072,
      log: () => {}, run: async () => {calls++; return failed;}}), /failed|memory budget/);
    assert.equal(calls, 1);
  }
  await assert.rejects(runBrowserBatches([], {root: '/fixture/', memoryLimitMiB: 3072}), /empty/i);
});
