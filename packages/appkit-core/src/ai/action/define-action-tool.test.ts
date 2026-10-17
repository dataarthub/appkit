import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ActionRegistry } from './registry';
import { createActionToolBridge } from './tool-bridge';
import { defineActionTool } from './define-action-tool';

const definition = () => ({
  id: 'count', name: 'count', description: 'Count items',
  inputSchema: { type: 'object' as const, properties: { count: { type: 'number' as const } }, required: ['count'], additionalProperties: false },
  parseInput: (input: { readonly [key: string]: unknown }) => typeof input.count === 'number' && input.count >= 0 ? { ok: true as const, data: { count: input.count } } : { ok: false as const, error: 'PRIVATE_RULE' },
  handler: (input: { count: number }) => ({ total: input.count + 1, secret: 'PRIVATE' }),
  mapOutput: (value: unknown) => { if (!value || typeof value !== 'object' || !('total' in value) || typeof value.total !== 'number') throw new Error('SECRET'); return { total: value.total }; },
});
describe('Typed action tool builder', () => {
  it('does not auto-register and shares validation between direct actions and tool execution', async () => {
    const built = defineActionTool(definition()); const registry = new ActionRegistry();
    const bridge = createActionToolBridge(registry, { tools: [built.tool] });
    assert.deepEqual(bridge.listTools(), []); registry.registerAction(built.action);
    assert.deepEqual(await registry.executeAction('count', { count: 1 }), { ok: true, data: { total: 2, secret: 'PRIVATE' } });
    const result = await bridge.execute({ callId: '1', name: 'count', arguments: { count: 1 } });
    assert.deepEqual(result, { callId: '1', name: 'count', ok: true, data: { total: 2 } });
    for (const input of [{ count: '1' }, { count: 1, extra: true }, { count: -1 }]) {
      const direct = await registry.executeAction('count', input); assert(!direct.ok); assert.equal(direct.code, 'INVALID_INPUT');
      const call = await bridge.execute({ callId: JSON.stringify(input), name: 'count', arguments: input }); assert(!call.ok); assert.equal(call.code, 'INVALID_INPUT');
    }
  });
  it('snapshots schema/config without mutating the caller and passes frozen input to the parser', () => {
    const config = definition(); let frozen = false; const original = config.parseInput;
    config.parseInput = input => { frozen = Object.isFrozen(input); return original(input); };
    const built = defineActionTool(config); config.inputSchema.properties.count.type = 'string' as 'number'; config.handler = () => ({ total: 999, secret: '' });
    assert(built.action.validate({ count: 1 }).ok); assert(frozen); assert.equal(built.action.validate({ count: '1' }).ok, false);
    assert(Object.isFrozen(built.tool.inputSchema.properties)); assert(!Object.isFrozen(config));
    assert.deepEqual(built.action.handler({ count: 2 }), { total: 3, secret: 'PRIVATE' });
  });
  it('does not invoke the typed parser for schema-invalid inputs and hides parser exceptions', () => {
    let called = 0;
    const built = defineActionTool({ ...definition(), parseInput: () => { called++; throw new Error('SECRET'); } });
    assert.equal(built.action.validate({ count: '1' }).ok, false); assert.equal(called, 0);
    const failure = built.action.validate({ count: 1 }); assert(!failure.ok); assert.equal(failure.error.includes('SECRET'), false); assert.equal(called, 1);
  });
  it('does not assume that output still has the original handler type after action replacement', async () => {
    const registry = new ActionRegistry(); const built = defineActionTool(definition());
    const bridge = createActionToolBridge(registry, { tools: [built.tool] });
    registry.registerAction({ id: 'count', description: 'replacement', validate: input => ({ ok: true, data: input }), handler: () => 'unrelated' });
    const result = await bridge.execute({ callId: '1', name: 'count', arguments: { count: 1 } }); assert(!result.ok); assert.equal(result.code, 'INVALID_OUTPUT');
  });
  it('rejects invalid definitions and schemas before registration', () => {
    assert.throws(() => defineActionTool({ ...definition(), name: 'invalid/name' }));
    assert.throws(() => defineActionTool({ ...definition(), id: '' }));
    assert.throws(() => defineActionTool({ ...definition(), inputSchema: { type: 'object', properties: { x: { type: 'invalid' as 'number' } } } }));
  });
});
