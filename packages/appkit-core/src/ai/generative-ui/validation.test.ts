import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateGenerativeUIDocument } from './validation';

const response = () => ({ version: 1, id: 'answer-1', blocks: [{ id: 'table-1', type: 'sales-table', data: { rows: [{ name: 'Tokyo', amount: 100 }] } }] });

describe('Generative UI document validation', () => {
  it('snapshots and deeply freezes valid documents without changing caller input', () => {
    const input = response();
    const result = validateGenerativeUIDocument(input);
    assert(result.ok);
    assert.deepEqual(result.data, input);
    assert(Object.isFrozen(result.data.blocks[0].data.rows));
    assert(!Object.isFrozen(input));
    input.blocks[0].data.rows[0].amount = 999;
    assert.equal(JSON.stringify(result.data).includes('999'), false);
  });
  it('allows empty responses and leaves component availability to the UI registry', () => {
    assert(validateGenerativeUIDocument({ version: 1, id: 'empty', blocks: [] }).ok);
    assert(validateGenerativeUIDocument({ version: 1, id: 'x', blocks: [{ id: 'x', type: 'constructor', data: {} }] }).ok);
  });
  it('rejects incomplete, extra or unsupported envelope fields', () => {
    for (const value of [null, [], '{}', {}, { ...response(), version: 2 }, { ...response(), id: '' }, { ...response(), execute: 'save' }, { ...response(), blocks: {} }]) assert.equal(validateGenerativeUIDocument(value).ok, false);
  });
  it('rejects duplicate IDs, invalid component names and non-object data', () => {
    const valid = response().blocks[0];
    for (const blocks of [[valid, valid], [{ ...valid, type: 'https://host/code.js' }], [{ ...valid, data: null }], [{ ...valid, data: [] }], [{ ...valid, onClick: 'save' }], [{ ...valid, id: 'a'.repeat(129) }]]) assert.equal(validateGenerativeUIDocument({ ...response(), blocks }).ok, false);
  });
  it('enforces block, size, depth and node limits', () => {
    assert.equal(validateGenerativeUIDocument({ ...response(), blocks: Array.from({ length: 33 }, (_, i) => ({ ...response().blocks[0], id: String(i) })) }).ok, false);
    let deep: unknown = {};
    for (let i = 0; i < 70; i++) deep = { nested: deep };
    for (const data of [{ text: 'x'.repeat(1000001) }, deep, { items: Array.from({ length: 10001 }, () => 1) }]) assert.equal(validateGenerativeUIDocument({ ...response(), blocks: [{ ...response().blocks[0], data }] }).ok, false);
  });
  it('rejects executable and lossy values without invoking accessors or toJSON', () => {
    let invoked = false;
    const cyclic: Record<string, unknown> = {}; cyclic.self = cyclic;
    for (const data of [{ bad: undefined }, { bad: NaN }, { bad: Infinity }, { bad: 1n }, { bad: new Date() }, { bad: () => {} }, cyclic, { get value() { invoked = true; return 1; } }, { toJSON() { invoked = true; return {}; } }, { items: new Array(2) }]) assert.equal(validateGenerativeUIDocument({ ...response(), blocks: [{ ...response().blocks[0], data }] }).ok, false);
    assert.equal(invoked, false);
  });
  it('preserves JSON text and special data keys as data, without prototype changes', () => {
    const data = JSON.parse('{"__proto__":{"polluted":true},"text":"<script>alert(1)</script>"}');
    const result = validateGenerativeUIDocument({ ...response(), blocks: [{ ...response().blocks[0], data }] });
    assert(result.ok);
    assert.equal(Object.getPrototypeOf(result.data.blocks[0].data), Object.prototype);
    assert.equal(JSON.stringify(result.data.blocks[0].data), JSON.stringify(data));
  });
});
