import type { JSONSchemaProperty } from './types';

export interface SchemaCastOptions {
  /** Compatibility default: parseInt/parseFloat prefixes. strict accepts a complete finite JSON number and checks integer results with Number.isInteger. */
  numericMode?: 'legacy' | 'strict';
}

/**
 * Convert form values, separately from JSON Schema validation. Never adds defaults,
 * resolves $ref, selects composition branches, or coerces booleans/dates/null values.
 * Numeric empty strings become null for nullable numeric types, otherwise undefined.
 * Legacy numeric parsing intentionally accepts prefixes and truncates integers.
 * Mismatched object/array values and unconvertible strings are retained for validation.
 * Walks only own declared properties, prefixItems and items; unknown properties survive.
 * Does not mutate inputs. Throws beyond depth 64 or 10,000 visited values (including cycles).
 */
export function castValuesBySchema(
  values: any,
  schema: JSONSchemaProperty,
  options: SchemaCastOptions = {},
): any {
  const mode = options.numericMode ?? 'legacy';
  if (mode !== 'legacy' && mode !== 'strict') throw new Error('Unknown numeric casting mode.');
  let visited = 0;
  const cast = (value: any, definition: JSONSchemaProperty, depth: number): any => {
    if (++visited > 10_000 || depth > 64)
      throw new Error('Schema casting exceeds traversal limits.');
    if (value === null || value === undefined) return value;
    const types = Array.isArray(definition.type)
      ? definition.type
      : definition.type
        ? [definition.type]
        : [];
    if (
      typeof value === 'object' &&
      !Array.isArray(value) &&
      (types.includes('object') || definition.properties)
    ) {
      const result = { ...value };
      for (const key of Object.keys(definition.properties ?? {})) {
        if (Object.hasOwn(value, key))
          Object.defineProperty(result, key, {
            value: cast(value[key], definition.properties![key], depth + 1),
            enumerable: true,
            writable: true,
            configurable: true,
          });
      }
      return result;
    }
    if (
      Array.isArray(value) &&
      (types.includes('array') || definition.items || definition.prefixItems)
    ) {
      if (!definition.items && !definition.prefixItems) return value;
      return value.map((item, i) => {
        const itemSchema = definition.prefixItems?.[i] ?? definition.items;
        return itemSchema && typeof itemSchema === 'object'
          ? cast(item, itemSchema, depth + 1)
          : item;
      });
    }
    if ((types.includes('number') || types.includes('integer')) && typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return types.includes('null') ? null : undefined;
      const integer = types.includes('integer');
      if (mode === 'strict') {
        if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(trimmed)) return value;
        const number = Number(trimmed);
        return Number.isFinite(number) && (!integer || Number.isInteger(number)) ? number : value;
      }
      const number = integer ? parseInt(trimmed, 10) : parseFloat(trimmed);
      return Number.isNaN(number) ? value : number;
    }
    return value;
  };
  return cast(values, schema, 0);
}
