import test from 'node:test';
import assert from 'node:assert/strict';
import {checkPolicy, matrixVerdict} from './policy.mjs';
const core = {version: '0.2.0'};
const react = {version: '0.1.1', dependencies: {'@alneas/appkit-core': '0.1.0'}};
const policy = {schemaVersion: 1, requirements: []};
test('independent versions are allowed when no fix requires a newer Core', () => {
  assert.equal(checkPolicy({core, react, policy}).requiredCore, '0.1.0');
});
test('a required fix blocks an old dependency and passes only after dependency update', () => {
  const required = {schemaVersion: 1, requirements: [{id: 'approval-fix', coreVersion: '0.1.1', reason: 'React users must receive the approval fix.'}]};
  assert.throws(() => checkPolicy({core, react, policy: required}), /approval-fix.*0\.1\.1/);
  assert.doesNotThrow(() => checkPolicy({core, react: {...react, dependencies: {'@alneas/appkit-core': '0.1.1'}}, policy: required}));
});
test('numeric version ordering and prereleases cannot bypass requirements', () => {
  const required = {schemaVersion: 1, requirements: [{id: 'fix', coreVersion: '0.1.10', reason: 'Required fix'}]};
  for (const version of ['0.1.9', '0.1.10-rc.1']) assert.throws(() => checkPolicy({core, react: {...react, dependencies: {'@alneas/appkit-core': version}}, policy: required}), /fix/);
  assert.doesNotThrow(() => checkPolicy({core, react: {...react, dependencies: {'@alneas/appkit-core': '0.1.11'}}, policy: required}));
});
test('invalid policy, nonexact dependencies and unpublished future requirements fail closed', () => {
  for (const version of ['^0.1.0', 'workspace:*', 'file:core.tgz', '01.1.0', '0.1.0-01']) assert.throws(() => checkPolicy({core, react: {...react, dependencies: {'@alneas/appkit-core': version}}, policy}));
  for (const bad of [{}, {...policy, schemaVersion: 2}, {...policy, requirements: [{id: 'a', coreVersion: '0.3.0', reason: 'future'}]}, {...policy, requirements: [{id: 'a', coreVersion: '0.1.0', reason: ''}]}]) assert.throws(() => checkPolicy({core, react, policy: bad}));
});
test('all four matrix outcomes require both lanes to pass and explain the difference', () => {
  assert.equal(matrixVerdict({current: true, candidate: true}).passed, true);
  assert.match(matrixVerdict({current: false, candidate: true}).reason, /dependency/);
  assert.match(matrixVerdict({current: true, candidate: false}).reason, /candidate/);
  assert.equal(matrixVerdict({current: false, candidate: false}).passed, false);
  assert.equal(matrixVerdict({current: null, candidate: true}).passed, false);
});
test('Core preparation records a pending adoption without requiring an unpublished dependency', () => {
  const staged = {schemaVersion: 1, requirements: [{id: 'approval-fix', coreVersion: '0.1.1', reactVersion: '0.1.2', reason: 'Adopt after publishing Core.'}]};
  const result = checkPolicy({core, react, policy: staged});
  assert.deepEqual(result.pendingRequirements, ['approval-fix']);
  assert.equal(result.requiredCore, '0.1.0');
});
test('the React adoption deadline and every React release enforce the required Core', () => {
  const staged = {schemaVersion: 1, requirements: [{id: 'approval-fix', coreVersion: '0.1.1', reactVersion: '0.1.2', reason: 'Adopt after publishing Core.'}]};
  assert.throws(() => checkPolicy({core, react: {...react, version: '0.1.2'}, policy: staged}), /approval-fix.*React dependency/);
  assert.throws(() => checkPolicy({core, react, policy: staged, release: true}), /approval-fix.*React dependency/);
  const adopted = {...react, version: '0.1.2', dependencies: {'@alneas/appkit-core': '0.1.1'}};
  assert.deepEqual(checkPolicy({core, react: adopted, policy: staged, release: true}).pendingRequirements, []);
});
test('staging never relaxes version validation or already active requirements', () => {
  const entry = {id: 'approval-fix', coreVersion: '0.1.1', reactVersion: '0.1.2', reason: 'Adopt after publishing Core.'};
  for (const reactVersion of ['^0.1.2', 'invalid', '0.1.2-01', null]) {
    assert.throws(() => checkPolicy({core, react, policy: {schemaVersion: 1, requirements: [{...entry, reactVersion}]}}));
  }
  assert.throws(() => checkPolicy({core: {version: '0.1.0'}, react, policy: {schemaVersion: 1, requirements: [entry]}}), /Core version/);
  assert.throws(() => checkPolicy({core, react: {...react, version: '0.1.2-rc.1'}, policy: {schemaVersion: 1, requirements: [{...entry, reactVersion: '0.1.1'}]}}), /React dependency/);
});
