import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, cpSync, existsSync, rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
test('the actual CI command rejects a required fix before any installation or test', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'appkit-required-fix-'));
  try {
    mkdirSync(path.join(root, 'scripts'), {recursive: true});
    cpSync(path.resolve('scripts/check-react-core.mjs'), path.join(root, 'scripts/check-react-core.mjs'));
    cpSync(path.resolve('scripts/react-core'), path.join(root, 'scripts/react-core'), {recursive: true});
    for (const name of ['appkit-core', 'appkit-react']) mkdirSync(path.join(root, 'packages', name), {recursive: true});
    writeFileSync(path.join(root, 'packages/appkit-core/package.json'), JSON.stringify({version: '0.1.1'}));
    writeFileSync(path.join(root, 'packages/appkit-react/package.json'), JSON.stringify({version: '0.1.1', dependencies: {'@alneas/appkit-core': '0.1.0'}}));
    writeFileSync(path.join(root, 'react-core-policy.json'), JSON.stringify({schemaVersion: 1, requirements: [{id: 'must-deliver-fix', coreVersion: '0.1.1', reason: 'React users require this fix.'}]}));
    const result = spawnSync(process.execPath, ['scripts/check-react-core.mjs'], {cwd: root, encoding: 'utf8'});
    assert.equal(result.status, 1);
    assert.match(result.stderr, /must-deliver-fix.*React dependency must use Core 0\.1\.1/);
    assert.equal(existsSync(path.join(root, '.verification')), false);
  } finally {rmSync(root, {recursive: true, force: true});}
});
