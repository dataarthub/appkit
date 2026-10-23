import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {parse} from 'yaml';
const workflow=parse(readFileSync('.github/workflows/complete-approved.yml','utf8'));
test('observer starts only after a successful release staging run and cannot recursively follow completion',()=>{
 assert.deepEqual(workflow.on,{workflow_run:{workflows:['Publish npm packages'],types:['completed']}});
 const gate=workflow.jobs.resolve.if;
 assert.match(gate,/workflow_run.event == 'release'/);
 assert.match(gate,/workflow_run.conclusion == 'success'/);
 assert.match(gate,/head_repository.full_name == 'dataarthub\/appkit'/);
 assert.match(workflow.concurrency.group,/workflow_run.id/);
 assert.notEqual(workflow.concurrency.group,'appkit-npm-publication');
 assert.equal(workflow.concurrency['cancel-in-progress'],false);
});
test('observer has no npm credential or OIDC and runs main code with exact original artifact identity',()=>{
 assert.equal(workflow.jobs.resolve.permissions.actions,'read');
 assert.equal(workflow.jobs.observe.permissions.actions,'write');
 assert.equal(workflow.jobs.observe['timeout-minutes'],35);
 for(const job of Object.values(workflow.jobs)){
  assert.equal(job.permissions['id-token'],undefined);
  assert.equal(job.permissions.deployments,undefined);
  const checkout=job.steps.find(s=>s.uses?.startsWith('actions/checkout@'));
  assert.equal(checkout.with.ref,'main');assert.equal(checkout.with['persist-credentials'],false);
  assert.doesNotMatch(JSON.stringify(job),/npm (?:publish|stage|dist-tag)|NODE_AUTH_TOKEN|NPM_TOKEN|bun install/);
 }
 const download=workflow.jobs.observe.steps.find(s=>s.uses?.startsWith('actions/download-artifact@'));
 assert.equal(download.with['artifact-ids'],'${{ needs.resolve.outputs.artifact }}');
 assert.equal(download.with['run-id'],'${{ needs.resolve.outputs.run }}');
 assert.equal(download.with['digest-mismatch'],'error');
});
test('approval observer refuses local execution before inspecting any artifact or credential',()=>{
 const result=spawnSync(process.execPath,['scripts/publish/await-approval.mjs'],{encoding:'utf8',env:{...process.env,GITHUB_ACTIONS:'false'}});
 assert.equal(result.status,1);assert.match(result.stderr,/trusted main workflow/);
});
