import test from 'node:test';
import assert from 'node:assert/strict';
import {automaticRunId, waitForApproval} from './auto-completion.mjs';
const run={id:123,run_attempt:1,event:'release',status:'completed',conclusion:'success',path:'.github/workflows/publish.yml',head_sha:'a'.repeat(40),head_branch:'appkit-react-v0.2.1',repository:{full_name:'dataarthub/appkit'},head_repository:{full_name:'dataarthub/appkit'}};
const event={action:'completed',repository:{full_name:'dataarthub/appkit'},workflow_run:run};
const target={name:'@alneas/appkit-react',version:'0.2.1',integrity:'sha512-reviewed'};
const metadata={name:target.name,version:target.version,dist:{integrity:target.integrity}};
function fixture(){
 let clock=0;
 const calls=[];
 return {target,calls,readRegistry:async()=>metadata,dispatch:async()=>calls.push('dispatch'),now:()=>clock,wait:async ms=>{clock+=ms;},timeoutMs:100,intervalMs:25};
}
test('automatic completion accepts only this repository successful release event, never its own dispatch',()=>{
 assert.equal(automaticRunId(event),'123');
 for(const patch of [{event:'workflow_dispatch'},{conclusion:'failure'},{status:'in_progress'},{path:'.github/workflows/other.yml'},{head_repository:{full_name:'fork/appkit'}},{id:'123'}]){
  assert.throws(()=>automaticRunId({...event,workflow_run:{...run,...patch}}));
 }
 assert.throws(()=>automaticRunId({...event,repository:{full_name:'fork/appkit'}}));
});
test('matching public bytes dispatch once; no automatic npm approval or publication',async()=>{
 const f=fixture();assert.equal((await waitForApproval(f)).status,'completion-dispatched');
 assert.deepEqual(f.calls,['dispatch']);
});
test('unapproved version times out without dispatch or claiming release success',async()=>{
 const f=fixture();let reads=0;
 const result=await waitForApproval({...f,readRegistry:async()=>{reads++;return null;}});
 assert.equal(result.status,'approval-pending');assert.equal(reads,4);assert.deepEqual(f.calls,[]);
});
test('eventual approval continues with no source rebuild',async()=>{
 const f=fixture();let reads=0;
 const result=await waitForApproval({...f,readRegistry:async()=>++reads<3?null:metadata});
 assert.equal(result.status,'completion-dispatched');assert.deepEqual(f.calls,['dispatch']);
});
test('wrong public name, version or integrity blocks dispatch',async()=>{
 for(const patch of [{name:'@other/react'},{version:'0.3.0'},{dist:{integrity:'different'}}]){
  const f=fixture();await assert.rejects(waitForApproval({...f,readRegistry:async()=>({...metadata,...patch})}),/identity|integrity/);
  assert.deepEqual(f.calls,[]);
 }
});
test('API failure and ambiguous dispatch fail without repeated dispatch attempts',async()=>{
 const f=fixture();await assert.rejects(waitForApproval({...f,readRegistry:async()=>{throw Error('unavailable');}}),/unavailable/);
 assert.deepEqual(f.calls,[]);
 let writes=0;await assert.rejects(waitForApproval({...fixture(),dispatch:async()=>{writes++;throw Error('dispatch uncertain');}}),/uncertain/);
 assert.equal(writes,1);
});
test('approval observed after the time budget expires does not trigger a write',async()=>{
 let clock=0;const f=fixture();
 const result=await waitForApproval({...f,now:()=>clock,readRegistry:async()=>{clock=101;return metadata;}});
 assert.equal(result.status,'approval-pending');assert.deepEqual(f.calls,[]);
});
