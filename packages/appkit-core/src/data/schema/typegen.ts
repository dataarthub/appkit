/**
 * @fileoverview Schema TypeScript Code Generator
 *
 * Core logic to generate TypeScript interface code from JSON Schema definitions.
 * Usable both from CLI (scripts/schema-typegen.ts) and runtime.
 *
 * @module lib/schema/typegen
 */
import type { JSONSchema, JSONSchemaProperty } from './types';
import pluralize from 'pluralize';

// =============================================================================
// Public Options
// =============================================================================

/**
 * Type generation options.
 */
export interface TypegenOptions {
  /** Whether to convert property names to camelCase (default: false) */
  camelCase?: boolean;
  /** Whether to singularize interface names (default: true) */
  singularize?: boolean;
  /** Suffix used to avoid collisions with built-in names like 'file' (default: 'Record') */
  conflictSuffix?: string;
  /** Header banner comment */
  banner?: string;
  /** Whether to respect x-gen.tsType override (default: true) */
  respectXGen?: boolean;
  /** Set of reserved names to avoid collisions with browser built-ins */
  reservedNames?: Set<string>;
}

/**
 * Schema input entry.
 */
export interface SchemaInput {
  /** Filename (e.g., 'clients.schema.json') */
  filename: string;
  /** Parsed JSON Schema */
  schema: JSONSchema;
}

// =============================================================================
// String Utilities
// =============================================================================

/**
 * Converts a snake_case string to camelCase.
 *
 * @param str - Target string to convert
 * @returns String converted to camelCase
 *
 * @example
 * ```typescript
 * snakeToCamel('client_id'); // => 'clientId'
 * ```
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Converts a camelCase string to snake_case.
 *
 * @param str - Target string to convert
 * @returns String converted to snake_case
 *
 * @example
 * ```typescript
 * camelToSnake('clientId'); // => 'client_id'
 * ```
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Capitalizes the first character of a string.
 *
 * @param str - Target string to capitalize
 * @returns Capitalized string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Converts an English plural noun to its singular form.
 *
 * Uses the `pluralize` package to support irregular plurals.
 *
 * @param str - Plural string
 * @returns Singular string
 *
 * @example
 * ```typescript
 * toSingular('deliveries');  // => 'delivery'
 * toSingular('orders');      // => 'order'
 * toSingular('statuses');    // => 'status'
 * toSingular('addresses');   // => 'address'
 * ```
 */
export function toSingular(str: string): string {
  return pluralize.singular(str);
}

// =============================================================================
// Type Mapping
// =============================================================================

/**
 * Generates a TypeScript type string from a JSON Schema property.
 *
 * @param prop - JSON Schema property definition
 * @param respectXGen - Whether to respect x-gen.tsType override
 * @returns TypeScript type string representation
 * @remarks Preserves all elements of type arrays (including null). Escapes enum strings as JSON.
 */
export function jsonSchemaPropertyToTsType(prop: JSONSchemaProperty, respectXGen = true): string {
  // x-gen.tsType override
  if (respectXGen && prop['x-gen']?.tsType) {
    return prop['x-gen'].tsType;
  }

  // enum -> union literal types
  if (prop.enum) {
    return prop.enum.map((v) => JSON.stringify(v)).join(' | ') || 'never';
  }

  if (Array.isArray(prop.type)) {
    return (
      [
        ...new Set(
          prop.type.map((type) => jsonSchemaPropertyToTsType({ ...prop, type }, respectXGen)),
        ),
      ].join(' | ') || 'never'
    );
  }
  const type = prop.type;

  switch (type) {
    case 'string':
      return 'string';
    case 'integer':
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'null':
      return 'null';
    case 'array':
      if (prop.items && typeof prop.items === 'object') {
        const itemType = jsonSchemaPropertyToTsType(prop.items as JSONSchemaProperty, respectXGen);
        return `${/[|&]/.test(itemType) ? `(${itemType})` : itemType}[]`;
      }
      return 'unknown[]';
    case 'object':
      return 'Record<string, any>';
    default:
      return 'any';
  }
}

// =============================================================================
// Core Generator
// =============================================================================

const DEFAULT_RESERVED_NAMES = new Set([
  'file',
  'error',
  'event',
  'response',
  'request',
  'headers',
  'document',
  'element',
  'node',
  'window',
]);

