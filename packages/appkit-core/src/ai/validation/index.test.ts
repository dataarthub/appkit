import { test, expect } from 'bun:test';
import { createAjvValidator, jsonSnapshot } from './index';
test('shared validator selects both drafts without coercion/defaults/removal', () => {
  const validate = createAjvValidator();
  for (const draft of ['http://json-schema.org/draft-07/schema#', 'https://json-schema.org/draft/2020-12/schema']) {
    const data = { amount: '2', extra: true };
    const schema = { $schema: draft, type: 'object', properties: { amount: { type: 'number', default: 3 } }, required: ['amount'], additionalProperties: false };
    expect(validate(schema, data).valid).toBe(false);
    expect(data).toEqual({ amount: '2', extra: true });
    expect(validate(schema, { amount: 2 }).valid).toBe(true);
  }
});
test('shared validator rejects dialect conflicts and leaves mutation opt-in explicit', () => {
  expect(() => createAjvValidator({ draft: 'draft-07' })({ $schema: 'https://json-schema.org/draft/2020-12/schema' }, {})).toThrow('conflicts');
  expect(() => createAjvValidator()({ $schema: 'https://example.invalid/schema' }, {})).toThrow('Unsupported');
  const data: { amount: string | number } = { amount: '2' };
  expect(createAjvValidator({ ajvOptions: { coerceTypes: true } })({ type: 'object', properties: { amount: { type: 'number' } } }, data).valid).toBe(true);
  expect(data.amount).toBe(2);
});
test('shared snapshot rejects executable properties without invoking accessors', () => {
  let invoked = false;
  expect(() => jsonSnapshot({ get secret() { invoked = true; return 'private'; } })).toThrow('Invalid JSON');
  expect(invoked).toBe(false);
  const input = { nested: { value: 1 } }; const output = jsonSnapshot(input);
  expect(output).not.toBe(input); expect(Object.isFrozen(output)).toBe(true);
});

test('synchronous validation rejects async schemas before execution in both dialects', () => {
  for (const draft of ['http://json-schema.org/draft-07/schema#', 'https://json-schema.org/draft/2020-12/schema']) {
    const validate = createAjvValidator();
    for (const data of [42, 'invalid']) expect(() => validate({ $schema: draft, $async: true, type: 'number' }, data)).toThrow('Asynchronous schemas');
  }
});
