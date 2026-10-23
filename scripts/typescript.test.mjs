import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
test('legacy API and native checker remain independently available', () => {
  assert.equal(ts.version, '6.0.3');
  assert.equal(typeof ts.createProgram, 'function');
  assert.equal(execFileSync(process.execPath, [require.resolve('typescript/lib/tsc.js'), '--version'], {encoding: 'utf8'}).trim(), 'Version 6.0.3');
  assert.equal(execFileSync(process.execPath, [path.join(root, 'node_modules/.bin/tsc'), '--version'], {encoding: 'utf8'}).trim(), 'Version 7.0.2');
});
test('each development install declares both compilers without changing public engines', () => {
  for (const directory of ['.', 'packages/appkit-core', 'packages/appkit-react']) {
    const pkg = JSON.parse(readFileSync(path.join(root, directory, 'package.json'), 'utf8'));
    assert.equal(pkg.devDependencies.typescript, 'npm:@typescript/typescript6@6.0.2');
    assert.equal(pkg.devDependencies['@typescript/native'], 'npm:typescript@7.0.2');
    if (directory !== '.') assert.equal(pkg.engines.node, '>=24.0.0');
  }
});
