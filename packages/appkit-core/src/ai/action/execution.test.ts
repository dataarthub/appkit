import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createExecutionSession, type ExecutionContext } from './execution';
import { ActionRegistry } from './registry';
import { defineActionTool } from './define-action-tool';
import { createActionToolBridge } from './tool-bridge';
const deferred = () => { let resolve!: () => void; const promise = new Promise<void>(yes => { resolve = yes; }); return { promise, resolve }; };
describe('Execution sessions', () => {
  it('publishes immutable progress and bounded history without retaining input, output or errors', async () => {
    const session = createExecutionSession({ historyLimit: 2 }); let notifications = 0;
    session.subscribe(() => { notifications++; }); session.subscribe(() => { throw new Error('observer'); });
    let saved!: ExecutionContext;
    const outcome = await session.run('first', context => { saved = context; context.reportProgress({ completed: 1, total: 2 }); context.reportProgress({ completed: NaN }); return 'SECRET'; });
    assert.deepEqual(outcome, { status: 'succeeded', value: 'SECRET' });
    const snapshot = session.getSnapshot(); assert.equal(snapshot[0].progress?.completed, 1); assert(Object.isFrozen(snapshot[0].progress));
    saved.reportProgress({ completed: 2 }); assert.equal(session.getSnapshot(), snapshot);
    await session.run('second', () => { throw new Error('PRIVATE'); }); await session.run('third', () => 3);
    assert.equal(session.getSnapshot().length, 2); assert(notifications >= 4); assert(!JSON.stringify(session.getSnapshot()).includes('PRIVATE'));
    assert(!JSON.stringify(snapshot).includes('SECRET')); assert(Object.isFrozen(snapshot)); session.clearHistory(); assert.deepEqual(session.getSnapshot(), []);
  });
  it('keeps the lock while an abort-ignoring handler runs and records its actual success', async () => {
    const session = createExecutionSession(); const wait = deferred();
    const first = session.run('work', async () => { await wait.promise; return 'saved'; });
    session.cancel(); assert.equal(session.getSnapshot()[0].status, 'cancelling');
    await assert.rejects(session.run('duplicate', () => undefined), /already running/);
    session.clearHistory(); assert.equal(session.getSnapshot().length, 1);
    wait.resolve(); assert.equal((await first).status, 'succeeded'); assert.equal(session.getSnapshot()[0].cancelRequested, true);
  });
  it('records cooperative abort, distinguishes unrelated failure and stops closed sessions', async () => {
    const session = createExecutionSession(); const wait = deferred();
    const running = session.run('work', async ({ signal }) => { await wait.promise; signal.throwIfAborted(); });
    session.cancel(); wait.resolve(); assert.equal((await running).status, 'cancelled');
    const failing = session.run('fail', async () => { session.cancel(); throw new Error('network'); }); assert.equal((await failing).status, 'failed');
    session.close(); await assert.rejects(session.run('closed', () => undefined), /closed/);
  });
  it('forwards cancellation and progress through typed action tools', async () => {
    const registry = new ActionRegistry(); const wait = deferred();
    const defined = defineActionTool<void, string>({ id: 'job', name: 'job', description: 'Job', inputSchema: { type: 'object' }, parseInput: () => ({ ok: true, data: undefined }), handler: async (_input, context) => { context?.reportProgress({ completed: 1, total: 2 }); await wait.promise; context?.signal.throwIfAborted(); return 'done'; }, mapOutput: value => value });
    registry.registerAction(defined.action); const bridge = createActionToolBridge(registry, { tools: [defined.tool] }); const session = createExecutionSession();
    const running = session.run('tool', async context => { const result = await bridge.execute({ callId: '1', name: 'job', arguments: {} }, context); assert(!result.ok); assert.equal(result.code, 'CANCELLED'); context.signal.throwIfAborted(); });
    assert.equal(session.getSnapshot()[0].progress?.completed, 1); session.cancel(); wait.resolve(); assert.equal((await running).status, 'cancelled');
    const controller = new AbortController(); controller.abort(); let calls = 0;
    registry.registerAction({ id: 'blocked', description: '', validate: value => ({ ok: true, data: value }), handler: () => { calls++; } });
    const blocked = await registry.executeAction('blocked', {}, { signal: controller.signal, reportProgress() {} }); assert(!blocked.ok); assert.equal(blocked.code, 'CANCELLED'); assert.equal(calls, 0);
  });
  it('validates history limits and ignores malformed progress', async () => {
    assert.throws(() => createExecutionSession({ historyLimit: 0 }));
    const session = createExecutionSession(); await session.run('job', ({ reportProgress }) => { reportProgress({ completed: 3, total: 2 }); reportProgress({ completed: -1 }); });
    assert.equal(session.getSnapshot()[0].progress, undefined);
  });
});
