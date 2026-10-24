import test from 'node:test';
import assert from 'node:assert/strict';
import {resumeTarget} from './resume-contract.mjs';
const run={id:123,run_attempt:2,event:'release',status:'completed',conclusion:'success',path:'.github/workflows/publish.yml',head_sha:'a'.repeat(40),head_branch:'appkit-core-v0.2.1',repository:{full_name:'dataarthub/appkit'},head_repository:{full_name:'dataarthub/appkit'}};
const artifact={id:456,name:'npm-package-123-2',expired:false,workflow_run:{id:123,head_sha:run.head_sha}};
const jobs=[{name:'Stage package for approval',status:'completed',conclusion:'success'}];
test('resume binds a successful release run to its current-attempt immutable archive',()=>{
 assert.deepEqual(resumeTarget(run,[artifact],jobs),{sha:run.head_sha,tag:run.head_branch,artifact:'456',control:run.head_sha,attempt:'2'});
});
test('manual, fork, failed, stale and ambiguous evidence cannot authorize completion',()=>{
 for(const patch of [{head_repository:{full_name:'fork/appkit'}},{event:'workflow_dispatch'},{conclusion:'failure'},{path:'.github/workflows/other.yml'},{repository:{full_name:'fork/appkit'}},{head_branch:'v0.1.0'}]) assert.throws(()=>resumeTarget({...run,...patch},[artifact],jobs));
 for(const artifacts of [[],[artifact,artifact],[{...artifact,expired:true}],[{...artifact,name:'npm-package-123-1'}],[{...artifact,workflow_run:{id:124,head_sha:run.head_sha}}]]) assert.throws(()=>resumeTarget(run,artifacts,jobs));
});

test('direct-publish runs and failed staging jobs cannot authorize completion',()=>{for(const invalid of [undefined,[],[{name:'Publish package',status:'completed',conclusion:'success'}],[{...jobs[0],conclusion:'failure'}]])assert.throws(()=>resumeTarget(run,[artifact],invalid),/staging job/);});
