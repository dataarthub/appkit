// Public-only CI integration. Producer fields are declarations, never independent attestations.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, isAbsolute, join, relative, resolve, sep} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {verifySide} from './check-paired.mjs';

export function producerIdentity(env) {
  assert.equal(env.GITHUB_ACTIONS, 'true', 'Authenticated CI context required');
  assert.equal(env.GITHUB_REPOSITORY, 'dataarthub/appkit', 'Expected public repository required');
  for (const key of ['GITHUB_SHA', 'GITHUB_WORKFLOW_SHA']) assert.match(env[key] ?? '', /^[a-f0-9]{40}$/, 'Full source/workflow SHA required');
  for (const key of ['GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT']) assert.match(env[key] ?? '', /^[1-9][0-9]*$/, 'Run and attempt required');
  assert.match(env.GITHUB_WORKFLOW_REF ?? '', /^dataarthub\/appkit\/\.github\/workflows\/ci\.yml@refs\//, 'Maintained source workflow required');
  assert.ok(['push', 'pull_request', 'merge_group', 'workflow_dispatch'].includes(env.GITHUB_EVENT_NAME), 'Source event required');
  assert.match(env.GITHUB_REF ?? '', /^refs\//, 'Source ref required');
  let headShaFromEvent = env.GITHUB_EVENT_NAME === 'pull_request' ? JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, 'utf8')).pull_request?.head?.sha : env.GITHUB_SHA;
  if (env.GITHUB_EVENT_NAME === 'merge_group') {
    headShaFromEvent = JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, 'utf8')).merge_group?.head_sha;
    assert.equal(headShaFromEvent, env.GITHUB_SHA, 'Merge queue head must match tested source');
  }
  assert.match(headShaFromEvent ?? '', /^[a-f0-9]{40}$/, 'Full event head SHA required');
  return {schemaVersion: 1, headShaFromEvent, repository: env.GITHUB_REPOSITORY, sourceSha: env.GITHUB_SHA, workflowRef: env.GITHUB_WORKFLOW_REF, workflowSha: env.GITHUB_WORKFLOW_SHA, runId: env.GITHUB_RUN_ID, runAttempt: env.GITHUB_RUN_ATTEMPT, eventName: env.GITHUB_EVENT_NAME, ref: env.GITHUB_REF};
}
export function publicPlan(env) {
  const producer = producerIdentity(env);
  return {
    schemaVersion: 1, taskId: 'appkit-release-compatibility-v1', side: 'public', revision: producer.sourceSha,
    impact: {decision: 'changed', rationale: 'Public source and maintained verification contracts require independent source-gate and bounded side checks.', reviewedBy: `${producer.workflowRef};run=${producer.runId};attempt=${producer.runAttempt};requires-authenticated-review`},
    checks: [
      {name: 'public-workflow-conformance', command: ['node', 'scripts/workflow-supply/public/conformance.mjs', 'check', '--project-root', '.'], timeoutMs: 60000},
      {name: 'public-source-side-contract', command: ['node', '--test', 'scripts/verification/workflow.test.mjs', 'scripts/verification/paired-public.test.mjs'], timeoutMs: 60000},
    ],
  };
}
export function runPublicSide({root, outputDir, env = process.env}) {
  root = realpathSync(resolve(root));
  mkdirSync(outputDir, {recursive: true}); outputDir = realpathSync(resolve(outputDir));
  const location = relative(root, outputDir);
  assert.ok(location.startsWith('..' + sep) || isAbsolute(location), 'Evidence directory must be outside checkout');
  // Even identity or plan failures invalidate previous producer/receipt evidence.
  for (const name of ['public-plan.json', 'public-receipt.json', 'producer.json']) rmSync(join(outputDir, name), {force: true});
  const producer = producerIdentity(env), plan = publicPlan(env);
  const planPath = join(outputDir, 'public-plan.json'), receiptPath = join(outputDir, 'public-receipt.json');
  writeFileSync(planPath, JSON.stringify(plan, null, 2) + '\n');
  const receipt = verifySide({root, plan: planPath, output: receiptPath});
  const digest = path => createHash('sha256').update(readFileSync(path)).digest('hex');
  writeFileSync(join(outputDir, 'producer.json'), JSON.stringify({...producer, planSha256: digest(planPath), receiptSha256: digest(receiptPath)}, null, 2) + '\n');
  return receipt;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    assert.ok(process.env.RUNNER_TEMP, 'Runner task directory required');
    runPublicSide({root: resolve(dirname(fileURLToPath(import.meta.url)), '..'), outputDir: join(process.env.RUNNER_TEMP, 'appkit-public-side')});
    console.log('Public side verification passed; public-only evidence written outside checkout.');
  } catch {
    console.error('Public side verification failed; inspect the selected source and CI inputs.');
    process.exitCode = 1;
  }
}
