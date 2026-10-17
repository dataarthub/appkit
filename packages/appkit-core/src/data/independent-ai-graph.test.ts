import { test, expect } from 'bun:test';
import { ActionRegistry as canonicalRegistry, type ActionToolInputSchema } from "../ai/action";
import { createAjvValidator as canonicalValidator } from "../ai/validation";
import { calculateCriticalPath as canonicalCpm, InMemoryTaskGraphAdapter as CanonicalAdapter } from "../graph";
import { ActionRegistry } from './action';
import { createAjvValidator } from './schema/ajv';
import { calculateCriticalPath, InMemoryTaskGraphAdapter } from './integrations/task-graph';
import type { JSONSchema } from './schema/types';
test('legacy engine entries reuse canonical AI/graph identities and accept engine schemas structurally', () => {
  expect(ActionRegistry).toBe(canonicalRegistry);
  expect(createAjvValidator()({ type: 'string' }, 3)).toEqual(canonicalValidator()({ type: 'string' }, 3));
  expect(calculateCriticalPath).toBe(canonicalCpm);
  expect(InMemoryTaskGraphAdapter).toBe(CanonicalAdapter);
  const extended: JSONSchema & { type: 'object' } = { type: 'object', properties: { query: { type: 'string' } }, 'x-db': { tableName: 'records' } };
  const input: ActionToolInputSchema = extended;
  expect(canonicalValidator()(input, { query: 'ok' }).valid).toBe(true);
});

test('independent generic and AI validators conform on draft, mutation and async boundaries', () => {
  for (const factory of [createAjvValidator, canonicalValidator]) {
    const validate = factory();
    const value = { n: '3' };
    expect(validate({ type: 'object', properties: { n: { type: 'number' } } }, value).valid).toBe(false);
    expect(value.n).toBe('3');
    expect(validate({ $schema: 'https://json-schema.org/draft/2020-12/schema', type: 'array', prefixItems: [{ type: 'integer' }], items: false }, [1]).valid).toBe(true);
    expect(validate({ type: 'string', maxLength: 0 }, '').valid).toBe(true);
    expect(() => validate({ $async: true, type: 'string' }, 'ok')).toThrow('Asynchronous');
    expect(() => factory({ draft: 'draft-07' })({ $schema: 'https://json-schema.org/draft/2020-12/schema' }, {})).toThrow('conflicts');
  }
});
