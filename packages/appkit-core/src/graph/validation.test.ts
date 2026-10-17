import { it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateCriticalPath, simulateDelayImpact } from './cpm';
const tasks = [{ id: 'a', title: 'A', status: 'TODO', durationHours: 2 }, { id: 'b', title: 'B', status: 'TODO', durationHours: 3 }];

it('rejects unsupported constraints rather than treating them as FS', () => {
  assert.throws(() => calculateCriticalPath(tasks, [{ predecessorId: 'a', successorId: 'b', dependencyType: 'SS' }]), /Unsupported/);
  assert.equal(calculateCriticalPath(tasks, [{ predecessorId: 'a', successorId: 'b', dependencyType: 'FS' }]).totalDurationHours, 5);
});
it('rejects dangling dependencies, duplicate IDs and invalid time values', () => {
  assert.throws(() => calculateCriticalPath(tasks, [{ predecessorId: 'a', successorId: 'missing' }]), /unknown task/);
  assert.throws(() => calculateCriticalPath([tasks[0], tasks[0]], []), /Duplicate/);
  assert.throws(() => calculateCriticalPath([{ ...tasks[0], durationHours: NaN }], []), /duration/);
  assert.throws(() => calculateCriticalPath(tasks, [{ predecessorId: 'a', successorId: 'b', lagHours: Infinity }]), /lag/);
  assert.throws(() => simulateDelayImpact(tasks, [], 'a', -1), /Delay/);
});
it('supports reserved object-property names as task IDs safely', () => {
  const result = calculateCriticalPath([{ ...tasks[0], id: '__proto__' }], []);
  assert.equal(result.taskSchedules.__proto__.earlyFinish, 2);
  assert(Object.hasOwn(result.taskSchedules, '__proto__'));
});
