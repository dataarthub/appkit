import { jsonSnapshot } from '../internal/json-snapshot';
import { createAjvValidator } from '../validation/index';
import type { ActionToolDescriptor, ActionToolObject } from './tool-types';
import type { ActionValidationResult } from './types';

/**
 * Shared non-mutating schema boundary for tool calls and directly executed actions.
 * @internal
 *
 * @param schemaInput - Synchronous object-root draft-07/2020-12 JSON Schema, snapshotted without coercion/default insertion.
 * @returns Frozen schema snapshot and synchronous parse helper for bounded finite JSON input.
 * @throws Throws invalid schema roots, async markers, snapshot limits or Ajv schema/configuration errors.
 *
 * @example
 * ```typescript
 * import { prepareActionToolInput } from '@alneas/appkit-core/ai/action/schema-input';
 *
 * const prepared = prepareActionToolInput({ type: 'object', properties: { text: { type: 'string' } } });
 * console.log(prepared.parse({ text: 'hello' }));
 * ```
 */
export function prepareActionToolInput(schemaInput: ActionToolDescriptor['inputSchema']) {
  const schema = jsonSnapshot(schemaInput);
  if (!schema || typeof schema !== 'object' || Array.isArray(schema) || !('type' in schema) || schema.type !== 'object' || ('$async' in schema && schema.$async !== undefined)) throw new Error('Tool inputSchema must have an object root and be synchronous');
  const inputSchema: ActionToolDescriptor['inputSchema'] = Object.freeze({ ...schema, type: 'object' });
  const validate = createAjvValidator({ ajvOptions: { strict: true, allowUnionTypes: true, coerceTypes: false, useDefaults: false, removeAdditional: false, allErrors: false } });
  validate(inputSchema, {});
  return {

    /** Snapshotted object-root synchronous JSON Schema used before typed input parsing. */
    inputSchema,

    /**
     * Validates and freezes one untrusted object against the prepared schema.
     *
     * @param input - Already-parsed untrusted value; invalid JSON or failed schema validation is rejected.
     * @returns Typed JSON object on success, otherwise a fixed input error; caught validation exceptions do not escape.
     *
     * @example
     * ```typescript
     * import { prepareActionToolInput } from '@alneas/appkit-core/ai/action/schema-input';
     *
     * const prepared = prepareActionToolInput({ type: 'object' });
     * console.log(prepared.parse({ text: 'hello' }));
     * ```
     */
    parse(input: unknown): ActionValidationResult<ActionToolObject> {
      try {
        const data = jsonSnapshot(input);
        if (data && typeof data === 'object' && !Array.isArray(data) && validate(inputSchema, data).valid) return { ok: true, data: data as ActionToolObject };
      } catch { /* Untrusted values and validation exceptions share the same safe error. */ }
      return { ok: false, error: 'Input did not pass schema validation.' };
    },
  };
}
