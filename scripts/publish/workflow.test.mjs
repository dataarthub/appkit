import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {parse} from 'yaml';
const workflow=parse(readFileSync('.github/workflows/publish.yml','utf8'));
test('only stable releases stage; main-only manual completion requires the original run ID',()=>{
 assert.deepEqual(Object.keys(workflow.on),['release','workflow_dispatch']);
 assert.deepEqual(workflow.on.release,{types:['published']});
 assert.equal(workflow.on.workflow_dispatch.inputs.staged_run.required,true);
 assert.match(workflow.jobs.verify.if,/event_name == 'release'/);
 assert.match(workflow.jobs.verify.if,/prerelease == false/);
 assert.match(workflow.jobs.resolve.if,/refs\/heads\/main/);
 assert.equal(workflow.concurrency['cancel-in-progress'],false);
});
test('verification and resume resolution have no OIDC; staging does not create a public Deployment',()=>{
 for(const key of ['verify','resolve']) assert.equal(workflow.jobs[key].permissions['id-token'],undefined);
 for(const key of ['stage','complete']) {
   const job=workflow.jobs[key];
   assert.equal(job.permissions['id-token'],'write');
   assert.equal(job.environment.deployment,false);
   assert.equal(job.steps.some(s=>/bun install|npm ci/.test(s.run??'')),false);
   assert.equal(job.steps.find(s=>s.uses?.startsWith('actions/setup-node@')).with['registry-url'],undefined);
 }
 assert.equal(workflow.jobs.stage.permissions.deployments,undefined);
 assert.equal(workflow.jobs.complete.permissions.deployments,'write');
});
test('both phases use immutable verified artifacts, and completion never rebuilds or restages',()=>{
 const verify=workflow.jobs.verify;
 assert.equal(verify.steps.find(s=>s.run==='bun run test:consumer').env.APPKIT_RELEASE_CONSUMER,'true');
 assert.equal(verify.steps.find(s=>s.run==='bun run check:react-core --release').if,"steps.select.outputs.key == 'react'");
 assert.deepEqual(verify.steps.find(s=>s.id==='upload').with.path.trim().split('\n'),['.verification/publish/package.tgz','.verification/publish/release.json']);
 for(const [key,source] of [['stage','verify'],['complete','resolve']]) {
   const job=workflow.jobs[key];assert.equal(job.needs,source);
   const download=job.steps.find(s=>s.uses?.startsWith('actions/download-artifact@'));
   assert.equal(download.with['artifact-ids'], '${{ needs.'+source+'.outputs.artifact }}');
   assert.equal(download.with['digest-mismatch'],'error');
   assert.equal(job.steps.find(s=>s.uses?.startsWith('actions/checkout@')).with.ref,'${{ needs.'+source+'.outputs.sha }}');
   assert.ok(job.steps.some(s=>s.run==='node scripts/publish/require-quality.mjs'));
 }
 const complete=JSON.stringify(workflow.jobs.complete.steps);
 assert.doesNotMatch(complete,/bun run|test:storybook|stage approve|stage publish/);
 assert.equal(workflow.jobs.complete.steps.find(s=>s.uses?.startsWith('actions/download-artifact@')).with['run-id'],'${{ inputs.staged_run }}');
});
test('publisher refuses local execution and has no direct publication or automated approval command',()=>{
 const result=spawnSync(process.execPath,['scripts/publish/publish.mjs'],{encoding:'utf8',env:{...process.env,APPKIT_NPM_PUBLISH:'false'}});
 assert.equal(result.status,1);assert.match(result.stderr,/OIDC publication job is required/);
 const source=readFileSync('scripts/publish/publish.mjs','utf8');
 assert.match(source,/\['stage', 'publish', archive/);
 assert.doesNotMatch(source,/\['publish', archive|\['stage', 'approve'/);
});
