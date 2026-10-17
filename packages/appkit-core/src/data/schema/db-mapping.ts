import type { JSONSchema, JSONSchemaProperty } from './types';

/** Internal shared NULL mapping for CREATE and physical verification. */
export function isDbNullable(prop: JSONSchemaProperty, required: boolean): boolean {
  if (prop['x-db']?.primaryKey) return false;
  if (prop['x-db']?.nullable !== undefined) return prop['x-db'].nullable;
  return (
    !required || prop.type === 'null' || (Array.isArray(prop.type) && prop.type.includes('null'))
  );
}

/** Reject a bundle or missing/empty table shape instead of emitting empty DDL. */
export function assertTableProperties(schema: JSONSchema): asserts schema is JSONSchema & {
  properties: Record<string, JSONSchemaProperty>;
} {
  if (!schema.properties || Object.keys(schema.properties).length === 0) {
    throw new Error(
      'Expected a single table with non-empty /properties; select a table from /$defs and resolve its references before generating SQL.',
    );
  }
}
