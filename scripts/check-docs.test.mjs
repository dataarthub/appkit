import assert from 'node:assert/strict';
import { test } from 'node:test';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function fixture(run) {
  const root = mkdtempSync(path.join(tmpdir(), 'appkit-portal-links-'));
  const write = (file, value) => {
    const target = path.join(root, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, value);
  };
  const page = body => '---\ntitle: Example\ndescription: Example guide\nsidebar:\n  order: 1\narchetype: explanation\nproject: appkit\ntags: ["appkit"]\n---\n\n' + body;
  try {
    write('scripts/check-docs.mjs', '');
    copyFileSync(new URL('./check-docs.mjs', import.meta.url), path.join(root, 'scripts/check-docs.mjs'));
    write('README.md', '[Core README](packages/appkit-core/README.md#quickstart)\n');
    write('CONTRIBUTING.md', '# Contributing\n');
    write('RELEASING.md', '# Releasing\n');
    for (const name of ['appkit-core', 'appkit-react']) {
      write(`packages/${name}/package.json`, JSON.stringify({ name: `@alneas/${name}`, exports: { '.': './dist/index.js' } }));
      write(`packages/${name}/README.md`, '# Package\n\n## Quickstart\n');
    }
    write('packages/appkit-core/docs/index.md', page('# Core\n\n## Quickstart\n'));
    write('docs/index.md', page('[Core validation example](../packages/appkit-core/docs/index.md#quickstart)\n'));
    write('docs.manifest.json', JSON.stringify({ projectId: 'appkit', documents: [
      { source: 'docs/index.md', visibility: 'public' },
      { source: 'packages/appkit-core/docs/index.md', visibility: 'public' },
    ] }));
    const check = () => spawnSync(process.execPath, ['scripts/check-docs.mjs'], { cwd: root, encoding: 'utf8' });
    run({ write, page, check });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('portal links accept registered landing pages and preserve native README links', () => fixture(({ check }) => {
  const result = check();
  assert.equal(result.status, 0, result.stderr);
}));

test('portal links reject an existing README that is not registered in the manifest', () => fixture(({ write, page, check }) => {
  write('docs/index.md', page('[Core validation example](../packages/appkit-core/README.md#quickstart)\n'));
  const result = check();
  assert.notEqual(result.status, 0, 'Existing files alone do not establish portal registration.');
  assert.match(result.stderr, /docs\/index\.md:.*not registered in docs\.manifest\.json.*README\.md/);
}));
