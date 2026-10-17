/**
 * Finite JSON data used by bounded input snapshots.
 * @internal
 */
export type SnapshotValue = null | boolean | number | string | readonly SnapshotValue[] | { readonly [key: string]: SnapshotValue };

/**
 * Detached, recursively frozen JSON snapshot shared by tool and UI boundaries.
 * At most 10,000 visited values, depth 64 (root 0), and 1,000,000 serialized
 * JavaScript UTF-16 code units. The size check is not a UTF-8 byte limit and does
 * not replace request/stream limits before parsing.
 * @internal
 */
// Clone data without invoking accessors or toJSON, and preserve special keys as own properties.
// These limits apply independently to each schema, arguments object and projected result.
export function jsonSnapshot(value: unknown): SnapshotValue {
  const ancestors = new Set<object>();
  let nodes = 0;
  function visit(input: unknown, depth: number): SnapshotValue {
    if (++nodes > 10000 || depth > 64) throw new Error('JSON value exceeds limits');
    if (input === null || typeof input === 'string' || typeof input === 'boolean') return input;
    if (typeof input === 'number' && Number.isFinite(input)) return input;
    if (typeof input !== 'object' || input === null || ancestors.has(input)) throw new Error('Invalid JSON value');
    const array = Array.isArray(input);
    if (!array && Object.getPrototypeOf(input) !== Object.prototype && Object.getPrototypeOf(input) !== null) {
      throw new Error('JSON values must be plain objects');
    }
    ancestors.add(input);
    const entries: [string, SnapshotValue][] = [];
    for (const key of Reflect.ownKeys(input)) {
      if (array && key === 'length') continue;
      const descriptor = Object.getOwnPropertyDescriptor(input, key)!;
      if (typeof key !== 'string' || !descriptor.enumerable || !('value' in descriptor)) throw new Error('Invalid JSON property');
      if (array && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= input.length)) throw new Error('Invalid array property');
      entries.push([key, visit(descriptor.value, depth + 1)]);
    }
    ancestors.delete(input);
    if (array) {
      if (entries.length !== input.length) throw new Error('Sparse arrays are not JSON values');
      return Object.freeze(entries.map(([, item]) => item));
    }
    return Object.freeze(Object.fromEntries(entries));
  }
  const result = visit(value, 0);
  if (JSON.stringify(result).length > 1000000) throw new Error('JSON value exceeds size limit');
  return result;
}
