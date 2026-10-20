import test from 'node:test';
import assert from 'node:assert/strict';
import {recordDeployments, parseArguments} from './record-npm-deployments.mjs';

const sha = 'a'.repeat(40);
const integrity = 'sha512-' + Buffer.alloc(64, 1).toString('base64');
function fixture({missingReact = false, existing = false, failStatus = false} = {}) {
  const writes = [];
  const deployments = new Map();
  const statuses = new Map();
  const api = async (method, endpoint, body) => {
    if (method === 'POST') {
      writes.push({endpoint, body});
      if (endpoint.endsWith('/statuses')) {
        if (failStatus) throw Error('status unavailable');
        statuses.set(endpoint.split('/').at(-2), [body]);
        return body;
      }
      const id = deployments.size + 1;
      const deployment = {...body, id, sha};
      deployments.set(body.environment, deployment);
      return deployment;
    }
    if (endpoint.includes('/git/ref/tags/')) return {object: {type: 'tag', sha: 'b'.repeat(40)}};
    if (endpoint.includes('/git/tags/')) return {object: {type: 'commit', sha}};
    if (endpoint.includes('/statuses')) return statuses.get(endpoint.split('/').at(-2)) ?? [];
    const url = new URL(endpoint, 'https://api.github.com');
    return [...deployments.values()].filter(d => d.environment === url.searchParams.get('environment'));
  };
  const registry = async name => {
    if (missingReact && name.endsWith('-react')) throw Error('version not published');
    return {name, version: '0.1.0', dist: {integrity}};
  };
  if (existing) {
    for (const [i, suffix] of ['core', 'react'].entries()) {
      deployments.set('npm-' + suffix, {id: i + 1, sha, task: 'record:npm', environment: 'npm-' + suffix,
        payload: {kind: 'npm-publication-record', package: '@alneas/appkit-' + suffix, version: '0.1.0', tag: 'v0.1.0', integrity, retrospective: true}});
      statuses.set(String(i + 1), [{state: 'success', environment_url: 'https://www.npmjs.com/package/@alneas/appkit-' + suffix}]);
    }
  }
  return {api, registry, writes, deployments, statuses};
}
test('preview resolves annotated tags and checks both packages without any write', async () => {
  const f = fixture();
  const result = await recordDeployments({tag: 'v0.1.0', ...f});
  assert.equal(result.sha, sha);
  assert.deepEqual(result.packages.map(p => p.environment), ['npm-core', 'npm-react']);
  assert.equal(f.writes.length, 0);
});
test('records exact tag commit and npm URLs without merging or deactivating deployments', async () => {
  const f = fixture();
  await recordDeployments({tag: 'v0.1.0', apply: true, ...f});
  assert.equal(f.writes.length, 4);
  for (const {endpoint, body} of f.writes) {
    if (endpoint.endsWith('/statuses')) {
      assert.equal(body.state, 'success');
      assert.equal(body.auto_inactive, false);
      assert.match(body.environment_url, /^https:\/\/www\.npmjs\.com\/package\/@alneas\/appkit-(core|react)$/);
    } else {
      assert.equal(body.ref, sha);
      assert.equal(body.auto_merge, false);
      assert.deepEqual(body.required_contexts, []);
      assert.equal(body.payload.retrospective, true);
      assert.equal(body.payload.integrity, integrity);
    }
  }
  await recordDeployments({tag: 'v0.1.0', apply: true, ...f});
  assert.equal(f.writes.length, 4, 'retry must not duplicate successful records');
});
test('missing publication or invalid metadata blocks all writes', async () => {
  const f = fixture({missingReact: true});
  await assert.rejects(recordDeployments({tag: 'v0.1.0', apply: true, ...f}), /not published/);
  assert.equal(f.writes.length, 0);
  await assert.rejects(recordDeployments({tag: 'v0.1.0', apply: true, ...f,
    registry: async name => ({name, version: '9.9.9', dist: {integrity}})}), /metadata/);
  assert.equal(f.writes.length, 0);
});
test('existing successes are reused and mismatched records block duplication', async () => {
  const f = fixture({existing: true});
  await recordDeployments({tag: 'v0.1.0', apply: true, ...f});
  assert.equal(f.writes.length, 0);
  f.deployments.get('npm-core').payload.integrity = 'sha512-changed';
  await assert.rejects(recordDeployments({tag: 'v0.1.0', apply: true, ...f}), /conflicting/);
  assert.equal(f.writes.length, 0);
});
test('failed status does not claim success and a retry repairs the same deployment', async () => {
  const f = fixture({failStatus: true});
  await assert.rejects(recordDeployments({tag: 'v0.1.0', apply: true, ...f}), /status unavailable/);
  assert.equal(f.deployments.size, 1);
  const api = async (method, endpoint, body) => {
    if (method === 'POST' && endpoint.endsWith('/statuses')) {
      f.statuses.set(endpoint.split('/').at(-2), [body]);
      return body;
    }
    return f.api(method, endpoint, body);
  };
  await recordDeployments({tag: 'v0.1.0', apply: true, ...f, api});
  assert.equal(f.deployments.size, 2);
  assert.equal(f.writes.filter(w => !w.endpoint.endsWith('/statuses')).length, 2);
});
test('arguments reject branch names, shell syntax, duplicate and unknown options', () => {
  assert.deepEqual(parseArguments(['--tag', 'v0.1.0', '--apply']), {tag: 'v0.1.0', apply: true});
  for (const args of [[], ['--tag','main'], ['--tag','v0.1.0;echo'], ['--tag','v0.1.0','--force'], ['--tag','v0.1.0','--tag','v0.2.0']]) {
    assert.throws(() => parseArguments(args));
  }
});
