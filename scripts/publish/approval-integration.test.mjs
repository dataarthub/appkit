import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {releaseTarget} from './contract.mjs';
import {archiveIntegrity} from './artifact.mjs';
const entry=fileURLToPath(new URL('./await-approval.mjs',import.meta.url));
function fixture(run){
 const root=mkdtempSync(path.join(tmpdir(),'appkit-auto-complete-'));
 try{
  const sha='a'.repeat(40),tag='appkit-react-v0.2.1',target={...releaseTarget(tag),sha,tag};
  mkdirSync(path.join(root,'package/dist'),{recursive:true});
  writeFileSync(path.join(root,'package/dist/index.js'),'export const value=1;');
  writeFileSync(path.join(root,'package/package.json'),JSON.stringify({name:target.name,version:target.version,publishConfig:{access:'public',registry:'https://registry.npmjs.org'},exports:{'.':'./dist/index.js'}}));
  const directory=path.join(root,'.verification/publish');mkdirSync(directory,{recursive:true});
  const archive=path.join(directory,'package.tgz');execFileSync('tar',['-czf',archive,'-C',root,'package']);
  const manifest={...target,schemaVersion:1,integrity:archiveIntegrity(archive)};
  writeFileSync(path.join(directory,'release.json'),JSON.stringify(manifest));
  const source={id:123,run_attempt:1,event:'release',status:'completed',conclusion:'success',path:'.github/workflows/publish.yml',head_sha:sha,head_branch:tag,repository:{full_name:'dataarthub/appkit'},head_repository:{full_name:'dataarthub/appkit'}};
  writeFileSync(path.join(root,'event.json'),JSON.stringify({action:'completed',repository:source.repository,workflow_run:source}));
  const artifact={id:456,expired:false,workflow_run:{id:123,head_sha:sha}};
  const registry={name:target.name,version:target.version,dist:{integrity:manifest.integrity}};
  const preload=path.join(root,'mock.mjs');
  writeFileSync(preload,`import {readFileSync,appendFileSync} from 'node:fs';
const data=JSON.parse(readFileSync('responses.json','utf8'));
globalThis.fetch=async(url,options={})=>{
 if(url.startsWith('https://registry.npmjs.org/'))return Response.json(data.registry);
 if(url.endsWith('/actions/runs/123'))return Response.json(data.run);
 if(url.endsWith('/actions/artifacts/456'))return Response.json(data.artifact);
 if(url.endsWith('/actions/workflows/publish.yml/dispatches')){
  appendFileSync('dispatch.json',options.body);return new Response(null,{status:204});
 }
 throw Error('Unexpected request');
};`);
  const execute=patch=>{
   writeFileSync(path.join(root,'responses.json'),JSON.stringify({run:source,artifact,registry,...patch}));
   return spawnSync(process.execPath,['--import',preload,entry],{cwd:root,encoding:'utf8',timeout:5000,env:{...process.env,GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:'dataarthub/appkit',GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'workflow_run',GITHUB_EVENT_PATH:path.join(root,'event.json'),GITHUB_TOKEN:'test-token',STAGING_RUN:'123',PUBLISH_SOURCE_SHA:sha,PUBLISH_RELEASE_TAG:tag,VERIFIED_ARTIFACT:'456',GITHUB_STEP_SUMMARY:path.join(root,'summary.md')}});
  };
  run({root,source,artifact,registry,execute});
 }finally{rmSync(root,{recursive:true,force:true});}
}
test('real observer CLI verifies the archive and dispatches only its original run with no registry write',()=>fixture(({root,execute})=>{
 const result=execute({});assert.equal(result.status,0,result.stderr);
 assert.deepEqual(JSON.parse(readFileSync(path.join(root,'dispatch.json'),'utf8')),{ref:'main',inputs:{staged_run:'123'}});
 assert.match(readFileSync(path.join(root,'summary.md'),'utf8'),/not release success/);
}));
test('changed run attempt, expired archive and mismatching public bytes prevent dispatch',()=>{
 for(const kind of ['run','artifact','registry'])fixture(({root,source,artifact,registry,execute})=>{
  const patch=kind==='run'?{run:{...source,run_attempt:2}}:kind==='artifact'?{artifact:{...artifact,expired:true}}:{registry:{...registry,dist:{integrity:'different'}}};
  const result=execute(patch);assert.equal(result.status,1);assert.equal(existsSync(path.join(root,'dispatch.json')),false);
 });
});
