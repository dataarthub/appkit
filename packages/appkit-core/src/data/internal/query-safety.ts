import type { Filter, QueryOptions } from '../types';
/** Reject unsupported filters before a provider can silently widen an operation. @internal */
export function validateFilter(filter: Filter | undefined, operators: readonly string[], logical: readonly string[] = []): void {
  if (filter === undefined) return;
  if (!filter || typeof filter !== 'object' || Array.isArray(filter)) throw new Error('Filter must be an object');
  for (const [field, value] of Object.entries(filter)) {
    if (field.startsWith('$')) {
      if (!logical.includes(field) || !Array.isArray(value) || value.length === 0) throw new Error(`Unsupported or empty logical filter: ${field}`);
      for (const entry of value) {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry) || Object.keys(entry).length === 0) throw new Error('Logical filters require nonempty objects');
        validateFilter(entry as Filter, operators, logical);
      }
      continue;
    }
    if (value === undefined || (typeof value === 'number' && !Number.isFinite(value))) throw new Error(`Invalid filter value: ${field}`);
    if (Array.isArray(value)) throw new Error('Use $in/$nin for array filters');
    if (value !== null && typeof value === 'object') {
      const entries = Object.entries(value);
      if (entries.length === 0) throw new Error('Empty filter operator object');
      for (const [op, operand] of entries) {
        if (!operators.includes(op)) throw new Error(`Unsupported filter operator: ${op}`);
        if (operand === undefined || (typeof operand === 'number' && !Number.isFinite(operand))) throw new Error(`Invalid operand for ${op}`);
        if (op === '$in' || op === '$nin') {
          if (!Array.isArray(operand) || operand.some(v => v === undefined || (typeof v === 'number' && !Number.isFinite(v)))) throw new Error(`${op} requires an array of defined values`);
        }
        if ((op === '$regex' || op === '$ilike') && typeof operand !== 'string') throw new Error(`${op} requires a string`);
      }
    }
  }
}
export const comparisonOperators = ['$eq', '$ne', '$neq', '$gt', '$gte', '$lt', '$lte', '$in', '$nin', '$regex'] as const;
/** SQL identifiers are application configuration, restricted to simple named segments. @internal */
export function quoteSqlIdentifier(value: string, qualified = false): string {
  const parts = qualified ? value.split('.') : [value];
  if (typeof value !== 'string' || !parts.length || parts.some(p => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(p))) throw new Error(`Invalid SQL identifier: ${value}`);
  return parts.map(p => `"${p}"`).join('.');
}
export function validatePagination(options?: QueryOptions): void {
  for (const n of [options?.limit, options?.skip]) if (n !== undefined && (!Number.isSafeInteger(n) || n < 0)) throw new Error('Pagination must use nonnegative safe integers');
  if (options?.sort && Object.values(options.sort).some(v => v !== 1 && v !== -1)) throw new Error('Sort directions must be 1 or -1');
}
