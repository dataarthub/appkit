import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {parse} from 'yaml';
const workflow=parse(readFileSync('.github/workflows/publish.yml','utf8'));
test('only stable releases stage; main-only manual completion requires the original run ID',()=>{
 assert.deepEqual(Object.keys(workflow.on),['release','workflow_dispatch']);
 assert.deepEqual(workflow.on.release,{types:['published']});
 assert.equal(workflow.on.workflow_dispatch.inputs.staged_run.required,false);
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
 assert.deepEqual(verify.steps.find(s=>s.id==='upload').with.path.trim().split('\n'),['source/.verification/publish/package.tgz','source/.verification/publish/release.json']);
 for(const [key,source] of [['stage','verify'],['complete','resolve']]) {
   const job=workflow.jobs[key];assert.equal(job.needs,source);
   const download=job.steps.find(s=>s.uses?.startsWith('actions/download-artifact@'));
   assert.equal(download.with['artifact-ids'], '${{ needs.'+source+'.outputs.artifact }}');
   assert.equal(download.with['digest-mismatch'],'error');
   assert.equal(job.steps.find(s=>s.uses?.startsWith('actions/checkout@')&&s.with.path==='source').with.ref,'${{ needs.'+source+'.outputs.sha }}');
   assert.ok(job.steps.some(s=>s.run==='node ../control/scripts/publish/require-quality.mjs'));
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
 assert.doesNotMatch(source,/\[\s*['"]publish['"]\s*,|\[\s*['"]stage['"]\s*,\s*['"]approve['"]/);
 for(const job of Object.values(workflow.jobs))for(const step of job.steps??[]){
  assert.doesNotMatch(step.run??'',/\bnpm\s+(?:publish|stage\s+approve)\b/);
 }
});

test('recovery uses maintained control, immutable original source and fresh checks on both runtimes',()=>{
 const v=workflow.jobs.verify;
 assert.match(v.if,/refs\/heads\/main.*inputs.recover_release != ''/);
 assert.match(v.if,/inputs.staged_run == ''/);
 assert.deepEqual(workflow.on.workflow_dispatch.inputs.recover_release.options,['','core-0.2.1']);
 const fresh=v.steps.filter(s=>s.run==='node ../control/scripts/publish/source-proof.mjs fresh');
 assert.equal(fresh.length,2);
 assert.deepEqual(v.steps.filter(s=>s.uses?.startsWith('actions/setup-node@')).map(s=>s.with['node-version']),[24,26,24]);
 for(const key of ['verify','stage','complete']){
  const j=workflow.jobs[key],checkouts=j.steps.filter(s=>s.uses?.startsWith('actions/checkout@'));
  assert.equal(checkouts[0].with.path,'control');assert.equal(checkouts[0].with.ref,'${{ github.sha }}');
  assert.equal(checkouts[1].with.path,'source');assert.equal(j.defaults.run['working-directory'],'source');
 }
 for(const key of ['stage','complete'])assert(workflow.jobs[key].steps.some(s=>s.run==='node ../control/scripts/publish/source-proof.mjs writer'));
});

test('every maintained publication helper receives its scoped GitHub token',()=>{
 for(const [phase,job] of Object.entries(workflow.jobs)){
  for(const step of job.steps.filter(s=>s.run?.includes('scripts/publish/'))){
   const effective={...job.env,...step.env};
   assert.equal(effective.GITHUB_TOKEN,'${{ github.token }}',`Missing GitHub token: ${phase}/${step.name}`);
  }
  assert.equal(job.permissions.contents,'read');assert.equal(job.permissions.actions,'read');
 }
 assert.equal(workflow.jobs.verify.permissions['id-token'],undefined);
});
