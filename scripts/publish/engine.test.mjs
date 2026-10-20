import test from 'node:test';
import assert from 'node:assert/strict';
import {publishVerified} from './engine.mjs';
const target = {name: '@alneas/appkit-core', version: '0.1.1', integrity: 'sha512-reviewed'};
const metadata = {name: target.name, version: target.version, dist: {integrity: target.integrity}};
function fixture({existing = null, failRead = false, badAfter = false, tagState} = {}) {
  const calls = []; let published = false;
  const tags = tagState ?? (existing ? {beta: target.version, latest: target.version} : {latest: '0.1.0'});
  const tagCalls = [], publishTags = [];
  return {calls, tags, tagCalls, publishTags, verifyArchive: async () => calls.push('archive'), wait: async () => {},
    readRegistry: async (name, version) => {
      if (failRead) throw Error('registry HTTP 503');
      if (version === 'latest') return {name, version: '0.1.0'};
      return published ? (badAfter ? {...metadata, dist: {integrity: 'sha512-wrong'}} : metadata) : existing;
    },
    readTags: async () => ({...tags}),
    setTag: async (name, version, tag) => {tagCalls.push(tag); tags[tag] = version;},
    publish: async (file, tag) => {calls.push(file); publishTags.push(tag); published = true; tags[tag] = target.version;}};
}
test('publishes only the verified archive once and checks registry integrity afterwards', async () => {
  const f = fixture();
  assert.equal((await publishVerified({target, file: '/reviewed/package.tgz', ...f})).status, 'published');
  assert.deepEqual(f.calls, ['archive', 'archive', '/reviewed/package.tgz']);
  assert.deepEqual(f.publishTags, ['beta']);
  assert.deepEqual(f.tagCalls, ['latest']);
  assert.deepEqual(f.tags, {beta: target.version, latest: target.version});
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
test('existing bytes with a missing tag repair the tag without republishing', async () => {
  const f = fixture({existing: metadata, tagState: {latest: target.version}});
  const result = await publishVerified({target, file: '/reviewed/package.tgz', ...f});
  assert.equal(result.status, 'already-published');
  assert.deepEqual(f.calls, ['archive']);
  assert.deepEqual(f.tagCalls, ['beta']);
  assert.deepEqual(result.tags, ['beta','latest']);
});
test('tag failure stops success and retries repair only missing metadata', async () => {
  const f = fixture(); let fail = true;
  const setTag = async (...args) => {if(fail) throw Error('dist-tag permission denied'); return f.setTag(...args);};
  await assert.rejects(publishVerified({target, file: '/reviewed/package.tgz', ...f, setTag}), /permission denied/);
  assert.deepEqual(f.tags, {beta: target.version, latest: '0.1.0'});
  fail = false;
  const result = await publishVerified({target, file: '/reviewed/package.tgz', ...f, setTag});
  assert.equal(result.status, 'already-published');
  assert.equal(f.publishTags.length, 1);
  assert.deepEqual(f.tags, {beta: target.version, latest: target.version});
});
test('newer beta or latest blocks all writes, including retries of an existing version', async () => {
  for(const existing of [null, metadata]) for(const tagState of [{beta:'0.2.0',latest:'0.1.0'},{beta:'0.1.0',latest:'1.0.0'}]) {
    const f=fixture({existing,tagState});
    await assert.rejects(publishVerified({target,file:'/reviewed/package.tgz',...f}),/backwards/);
    assert.deepEqual(f.calls,['archive']);
    assert.deepEqual(f.tagCalls,[]);
  }
});
test('tag read failure and unconfirmed tag writes cannot be reported as success', async () => {
  const f=fixture();
  await assert.rejects(publishVerified({target,file:'/reviewed/package.tgz',...f,readTags:async()=>{throw Error('tag registry unavailable');}}),/unavailable/);
  assert.deepEqual(f.calls,['archive']);
  const g=fixture({existing:metadata,tagState:{beta:target.version,latest:'0.1.0'}});
  await assert.rejects(publishVerified({target,file:'/reviewed/package.tgz',...g,setTag:async()=>{}}),/not confirmed/);
});
test('1.0.0 publishes on latest without advancing or removing the earlier beta channel', async () => {
  const major={...target,version:'1.0.0'}, tags={beta:'0.9.0',latest:'0.9.0'};
  let published=false; const publishTags=[];
  const result=await publishVerified({target:major,file:'/reviewed/package.tgz',verifyArchive:async()=>{},wait:async()=>{},
    readRegistry:async()=>published?{...metadata,version:major.version}:null,
    readTags:async()=>({...tags}),
    publish:async(file,tag)=>{published=true;publishTags.push(tag);tags[tag]=major.version;},
    setTag:async()=>{throw Error('No beta tag write is expected');}});
  assert.deepEqual(publishTags,['latest']);
  assert.deepEqual(result.tags,['latest']);
  assert.equal(tags.beta,'0.9.0');
});
