/**
 * @fileoverview Mermaid ERD Exporter for JSON Schema
 *
 * Generates Mermaid ER diagrams from JSON Schema definitions.
 *
 * @module lib/schema/exporter
 */
import type { JSONSchema } from './types';

/**
 * Generates a Mermaid ER diagram from JSON Schemas.
 *
 * @param schemas - Array of JSON Schemas to display
 * @returns Mermaid erDiagram formatted string
 *
 * @example
 * ```typescript
 * const mermaid = generateMermaidERD([userSchema, orderSchema]);
 * ```
 */
export function generateMermaidERD(schemas: JSONSchema[]): string {
  let mermaid = 'erDiagram\n';
  const relations: string[] = [];
  const processedTables = new Set<string>();

  for (const schema of schemas) {
    const tableName = schema['x-db']?.tableName || schema.title || 'Unknown';
    if (processedTables.has(tableName)) continue;
    processedTables.add(tableName);

    mermaid += `    ${tableName} {\n`;

    if (schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        // Determine type (use first element if array)
        const rawType = Array.isArray(prop.type) ? prop.type[0] : prop.type || 'string';
        // Clean up type name for Mermaid (remove spaces, etc.)
        const type = String(rawType).replace(/\s+/g, '_');

        const label = prop['x-ui']?.label || prop.title || '';
        const isPK = prop['x-db']?.primaryKey ? 'PK' : '';
        const isUnique = prop['x-db']?.unique ? 'UK' : '';

        // Column definition: type name key "label"
        mermaid += `        ${type} ${key} ${isPK} ${isUnique} "${label}"\n`;

        // Extract relation (prioritize x-ui.searchSource)
        const targetCollection =
          prop['x-ui']?.searchSource?.collection ||
          prop['x-db']?.foreignKey?.table ||
          prop['x-db']?.references?.table;

        if (targetCollection) {
          // Record relation reference
          relations.push(`    ${tableName} }o--|| ${targetCollection} : "references"`);
        }
      }
    }
    mermaid += '    }\n';
  }

  // Deduplicate and append relations
  const uniqueRelations = Array.from(new Set(relations));
  mermaid += uniqueRelations.join('\n');

  return mermaid;
}
