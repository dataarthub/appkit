import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {verifyInstalledCore, runMatrix} from './runner.mjs';
test('both lanes run even if current fails, and failures cannot become a pass', async () => {
  const seen = [];
  const result = await runMatrix(async name => {seen.push(name); if (name === 'current') throw Error('old API missing'); return {passed: true};});
  assert.deepEqual(seen, ['current', 'candidate']);
  assert.equal(result.passed, false);
  assert.match(result.lanes.current.error, /old API missing/);
  assert.equal(result.lanes.candidate.passed, true);
});
test('a missing lane result fails closed', async () => {
  assert.equal((await runMatrix(async () => undefined)).passed, false);
});
test('installed Core identity includes React resolution, archive integrity, and no checkout links', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'appkit-resolution-test-'));
  const core = path.join(root, 'node_modules/@alneas/appkit-core');
  const react = path.join(root, 'node_modules/@alneas/appkit-react');
  const expected = {version: '0.1.0', integrity: 'sha512-reviewed'};
  const json = (file, value) => writeFileSync(file, JSON.stringify(value));
  try {
    mkdirSync(core, {recursive: true}); mkdirSync(react, {recursive: true});
    json(path.join(root, 'package.json'), {type: 'module'});
    json(path.join(core, 'package.json'), {name: '@alneas/appkit-core', version: '0.1.0', main: 'index.cjs'});
    writeFileSync(path.join(core, 'index.cjs'), 'module.exports={}');
    json(path.join(react, 'package.json'), {name: '@alneas/appkit-react', main: 'index.cjs'});
    json(path.join(root, 'package-lock.json'), {packages: {'node_modules/@alneas/appkit-core': {version: '0.1.0', integrity: expected.integrity}}});
    assert.equal(verifyInstalledCore(root, expected).version, '0.1.0');
    assert.throws(() => verifyInstalledCore(root, {...expected, integrity: 'sha512-other'}), /integrity/);
    const nested = path.join(react, 'node_modules/@alneas/appkit-core');
    mkdirSync(nested, {recursive: true});
    json(path.join(nested, 'package.json'), {name: '@alneas/appkit-core', version: '0.0.1', main: 'index.cjs'});
    writeFileSync(path.join(nested, 'index.cjs'), 'module.exports={}');
    assert.throws(() => verifyInstalledCore(root, expected), /different Core/);
    rmSync(path.join(react, 'node_modules'), {recursive: true});
    rmSync(core, {recursive: true});
    symlinkSync(path.resolve('packages/appkit-core'), core, 'dir');
    assert.throws(() => verifyInstalledCore(root, expected), /outside|symlink/);
  } finally {rmSync(root, {recursive: true, force: true});}
});
