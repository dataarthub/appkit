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
    removeTag:async(name,tag)=>{calls.push(['remove',tag]); delete tags[tag];},
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
test('completion removes only its own inspection tag after required channels are confirmed',async()=>{
 const f=fixture(metadata);f.tags.staged=target.version;
 await finalizeVerified(f);
 assert.deepEqual(f.calls,['verify',['tag','beta'],['tag','latest'],['remove','staged']]);
 assert.deepEqual(f.tags,{latest:target.version,beta:target.version});
 for(const staged of [undefined,'0.3.0','0.1.0']){
  const g=fixture(metadata);if(staged!==undefined)g.tags.staged=staged;
  await finalizeVerified(g);
  assert.equal(g.calls.some(c=>Array.isArray(c)&&c[0]==='remove'),false);
  assert.equal(g.tags.staged,staged);
 }
});
test('unconfirmed required tags and integrity failures never remove the inspection tag',async()=>{
 const f=fixture(metadata);f.tags.staged=target.version;
 await assert.rejects(finalizeVerified({...f,attempts:2,setTag:async()=>{}}),/not confirmed/);
 assert.equal(f.tags.staged,target.version);
 const g=fixture({...metadata,dist:{integrity:'different'}});g.tags.staged=target.version;
 await assert.rejects(finalizeVerified(g),/integrity/);
 assert.equal(g.calls.some(c=>Array.isArray(c)&&c[0]==='remove'),false);
});
test('cleanup failures block completion and retry without repeating publication or channel writes',async()=>{
 const f=fixture(metadata);f.tags.staged=target.version;
 await assert.rejects(finalizeVerified({...f,removeTag:async()=>{throw Error('cleanup denied');}}),/cleanup denied/);
 assert.equal(f.tags.staged,target.version);
 const before=f.calls.length;
 await finalizeVerified(f);
 assert.deepEqual(f.calls.slice(before),['verify',['remove','staged']]);
});
test('cleanup observes propagation and refuses to claim success if its tag remains',async()=>{
 const f=fixture(metadata);f.tags.staged=target.version;
 await assert.rejects(finalizeVerified({...f,attempts:2,removeTag:async()=>{}}),/staged.*not confirmed/);
 let reads=0;
 const g=fixture(metadata);g.tags.staged=target.version;
 const result=await finalizeVerified({...g,removeTag:async()=>{},readTags:async()=>{
  if(g.tags.beta===target.version&&g.tags.latest===target.version&&++reads>3)delete g.tags.staged;
  return {...g.tags};
 }});
 assert.equal(result.status,'published');
});
test('cleanup re-reads the inspection tag and preserves a newly approved different version',async()=>{
 const f=fixture(metadata);f.tags.beta=f.tags.latest=target.version;f.tags.staged=target.version;
 let reads=0;
 await finalizeVerified({...f,readTags:async()=>{
  if(++reads===4)f.tags.staged='0.3.0';
  return {...f.tags};
 }});
 assert.equal(f.tags.staged,'0.3.0');
 assert.equal(f.calls.some(c=>Array.isArray(c)&&c[0]==='remove'),false);
});
test('stable completion cleans its inspection tag while retaining the beta channel',async()=>{
 const f=fixture();f.target={...target,version:'1.0.0'};f.tags.beta='0.9.0';f.tags.staged='1.0.0';
 const result=await finalizeVerified({...f,readRegistry:async()=>({...metadata,version:'1.0.0'})});
 assert.equal(result.status,'published');assert.equal(f.tags.beta,'0.9.0');
 assert.equal(f.tags.staged,undefined);assert.equal(f.tags.latest,'1.0.0');
});
test('changed required channels block cleanup even after the earlier confirmation passed',async()=>{
 const f=fixture(metadata);f.tags.beta=f.tags.latest=f.tags.staged=target.version;
 let reads=0;
 await assert.rejects(finalizeVerified({...f,readTags:async()=>{
  if(++reads===4)f.tags.beta='0.2.0';
  return {...f.tags};
 }}),/not confirmed before staged cleanup/);
 assert.equal(f.calls.some(c=>Array.isArray(c)&&c[0]==='remove'),false);
});
