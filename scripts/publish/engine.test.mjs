import test from 'node:test';
import assert from 'node:assert/strict';
import {publishVerified} from './engine.mjs';
const target = {name: '@alneas/appkit-core', version: '0.1.1', integrity: 'sha512-reviewed'};
const metadata = {name: target.name, version: target.version, dist: {integrity: target.integrity}};
function fixture({existing = null, failRead = false, badAfter = false} = {}) {
  const calls = []; let published = false;
  return {calls, verifyArchive: async () => calls.push('archive'), wait: async () => {},
    readRegistry: async (name, version) => {
      if (failRead) throw Error('registry HTTP 503');
      if (version === 'latest') return {name, version: '0.1.0'};
      return published ? (badAfter ? {...metadata, dist: {integrity: 'sha512-wrong'}} : metadata) : existing;
    },
    publish: async file => {calls.push(file); published = true;}};
}
test('publishes only the verified archive once and checks registry integrity afterwards', async () => {
  const f = fixture();
  assert.equal((await publishVerified({target, file: '/reviewed/package.tgz', ...f})).status, 'published');
  assert.deepEqual(f.calls, ['archive', 'archive', '/reviewed/package.tgz']);
});
test('matching existing versions skip publish and do not move dist-tags', async () => {
  const f = fixture({existing: metadata});
  assert.equal((await publishVerified({target, file: '/reviewed/package.tgz', ...f})).status, 'already-published');
  assert.deepEqual(f.calls, ['archive']);
});
test('different existing content and registry outages cannot trigger publication', async () => {
  for (const options of [{existing: {...metadata, dist: {integrity: 'different'}}}, {failRead: true}]) {
    const f = fixture(options);
    await assert.rejects(publishVerified({target, file: '/reviewed/package.tgz', ...f}));
    assert.deepEqual(f.calls, ['archive']);
  }
});
test('post-publication mismatch is an error, and archive mutation blocks before publish', async () => {
  const f = fixture({badAfter: true});
  await assert.rejects(publishVerified({target, file: '/reviewed/package.tgz', ...f}), /integrity/);
  let verified = 0; const g = fixture();
  await assert.rejects(publishVerified({target, file: '/reviewed/package.tgz', ...g,
    verifyArchive: async () => {if (++verified === 2) throw Error('archive changed');}}), /archive changed/);
  assert.deepEqual(g.calls, []);
});
