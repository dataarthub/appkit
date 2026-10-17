import { jsonSnapshot } from '../internal/json-snapshot';
import { createAjvValidator } from '../validation/index';
import type { ActionToolDescriptor, ActionToolObject } from './tool-types';
import type { ActionValidationResult } from './types';

/**
 * Shared non-mutating schema boundary for tool calls and directly executed actions.
 * @internal
 */
export function prepareActionToolInput(schemaInput: ActionToolDescriptor['inputSchema']) {
  const schema = jsonSnapshot(schemaInput);
  if (!schema || typeof schema !== 'object' || Array.isArray(schema) || !('type' in schema) || schema.type !== 'object' || ('$async' in schema && schema.$async !== undefined)) throw new Error('Tool inputSchema must have an object root and be synchronous');
  const inputSchema: ActionToolDescriptor['inputSchema'] = Object.freeze({ ...schema, type: 'object' });
  const validate = createAjvValidator({ ajvOptions: { strict: true, allowUnionTypes: true, coerceTypes: false, useDefaults: false, removeAdditional: false, allErrors: false } });
  validate(inputSchema, {});
  return {
    inputSchema,
    parse(input: unknown): ActionValidationResult<ActionToolObject> {
      try {
        const data = jsonSnapshot(input);
        if (data && typeof data === 'object' && !Array.isArray(data) && validate(inputSchema, data).valid) return { ok: true, data: data as ActionToolObject };
      } catch { /* Untrusted values and validation exceptions share the same safe error. */ }
      return { ok: false, error: 'Input did not pass schema validation.' };
    },
  };
}
