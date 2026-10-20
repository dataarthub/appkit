import test from 'node:test';
import assert from 'node:assert/strict';
import {requiredDistTags, planTagUpdates} from './dist-tags.mjs';
test('all versions before 1.0.0 require beta and latest for the same version', () => {
  for (const version of ['0.0.1', '0.9.99', '0.10.0', '1.0.0-rc.1']) assert.deepEqual(requiredDistTags(version), ['beta', 'latest']);
  for (const version of ['1.0.0', '1.1.0', '2.0.0-beta.1']) assert.deepEqual(requiredDistTags(version), ['latest']);
});
test('partial success repairs only missing tags, without touching unrelated channels', () => {
  assert.deepEqual(planTagUpdates('0.2.0', {beta: '0.2.0', latest: '0.1.0', next: '1.0.0-rc.1'}), ['latest']);
  assert.deepEqual(planTagUpdates('0.2.0', {latest: '0.2.0'}), ['beta']);
  assert.deepEqual(planTagUpdates('0.2.0', {beta: '0.2.0', latest: '0.2.0'}), []);
  assert.deepEqual(planTagUpdates('1.0.0', {beta: '0.9.0', latest: '0.9.0'}), ['latest']);
});
test('neither beta nor latest may be rolled backwards, including numeric and prerelease ordering', () => {
  for (const tags of [{beta: '0.3.0', latest: '0.1.0'}, {beta: '0.1.0', latest: '1.0.0'}, {latest: '0.1.10'}]) assert.throws(() => planTagUpdates('0.1.9', tags), /backwards/);
  assert.deepEqual(planTagUpdates('0.2.0', {beta: '0.2.0-rc.10', latest: '0.1.0'}), ['beta','latest']);
  assert.deepEqual(planTagUpdates('0.2.0-rc.10', {beta: '0.2.0-rc.9'}), ['beta','latest']);
  for (const tags of [null, [], {latest: 'not-a-version'}]) assert.throws(() => planTagUpdates('0.2.0', tags));
});
