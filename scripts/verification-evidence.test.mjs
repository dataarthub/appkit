import test from 'node:test';
import assert from 'node:assert/strict';
import {validateReceipt, validateFreshPull, artifactData, restoreEvidence, executionIdentity, checkReadySource, controlHash} from './verification-evidence.mjs';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
const sha = c => c.repeat(40);
const identity = {node:'v24.15.0',bun:'1.4.0',os:'linux',arch:'x64',image:'ubuntu24:1',environment:'env',controls:'controls'};
const receipt = {schemaVersion:1,status:'passed',repository:'owner/project',run:12,attempt:2,event:'pull_request',workflowSha:sha('a'),candidate:sha('a'),tree:sha('b'),base:sha('c'),head:sha('d'),pull:3,identity,workflowRef:'owner/project/.github/workflows/ci.yml@refs/pull/3/merge'};
const run = {id:12,run_attempt:2,path:'.github/workflows/ci.yml',name:'Source quality',event:'pull_request',head_sha:sha('d'),head_repository:{full_name:'owner/project'},status:'completed',conclusion:'success',referenced_workflows:[{path:'owner/project/.github/workflows/package-quality.yml@refs/pull/3/merge',sha:sha('a')}],pull_requests:[{number:3,head:{sha:sha('d')},base:{sha:sha('c')}}]};
const options = () => ({repository:'owner/project',identity,tree:sha('b'),candidate:{sha:sha('a'),tree:{sha:sha('b')},parents:[{sha:sha('c')},{sha:sha('d')}]},jobs:[24,26].map(n=>({name:`verify / Verify packages (Node ${n})`,status:'completed',conclusion:'success'})),nodes:[24,26],trustedControls:true});
test('verified PR evidence can cross a squash commit only with equal actual trees',()=>{
 assert.equal(validateReceipt(receipt,run,options()).run,12);
 for(const change of [{tree:sha('e')},{identity:{...identity,image:'other'}},{trustedControls:false},{jobs:[]}])assert.throws(()=>validateReceipt(receipt,run,{...options(),...change}));
});
test('forks, failed attempts, stale bindings and malformed producer evidence fail closed',()=>{
 for(const changed of [{run_attempt:3},{conclusion:'failure'},{event:'pull_request_target'},{head_repository:{full_name:'fork/project'}},{head_sha:sha('e')},{path:'.github/workflows/other.yml'}])assert.throws(()=>validateReceipt(receipt,{...run,...changed},options()));
 for(const changed of [{status:'failed'},{attempt:1},{base:sha('f')},{workflowRef:'owner/project/.github/workflows/ci.yml@refs/heads/other'},{tree:sha('f')}])assert.throws(()=>validateReceipt({...receipt,...changed},run,options()));
});
test('current PR head, latest target base and actual merge candidate must all match',()=>{
 const p={state:'open',draft:false,head:{sha:sha('d'),repo:{full_name:'owner/project'}},base:{sha:sha('c'),ref:'main',repo:{full_name:'owner/project'}},merge_commit_sha:sha('a')};
 assert.doesNotThrow(()=>validateFreshPull(receipt,p,sha('c')));
 for(const changed of [{draft:true},{head:{sha:sha('e')}},{base:{...p.base,sha:sha('e')}},{merge_commit_sha:sha('f')}])assert.throws(()=>validateFreshPull(receipt,{...p,...changed},sha('c')));
 assert.throws(()=>validateFreshPull(receipt,p,sha('e')));
});
test('artifact bytes are digest checked, bounded, and credentials never reach signed storage',async()=>{
 const {createHash}=await import('node:crypto');const bytes=Buffer.from('fixture');const a={id:8,digest:'sha256:'+createHash('sha256').update(bytes).digest('hex')};const calls=[];
 const fetchImpl=async(url,opts)=>{calls.push({url,opts});return calls.length===1?{status:302,headers:new Headers({location:'https://safe.blob.core.windows.net/file?sig=opaque'})}:{ok:true,headers:new Headers(),arrayBuffer:async()=>bytes};};
 assert.deepEqual(await artifactData('owner/project',a,{token:'secret',fetchImpl}),bytes);
 assert.equal(calls[1].opts.headers,undefined);
 await assert.rejects(()=>artifactData('owner/project',{...a,digest:'sha256:'+'0'.repeat(64)},{token:'fixture',fetchImpl:async(url)=>url.includes('api.github.com')?{status:302,headers:new Headers({location:'https://safe.blob.core.windows.net/file'})}:{ok:true,headers:new Headers(),arrayBuffer:async()=>bytes}}));
 await assert.rejects(()=>artifactData('owner/project',a,{token:'fixture',fetchImpl:async()=>({status:302,headers:new Headers({location:'https://evil.example/file'})})}));
 let cancelled=false;
 await assert.rejects(()=>artifactData('owner/project',a,{token:'fixture',fetchImpl:async url=>url.includes('api.github.com')?{status:302,headers:new Headers({location:'https://safe.blob.core.windows.net/file'})}:{ok:true,headers:new Headers(),body:{getReader:()=>({read:async()=>({done:false,value:new Uint8Array(9*1024**2)}),cancel:async()=>{cancelled=true;},releaseLock(){}})}}}),/too large/);assert.equal(cancelled,true);
});

