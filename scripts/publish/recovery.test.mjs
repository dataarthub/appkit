import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateRecovery,publicationPhase,validateFresh} from './recovery.mjs';
const candidate=JSON.parse(readFileSync(new URL('./recoveries/core-0.2.1.json',import.meta.url)));
const run={id:candidate.run,run_attempt:candidate.attempt,event:'release',path:'.github/workflows/publish.yml',head_sha:candidate.sha,head_branch:candidate.tag,status:'completed',conclusion:'failure',repository:{full_name:'dataarthub/appkit'},head_repository:{full_name:'dataarthub/appkit'}};
const release={id:candidate.release,tag_name:candidate.tag,target_commitish:candidate.sha,draft:false,prerelease:false};
const ref={object:{type:'tag',sha:candidate.tagObject}};
const tag={tag:candidate.tag,sha:candidate.tagObject,object:{type:'commit',sha:candidate.sha}};
const jobs=[{name:'verify',conclusion:'failure',status:'completed'},{name:'Stage package for approval',conclusion:'skipped',status:'completed'}];
const valid={candidate,run,release,ref,tag,jobs,artifacts:{total_count:0,artifacts:[]}};
test('recovery accepts only the reviewed original candidate before any archive/staging',()=>{
 assert.deepEqual(validateRecovery(valid),candidate);
 for(const patch of [{run:{...run,run_attempt:3}},{run:{...run,head_sha:'a'.repeat(40)}},{release:{...release,id:1}},{release:{...release,target_commitish:'main'}},{ref:{object:{...ref.object,sha:'b'.repeat(40)}}},{tag:{...tag,object:{type:'commit',sha:'c'.repeat(40)}}},{artifacts:{total_count:1,artifacts:[{}]}},{jobs:[jobs[0],{...jobs[1],conclusion:'success'}]},{jobs:[]},{run:{...run,event:'workflow_dispatch'}}])assert.throws(()=>validateRecovery({...valid,...patch}));
});
test('dispatch staging and completion are explicit exclusive phases',()=>{
 const env={GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:'dataarthub/appkit',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF:'refs/heads/main'};
 assert.equal(publicationPhase(env,{inputs:{recover_release:'core-0.2.1',staged_run:''}}),'stage');
 assert.equal(publicationPhase(env,{inputs:{staged_run:'123',recover_release:''}}),'complete');
 for(const inputs of [{},{recover_release:'unknown'},{staged_run:'123',recover_release:'core-0.2.1'},{staged_run:'bad'}])assert.throws(()=>publicationPhase(env,{inputs}));
 assert.throws(()=>publicationPhase({...env,GITHUB_REF:'refs/heads/other'},{inputs:{recover_release:'core-0.2.1'}}));
});
test('fresh proof binds both runtime checks, package source, producer attempt and control source',()=>{
 const ctx={source:candidate.sha,control:'d'.repeat(40),run:20,attempt:1};
 const fresh={...ctx,status:'passed',nodes:[{major:24,status:'passed',identity:{node:'v24.22.1',image:'ubuntu24:old'}},{major:26,status:'passed',identity:{node:'v26.5.0',image:'ubuntu24:old'}}]};
 validateFresh(fresh,ctx);
 for(const patch of [{source:'e'.repeat(40)},{control:'f'.repeat(40)},{attempt:2},{nodes:[fresh.nodes[0]]},{status:'failed'},{nodes:[fresh.nodes[0],{...fresh.nodes[1],status:'failed'}]}])assert.throws(()=>validateFresh({...fresh,...patch},ctx));
});

test('recovery staging is single-use even before npm becomes public',async()=>{
 const {validateRecoveryProducer}=await import('./recovery.mjs');
 const producer={id:30,run_attempt:1,event:'workflow_dispatch',head_branch:'main',display_title:'Recover core-0.2.1',head_sha:'d'.repeat(40),path:'.github/workflows/publish.yml',repository:{full_name:'dataarthub/appkit'},head_repository:{full_name:'dataarthub/appkit'}};
 validateRecoveryProducer(candidate,producer,[producer]);
 assert.throws(()=>validateRecoveryProducer(candidate,{...producer,run_attempt:2},[producer]));
 assert.throws(()=>validateRecoveryProducer(candidate,producer,[{...producer,id:29},producer]));
});

test('completion resolves a successful recovery producer to original package SHA, never control SHA',async()=>{
 const {resumeTarget}=await import('./resume-contract.mjs');
 const control='d'.repeat(40),r={id:30,run_attempt:1,event:'workflow_dispatch',head_branch:'main',display_title:'Recover core-0.2.1',head_sha:control,path:'.github/workflows/publish.yml',repository:{full_name:'dataarthub/appkit'},head_repository:{full_name:'dataarthub/appkit'},status:'completed',conclusion:'success'};
 const artifact={id:31,name:'npm-package-30-1',expired:false,workflow_run:{id:30,head_sha:control}};
 const target=resumeTarget(r,[artifact],[{name:'Stage package for approval',status:'completed',conclusion:'success'}]);
 assert.equal(target.sha,candidate.sha);assert.equal(target.control,control);assert.equal(target.tag,candidate.tag);
 assert.throws(()=>resumeTarget({...r,display_title:'Complete package'},[artifact],jobs));
});
