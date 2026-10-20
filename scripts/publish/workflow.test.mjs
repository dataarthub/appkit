import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {parse} from 'yaml';
const workflow = parse(readFileSync('.github/workflows/publish.yml', 'utf8'));
test('only stable published package releases enter verification, never pushes or manual dispatch', () => {
  assert.deepEqual(workflow.on, {release: {types: ['published']}});
  assert.match(workflow.jobs.verify.if, /prerelease == false/);
  assert.match(workflow.jobs.verify.if, /draft == false/);
  assert.match(workflow.jobs.verify.if, /appkit-core-v/);
  assert.match(workflow.jobs.verify.if, /appkit-react-v/);
  assert.equal(workflow.concurrency['cancel-in-progress'], false);
});
test('only the publisher has OIDC and the selected package deployment environment', () => {
  assert.deepEqual(workflow.permissions, {contents: 'read'});
  assert.equal(workflow.jobs.verify.permissions?.['id-token'], undefined);
  const publisher = workflow.jobs.publish;
  assert.equal(publisher.needs, 'verify');
  assert.equal(publisher.permissions['id-token'], 'write');
  assert.equal(publisher.environment.name, '${{ needs.verify.outputs.environment }}');
  assert.equal(publisher.environment.url, '${{ needs.verify.outputs.url }}');
  assert.equal(publisher.steps.some(s => /bun install|npm ci/.test(s.run ?? '')), false);
  assert.equal(publisher.steps.find(s => s.uses?.startsWith('actions/checkout@')).with.ref, '${{ needs.verify.outputs.sha }}');
  // setup-node's registry-url injects a placeholder NODE_AUTH_TOKEN, conflicting
  // with the publisher's deliberate refusal to fall back to a write token.
  assert.equal(publisher.steps.find(s => s.uses?.startsWith('actions/setup-node@')).with['registry-url'], undefined);
});
test('artifact handoff uploads only tested public bytes and binds the publisher to immutable ID/digest', () => {
  const steps = workflow.jobs.verify.steps;
  const packed = steps.find(s => s.run === 'bun run test:consumer');
  assert.equal(packed.env.APPKIT_RELEASE_CONSUMER, 'true');
  const react = steps.find(s => s.run === 'bun run check:react-core');
  assert.equal(react.if, "steps.select.outputs.key == 'react'");
  const upload = steps.find(s => s.id === 'upload');
  assert.deepEqual(upload.with.path.trim().split('\n'), ['.verification/publish/package.tgz', '.verification/publish/release.json']);
  const download = workflow.jobs.publish.steps.find(s => s.uses?.startsWith('actions/download-artifact@'));
  assert.equal(download.with['artifact-ids'], '${{ needs.verify.outputs.artifact }}');
  assert.equal(download.with['digest-mismatch'], 'error');
  assert.equal(workflow.jobs.publish.steps.at(-1).env.VERIFIED_INTEGRITY, '${{ needs.verify.outputs.integrity }}');
});
test('the real publisher entry point refuses local execution before any registry or npm operation', () => {
  const result = spawnSync(process.execPath, ['scripts/publish/publish.mjs'], {encoding: 'utf8', env: {...process.env, APPKIT_NPM_PUBLISH: 'false'}});
  assert.equal(result.status, 1);
  assert.match(result.stderr, /OIDC publication job is required/);
});
