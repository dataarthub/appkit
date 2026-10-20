import test from 'node:test';
import assert from 'node:assert/strict';
import {stageVerified, finalizeVerified} from './engine.mjs';
const target = {name:'@alneas/appkit-core', version:'0.2.1', integrity:'sha512-reviewed'};
const metadata = {...target, dist:{integrity:target.integrity}};
function fixture(existing = null) {
  const calls = [], tags = {latest:'0.2.0'};
  return {calls, tags, target, file:'/verified/package.tgz', wait:async()=>{},
    verifyArchive:async()=>calls.push('verify'), readRegistry:async()=>existing,
    readTags:async()=>({...tags}), stage:async(file, tag)=>calls.push(['stage',file,tag]),
    setTag:async(name,version,tag)=>{calls.push(['tag',tag]); tags[tag]=version;}};
}
test('staging submits verified bytes on an isolated tag without public-tag writes or claiming publication',async()=>{
  const f=fixture(); const result=await stageVerified(f);
  assert.equal(result.status,'awaiting-approval');
  assert.deepEqual(f.calls,['verify','verify',['stage','/verified/package.tgz','staged']]);
  assert.deepEqual(f.tags,{latest:'0.2.0'});
});
test('completion waits for approval and never stages when the public version is missing',async()=>{
  const f=fixture(); await assert.rejects(finalizeVerified({...f,attempts:2}),/approval|visible/);
  assert.deepEqual(f.calls,['verify']);
});
test('completion verifies the approved archive before repairing both required tags',async()=>{
  const f=fixture(metadata); const result=await finalizeVerified(f);
  assert.equal(result.status,'published');
  assert.deepEqual(f.calls,['verify',['tag','beta'],['tag','latest']]);
});
test('mismatched public bytes and newer channels block all stage/tag writes',async()=>{
  for(const run of [stageVerified,finalizeVerified]) {
    const f=fixture({...metadata,dist:{integrity:'different'}});
    await assert.rejects(run(f),/integrity/);
    assert.deepEqual(f.calls,['verify']);
    const g=fixture(metadata);g.tags.latest='0.3.0';
    await assert.rejects(run(g),/backwards/);
    assert.deepEqual(g.calls,['verify']);
  }
});
test('registry propagation may take longer than the previous twelve-second window',async()=>{
  const f=fixture(metadata);let reads=0;
  const result=await finalizeVerified({...f,readRegistry:async()=>++reads<10?null:metadata});
  assert.equal(result.status,'published');assert.equal(reads,10);
});
test('already public matching version is not staged again; failures do not retry the upload',async()=>{
  const f=fixture(metadata);assert.equal((await stageVerified(f)).status,'already-published');
  assert.deepEqual(f.calls,['verify']);
  const g=fixture();let uploads=0;
  await assert.rejects(stageVerified({...g,stage:async()=>{uploads++;throw Error('ambiguous upload');}}),/ambiguous/);
  assert.equal(uploads,1);
});
test('archive mutation blocks staging, and incomplete tag writes can be retried without upload',async()=>{
 const f=fixture();let checks=0;
 await assert.rejects(stageVerified({...f,verifyArchive:async()=>{if(++checks===2)throw Error('archive changed');}}),/archive changed/);
 assert.deepEqual(f.calls,[]);
 const g=fixture(metadata);let fail=true;
 const setTag=async(...args)=>{if(fail&&args[2]==='latest')throw Error('permission denied');return g.setTag(...args);};
 await assert.rejects(finalizeVerified({...g,setTag}),/permission denied/);
 assert.equal(g.tags.beta,target.version);assert.equal(g.tags.latest,'0.2.0');
 fail=false;await finalizeVerified({...g,setTag});
 assert.deepEqual(g.calls.filter(c=>Array.isArray(c)),[['tag','beta'],['tag','latest']]);
 const h=fixture(metadata);
 await assert.rejects(finalizeVerified({...h,attempts:2,setTag:async()=>{}}),/not confirmed/);
});
test('1.0.0 also stages in isolation; completion advances latest while preserving beta',async()=>{
 const f=fixture();f.target={...target,version:'1.0.0'};
 assert.equal((await stageVerified(f)).status,'awaiting-approval');
 assert.deepEqual(f.calls.at(-1),['stage','/verified/package.tgz','staged']);
 f.tags.beta='0.9.0';
 const result=await finalizeVerified({...f,readRegistry:async()=>({...metadata,version:'1.0.0'})});
 assert.deepEqual(result.tags,['latest']);assert.equal(f.tags.beta,'0.9.0');
});
