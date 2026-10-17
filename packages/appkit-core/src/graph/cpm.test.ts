import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCriticalPath,
  analyzeBlockers,
  simulateDelayImpact,
  detectCycles,
  topologicalSort,
} from './cpm';
import type { TaskNode, TaskEdge } from './types';

describe('CPM & DAG Graph Utilities', () => {
  const sampleTasks: TaskNode[] = [
    { id: 'A', title: 'Task A (Design)', durationHours: 2, status: 'DONE' },
    { id: 'B', title: 'Task B (Backend)', durationHours: 4, status: 'IN_PROGRESS' },
    { id: 'C', title: 'Task C (Frontend)', durationHours: 3, status: 'TODO' },
    { id: 'D', title: 'Task D (Integration)', durationHours: 2, status: 'TODO' },
    { id: 'E', title: 'Task E (Documentation)', durationHours: 1, status: 'TODO' },
  ];

  // A -> B -> D
  // A -> C -> D
  // A -> E
  const sampleEdges: TaskEdge[] = [
    { predecessorId: 'A', successorId: 'B' },
    { predecessorId: 'A', successorId: 'C' },
    { predecessorId: 'B', successorId: 'D' },
    { predecessorId: 'C', successorId: 'D' },
    { predecessorId: 'A', successorId: 'E' },
  ];

  it('detects cycles correctly', () => {
    // 循環なし
    const noCycles = detectCycles(sampleTasks, sampleEdges);
    assert.equal(noCycles.length, 0);

    // 循環あり (D -> A)
    const cyclicEdges: TaskEdge[] = [
      ...sampleEdges,
      { predecessorId: 'D', successorId: 'A' },
    ];
    const cycles = detectCycles(sampleTasks, cyclicEdges);
    assert.ok(cycles.length > 0);
  });

  it('topologicalSort sorts nodes in dependency order', () => {
    const order = topologicalSort(sampleTasks, sampleEdges);
    assert.ok(order.indexOf('A') < order.indexOf('B'));
    assert.ok(order.indexOf('A') < order.indexOf('C'));
    assert.ok(order.indexOf('B') < order.indexOf('D'));
    assert.ok(order.indexOf('C') < order.indexOf('D'));
    assert.ok(order.indexOf('A') < order.indexOf('E'));
  });

  it('calculates critical path correctly', () => {
    // Path 1: A (2) -> B (4) -> D (2) = 8 hours (Critical!)
    // Path 2: A (2) -> C (3) -> D (2) = 7 hours (Slack = 1)
    // Path 3: A (2) -> E (1) = 3 hours (Slack = 5)
    const result = calculateCriticalPath(sampleTasks, sampleEdges);

    assert.equal(result.totalDurationHours, 8);
    assert.deepEqual(result.criticalPathTaskIds, ['A', 'B', 'D']);

    assert.equal(result.taskSchedules.B.isCritical, true);
    assert.equal(result.taskSchedules.C.isCritical, false);
    assert.equal(result.taskSchedules.C.slack, 1);
    assert.equal(result.taskSchedules.E.slack, 5);
  });

  it('analyzes blockers and ranks by unblock priority', () => {
    const blockers = analyzeBlockers(sampleTasks, sampleEdges);

    // A は B, C, D, E すべてをブロックしている
    const blockerA = blockers.find((b) => b.taskId === 'A')!;
    assert.equal(blockerA.blockedCount, 4);

    // B は D をブロックしている
    const blockerB = blockers.find((b) => b.taskId === 'B')!;
    assert.equal(blockerB.blockedCount, 1);
    assert.equal(blockerB.isCritical, true);

    // A は最多ブロッカーかつクリティカルなので先頭
    assert.equal(blockers[0].taskId, 'A');
  });

  it('simulates delay impact (What-If analysis)', () => {
    // B を 2時間遅延させると、クリティカルパス上なのでプロジェクト全体が 2時間遅れる
    const delayB = simulateDelayImpact(sampleTasks, sampleEdges, 'B', 2);
    assert.equal(delayB.projectDelayHours, 2);
    assert.ok(delayB.affectedTaskIds.includes('D'));

    // C（非クリティカル、slack 1時間）を 0.5時間遅延させても、プロジェクト全体は遅れない
    const delayC = simulateDelayImpact(sampleTasks, sampleEdges, 'C', 0.5);
    assert.equal(delayC.projectDelayHours, 0);

    // C を 3時間遅延させると、slack(1)を超えてプロジェクト全体が 2時間遅れ、C がクリティカルパスになる
    const delayCBig = simulateDelayImpact(sampleTasks, sampleEdges, 'C', 3);
    assert.equal(delayCBig.projectDelayHours, 2);
    assert.ok(delayCBig.newCriticalPathTaskIds.includes('C'));
  });
});

it('caps late finish at project completion with a negative lead', () => {
  const tasks: TaskNode[] = [{id:'A',title:'A',durationHours:10,status:'TODO'}, {id:'B',title:'B',durationHours:1,status:'TODO'}];
  const edges: TaskEdge[] = [{predecessorId:'A',successorId:'B',lagHours:-9}];
  const result = calculateCriticalPath(tasks, edges);
  assert.equal(result.totalDurationHours, 10);
  assert.equal(result.taskSchedules.A.slack, 0);
  assert.equal(result.taskSchedules.B.slack, 8);
  assert.equal(simulateDelayImpact(tasks, edges, 'A', 2).projectDelayHours, 2);
  assert.equal(simulateDelayImpact(tasks, edges, 'B', 2).projectDelayHours, 0);
});
it('reports all critical nodes when critical paths tie', () => {
  const tasks: TaskNode[] = ['A','B'].map(id => ({id,title:id,durationHours:3,status:'TODO'}));
  const result = calculateCriticalPath(tasks, []);
  assert.deepEqual(new Set(result.criticalPathTaskIds), new Set(['A','B']));
});
