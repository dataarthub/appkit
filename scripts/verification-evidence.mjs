/** Immutable CI evidence. Imported archives contain JSON only, never executable cache outputs. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {existsSync,readFileSync,writeFileSync,mkdirSync,readdirSync,rmSync,mkdtempSync,lstatSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {validatePartialReceipt} from './verification-partial.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
function apiToken(env=process.env) {
 if(env.GH_TOKEN||env.GITHUB_TOKEN)return env.GH_TOKEN??env.GITHUB_TOKEN;
 if(env.GITHUB_ACTIONS!=='true')try{return execFileSync('gh',['auth','token'],{encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:10000,maxBuffer:65536}).trim();}catch{/* Public API may remain readable without authentication. */}
}
const git = (root,args) => execFileSync('git',args,{cwd:root,encoding:'utf8',env:Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('GIT_'))),maxBuffer:32*1024**2}).trim();
// Bind every executable verifier/selector and its manifest, including project adapters.
const controlPath = path => /^\.github\//.test(path) || /^scripts\//.test(path) || /(?:^|\/)(?:package\.json|turbo\.json|[^/]*\.config\.[^/]+)$/.test(path);
export function controlHash(entries) {return hash(JSON.stringify(entries.filter(e=>e.type==='blob' && controlPath(e.path)).map(e=>[e.path,e.sha]).sort(([a],[b])=>a.localeCompare(b))));}
function localControls(root,ref='HEAD') {return controlHash(git(root,['ls-tree','-r',ref]).split('\n').filter(Boolean).map(line=>{const [,type,sha,path]=line.match(/^\d+ (\w+) ([a-f0-9]+)\t(.+)$/);return {type,sha,path};}));}
export function executionIdentity(root,env=process.env) {
 return {node:process.version,bun:execFileSync('bun',['--version'],{encoding:'utf8'}).trim(),os:process.platform,arch:process.arch,
  image:env.GITHUB_ACTIONS==='true'?`${env.ImageOS??''}:${env.ImageVersion??''}`:'local',
  environment:hash(JSON.stringify([...new Set(['CI','NODE_ENV','NODE_OPTIONS','TZ','LANG','LC_ALL',...Object.keys(env).filter(k=>/^(?:APPKIT|WORKFLOW|PLAYWRIGHT|FEATURE_CI|BUN_JSC)_/.test(k)&&!/(?:TOKEN|SECRET|PASSWORD|CREDENTIAL|API_KEY)/.test(k))])].sort().map(k=>[k,env[k]??'']))),controls:localControls(root)};
}
export function validateFreshPull(receipt,pull,latestBase) {
 assert(pull.state==='open' && pull.draft===false,'Ready open PR required');
 assert.equal(pull.head?.repo?.full_name,receipt.repository,'Fork evidence cannot become authoritative');
 assert.equal(pull.base?.repo?.full_name,receipt.repository);assert.equal(pull.base.ref,'main');
 assert.equal(pull.head.sha,receipt.head,'PR head advanced');assert.equal(pull.base.sha,receipt.base,'PR base advanced');
 assert.equal(latestBase,receipt.base,'Target branch advanced');assert.equal(pull.merge_commit_sha,receipt.candidate,'Merge candidate changed');
}
export function validateReceipt(receipt,run,{repository,identity,tree,candidate,jobs,nodes,trustedControls}) {
 assert(run.path==='.github/workflows/ci.yml' && run.name==='Source quality','Unexpected source workflow');
 assert(['push','pull_request','merge_group'].includes(run.event),'Untrusted source event');
 assert(run.head_repository?.full_name===repository && run.status==='completed' && run.conclusion==='success','Untrusted or incomplete run');
 assert(receipt.schemaVersion===1 && receipt.status==='passed' && receipt.repository===repository,'Invalid receipt');
 assert(receipt.run===run.id && receipt.attempt===run.run_attempt && receipt.event===run.event,'Superseded receipt');
 assert(sha(receipt.candidate)&&sha(receipt.tree),'Invalid source identity');
 assert.equal(receipt.workflowSha,receipt.candidate,'Source workflow revision differs from tested candidate');
 assert(run.referenced_workflows?.some(w=>w.path?.startsWith(`${repository}/.github/workflows/package-quality.yml@`)&&w.sha===receipt.workflowSha),'Reusable workflow identity differs');
 assert.equal(candidate.sha,receipt.candidate);assert.equal(candidate.tree?.sha,receipt.tree,'Actual candidate tree differs');
 if(tree)assert.equal(receipt.tree,tree,'Integration tree differs');
 assert(trustedControls,'Workflow controls differ from trusted base');assert.deepEqual(receipt.identity,identity,'Execution environment changed');
 if(run.event==='pull_request') {
  assert.equal(receipt.workflowRef,`${repository}/.github/workflows/ci.yml@refs/pull/${receipt.pull}/merge`);
  assert.equal(run.head_sha,receipt.head);assert(candidate.parents?.some(p=>p.sha===receipt.base)&&candidate.parents?.some(p=>p.sha===receipt.head),'Merge ancestry differs');
  const p=run.pull_requests?.find(p=>p.number===receipt.pull);assert(p&&p.head.sha===receipt.head&&p.base.sha===receipt.base,'PR provenance differs');
 } else {
  assert.equal(run.head_sha,receipt.candidate);
  if(run.event==='push')assert(run.head_branch==='main'&&receipt.workflowRef===`${repository}/.github/workflows/ci.yml@refs/heads/main`);
  else assert(receipt.workflowRef.startsWith(`${repository}/.github/workflows/ci.yml@refs/heads/gh-readonly-queue/main/`));
 }
 for(const node of nodes) {const suffix=`Verify packages (Node ${node})`,matched=jobs.filter(j=>j.name===suffix||j.name.endsWith(' / '+suffix));assert(matched.length===1&&matched[0].status==='completed'&&matched[0].conclusion==='success','Missing successful runtime job');}
 return receipt;
}
export async function artifactData(repository,artifact,{token=apiToken(),fetchImpl=fetch}={}) {
 assert(Number.isSafeInteger(artifact.id)&&artifact.id>0);assert.match(artifact.digest??'',/^sha256:[a-f0-9]{64}$/);
 if(artifact.size_in_bytes!==undefined)assert(Number.isSafeInteger(artifact.size_in_bytes)&&artifact.size_in_bytes<=8*1024**2,'Artifact too large');
 const r=await fetchImpl(`https://api.github.com/repos/${repository}/actions/artifacts/${artifact.id}/zip`,{headers:token?{Authorization:`Bearer ${token}`}:{},redirect:'manual',signal:AbortSignal.timeout(30000)});
 assert.equal(r.status,302,'Signed artifact redirect required');const url=new URL(r.headers.get('location'));
 assert(url.protocol==='https:'&&!url.username&&!url.password&&/\.(?:blob\.core\.windows\.net|actions\.githubusercontent\.com|githubusercontent\.com)$/.test(url.hostname),'Unsafe artifact destination');
 const data=await fetchImpl(url.href,{redirect:'error',signal:AbortSignal.timeout(30000)});assert(data.ok,'Artifact download failed');
 const length=Number(data.headers.get('content-length'));assert(!length||length<=8*1024**2,'Artifact too large');
 let bytes;
 if(data.body?.getReader) {
  const reader=data.body.getReader(),chunks=[];let size=0;
  try {while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;assert(size<=8*1024**2,'Artifact too large');chunks.push(Buffer.from(value));}bytes=Buffer.concat(chunks,size);}
  catch(error){await reader.cancel();throw error;}finally{reader.releaseLock();}
 }else bytes=Buffer.from(await data.arrayBuffer());
 assert(bytes.length<=8*1024**2,'Artifact too large');assert.equal(`sha256:${hash(bytes)}`,artifact.digest,'Artifact digest mismatch');return bytes;
}
function unpack(bytes) {
 const tmp=mkdtempSync(join(tmpdir(),'appkit-evidence-'));
 try {const file=join(tmp,'evidence.zip');writeFileSync(file,bytes);
  const entries=execFileSync('unzip',['-Z1',file],{encoding:'utf8',timeout:10000}).trim().split('\n').sort();assert.deepEqual(entries,['checks.json','source.json'],'Unexpected evidence members');
  const read=name=>JSON.parse(execFileSync('unzip',['-p',file,name],{encoding:'utf8',timeout:10000,maxBuffer:8*1024**2}));
  return {receipt:read('source.json'),checks:read('checks.json')};
 } finally {rmSync(tmp,{recursive:true,force:true});}
}
export function evidenceReader(repository,env=process.env) {
 assert.match(repository,/^[\w.-]+\/[\w.-]+$/);const token=apiToken(env);
 return async path => {assert(path.startsWith('/')&&!path.includes('://'));const r=await fetch(`https://api.github.com/repos/${repository}${path}`,{headers:{Accept:'application/vnd.github+json',...(token?{Authorization:`Bearer ${token}`}:{})},redirect:'error',signal:AbortSignal.timeout(30000)});assert(r.ok,`Evidence API failed (${r.status})`);return r.json();};
}
const read = file => JSON.parse(readFileSync(file,'utf8'));
function exportChecks(root) {
 const checks={};for(const group of ['source-checks','unit-checks']) {const directory=safeRecordPath(root,group);if(!existsSync(directory))continue;
  for(const name of readdirSync(directory).filter(n=>/^[\w.-]+\.json$/.test(n))) {const p=join(directory,name);if(lstatSync(p).isFile()&&!lstatSync(p).isSymbolicLink()){const value=read(p);if(value.status==='passed')checks[`${group}/${name}`]=value;}}
 }return checks;
}
function safeRecordPath(root,name) {
 let current=root;for(const part of ['.verification','records',...name.split('/')]) {current=join(current,part);if(existsSync(current))assert(!lstatSync(current).isSymbolicLink(),'Receipt path cannot cross a symlink');}return current;
}
function importChecks(root,checks) {
 assert(checks&&typeof checks==='object'&&!Array.isArray(checks));
 for(const [name,value] of Object.entries(checks)) {assert(/^(?:source-checks|unit-checks)\/[\w.-]+\.json$/.test(name),'Unsafe receipt path');const p=safeRecordPath(root,name);mkdirSync(resolve(p,'..'),{recursive:true});assert(!existsSync(p)||lstatSync(p).isFile()&&!lstatSync(p).isSymbolicLink());writeFileSync(p,JSON.stringify(value)+'\n');}
}
async function currentReceipt(root,env,request) {
 const repository=JSON.parse(readFileSync(join(root,'.github/workflow-adapter.json'))).repository;
 assert.equal(env.GITHUB_REPOSITORY,repository);assert.equal(env.GITHUB_ACTIONS,'true');
 const candidate=git(root,['rev-parse','HEAD']);assert.equal(candidate,env.GITHUB_SHA);assert.equal(git(root,['status','--porcelain','--untracked-files=all']),'','Committed clean source required');
 const event=read(env.GITHUB_EVENT_PATH),receipt={schemaVersion:1,status:'passed',repository,run:Number(env.GITHUB_RUN_ID),attempt:Number(env.GITHUB_RUN_ATTEMPT),event:env.GITHUB_EVENT_NAME,candidate,tree:git(root,['rev-parse','HEAD^{tree}']),workflowRef:env.GITHUB_WORKFLOW_REF,workflowSha:env.GITHUB_WORKFLOW_SHA,identity:executionIdentity(root,env)};
 assert(Number.isSafeInteger(receipt.run)&&receipt.run>0&&Number.isSafeInteger(receipt.attempt)&&receipt.attempt>0);assert(sha(receipt.workflowSha));assert(!receipt.identity.image.startsWith(':')&&!receipt.identity.image.endsWith(':'));
 if(receipt.event==='pull_request') {const p=event.pull_request;receipt.pull=event.number;receipt.base=p.base.sha;receipt.head=p.head.sha;
  const live=await request(`/pulls/${receipt.pull}`),base=await request('/git/ref/heads/main');validateFreshPull(receipt,live,base.object.sha);
  } else if(receipt.event==='push'||receipt.event==='workflow_dispatch') {if(receipt.event==='push')assert.equal(env.GITHUB_REF,'refs/heads/main');else assert.match(env.GITHUB_REF??'',/^refs\/heads\//);receipt.base=git(root,['rev-parse','HEAD^']);}
 else if(receipt.event==='merge_group') {receipt.base=event.merge_group.base_sha;receipt.head=event.merge_group.head_sha;assert.equal(receipt.head,candidate);}
 else throw Error('Only source CI can record evidence');
 return receipt;
}
export async function restoreEvidence(root,{env=process.env,request,readBundle}={}) {
 const outcome={inherited:false,restored:false,reason:'No authenticated matching evidence'};
 if(env.GITHUB_ACTIONS!=='true')return outcome;
 const adapter=read(join(root,'.github/workflow-adapter.json')),repository=adapter.repository;request??=evidenceReader(repository,env);
 readBundle??=async artifact=>unpack(await artifactData(repository,artifact,{token:env.GH_TOKEN??env.GITHUB_TOKEN}));
 try {
  const identity=executionIdentity(root,env),tree=git(root,['rev-parse','HEAD^{tree}']);
  const listed=await request('/actions/workflows/ci.yml/runs?per_page=30');assert(Array.isArray(listed.workflow_runs));
  const seen=new Set();
  for(const previous of listed.workflow_runs.sort((a,b)=>b.id-a.id)) {
   if(previous.id===Number(env.GITHUB_RUN_ID)||previous.head_repository?.full_name!==repository||!['pull_request','push','merge_group'].includes(previous.event))continue;
   const key=previous.event+':'+previous.head_sha;if(seen.has(key))continue;seen.add(key);
   if(previous.status!=='completed'||!['success','failure'].includes(previous.conclusion))continue;
   try {
    const run=await request(`/actions/runs/${previous.id}`);assert.equal(run.run_attempt,previous.run_attempt,'Attempt superseded');
    const artifacts=await request(`/actions/runs/${run.id}/artifacts?per_page=100`);assert(artifacts.total_count<=100);
    const name=`verification-node${process.versions.node.split('.')[0]}-${run.id}-${run.run_attempt}`,matched=artifacts.artifacts.filter(a=>a.name===name);assert.equal(matched.length,1);const artifact=matched[0];
    assert(artifact.expired===false&&Date.parse(artifact.expires_at)>Date.now()&&artifact.workflow_run?.id===run.id&&artifact.workflow_run?.head_sha===run.head_sha);
    const {receipt,checks}=await readBundle(artifact);
    const candidate=await request(`/git/commits/${receipt.candidate}`);
    const baseCommit=await request(`/git/commits/${receipt.base}`);
    const [candidateControls,baseControls,jobs]=await Promise.all([request(`/git/trees/${candidate.tree.sha}?recursive=1`),request(`/git/trees/${baseCommit.tree.sha}?recursive=1`),request(`/actions/runs/${run.id}/attempts/${run.run_attempt}/jobs?per_page=100`)]);
    assert(!candidateControls.truncated&&!baseControls.truncated&&jobs.total_count<=100);
    const options={repository,identity,candidate,jobs:jobs.jobs,nodes:adapter.runtime.nodeVersions,trustedControls:controlHash(candidateControls.tree)===identity.controls&&controlHash(baseControls.tree)===identity.controls};
    const complete=run.conclusion==='success';
    const accepted=complete?(validateReceipt(receipt,run,options),checks):validatePartialReceipt(receipt,run,{...options,checks,producerNode:Number(process.versions.node.split('.')[0])},validateReceipt).checks;
    // Same-candidate retries and post-merge equivalent trees can inherit completed suites.
    // A changed candidate may only reuse individually keyed receipts, never the whole gate.
    if(env.GITHUB_EVENT_NAME==='pull_request') {const e=read(env.GITHUB_EVENT_PATH);assert.equal(receipt.pull,e.number);assert.equal(receipt.base,e.pull_request.base.sha);}
    else if(env.GITHUB_EVENT_NAME==='push')assert.equal(env.GITHUB_REF,'refs/heads/main');
    else assert.equal(env.GITHUB_EVENT_NAME,'merge_group');
    const confirmed=await request(`/actions/runs/${run.id}`);assert(confirmed.run_attempt===run.run_attempt&&confirmed.status==='completed'&&confirmed.conclusion===run.conclusion,'Attempt changed during evidence validation');
    const latest=await request(`/actions/workflows/ci.yml/runs?head_sha=${run.head_sha}&per_page=30`);
    assert(!latest.workflow_runs.some(r=>r.path==='.github/workflows/ci.yml'&&r.event===run.event&&r.head_repository?.full_name===repository&&r.id>run.id),'Newer source run supersedes evidence');
    importChecks(root,accepted);
    const inherited=complete&&receipt.tree===tree;
    return {inherited,restored:true,reason:inherited?'Authenticated identical Git tree and execution identity':'Authenticated independently keyed checks; changed inputs will execute',producer:{run:run.id,attempt:run.run_attempt,candidate:receipt.candidate,tree:receipt.tree,artifact:artifact.id,digest:artifact.digest}};
   }catch(error){outcome.reason=`Evidence not reusable: ${error.message}`;}
  }
 }catch(error){outcome.reason=`Evidence unavailable: ${error.message}`;}
 return outcome;
}
/** Read-only pre-merge gate; never merges or substitutes a partial checkpoint. */
export async function checkReadySource({repository,pullNumber,nodes,bunVersion,expectedControls,request,readBundle}) {
 assert(Number.isSafeInteger(pullNumber)&&pullNumber>0,'Positive PR number required');
 const pull=await request(`/pulls/${pullNumber}`),base=await request('/git/ref/heads/main');
 const listed=await request(`/actions/workflows/ci.yml/runs?head_sha=${pull.head.sha}&per_page=30`);
 const latest=listed.workflow_runs.filter(r=>r.path==='.github/workflows/ci.yml'&&r.event==='pull_request'&&r.head_repository?.full_name===repository&&r.pull_requests?.some(p=>p.number===pullNumber)).sort((a,b)=>b.id-a.id)[0];
 assert(latest,'Missing current Source quality');const run=await request(`/actions/runs/${latest.id}`);assert(run.run_attempt===latest.run_attempt&&run.status==='completed'&&run.conclusion==='success','Latest Source quality has not passed');
 const [jobs,artifacts,candidate]=await Promise.all([request(`/actions/runs/${run.id}/attempts/${run.run_attempt}/jobs?per_page=100`),request(`/actions/runs/${run.id}/artifacts?per_page=100`),request(`/git/commits/${pull.merge_commit_sha}`)]);
 assert(jobs.total_count<=100&&artifacts.total_count<=100);const controls=await request(`/git/trees/${candidate.tree.sha}?recursive=1`);assert(!controls.truncated&&controlHash(controls.tree)===expectedControls,'Candidate verifier differs from reviewed local controls');
 for(const node of nodes) {
  const matches=artifacts.artifacts.filter(a=>a.name===`verification-node${node}-${run.id}-${run.run_attempt}`);assert.equal(matches.length,1,'Missing runtime source proof');const artifact=matches[0];assert(artifact.expired===false&&Date.parse(artifact.expires_at)>Date.now()&&artifact.workflow_run?.id===run.id&&artifact.workflow_run?.head_sha===run.head_sha,'Expired or mismatched runtime artifact');
  const {receipt}=await readBundle(artifact);assert.equal(Number(/^v(\d+)\./.exec(receipt.identity.node)?.[1]),node);assert.equal(receipt.identity.bun,bunVersion);assert.equal(receipt.identity.controls,expectedControls);assert.match(receipt.identity.image,/^[^:]+:[^:]+$/);
  validateReceipt(receipt,run,{repository,identity:receipt.identity,tree:candidate.tree.sha,candidate,jobs:jobs.jobs,nodes,trustedControls:true});validateFreshPull(receipt,pull,base.object.sha);
 }
 // Catch changes that happened while artifacts were being authenticated.
 const [freshPull,freshBase,freshRun]=await Promise.all([request(`/pulls/${pullNumber}`),request('/git/ref/heads/main'),request(`/actions/runs/${run.id}`)]);
 assert.equal(freshPull.head.sha,pull.head.sha);assert.equal(freshPull.merge_commit_sha,pull.merge_commit_sha);assert.equal(freshBase.object.sha,base.object.sha);assert(freshRun.run_attempt===run.run_attempt&&freshRun.status==='completed'&&freshRun.conclusion==='success');
 const result={repository,pull:pullNumber,head:pull.head.sha,base:base.object.sha,candidate:candidate.sha,tree:candidate.tree.sha,sourceRun:run.id,sourceAttempt:run.run_attempt};await confirmSourceContext(result,{request});return result;
}
export async function confirmSourceContext(context,{request}) {
 const list=await request(`/actions/workflows/ci.yml/runs?head_sha=${context.head}&per_page=30`);
 const latest=list.workflow_runs.filter(r=>r.path==='.github/workflows/ci.yml'&&r.event==='pull_request'&&r.head_repository?.full_name===context.repository&&r.pull_requests?.some(p=>p.number===context.pull)).sort((a,b)=>b.id-a.id)[0];
 assert(latest&&latest.id===context.sourceRun&&latest.run_attempt===context.sourceAttempt&&latest.status==='completed'&&latest.conclusion==='success','Newer source run superseded the merge evidence');
 const current=await request(`/actions/runs/${context.sourceRun}`);assert(current.run_attempt===context.sourceAttempt&&current.status==='completed'&&current.conclusion==='success','Source attempt changed before acceptance');
}
export async function main(mode,root=process.cwd(),env=process.env,{args=process.argv.slice(3)}={}) {
 const adapter=read(join(root,'.github/workflow-adapter.json')),request=evidenceReader(adapter.repository,env),directory=safeRecordPath(root,'ci-evidence');mkdirSync(directory,{recursive:true});
 if(mode==='restore') {
  // Validate the current merge candidate before any expensive work.
  if(env.GITHUB_ACTIONS==='true'&&env.GITHUB_EVENT_NAME==='pull_request')await currentReceipt(root,env,request);
  const outcome=await restoreEvidence(root,{env,request});writeFileSync(join(directory,'restored.json'),JSON.stringify(outcome)+'\n');
  console.log(`[verification] ${outcome.reason}`);if(env.GITHUB_OUTPUT)(await import('node:fs')).appendFileSync(env.GITHUB_OUTPUT,`inherited=${outcome.inherited}\nrestored=${outcome.restored}\n`);return outcome;
 }
 if(mode==='record') {for(const name of ['source.json','checks.json'])rmSync(join(directory,name),{force:true});const receipt=await currentReceipt(root,env,request);if(env.SOURCE_VERIFICATION_CONCLUSION!=='success'||receipt.event==='workflow_dispatch')receipt.status='checks-only';if(existsSync(join(directory,'restored.json')))receipt.reuse=read(join(directory,'restored.json'));writeFileSync(join(directory,'source.json'),JSON.stringify(receipt)+'\n');writeFileSync(join(directory,'checks.json'),JSON.stringify(exportChecks(root))+'\n');return;}
 if(mode==='merge-check') {assert.equal(git(root,['status','--porcelain','--untracked-files=all']),'','Review and commit changes before merge verification');assert(args.length===2&&args[0]==='--pr'&&/^[1-9]\d*$/.test(args[1]),'Use merge-check --pr <number>');const result=await checkReadySource({repository:adapter.repository,pullNumber:Number(args[1]),nodes:adapter.runtime.nodeVersions,bunVersion:adapter.runtime.bunVersion,expectedControls:localControls(root),request,readBundle:async artifact=>unpack(await artifactData(adapter.repository,artifact,{token:env.GH_TOKEN??env.GITHUB_TOKEN}))});console.log(JSON.stringify(result));return result;}
 throw Error('Use restore, record or merge-check');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main(process.argv[2]).catch(error=>{console.error(error.message);process.exitCode=1;});
