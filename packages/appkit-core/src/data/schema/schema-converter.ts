/**
 * @fileoverview Schema Data Converter
 *
 * Generic converter for bi-directional conversion between snake_case DB data
 * and camelCase JS objects based on JSON Schema definitions.
 *
 * @module lib/schema/schema-converter
 */
import type { JSONSchema, JSONSchemaProperty } from './types';

// =============================================================================
// String Utilities (Internal)
// =============================================================================

function snakeToCamelKey(key: string): string {
  return key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function camelToSnakeKey(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

// =============================================================================
// Column Info
// =============================================================================

interface ColumnInfo {
  /** Property name on schema (snake_case) */
  schemaKey: string;
  /** Actual column name in DB (x-db.columnName or schemaKey) */
  dbColumnName: string;
  /** Property name in JS (camelCase) */
  jsKey: string;
}

/**
 * Builds column mapping information from a JSON Schema.
 */
function buildColumnMap(schema: JSONSchema): ColumnInfo[] {
  const properties = (schema.properties || {}) as Record<string, JSONSchemaProperty>;
  const columns: ColumnInfo[] = [];

  for (const [schemaKey, prop] of Object.entries(properties)) {
    const dbColumnName = prop['x-db']?.columnName || prop['x-db']?.column || schemaKey;
    const jsKey = snakeToCamelKey(schemaKey);
    columns.push({ schemaKey, dbColumnName, jsKey });
  }

  return columns;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Converter for bi-directional conversion between snake_case DB data
 * and camelCase JS objects based on JSON Schema definitions.
 *
 * @example
 * ```typescript
 * import { SchemaDataConverter } from "..";
 * const clientsSchema = { type: 'object', properties: { name: { type: 'string' } } } as const;
 *
 * const converter = new SchemaDataConverter<Client>(clientsSchema);
 *
 * // DB → JS
 * const jsClient = converter.fromDB(dbRow);
 * console.log(jsClient.companyName); // Access via camelCase
 *
 * // JS → DB
 * const dbPayload = converter.toDB({ companyName: '田川製作所' });
 * // => { company_name: '田川製作所' }
 * ```
 */
export class SchemaDataConverter<T = unknown> {
  private columns: ColumnInfo[];
  private dbToJsMap: Map<string, string>;
  private jsToDdMap: Map<string, string>;
  private snakeToDbMap: Map<string, string>;

  /**
   * Creates a new instance of SchemaDataConverter.
   * @param schema JSON Schema used as reference for bi-directional conversion
   */
  constructor(schema: JSONSchema) {
    this.columns = buildColumnMap(schema);
    this.dbToJsMap = new Map();
    this.jsToDdMap = new Map();
    this.snakeToDbMap = new Map();

    for (const col of this.columns) {
      this.dbToJsMap.set(col.dbColumnName, col.jsKey);
      this.jsToDdMap.set(col.jsKey, col.dbColumnName);
      this.snakeToDbMap.set(col.schemaKey, col.dbColumnName);
    }
  }

  /**
   * Converts DB (snake_case) data to a JS (camelCase) object.
   *
   * @param dbData - Raw data retrieved from DB
   * @returns JS object with camelCase properties
   */
  fromDB(dbData: unknown): T {
    if (!dbData || typeof dbData !== 'object') return dbData as T;
    const data = dbData as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const col of this.columns) {
      const value = data[col.dbColumnName];
      if (value !== undefined) {
        result[col.jsKey] = value;
      }
    }

    return result as T;
  }

  /**
   * Converts a JS (camelCase) object to DB (snake_case) data.
   *
   * @param jsData - JS data with camelCase properties
   * @returns snake_case data formatted for DB
   */
  toDB(jsData: unknown): Record<string, unknown> {
    if (!jsData || typeof jsData !== 'object') return {};
    const data = jsData as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const col of this.columns) {
      // Prefer camelCase key, fallback to snake_case key
      if (Object.prototype.hasOwnProperty.call(data, col.jsKey)) {
        result[col.dbColumnName] = data[col.jsKey];
      } else if (Object.prototype.hasOwnProperty.call(data, col.schemaKey)) {
        result[col.dbColumnName] = data[col.schemaKey];
      }
    }

    return result;
  }

  /**
   * Resolves a camelCase or snake_case field name to a DB column name.
   *
   * @param field - Field name in JS
   * @returns DB column name
   */
  resolveColumnName(field: string): string {
    // Direct lookup by camelCase
    const fromJs = this.jsToDdMap.get(field);
    if (fromJs) return fromJs;

    // Lookup by snake_case
    const fromSnake = this.snakeToDbMap.get(field);
    if (fromSnake) return fromSnake;

    // Fallback: convert camelCase to snake_case
    return camelToSnakeKey(field);
  }
}