test('actual Git snapshots restore keyed checks and inherit only a complete identical-tree producer',async()=>{
 const root=mkdtempSync(join(tmpdir(),'appkit-evidence-test-'));
 try {
  const g=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',env:Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('GIT_')))}).trim();
  g(['init','-q']);g(['config','user.name','Fixture']);g(['config','user.email','fixture@example.invalid']);
  mkdirSync(join(root,'.github'),{recursive:true});writeFileSync(join(root,'.gitignore'),'.verification/\n');writeFileSync(join(root,'.github/workflow-adapter.json'),JSON.stringify({repository:'owner/project',runtime:{nodeVersions:[24,26]}}));writeFileSync(join(root,'source.txt'),'first');g(['add','.']);g(['commit','-qm','base']);
  const base=g(['rev-parse','HEAD']),entries=g(['ls-tree','-r','HEAD']).split('\n').map(l=>{const [,type,sha,path]=l.match(/^\d+ (\w+) ([a-f0-9]+)\t(.+)$/);return {type,sha,path};});
  const env={GITHUB_ACTIONS:'true',GITHUB_EVENT_NAME:'push',GITHUB_REF:'refs/heads/main',GITHUB_RUN_ID:'99',ImageOS:'ubuntu24',ImageVersion:'1',CI:'true'};
  const runtime=executionIdentity(root,env),tree=g(['rev-parse','HEAD^{tree}']);
  const r={...receipt,candidate:sha('a'),tree,base,identity:runtime};
  const producer={...run,pull_requests:[{number:3,head:{sha:r.head},base:{sha:base}}]};
  let invalidation='';const requests=[];
  const request=async path=>{
   requests.push(path);
   if(path.startsWith('/actions/workflows/'))return {workflow_runs:[producer]};
   if(path==='/actions/runs/12')return {...producer,...(invalidation==='attempt'?{run_attempt:3}:{})};
   if(path.includes('/artifacts'))return {total_count:1,artifacts:[{id:8,name:`verification-node${process.versions.node.split('.')[0]}-12-2`,expired:false,expires_at:'2999-01-01',digest:'sha256:'+'1'.repeat(64),workflow_run:{id:12,head_sha:r.head}}]};
   if(path.includes('/jobs'))return {total_count:2,jobs:options().jobs};
   if(path===`/git/commits/${base}`)return {sha:base,tree:{sha:tree}};
   if(path.startsWith('/git/commits/'))return {sha:r.candidate,tree:{sha:r.tree},parents:[{sha:base},{sha:r.head}]};
   if(path.startsWith('/git/trees/'))return {truncated:false,tree:invalidation==='controls'?[]:entries};
   throw Error('Unexpected request '+path);
  };
  const checks={'unit-checks/fixture.json':{schemaVersion:1,status:'passed',key:'1'.repeat(64)}};
  const readBundle=async()=>({receipt:r,checks});
  let result=await restoreEvidence(root,{env,request,readBundle});assert.equal(result.inherited,true);assert.equal(result.restored,true);assert.equal(JSON.parse(readFileSync(join(root,'.verification/records/unit-checks/fixture.json'))).status,'passed');
  writeFileSync(join(root,'source.txt'),'second');g(['add','.']);g(['commit','-qm','changed source']);
  result=await restoreEvidence(root,{env,request,readBundle});assert.equal(result.inherited,false);assert.equal(result.restored,true);
  for(const changed of ['attempt','controls']) {invalidation=changed;result=await restoreEvidence(root,{env,request,readBundle});assert.equal(result.restored,false);assert.equal(result.inherited,false);}
  assert(requests.some(p=>p===`/git/commits/${base}`),'Base commit must resolve to its actual tree SHA before fetching Git trees');
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('pre-merge source gate checks every runtime, actual candidate and freshness without running suites',async()=>{
 const controls=controlHash([]),pull={state:'open',draft:false,head:{sha:receipt.head,repo:{full_name:'owner/project'}},base:{sha:receipt.base,ref:'main',repo:{full_name:'owner/project'}},merge_commit_sha:receipt.candidate};
 let changed='',reads=0;
 const request=async path=>{
  if(path.startsWith('/pulls/'))return pull;
  if(path==='/git/ref/heads/main')return {object:{sha:changed==='base'&&reads===2?sha('f'):receipt.base}};
  if(path.startsWith('/actions/workflows/'))return {workflow_runs:[changed==='new-run'&&reads===2?{...run,id:13}:run]};
  if(path==='/actions/runs/12')return {...run,...(changed==='attempt'?{run_attempt:3}:{})};
  if(path.includes('/jobs'))return {total_count:2,jobs:options().jobs};
  if(path.includes('/artifacts'))return {total_count:2,artifacts:[24,26].map(node=>({id:node,name:`verification-node${node}-12-2`,expired:false,expires_at:'2999-01-01',workflow_run:{id:12,head_sha:run.head_sha}}))};
  if(path.startsWith('/git/commits/'))return options().candidate;
  if(path.startsWith('/git/trees/'))return {truncated:false,tree:[]};
  throw Error(path);
 };
 const readBundle=async a=>{reads++;return {receipt:{...receipt,status:changed==='partial'?'checks-only':'passed',identity:{...identity,node:`v${a.id}.15.0`,controls}}};};
 const input={repository:'owner/project',pullNumber:3,nodes:[24,26],bunVersion:'1.4.0',expectedHead:receipt.head,expectedControls:controls,request,readBundle};
 assert.equal((await checkReadySource(input)).sourceRun,12);assert.equal(reads,2);
 await assert.rejects(()=>checkReadySource({...input,expectedHead:sha('f')}),/reviewed checkout/);
 await assert.rejects(()=>checkReadySource({...input,expectedHead:undefined}),/reviewed checkout/);
 for(const reason of ['base','attempt','partial','new-run']) {changed=reason;reads=0;await assert.rejects(()=>checkReadySource(input));}
});
