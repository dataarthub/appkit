import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createGenerativeUIContract } from './contract';
import { createAjvValidator } from '../validation/index';

const definition = () => ({ type: 'summary', dataSchema: { type: 'object', properties: { count: { type: 'number' } }, required: ['count'], additionalProperties: false } });
const response = (data: unknown = { count: 1 }) => ({ version: 1, id: 'answer', blocks: [{ id: 'block', type: 'summary', data }] });
describe('Generative UI schema contract', () => {
  it('exports a schema usable by independent Ajv and enforces the same data constraints', () => {
    const contract = createGenerativeUIContract([definition()]);
    const external = createAjvValidator({ ajvOptions: { coerceTypes: false } });
    assert(external(contract.schema, response()).valid);
    assert(contract.validate(response()).ok);
    for (const data of [{ count: '1' }, { count: 1, extra: true }, {}, []]) {
      assert.equal(external(contract.schema, response(data)).valid, false);
      assert.equal(contract.validate(response(data)).ok, false);
      assert.equal(contract.validateData('summary', data), false);
    }
  });
  it('snapshots schemas and accepted documents without freezing or mutating callers', () => {
    const input = definition();
    const contract = createGenerativeUIContract([input]);
    input.dataSchema.properties.count.type = 'string';
    assert(contract.validateData('summary', { count: 1 }));
    assert.equal(contract.validateData('summary', { count: '1' }), false);
    assert(Object.isFrozen(contract.schema));
    assert(Object.isFrozen(contract.components[0].dataSchema.properties));
    assert(!Object.isFrozen(input));
    const data = response(); const result = contract.validate(data); assert(result.ok);
    assert(Object.isFrozen(result.data.blocks[0].data)); assert(!Object.isFrozen(data));
  });
  it('rejects references, mixed dialects, async and malformed schemas during construction', () => {
    for (const key of ['$ref', '$id', '$schema', '$async', '$anchor', '$dynamicRef']) {
      assert.throws(() => createGenerativeUIContract([{ type: 'x', dataSchema: { type: 'object', [key]: 'invalid' } }]));
    }
    assert.throws(() => createGenerativeUIContract([{ type: 'x', dataSchema: { type: 'object', properties: { child: { $ref: '#/definitions/x' } } } }]));
    assert.throws(() => createGenerativeUIContract([{ type: 'x', dataSchema: { type: 'array' } }]));
    assert.throws(() => createGenerativeUIContract([{ type: 'x', dataSchema: { type: 'object', properties: { x: { type: 'unknown' } } } }]));
  });
  it('rejects duplicate/invalid registrations and enforces schema bounds', () => {
    assert.throws(() => createGenerativeUIContract([definition(), definition()]));
    assert.throws(() => createGenerativeUIContract([{ ...definition(), type: 'remote/code' }]));
    assert.throws(() => createGenerativeUIContract(Array.from({ length: 33 }, (_, i) => ({ ...definition(), type: `t${i}` }))));
    assert.throws(() => createGenerativeUIContract([{ type: 'large', dataSchema: { type: 'object', description: 'x'.repeat(1000001) } }]));
  });
  it('adds runtime unique-ID and finite-JSON checks beyond schema validation', () => {
    const contract = createGenerativeUIContract([definition()]);
    const doc = response(); doc.blocks.push(doc.blocks[0]);
    assert.equal(contract.validate(doc).ok, false);
    assert.equal(contract.validateData('summary', { count: Infinity }), false);
    assert.equal(contract.validateData('missing', {}), false);
    assert.equal(contract.validate(response({ count: 1, callback: () => {} })).ok, false);
  });
  it('an empty registry permits an empty document only', () => {
    const contract = createGenerativeUIContract([]);
    assert(contract.validate({ version: 1, id: 'empty', blocks: [] }).ok);
    assert.equal(contract.validate(response()).ok, false);
  });
  it('does not inject defaults or coerce values', () => {
    const contract = createGenerativeUIContract([{ type: 'x', dataSchema: { type: 'object', properties: { count: { type: 'number', default: 1 } }, required: ['count'] } }]);
    const missing = {}; const text = { count: '2' };
    assert.equal(contract.validateData('x', missing), false); assert.deepEqual(missing, {});
    assert.equal(contract.validateData('x', text), false); assert.deepEqual(text, { count: '2' });
  });
});
