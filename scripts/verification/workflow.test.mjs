import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parse} from 'yaml';
const workflow = parse(readFileSync('.github/workflows/package-quality.yml','utf8'));
const entry = parse(readFileSync('.github/workflows/ci.yml','utf8'));
test('main and manual keep their triggers; selection precedes browser installation and shared execution', () => {
  assert.deepEqual(Object.keys(entry.on), ['push','pull_request','workflow_dispatch']);
  assert.deepEqual(Object.keys(workflow.on), ['workflow_call']);
  assert.deepEqual(entry.on.push.branches, ['main']);
  assert.equal(workflow.permissions.actions, 'read');
  const steps = workflow.jobs.verify.steps;
  const plan = steps.findIndex(step => step.id === 'selection');
  const browser = steps.findIndex(step => step.run?.includes('playwright install'));
  assert.ok(plan > 0 && plan < browser);
  assert.equal(steps[plan].run, 'node scripts/workflow-adapter.mjs plan');
  assert.match(steps[browser].if, /steps.selection.outputs.browser == 'true'/);
  assert.ok(steps.some(step => step.run?.includes('bun run verify:push --ci-plan')));
  assert.ok(steps.some(step => step.run === 'node scripts/verification/run.mjs --ci-plan --node-compat'));
});

test('the required primary source job fails closed on missing side evidence after mandatory checks', () => {
  const steps = workflow.jobs.verify.steps;
  const required = steps.findIndex(step => step.run?.includes('bun run verify:push --ci-plan'));
  const side = steps.findIndex(step => step.run === 'node scripts/paired-public.mjs');
  const upload = steps.findIndex(step => step.with?.name?.startsWith('appkit-public-side-'));
  assert.ok(side > required, 'public side must follow the mandatory source gate');
  assert.ok(upload > side, 'evidence upload must follow side verification');
  assert.equal(steps[side].if, 'matrix.node == 24');
  assert.equal(steps[side]['continue-on-error'], undefined);
  assert.equal(steps[upload].if, 'matrix.node == 24');
  assert.equal(steps[upload].with['if-no-files-found'], 'error');
  assert.deepEqual(steps[upload].with.path.trim().split('\n'), ['public-plan.json', 'public-receipt.json', 'producer.json'].map(name => '${{ runner.temp }}/appkit-public-side/' + name));
  assert.equal(steps[upload]['continue-on-error'], undefined);
});
