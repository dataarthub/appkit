import { createAjvValidator } from '../validation/index';
import { jsonSnapshot } from '../internal/json-snapshot';
import { validateGenerativeUIDocument } from './validation';
import type { GenerativeUIDocumentResult, GenerativeUIObject, GenerativeUIValue } from './types';

/** Application-owned component data schema; inline draft-07 object schemas only. */
export interface GenerativeUIComponentSchema {
  readonly type: string;
  readonly dataSchema: GenerativeUIObject;
}
/** Shared response schema and non-mutating runtime validators for the same registrations. */
export interface GenerativeUIContract {
  readonly schema: GenerativeUIObject;
  readonly components: readonly GenerativeUIComponentSchema[];
  /** Also enforces envelope bounds and unique block IDs, which schema alone cannot express. */
  validate(input: unknown): GenerativeUIDocumentResult;
  /** Returns false for unregistered types or invalid/beyond-limit JSON data. */
  validateData(type: string, input: unknown): boolean;
}
const forbidden = new Set(['$schema', '$id', '$ref', '$anchor', '$dynamicRef', '$dynamicAnchor', '$recursiveRef', '$recursiveAnchor', '$async']);
function checkInline(value: GenerativeUIValue): void {
  if (!value || typeof value !== 'object') return;
  for (const [key, nested] of Object.entries(value)) {
    if (forbidden.has(key)) throw new Error('Component schemas must be inline synchronous draft-07 schemas without reference or dialect keys');
    checkInline(nested);
  }
}

/**
 * Builds a provider-neutral draft-07 response schema from explicit component definitions.
 *
 * @remarks
 * Up to 32 unique type names, each with an inline object-root dataSchema. References,
 * IDs, anchors, dialect declarations and async schemas are rejected (including nested
 * reserved keys); this prevents reference rebasing and mixed-dialect ambiguity when
 * schemas are composed. No network loading occurs. Schemas are snapshotted/frozen and
 * compiled immediately using the existing Ajv adapter with coercion/defaults/removal
 * disabled. Invalid schemas throw configuration errors.
 * Exported schema describes structural constraints; runtime validation additionally
 * enforces unique block IDs and JSON size/depth limits. Custom business validators and
 * authorization still belong to the app. Provider-specific schema subsets may require
 * an application adapter; this function never contacts an AI service.
 *
 * @example
 * ```ts
 * import { createGenerativeUIContract } from "./";
 * const contract = createGenerativeUIContract([{ type: 'summary', dataSchema: {
 *   type: 'object', properties: { text: { type: 'string' } },
 *   required: ['text'], additionalProperties: false,
 * } }]);
 * const schemaForModel = contract.schema;
 * const checked = contract.validate(response);
 * ```
 */
export function createGenerativeUIContract(components: readonly GenerativeUIComponentSchema[]): GenerativeUIContract {
  if (components.length > 32) throw new Error('At most 32 component schemas can be composed');
  const validator = createAjvValidator({ draft: 'draft-07', ajvOptions: { strict: true, allowUnionTypes: true, coerceTypes: false, useDefaults: false, removeAdditional: false, allErrors: false } });
  const entries = new Map<string, GenerativeUIObject>();
  for (const component of components) {
    if (!/^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(component.type) || entries.has(component.type)) throw new Error('Component types must be valid and unique');
    const snapshot = jsonSnapshot(component.dataSchema) as GenerativeUIObject;
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot) || snapshot.type !== 'object') throw new Error('dataSchema must have an object root');
    checkInline(snapshot);
    validator(snapshot, {});
    entries.set(component.type, snapshot);
  }
  const id = { type: 'string', minLength: 1, maxLength: 128, pattern: '\\S' };
  const schema = jsonSnapshot({
    $schema: 'http://json-schema.org/draft-07/schema#', type: 'object',
    properties: { version: { const: 1 }, id, blocks: { type: 'array', maxItems: 32, items: entries.size ? { oneOf: [...entries].map(([type, data]) => ({ type: 'object', properties: { id, type: { const: type }, data }, required: ['id', 'type', 'data'], additionalProperties: false })) } : false } },
    required: ['version', 'id', 'blocks'], additionalProperties: false,
  }) as GenerativeUIObject;
  validator(schema, {});
  return Object.freeze({
    schema,
    components: Object.freeze([...entries].map(([type, dataSchema]) => Object.freeze({ type, dataSchema }))),
    validate(input: unknown): GenerativeUIDocumentResult {
      const document = validateGenerativeUIDocument(input);
      if (!document.ok) return document;
      return validator(schema, document.data).valid ? document : Object.freeze({ ok: false, code: 'INVALID_DOCUMENT', error: 'The UI document does not match its registered component schemas.' });
    },
    validateData(type: string, input: unknown): boolean {
      const dataSchema = entries.get(type);
      if (!dataSchema) return false;
      try { return validator(dataSchema, jsonSnapshot(input)).valid; } catch { return false; }
    },
  });
}
