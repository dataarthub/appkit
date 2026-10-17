import { describe, expect, test } from 'bun:test';
import { castValuesBySchema } from './cast';
import type { JSONSchemaProperty } from './types';

describe('schema casting is distinct from validation', () => {
  test('preserves existing numeric/empty/null form semantics', () => {
    expect(castValuesBySchema('  ', { type: ['integer', 'null'] })).toBeNull();
    expect(castValuesBySchema('', { type: 'number' })).toBeUndefined();
    expect(castValuesBySchema(null, { type: 'integer' })).toBeNull();
    expect(castValuesBySchema('12suffix', { type: 'integer' })).toBe(12);
    expect(castValuesBySchema('1.9', { type: 'integer' })).toBe(1);
    expect(castValuesBySchema('1e3', { type: 'integer' })).toBe(1);
    expect(castValuesBySchema('1e3', { type: 'number' })).toBe(1000);
    expect(castValuesBySchema('Infinity', { type: 'number' })).toBe(Infinity);
    expect(castValuesBySchema('oops', { type: 'number' })).toBe('oops');
    expect(castValuesBySchema('false', { type: 'boolean' })).toBe('false');
    expect(castValuesBySchema('12', { type: 'integer', maximum: 2 })).toBe(12);
  });
  test('strict mode retains malformed, fractional-integer and non-finite inputs for validation', () => {
    for (const input of ['12suffix', '1.9', 'Infinity', '0x10', '01', '1e999'])
      expect(castValuesBySchema(input, { type: 'integer' }, { numericMode: 'strict' })).toBe(input);
    expect(castValuesBySchema('1e3', { type: 'integer' }, { numericMode: 'strict' })).toBe(1000);
    expect(castValuesBySchema(' -1.25 ', { type: 'number' }, { numericMode: 'strict' })).toBe(
      -1.25,
    );
  });
  test('casts nested properties, arrays and tuple prefixes without mutating inputs', () => {
    const input = { list: ['2', ''], tuple: ['3', 'hello', '4'], extra: '5' };
    const schema: JSONSchemaProperty = {
      type: 'object',
      properties: {
        list: { type: 'array', items: { type: ['integer', 'null'] } },
        tuple: {
          type: 'array',
          prefixItems: [{ type: 'integer' }, { type: 'string' }],
          items: { type: 'number' },
        },
      },
    };
    expect(castValuesBySchema(input, schema)).toEqual({
      list: [2, null],
      tuple: [3, 'hello', 4],
      extra: '5',
    });
    expect(input).toEqual({ list: ['2', ''], tuple: ['3', 'hello', '4'], extra: '5' });
    expect(castValuesBySchema('bad', { type: 'array', items: { type: 'number' } })).toBe('bad');
    expect(castValuesBySchema(2, { type: 'object' })).toBe(2);
    expect(castValuesBySchema('2', { $ref: '#/$defs/number' })).toBe('2');
  });
  test('handles own prototype-named properties safely and bounds cyclic traversal', () => {
    const input = JSON.parse('{"__proto__":"3","constructor":"4"}');
    const properties = JSON.parse(
      '{"__proto__":{"type":"integer"},"constructor":{"type":"integer"}}',
    );
    const result = castValuesBySchema(input, { type: 'object', properties });
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(Object.hasOwn(result, '__proto__')).toBe(true);
    expect(result.__proto__).toBe(3);
    expect(result.constructor).toBe(4);
    const inherited = Object.create({ a: '2' });
    expect(castValuesBySchema(inherited, { properties: { a: { type: 'integer' } } })).toEqual({});
    const recursive: JSONSchemaProperty = { type: 'object', properties: {} };
    recursive.properties!.self = recursive;
    const cyclic: any = {};
    cyclic.self = cyclic;
    expect(() => castValuesBySchema(cyclic, recursive)).toThrow(/limits/);
    expect(() =>
      castValuesBySchema(Array(10_001).fill('1'), { type: 'array', items: { type: 'number' } }),
    ).toThrow(/limits/);
  });
});
