import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, cpSync, rmSync} from 'node:fs';
import {execFileSync, spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {archiveIntegrity} from './artifact.mjs';
test('real preparation selects only the consumer-tested tagged archive and rejects stale or failed evidence', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'appkit-release-prepare-'));
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
  const git = args => execFileSync('git', args, {cwd: root, env, encoding: 'utf8', stdio: ['ignore','pipe','pipe']}).trim();
  const json = (file, object) => writeFileSync(path.join(root, file), JSON.stringify(object));
  try {
    mkdirSync(path.join(root, 'scripts'), {recursive: true});
    cpSync(path.resolve('scripts/publish'), path.join(root, 'scripts/publish'), {recursive: true});
    writeFileSync(path.join(root, '.gitignore'), '.verification/\n');
    const versions = {core: '0.1.1', react: '0.2.0'};
    for (const key of ['core', 'react']) {
      mkdirSync(path.join(root, 'packages/appkit-' + key), {recursive: true});
      json(`packages/appkit-${key}/package.json`, {name: '@alneas/appkit-' + key, version: versions[key], repository: {url: 'https://github.com/dataarthub/appkit.git'}, publishConfig: {access: 'public', registry: 'https://registry.npmjs.org'}, exports: {'.': './dist/index.js'}});
    }
    git(['init', '-q']); git(['add', '.']);
    git(['-c','user.name=Release Fixture','-c','user.email=package@alneas.com','-c','core.hooksPath=/dev/null','commit','-qm','fixture']);
    const sha = git(['rev-parse','HEAD']);
    git(['update-ref','refs/remotes/origin/main',sha]); git(['tag','appkit-react-v0.2.0']);
    const artifacts = path.join(root, '.verification/artifacts/candidate-fixture');
    mkdirSync(path.join(artifacts, 'package/dist'), {recursive: true});
    cpSync(path.join(root, 'packages/appkit-react/package.json'), path.join(artifacts, 'package/package.json'));
    writeFileSync(path.join(artifacts, 'package/dist/index.js'), 'export const value=1;');
    const file = path.join(artifacts, 'react.tgz');
    execFileSync('tar', ['-czf',file,'-C',artifacts,'package']);
    mkdirSync(path.join(root, '.verification/publish'), {recursive: true});
    const record = {mode: 'two-package-packed-consumer', verified: true, baseCommit: sha,
      packages: {'@alneas/appkit-react': {version: '0.2.0', file, integrity: archiveIntegrity(file)}}};
    json('.verification/publish/consumer.json', record);
    json('.verification/event.json', {action: 'published', repository: {full_name: 'dataarthub/appkit'}, release: {tag_name: 'appkit-react-v0.2.0', draft: false, prerelease: false}});
    const run = () => spawnSync(process.execPath, ['scripts/publish/prepare.mjs'], {cwd: root, encoding: 'utf8', env: {...env,
      GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: 'release', GITHUB_REPOSITORY: 'dataarthub/appkit', GITHUB_SHA: sha,
      GITHUB_EVENT_PATH: path.join(root, '.verification/event.json'), GITHUB_OUTPUT: path.join(root, '.verification/output')}});
    const success = run();
    assert.equal(success.status, 0, success.stderr);
    assert.deepEqual(readFileSync(path.join(root, '.verification/publish/package.tgz')), readFileSync(file));
    assert.equal(JSON.parse(readFileSync(path.join(root, '.verification/publish/release.json'))).name, '@alneas/appkit-react');
    for (const change of [{verified: false}, {baseCommit: 'b'.repeat(40)}]) {
      json('.verification/publish/consumer.json', {...record, ...change});
      const failed = run();
      assert.equal(failed.status, 1);
      assert.match(failed.stderr, /verified packed-consumer result/);
    }
  } finally {rmSync(root, {recursive: true, force: true});}
});
