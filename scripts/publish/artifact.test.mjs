import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {archiveIntegrity, verifyArtifact} from './artifact.mjs';
test('artifact is bound to tag/commit/package/integrity, and unexpected members are rejected', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'appkit-publish-artifact-'));
  try {
    mkdirSync(path.join(dir, 'package/dist'), {recursive: true});
    const target = {key: 'core', name: '@alneas/appkit-core', version: '0.1.1', sha: 'a'.repeat(40), tag: 'appkit-core-v0.1.1'};
    writeFileSync(path.join(dir, 'package/package.json'), JSON.stringify({name: target.name, version: target.version, publishConfig: {access: 'public', registry: 'https://registry.npmjs.org'}, exports: {'.': './dist/index.js'}}));
    writeFileSync(path.join(dir, 'package/dist/index.js'), 'export const value=1;');
    const file = path.join(dir, 'package.tgz');
    const pack = () => execFileSync('tar', ['-czf', file, '-C', dir, 'package']);
    pack();
    const manifest = {...target, schemaVersion: 1, integrity: archiveIntegrity(file)};
    assert.doesNotThrow(() => verifyArtifact({file, manifest, target}));
    assert.throws(() => verifyArtifact({file, manifest: {...manifest, sha: 'b'.repeat(40)}, target}), /identity/);
    assert.throws(() => verifyArtifact({file, manifest: {...manifest, integrity: 'sha512-other'}, target}), /integrity/);
    writeFileSync(path.join(dir, 'package/.env'), 'not-for-publication'); pack();
    assert.throws(() => verifyArtifact({file, manifest: {...manifest, integrity: archiveIntegrity(file)}, target, expectedIntegrity: manifest.integrity}), /integrity/);
    assert.throws(() => verifyArtifact({file, manifest: {...manifest, integrity: archiveIntegrity(file)}, target}), /member/);
  } finally {rmSync(dir, {recursive: true, force: true});}
});
