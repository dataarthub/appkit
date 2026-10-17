/**
 * @fileoverview Physical DB to JSON Schema Converter
 *
 * Reverse engineers JSON Schema definitions from physical database schemas.
 *
 * @module lib/schema/converter
 */
import type { JSONSchema, JSONSchemaProperty } from './types';
import type { PhysicalTable } from './verifier';

/**
 * Generates a JSON Schema from physical table metadata (PhysicalTable).
 *
 * @param physical - Source physical table metadata
 * @returns Generated JSON Schema
 *
 * @example
 * ```typescript
 * const schema = physicalToJSONSchema(physicalTable);
 * ```
 */
export function physicalToJSONSchema(physical: PhysicalTable): JSONSchema {
  const properties: Record<string, JSONSchemaProperty> = {};
  const required: string[] = [];

  for (const col of physical.columns) {
    const prop: JSONSchemaProperty = {
      title: col.name, // Use column name as default display title
      ...mapPostgresTypeToJSONSchema(col.type),
      'x-db': {
        columnName: col.name,
        primaryKey: col.isPrimaryKey ? true : undefined,
        unique: col.isUnique ? true : undefined,
        default: col.defaultValue || undefined,
      },
      'x-ui': {
        label: col.name,
      },
    };

    properties[col.name] = prop;
    if (!col.isNullable) {
      required.push(col.name);
    }
  }

  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    title: physical.name,
    'x-db': {
      tableName: physical.name,
    },
    required: required.length > 0 ? required : undefined,
    properties,
  };
}

/**
 * Maps a Postgres type (udt_name) to a JSON Schema type and format.
 */
function mapPostgresTypeToJSONSchema(pgType: string): Partial<JSONSchemaProperty> {
  const type = pgType.toLowerCase();

  // Date/time types
  if (type.includes('timestamp')) {
    return { type: 'string', format: 'date-time' };
  }
  if (type === 'date') {
    return { type: 'string', format: 'date' };
  }
  if (type === 'time' || type === 'timetz') {
    return { type: 'string', format: 'time' };
  }

  // Numeric types
  if (['int2', 'int4', 'int8', 'integer', 'bigint', 'serial', 'bigserial'].includes(type)) {
    return { type: 'integer' };
  }
  if (['numeric', 'decimal', 'float4', 'float8', 'real', 'double precision'].includes(type)) {
    return { type: 'number' };
  }

  // Boolean
  if (type === 'bool' || type === 'boolean') {
    return { type: 'boolean' };
  }

  // JSON types
  if (type === 'json' || type === 'jsonb') {
    return { type: 'object' }; // Or array, but treat as object for now
  }

  // Special types
  if (type === 'uuid') {
    return { type: 'string', format: 'uuid' };
  }

  // Others (text, varchar, etc.)
  return { type: 'string' };
}
