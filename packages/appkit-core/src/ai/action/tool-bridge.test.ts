import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ActionRegistry } from './registry';
import { createActionToolBridge } from './tool-bridge';
import type { ActionToolBinding, ActionToolCall } from './tool-types';

const schema = { type: 'object' as const, properties: { query: { type: 'string' as const } }, required: ['query'], additionalProperties: false };
const binding = (): Extract<ActionToolBinding, { kind: 'action' }> => ({ kind: 'action', actionId: 'table.filter', name: 'filter_table', description: 'Filter', inputSchema: schema, mapOutput: () => ({ updated: true }) });
const call = (callId = '1', args: unknown = { query: 'Tokyo' }): ActionToolCall => ({ callId, name: 'filter_table', arguments: args });
function setup(handler: (v: unknown) => unknown = (v) => v) {
  const registry = new ActionRegistry();
  const unregister = registry.registerAction({ id: 'table.filter', description: 'internal', metadata: { secret: 'private' }, validate: (data) => ({ ok: true, data }), handler });
  return { registry, unregister };
}
function deferred() {
  let resolve!: (value: unknown) => void;
  const promise = new Promise<unknown>(done => { resolve = done; });
  return { promise, resolve };
}

describe('Action tool bridge', () => {
  it('exposes only opted-in descriptors and invokes validated actions with correlated, projected results', async () => {
    let received: unknown;
    const { registry } = setup(v => { received = v; return { secret: 'private', updated: true }; });
    registry.registerAction({ id: 'delete.all', description: 'hidden', validate: data => ({ ok: true, data }), handler: () => assert.fail('not exposed') });
    const bridge = createActionToolBridge(registry, { tools: [binding()] });
    assert.deepEqual(bridge.listTools(), [{ name: 'filter_table', description: 'Filter', inputSchema: schema }]);
    assert.deepEqual(await bridge.execute(call()), { callId: '1', name: 'filter_table', ok: true, data: { updated: true } });
    assert.deepEqual(received, { query: 'Tokyo' });
    assert.equal((await bridge.execute({ ...call('2'), name: 'delete.all' })).ok, false);
    assert(!JSON.stringify(bridge.listTools()).includes('private'));
  });

  it('rejects schema failures without coercion, mutation or handler execution', async () => {
    const { registry } = setup(() => assert.fail('handler should not run'));
    const bridge = createActionToolBridge(registry, { tools: [binding()] });
    for (const [i, args] of [{ query: 1 }, {}, { query: 'a', admin: true }, null, [], '{"query":"a"}'].entries()) {
      const before = JSON.stringify(args);
      assert.equal((await bridge.execute(call(String(i), args)) as { code: string }).code, 'INVALID_INPUT');
      assert.equal(JSON.stringify(args), before);
    }
  });

  it('also applies the registered business validator and hides its messages', async () => {
    const registry = new ActionRegistry();
    registry.registerAction({ id: 'table.filter', description: 'd', validate: () => ({ ok: false, error: 'secret customer' }), handler: () => assert.fail() });
    const bridge = createActionToolBridge(registry, { tools: [binding()] });
    const result = await bridge.execute(call());
    assert.equal((result as { code: string }).code, 'INVALID_INPUT');
    assert(!JSON.stringify(result).includes('secret'));
  });

  it('reads only exposed contexts on demand and projects their values', async () => {
    const registry = new ActionRegistry();
    let calls = 0;
    let id = 'A';
    registry.registerContext({ key: 'record', getter: () => { calls++; return { id, secret: 'hidden' }; } });
    registry.registerContext({ key: 'private', getter: () => assert.fail('not exposed') });
    const bridge = createActionToolBridge(registry, { tools: [{ kind: 'context', contextKey: 'record', name: 'selection', description: 'Selection', inputSchema: { type: 'object', additionalProperties: false }, mapOutput: value => ({ id: (value as { id: string }).id }) }] });
    assert.equal(bridge.listTools().length, 1);
    assert.equal(calls, 0);
    id = 'B';
    assert.deepEqual(await bridge.execute({ callId: '1', name: 'selection', arguments: {} }), { callId: '1', name: 'selection', ok: true, data: { id: 'B' } });
    assert.equal(calls, 1);
  });

  it('rejects duplicate concurrent and completed call IDs without re-executing', async () => {
    const pending = deferred();
    let calls = 0;
    const { registry } = setup(() => { calls++; return pending.promise; });
    const bridge = createActionToolBridge(registry, { tools: [binding()] });
    const first = bridge.execute(call());
    assert.equal((await bridge.execute(call()) as { code: string }).code, 'DUPLICATE_CALL');
    pending.resolve({});
    assert.equal((await first).ok, true);
    assert.equal((await bridge.execute(call()) as { code: string }).code, 'DUPLICATE_CALL');
    assert.equal(calls, 1);
  });

  it('retains failed call IDs and enforces the session bound without evicting old IDs', async () => {
    const { registry } = setup();
    const bridge = createActionToolBridge(registry, { tools: [binding()], maxCalls: 1 });
    assert.equal((await bridge.execute(call('1', {})) as { code: string }).code, 'INVALID_INPUT');
    assert.equal((await bridge.execute(call('1')) as { code: string }).code, 'DUPLICATE_CALL');
    assert.equal((await bridge.execute(call('2')) as { code: string }).code, 'CALL_LIMIT');
  });

  it('suppresses in-flight results and future calls when closed', async () => {
    const pending = deferred();
    const { registry } = setup(() => pending.promise);
    let projected = false;
    const bridge = createActionToolBridge(registry, { tools: [{ ...binding(), mapOutput: () => { projected = true; return null; } }] });
    const first = bridge.execute(call());
    bridge.close();
    pending.resolve('sensitive');
    assert.equal((await first as { code: string }).code, 'CLOSED');
    assert.equal(projected, false);
    assert.equal((await bridge.execute(call('2')) as { code: string }).code, 'CLOSED');
    assert.deepEqual(bridge.listTools(), []);
  });

  it('discards output after an action registration is replaced', async () => {
    const pending = deferred();
    const { registry, unregister } = setup(() => pending.promise);
    const bridge = createActionToolBridge(registry, { tools: [binding()] });
    const first = bridge.execute(call());
    unregister();
    assert.deepEqual(bridge.listTools(), []);
    assert.equal((await bridge.execute(call('2')) as { code: string }).code, 'NOT_AVAILABLE');
    registry.registerAction({ id: 'table.filter', description: 'replacement', validate: data => ({ ok: true, data }), handler: () => 'new' });
    pending.resolve('old');
    assert.equal((await first as { code: string }).code, 'NOT_AVAILABLE');
    assert.equal((await bridge.execute(call('3'))).ok, true);
  });

  it('discards context output when it unregisters during retrieval', async () => {
    const pending = deferred();
    const registry = new ActionRegistry();
    const remove = registry.registerContext({ key: 'selection', getter: () => pending.promise });
    const bridge = createActionToolBridge(registry, { tools: [{ kind: 'context', contextKey: 'selection', name: 'selection', description: 'Selection', inputSchema: { type: 'object' }, mapOutput: () => assert.fail('must not project') }] });
    const first = bridge.execute({ callId: '1', name: 'selection', arguments: {} });
    remove();
    pending.resolve('private');
    assert.equal((await first as { code: string }).code, 'NOT_AVAILABLE');
  });

  it('sanitizes action/getter/projection failures and rejects non-JSON outputs', async () => {
    const { registry } = setup(() => { throw new Error('SECRET'); });
    const bridge = createActionToolBridge(registry, { tools: [binding()] });
    const result = await bridge.execute(call());
    assert.equal((result as { code: string }).code, 'EXECUTION_FAILED');
    assert(!JSON.stringify(result).includes('SECRET'));
    const good = setup();
    for (const value of [undefined, NaN, Infinity, 1n, new Date(), () => {}, { a: undefined }, new Array(1)]) {
      const invalid = createActionToolBridge(good.registry, { tools: [{ ...binding(), mapOutput: () => value }] });
      assert.equal((await invalid.execute(call()) as { code: string }).code, 'INVALID_OUTPUT');
    }
    const projection = createActionToolBridge(good.registry, { tools: [{ ...binding(), mapOutput: () => { throw new Error('SECRET'); } }] });
    assert.equal((await projection.execute(call()) as { code: string }).code, 'INVALID_OUTPUT');
  });

  it('snapshots bindings and schemas without freezing caller data; projected results are detached', async () => {
    const { registry } = setup();
    const original = { ...binding(), inputSchema: { ...schema, properties: { query: { type: 'string' as const } } } };
    const value = { nested: { count: 1 } };
    original.mapOutput = () => value;
    const bridge = createActionToolBridge(registry, { tools: [original] });
    original.name = 'changed';
    original.inputSchema.properties.query.type = 'number' as 'string';
    original.mapOutput = () => assert.fail();
    assert(!Object.isFrozen(original));
    const result = await bridge.execute(call());
    assert(result.ok);
    value.nested.count = 2;
    assert.deepEqual(result.data, { nested: { count: 1 } });
    assert(Object.isFrozen(result.data));
    assert(Object.isFrozen(bridge.listTools()[0].inputSchema.properties));
  });

  it('does not invoke accessors/toJSON; rejects cycles and preserves special JSON keys', async () => {
    const { registry } = setup();
    let invoked = false;
    const accessor = { get secret() { invoked = true; return 'bad'; } };
    const cycle: Record<string, unknown> = {}; cycle.self = cycle;
    for (const value of [accessor, cycle, { toJSON() { invoked = true; return 'bad'; } }]) {
      const bridge = createActionToolBridge(registry, { tools: [{ ...binding(), mapOutput: () => value }] });
      assert.equal((await bridge.execute(call()) as { code: string }).code, 'INVALID_OUTPUT');
    }
    assert.equal(invoked, false);
    const special = JSON.parse('{"__proto__":{"safe":true},"constructor":"x"}');
    const bridge = createActionToolBridge(registry, { tools: [{ ...binding(), mapOutput: () => special }] });
    const result = await bridge.execute(call());
    assert(result.ok);
    assert.equal(JSON.stringify(result.data), JSON.stringify(special));
    assert.equal(Object.getPrototypeOf(result.data), Object.prototype);
  });

  it('supports explicit input mapping and 2020-12 schemas', async () => {
    const { registry } = setup(value => { assert.equal(value, undefined); return null; });
    const bridge = createActionToolBridge(registry, { tools: [{ ...binding(), inputSchema: { $schema: 'https://json-schema.org/draft/2020-12/schema', type: 'object', additionalProperties: false }, mapInput: () => undefined }] });
    assert.equal((await bridge.execute(call('1', {}))).ok, true);
  });

  it('rejects malformed configuration and envelopes before execution', async () => {
    const { registry } = setup(() => assert.fail());
    assert.throws(() => createActionToolBridge(registry, { tools: [binding(), binding()] }));
    assert.throws(() => createActionToolBridge(registry, { tools: [{ ...binding(), name: 'with.dot' }] }));
    assert.throws(() => createActionToolBridge(registry, { tools: [binding()], maxCalls: 0 }));
    assert.throws(() => createActionToolBridge(registry, { tools: [{ ...binding(), inputSchema: { type: 'object', $ref: 'https://example.invalid/schema' } }] }));
    assert.throws(() => createActionToolBridge(registry, { tools: [{ ...binding(), inputSchema: { type: 'object', $async: true } } as unknown as ActionToolBinding] }));
    const bridge = createActionToolBridge(registry, { tools: [binding()] });
    assert.equal((await bridge.execute({ ...call(), callId: '' }) as { code: string }).code, 'INVALID_CALL');
    assert.equal((await bridge.execute(null as unknown as ActionToolCall) as { code: string }).code, 'INVALID_CALL');
  });
  it('accepts JSON Schema union types and rejects oversized/deep arguments before effects', async () => {
    let effects = 0;
    const { registry } = setup(() => { effects++; return null; });
    const bridge = createActionToolBridge(registry, { tools: [{ ...binding(), inputSchema: { type: 'object', properties: { query: { type: ['string', 'number'] } }, required: ['query'], additionalProperties: false } }] });
    assert.equal((await bridge.execute(call('1', { query: 42 }))).ok, true);
    assert.equal((await bridge.execute(call('2', { query: 'a'.repeat(1000001) })) as { code: string }).code, 'INVALID_INPUT');
    let deep: unknown = {};
    for (let i = 0; i < 70; i++) deep = { value: deep };
    assert.equal((await bridge.execute(call('3', deep)) as { code: string }).code, 'INVALID_INPUT');
    assert.equal(effects, 1);
  });

  it('does not execute a replacement registered by an input mapper', async () => {
    const { registry, unregister } = setup(() => assert.fail('old handler'));
    const bridge = createActionToolBridge(registry, { tools: [{ ...binding(), mapInput: () => {
      unregister();
      registry.registerAction({ id: 'table.filter', description: 'new', validate: data => ({ ok: true, data }), handler: () => assert.fail('replacement handler') });
      return {};
    } }] });
    assert.equal((await bridge.execute(call()) as { code: string }).code, 'NOT_AVAILABLE');
  });

  it('hides context errors and input mapper exceptions', async () => {
    const { registry } = setup(() => assert.fail('handler'));
    registry.registerContext({ key: 'private', getter: () => { throw new Error('SECRET'); } });
    const bridge = createActionToolBridge(registry, { tools: [
      { ...binding(), mapInput: () => { throw new Error('SECRET'); } },
      { kind: 'context', contextKey: 'private', name: 'context', description: 'Context', inputSchema: { type: 'object' }, mapOutput: value => value },
    ] });
    const inputFailure = await bridge.execute(call());
    const getterFailure = await bridge.execute({ callId: '2', name: 'context', arguments: {} });
    assert.equal((inputFailure as { code: string }).code, 'INVALID_INPUT');
    assert.equal((getterFailure as { code: string }).code, 'EXECUTION_FAILED');
    assert(!JSON.stringify([inputFailure, getterFailure]).includes('SECRET'));
  });

});
