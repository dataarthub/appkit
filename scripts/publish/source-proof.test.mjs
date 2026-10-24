import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,realpathSync,mkdirSync,cpSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
function fixture(work){
 const workspace=realpathSync(mkdtempSync(path.join(tmpdir(),'release-two-roots-'))),control=path.join(workspace,'control'),source=path.join(workspace,'source');
 const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('GIT_')&&!k.startsWith('PUBLISH_')));
 const git=(cwd,args)=>execFileSync('git',args,{cwd,env,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 try{
  mkdirSync(path.join(control,'scripts'),{recursive:true});cpSync(path.resolve('scripts/publish'),path.join(control,'scripts/publish'),{recursive:true});
  mkdirSync(path.join(control,'scripts/workflow-supply/public'),{recursive:true});
  writeFileSync(path.join(control,'scripts/workflow-supply/public/quality.mjs'),`import {execFileSync} from 'node:child_process';export async function requireSource(){if(process.env.FIXTURE_FORMAL_FAILURE)throw Error('invalid official evidence');return {run:{id:1,run_attempt:2}};}export function executionIdentity(root,env=process.env){return {node:process.version,image:'fixture',force:env.TURBO_FORCE??''};}export function inputHash(root){return execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'});}`);
  mkdirSync(path.join(control,'scripts/verification'),{recursive:true});
  writeFileSync(path.join(control,'scripts/verification/run.mjs'),`import assert from 'node:assert/strict';import {writeFileSync} from 'node:fs';assert(process.argv.includes('--full'));assert(!Object.keys(process.env).some(k=>k.startsWith('PUBLISH_')));if(process.env.FIXTURE_SOURCE_FAILURE)throw Error('source checks failed');writeFileSync('.verification/publish/child-ran.json',JSON.stringify({cwd:process.cwd(),args:process.argv.slice(2)}));`);
  writeFileSync(path.join(control,'.gitignore'),'.verification/\n');mkdirSync(path.join(control,'.github'));writeFileSync(path.join(control,'.github/workflow-adapter.json'),'{}');
  for(const key of ['core','react']){mkdirSync(path.join(control,`packages/appkit-${key}`),{recursive:true});writeFileSync(path.join(control,`packages/appkit-${key}/package.json`),JSON.stringify({name:`@alneas/appkit-${key}`,version:key==='core'?'0.2.1':'0.3.0',repository:{url:'https://github.com/dataarthub/appkit.git'},publishConfig:{access:'public'}}));}
  git(control,['init','-q']);git(control,['add','.']);git(control,['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','-c','core.hooksPath=/dev/null','commit','-qm','fixture']);
  git(workspace,['clone','--quiet','--no-hardlinks',control,source]);const sha=git(source,['rev-parse','HEAD']);git(source,['update-ref','refs/remotes/origin/main',sha]);git(source,['tag','appkit-core-v0.2.1']);
  const event=path.join(workspace,'event.json');writeFileSync(event,JSON.stringify({action:'published',repository:{full_name:'dataarthub/appkit'},release:{tag_name:'appkit-core-v0.2.1',draft:false,prerelease:false}}));
  const base={...env,GITHUB_WORKSPACE:workspace,GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:'dataarthub/appkit',GITHUB_EVENT_NAME:'release',GITHUB_SHA:sha,GITHUB_EVENT_PATH:event,GITHUB_RUN_ID:'123',GITHUB_RUN_ATTEMPT:'1',PUBLISH_PACKAGE_ROOT:source};
  const run=(command,extra={})=>spawnSync(process.execPath,[path.join(control,'scripts/publish/source-proof.mjs'),command],{cwd:source,env:{...base,...extra},encoding:'utf8'});
  return work({workspace,control,source,sha,run,git,base});
 }finally{rmSync(workspace,{recursive:true,force:true});}
}
test('fresh verification runs the original source in a separate root and isolates control-only variables',()=>fixture(({source,run})=>{
 const result=run('fresh');assert.equal(result.status,0,result.stderr);
 const major=Number(process.versions.node.split('.')[0]);
 assert(existsSync(path.join(source,`.verification/publish/fresh-node${major}.json`)));
 assert.equal(JSON.parse(readFileSync(path.join(source,`.verification/publish/fresh-node${major}.json`))).identity.force,'true');
 const child=JSON.parse(readFileSync(path.join(source,'.verification/publish/child-ran.json')));assert.equal(child.cwd,source);assert(child.args.includes('--full'));
}));
test('invalid official evidence or failed fresh checks never produce a source pass',()=>{
 for(const extra of [{FIXTURE_FORMAL_FAILURE:'1'},{FIXTURE_SOURCE_FAILURE:'1'}])fixture(({source,run})=>{
  const result=run('fresh',extra);assert.equal(result.status,1);assert(!existsSync(path.join(source,`.verification/publish/fresh-node${process.versions.node.split('.')[0]}.json`)));
  if(extra.FIXTURE_FORMAL_FAILURE)assert(!existsSync(path.join(source,'.verification/publish/child-ran.json')));
 });
});
test('historical completion without a source adapter keeps its authenticated producer contract',()=>fixture(({workspace,source,sha,run,git,base})=>{
 rmSync(path.join(source,'.github/workflow-adapter.json'));git(source,['add','-A']);git(source,['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','-c','core.hooksPath=/dev/null','commit','-qm','historical source']);
 const oldSha=git(source,['rev-parse','HEAD']);git(source,['update-ref','refs/remotes/origin/main',oldSha]);git(source,['tag','-f','appkit-core-v0.2.1',oldSha]);
 const bin=path.join(workspace,'bin');mkdirSync(bin);writeFileSync(path.join(bin,'gh'),`#!/usr/bin/env node\nconsole.log(JSON.stringify({tag_name:'appkit-core-v0.2.1',draft:false,prerelease:false}));`,{mode:0o755});
 writeFileSync(base.GITHUB_EVENT_PATH,JSON.stringify({inputs:{staged_run:'10'}}));mkdirSync(path.join(source,'.verification/publish'),{recursive:true});writeFileSync(path.join(source,'.verification/publish/release.json'),JSON.stringify({schemaVersion:1,sha:oldSha}));
 const result=run('writer',{GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF:'refs/heads/main',PUBLISH_SOURCE_SHA:oldSha,PUBLISH_RELEASE_TAG:'appkit-core-v0.2.1',PUBLISH_PRODUCER_CONTROL:sha,PUBLISH_PRODUCER_RUN:'10',PUBLISH_PRODUCER_ATTEMPT:'1',PATH:bin+path.delimiter+base.PATH});
 assert.equal(result.status,0,result.stderr);
}));

test('actual writer proof rejects changed source, control, producer run or attempt',()=>fixture(({source,sha,run})=>{
 const directory=path.join(source,'.verification/publish');mkdirSync(directory,{recursive:true});
 const fresh={source:sha,control:sha,run:123,attempt:1,status:'passed',nodes:[24,26].map(major=>({major,status:'passed',identity:{node:`v${major}.0.0`,image:'fixture'}}))};
 const write=value=>writeFileSync(path.join(directory,'release.json'),JSON.stringify({schemaVersion:1,sha,freshVerification:value}));
 write(fresh);assert.equal(run('writer').status,0);
 for(const patch of [{source:'a'.repeat(40)},{control:'b'.repeat(40)},{run:124},{attempt:2}]){write({...fresh,...patch});const rejected=run('writer');assert.equal(rejected.status,1);assert.match(rejected.stderr,/Fresh verification .* changed/);}
}));
