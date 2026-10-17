import { test, expect } from 'bun:test';
import { InMemoryTaskGraphAdapter } from './in-memory-adapter';
import type { TaskNode } from './types';
const tasks: TaskNode[] = [{ id: 'a', title: 'A', status: 'TODO', durationHours: 2 }, { id: 'b', title: 'B', status: 'TODO', durationHours: 3 }];
const edges = [{ predecessorId: 'a', successorId: 'b', lagHours: 1 }];
test('adapter implements the complete calculation interface and replaces in-memory data', async () => {
  const adapter = new InMemoryTaskGraphAdapter({ tasks, edges });
  expect((await adapter.getCriticalPath()).totalDurationHours).toBe(6);
  expect((await adapter.simulateDelay('a', 2)).projectDelayHours).toBe(2);
  expect((await adapter.getTopBlockers())[0]?.taskId).toBe('a');
  expect((await adapter.validateAcyclic()).isValid).toBe(true);
  adapter.setData(tasks, [...edges, { predecessorId: 'b', successorId: 'a', lagHours: 0 }]);
  expect((await adapter.validateAcyclic()).isValid).toBe(false);
  await expect(adapter.getCriticalPath()).rejects.toThrow('cyclic');
});
test('async loaders refresh analysis and propagate failures', async () => {
  let duration = 2;
  const adapter = new InMemoryTaskGraphAdapter({ loadData: async () => ({ tasks: [{ ...tasks[0]!, durationHours: duration }], edges: [] }) });
  expect((await adapter.getCriticalPath()).totalDurationHours).toBe(2);
  duration = 4;
  expect((await adapter.getCriticalPath()).totalDurationHours).toBe(4);
  const failure = new InMemoryTaskGraphAdapter({ loadData: async () => { throw new Error('loader failure'); } });
  await expect(failure.loadGraph()).rejects.toThrow('loader failure');
});
test('known-answer lag and branch ties preserve inputs and represent all zero-slack tasks', async () => {
  const before = JSON.stringify({ tasks, edges });
  const adapter = new InMemoryTaskGraphAdapter({ tasks, edges });
  const result = await adapter.getCriticalPath();
  expect(result.taskSchedules.b?.earlyStart).toBe(3);
  expect(result.criticalPathTaskIds).toEqual(['a', 'b']);
  expect(JSON.stringify({ tasks, edges })).toBe(before);
  expect((await new InMemoryTaskGraphAdapter().getCriticalPath()).totalDurationHours).toBe(0);
  const tied = await new InMemoryTaskGraphAdapter({
    tasks: [{ ...tasks[0]!, durationHours: 2 }, { ...tasks[1]!, durationHours: 2 }, { id: 'c', title: 'C', status: 'TODO', durationHours: 1 }],
    edges: [{ predecessorId: 'a', successorId: 'c' }, { predecessorId: 'b', successorId: 'c' }],
  }).getCriticalPath();
  expect(tied.totalDurationHours).toBe(3);
  expect(new Set(tied.criticalPathTaskIds)).toEqual(new Set(['a', 'b', 'c']));
});
