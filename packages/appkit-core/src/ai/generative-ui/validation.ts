import { jsonSnapshot } from '../internal/json-snapshot';
import type { GenerativeUIBlock, GenerativeUIDocumentResult, GenerativeUIObject, GenerativeUIValue } from './types';

function object(value: GenerativeUIValue | undefined): value is GenerativeUIObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function id(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 128;
}

/**
 * Validates and snapshots a fully assembled UI document without a UI dependency.
 *
 * @remarks
 * Requires version 1, a document ID, and at most 32 flat blocks with unique IDs.
 * Blocks have exactly id/type/data; the envelope has exactly version/id/blocks.
 * Data must be an object. Component names match `[A-Za-z][A-Za-z0-9_.-]{0,63}`.
 * All values must be plain finite JSON data: no accessors, functions, cycles,
 * sparse arrays, class instances or undefined. Limits: 64 nesting levels,
 * 10000 nodes and 1000000 serialized characters for the entire document.
 * The successful result is cloned and recursively frozen; caller input is untouched.
 * This validates structure, not business data or authorization. Unknown component
 * names are allowed here and handled by the application's explicit UI registry.
 * Parse provider JSON and assemble streaming fragments before calling this function.
 *
 * @example
 * ```ts
 * import { validateGenerativeUIDocument } from "./";
 * const result = validateGenerativeUIDocument({
 *   version: 1, id: 'answer-1',
 *   blocks: [{ id: 'summary', type: 'sales-table', data: { rows: [] } }],
 * });
 * ```
 */
export function validateGenerativeUIDocument(input: unknown): GenerativeUIDocumentResult {
  const invalid = (): GenerativeUIDocumentResult => Object.freeze({ ok: false, code: 'INVALID_DOCUMENT', error: 'The UI document has an invalid structure or exceeds its limits.' });
  try {
    const value = jsonSnapshot(input);
    if (!object(value) || Object.keys(value).some(key => !['version', 'id', 'blocks'].includes(key)) || value.version !== 1 || !id(value.id) || !Array.isArray(value.blocks) || value.blocks.length > 32) return invalid();
    const ids = new Set<string>();
    const blocks: GenerativeUIBlock[] = [];
    for (const block of value.blocks) {
      if (!object(block) || Object.keys(block).some(key => !['id', 'type', 'data'].includes(key)) || !id(block.id) || ids.has(block.id) || typeof block.type !== 'string' || !/^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(block.type) || !object(block.data)) return invalid();
      ids.add(block.id);
      blocks.push(Object.freeze({ id: block.id, type: block.type, data: block.data }));
    }
    return Object.freeze({ ok: true, data: Object.freeze({ version: 1, id: value.id, blocks: Object.freeze(blocks) }) });
  } catch { return invalid(); }
}