const DEFAULT_BANNER = `/**
 * THIS FILE IS AUTOGENERATED. DO NOT EDIT DIRECTLY.
 * Generated from JSON Schemas with @alneas/appkit-core/data typegen.
 */\n\n`;

/**
 * Generates TypeScript interface code from an array of JSON Schemas.
 *
 * @param schemas - Array of schema inputs
 * @param options - Type generation options
 * @returns Generated TypeScript code string
 *
 * @example
 * ```typescript
 * import { generateTypeScriptFromSchemas } from "./typegen";
 *
 * const code = generateTypeScriptFromSchemas(
 *   [{ filename: 'clients.schema.json', schema: clientsSchema }],
 *   { camelCase: true, singularize: true }
 * );
 * ```
 */
export function generateTypeScriptFromSchemas(
  schemas: SchemaInput[],
  options: TypegenOptions = {},
): string {
  const {
    camelCase = false,
    singularize = true,
    conflictSuffix = 'Record',
    banner = DEFAULT_BANNER,
    respectXGen = true,
    reservedNames = DEFAULT_RESERVED_NAMES,
  } = options;

  let content = banner;

  for (const { filename, schema } of schemas) {
    const baseName = filename.replace('.schema.json', '').replace('.json', '');

    let singularName = singularize ? toSingular(baseName) : baseName;

    // Avoid collision with browser standard types
    if (reservedNames.has(singularName.toLowerCase())) {
      singularName = `${singularName}_${conflictSuffix.toLowerCase()}`;
    }

    const interfaceName = capitalize(snakeToCamel(singularName));

    content += `// From ${filename}\n`;
    if (schema.description) {
      content += `/**\n * ${schema.description}\n */\n`;
    }
    content += `export interface ${interfaceName} {\n`;

    const properties = schema.properties || {};
    const required = schema.required || [];

    for (const [key, prop] of Object.entries(properties)) {
      const propKey = camelCase ? snakeToCamel(key) : key;
      const isRequired = required.includes(key);
      const tsType = jsonSchemaPropertyToTsType(prop as JSONSchemaProperty, respectXGen);
      content += `  ${propKey}${isRequired ? '' : '?'}: ${tsType};\n`;
    }

    content += `}\n\n`;
  }

  return content;
}

// =============================================================================
// Schema Registry Generator
// =============================================================================

/**
 * Schema registry JSON entry.
 */
export interface RegistryEntry {
  id: string;
  doc_type?: string;
  version: string;
  edi_version?: string;
  path: string;
  title: string;
}

/**
 * Schema registry JSON structure.
 */
export interface SchemaRegistry {
  registry_version: string;
  updated_at: string;
  profile: string;
  schemas: RegistryEntry[];
}

/**
 * Generates schema registry JSON from schema inputs.
 *
 * @param schemas - Array of schema inputs
 * @param options - Registry metadata options
 * @returns Registry object
 */
export function generateSchemaRegistry(
  schemas: SchemaInput[],
  options: {
    registryVersion?: string;
    profile?: string;
  } = {},
): SchemaRegistry {
  const { registryVersion = '1.0.0', profile = 'default' } = options;

  const entries: RegistryEntry[] = schemas.map(({ filename, schema }) => {
    const id = schema.$id || filename.replace('.schema.json', '').replace('.json', '');
    const version = (schema as Record<string, any>)['x-plugin']?.version || '1.0.0';
    const title = schema.title || id;
    const ediVersion = (schema.properties as Record<string, any>)?.schema_version?.default;

    let docType = (schema.properties as Record<string, any>)?.doc_type?.default;
    if (!docType) {
      if (filename.includes('quotes')) docType = 'Quotation';
      if (filename.includes('orders') && !filename.includes('purchase')) docType = 'PurchaseOrder';
      if (filename.includes('deliveries')) docType = 'DespatchAdvice';
      if (filename.includes('invoices')) docType = 'Invoice';
      if (filename.includes('moneys')) docType = 'RemittanceAdvice';
    }

    return {
      id,
      doc_type: docType,
      version,
      edi_version: ediVersion,
      path: `./${filename}`,
      title,
    };
  });

  entries.sort((a, b) => a.id.localeCompare(b.id));

  return {
    registry_version: registryVersion,
    updated_at: new Date().toISOString().split('T')[0],
    profile,
    schemas: entries,
  };
}
