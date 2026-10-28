import test from 'node:test';
import assert from 'node:assert/strict';
import {validateReceipt} from './verification-evidence.mjs';
import {validatePartialReceipt} from './verification-partial.mjs';
const sha=value=>value.repeat(40),key='1'.repeat(64);
const identity={node:'v24.fixture',image:'same',controls:'same'};
const receipt={schemaVersion:1,status:'checks-only',repository:'owner/project',run:12,attempt:2,event:'pull_request',workflowSha:sha('a'),candidate:sha('a'),tree:sha('b'),base:sha('c'),head:sha('d'),pull:3,identity,workflowRef:'owner/project/.github/workflows/ci.yml@refs/pull/3/merge'};
const run={id:12,run_attempt:2,path:'.github/workflows/ci.yml',name:'Source quality',event:'pull_request',head_sha:sha('d'),head_repository:{full_name:'owner/project'},status:'completed',conclusion:'failure',referenced_workflows:[{path:'owner/project/.github/workflows/package-quality.yml@refs/pull/3/merge',sha:sha('a')}],pull_requests:[{number:3,head:{sha:sha('d')},base:{sha:sha('c')}}]};
const options=()=>({repository:'owner/project',identity,candidate:{sha:sha('a'),tree:{sha:sha('b')},parents:[{sha:sha('c')},{sha:sha('d')}]},producerNode:24,nodes:[24,26],trustedControls:true,jobs:[{name:'verify / Verify packages (Node 24)',status:'completed',conclusion:'failure',steps:[{name:'Project: Seal source verification receipt',status:'completed',conclusion:'success',number:10},{name:'Shared: Preserve immutable source verification',status:'completed',conclusion:'success',number:11}]}],checks:{'unit-checks/bun-fixture.json':{schemaVersion:1,status:'passed',key,runner:'bun',cases:1,reportSha256:key,files:['src/a.test.ts']},'source-checks/first.json':{version:1,status:'passed',key},'source-checks/summary.json':{complete:false,outcomes:[{id:'first',outcome:'executed'}]}}});
test('a failed source run may transfer independently completed checks but never inherit the whole gate',()=>{
 const result=validatePartialReceipt(receipt,run,options(),validateReceipt);
 assert.equal(result.inherited,false);assert.equal(result.status,'checks-only');assert.equal(Object.keys(result.checks).length,2);assert(!Object.hasOwn(result.checks,'source-checks/summary.json'));
 // Another runtime failing still allows this runtime's completed result to transfer.
 const ownPass=options();ownPass.jobs[0].conclusion='success';assert.equal(validatePartialReceipt({...receipt,status:'passed'},run,ownPass,validateReceipt).inherited,false);
});
test('failed/cancelled uploads, superseded attempts, foreign nodes and untrusted controls cannot transfer checks',()=>{
 for(const patch of [{run_attempt:3},{conclusion:'cancelled'},{conclusion:'timed_out'},{conclusion:'success'},{status:'in_progress'}])assert.throws(()=>validatePartialReceipt(receipt,{...run,...patch},options(),validateReceipt));
 for(const changed of [{producerNode:26},{identity:{...identity,image:'other'}},{trustedControls:false},{jobs:[]}])assert.throws(()=>validatePartialReceipt(receipt,run,{...options(),...changed},validateReceipt));
 for(const step of [0,1]){const value=options();value.jobs[0].steps[step].conclusion='failure';assert.throws(()=>validatePartialReceipt(receipt,run,value,validateReceipt));}
 const badOrder=options();badOrder.jobs[0].steps[0].number=12;assert.throws(()=>validatePartialReceipt(receipt,run,badOrder,validateReceipt));
});
test('only well-formed individually passed receipts transfer; empty or failed subsets do not become a pass',()=>{
 for(const checks of [{},{'unit-checks/a.json':{schemaVersion:1,status:'failed',key}},{'source-checks/a.json':{version:1,status:'passed',key:'invalid'}},{'../escape.json':{version:1,status:'passed',key}},{'unit-checks/a.json':{schemaVersion:2,status:'passed',key}}])assert.throws(()=>validatePartialReceipt(receipt,run,{...options(),checks},validateReceipt));
 assert.throws(()=>validatePartialReceipt({...receipt,status:'failed'},run,options(),validateReceipt));
});
