/**
 * @fileoverview JSON Schema Utilities
 *
 * Helper functions for working with JSON Schema + vendor extensions.
 *
 * @module lib/schema/json-schema
 */

import type {
  JSONSchemaProperty,
  JSONSchema,
  XRuleDefinition,
  XRuleOperand,
  XCodelistOptions,
  FlatIssue,
} from './types';

// =============================================================================
// Schema Dereferencing
// =============================================================================

/**
 * Resolves and flattens $ref in a JSON Schema.
 *
 * Converts schemas using $defs and $ref into flattened schemas with resolved references.
 * Useful before passing to Zod v4 z.fromJSONSchema().
 *
 * @param schema - JSON Schema containing references
 * External file and HTTP references are not resolved, preventing I/O from untrusted schemas.
 * @returns Dereferenced JSON Schema
 *
 * @example
 * ```typescript
 * const schemaWithRefs = {
 *   $defs: { address: { type: "object", properties: {...} } },
 *   properties: {
 *     billing: { $ref: "#/$defs/address" }
 *   }
 * };
 *
 * const flatSchema = await dereferenceSchema(schemaWithRefs);
 * const zodSchema = z.fromJSONSchema(flatSchema);
 * ```
 */
export async function dereferenceSchema<T extends JSONSchema>(schema: T): Promise<T> {
  const { default: RefParser } = await import('@apidevtools/json-schema-ref-parser');
  return (await RefParser.dereference(schema, {
    resolve: { file: false, http: false },
  })) as T;
}

/**
 * Synchronous version: checks if a schema is already dereferenced.
 *
 * Performs a simple check for the presence of $ref.
 */
export function hasSchemaRefs(schema: JSONSchema): boolean {
  const json = JSON.stringify(schema);
  return json.includes('"$ref"');
}

// =============================================================================
// Widget Inference
// =============================================================================

/**
 * Infers widget type from a JSON Schema property.
 *
 * @param prop - JSON Schema property
 * @returns Widget type
 */
export function inferWidget(prop: JSONSchemaProperty): string {
  // Prioritize explicit x-ui.widget
  if (prop['x-ui']?.widget) {
    return prop['x-ui'].widget;
  }

  // Use select if enum exists
  if (prop.enum && prop.enum.length > 0) {
    return 'select';
  }

  // Inference based on type
  const type = Array.isArray(prop.type) ? prop.type[0] : prop.type;

  if (type === 'boolean') {
    return 'checkbox';
  }

  if (type === 'integer' || type === 'number') {
    return 'number';
  }

  if (type === 'array') {
    return 'array';
  }

  if (type === 'object') {
    return 'object';
  }

  // Inference based on format
  if (prop.format) {
    switch (prop.format) {
      case 'email':
        return 'email';
      case 'password':
        return 'password';
      case 'date':
        return 'date';
      case 'date-time':
        return 'datetime-local';
      case 'time':
        return 'time';
      case 'uri':
        return 'url';
    }
  }

  // Long text uses textarea
  if (prop.maxLength && prop.maxLength > 200) {
    return 'textarea';
  }

  return 'text';
}

// =============================================================================
// UI Metadata Extraction
// =============================================================================

/**
 * Extracts UI configuration from a JSON Schema property.
 *
 * @param prop - JSON Schema property
 * @param key - Property key (name)
 * @param required - List of required fields
 * @returns UI configuration object
 */
export function extractUIConfig(
  prop: JSONSchemaProperty,
  key: string,
  required: string[] = [],
  codelistResolver?: (config: XCodelistOptions) => Array<{ label: string; value: string | number }>,
): {
  type: string;
  label: string;
  placeholder?: string;
  help?: string;
  required: boolean;
  options?: Array<{ label: string; value: string | number }>;
  hidden?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  prefix?: string;
  suffix?: string;
} {
  const xui = prop['x-ui'] || {};

  let options =
    xui.options || prop.enum?.map((v) => ({ label: String(v), value: v as string | number }));

  if (!options && prop['x-codelist'] && codelistResolver) {
    options = codelistResolver(prop['x-codelist']);
  }

  return {
    type: inferWidget(prop),
    label: xui.label || prop.title || key,
    placeholder: xui.placeholder || prop.description,
    help: xui.help,
    required: required.includes(key),
    options,
    hidden: xui.hidden,
    readOnly: xui.readOnly,
    disabled: xui.disabled,
    prefix: xui.prefix,
    suffix: xui.suffix,
  };
}

// =============================================================================
// Postgres Type Mapping
// =============================================================================

/**
 * Infers PostgreSQL type from a JSON Schema property.
 *
 * @param prop - JSON Schema property
 * @returns PostgreSQL type name
 * @remarks date is date, date-time is timestamptz. Null in nullable unions is excluded from physical type inference.
 * @throws When union contains multiple disparate types without x-db.type.
 */
export function inferPostgresType(prop: JSONSchemaProperty): string {
  // Prioritize x-db.type override if present
  if (prop['x-db']?.type) {
    return prop['x-db'].type;
  }

  const types = [...new Set((Array.isArray(prop.type) ? prop.type : [prop.type]).filter((type) => type !== 'null'))];
  // Integer is a subset of number. Other unions need an explicit storage type.
  if (types.includes('number') && types.includes('integer')) types.splice(types.indexOf('integer'), 1);
  if (types.length > 1) {
    throw new Error('Ambiguous SQL mapping at /type: supply /x-db/type for a multi-type union.');
  }
  const type = types[0];

  switch (type) {
    case 'boolean':
      return 'boolean';
    case 'integer':
      return 'integer';
    case 'number':
      return 'numeric';
    case 'array':
    case 'object':
      return 'jsonb';
  }

  // Inference based on format
  if (prop.format) {
    switch (prop.format) {
      case 'date-time':
        return 'timestamptz';
      case 'date':
        return 'date';
      case 'time':
        return 'time';
      case 'uuid':
        return 'uuid';
    }
  }

  return 'text';
}

// =============================================================================
// Convex Type Mapping
// =============================================================================

/**
 * Generates Convex validator code from a JSON Schema property.
 *
 * @param prop - JSON Schema property
 * @param indent - Indentation string
 * @returns Convex validator code
 */
export function inferConvexValidator(prop: JSONSchemaProperty, indent: string = ''): string {
  // Prioritize x-db.convexType override if present
  if (prop['x-db']?.convexType) {
    return prop['x-db'].convexType;
  }

  const type = Array.isArray(prop.type) ? prop.type[0] : prop.type;

  switch (type) {
    case 'boolean':
      return 'v.boolean()';
    case 'integer':
    case 'number':
      return 'v.number()';
    case 'array':
      if (prop.items) {
        return `v.array(${inferConvexValidator(prop.items, indent)})`;
      }
      return 'v.array(v.any())';
    case 'object':
      if (prop.properties) {
        const nestedIndent = indent + '  ';
        const props = Object.entries(prop.properties).map(([key, p]) => {
          const required = prop.required || [];
          let val = inferConvexValidator(p, nestedIndent);
          if (!required.includes(key)) {
            val = `v.optional(${val})`;
          }
          return `${nestedIndent}${key}: ${val}`;
        });
        return `v.object({\n${props.join(',\n')}\n${indent}})`;
      }
      return 'v.record(v.string(), v.any())';
  }

  // Foreign key references
  if (prop['x-db']?.foreignKey || prop['x-db']?.references) {
    const table = prop['x-db'].foreignKey?.table || prop['x-db'].references?.table;
    if (table) {
      return `v.id("${table}")`;
    }
  }

  // enum
  if (prop.enum && prop.enum.length > 0) {
    const literals = prop.enum.map((v) =>
      typeof v === 'string' ? `v.literal("${v}")` : `v.literal(${v})`,
    );
    return `v.union(${literals.join(', ')})`;
  }

  return 'v.string()';
}

// =============================================================================
// Schema Creation Helper
// =============================================================================

/**
 * Helper function to create a JSON Schema.
 *
 * @param schema - JSON Schema object
 * @returns The same schema (for type-safety)
 */
export function createJSONSchema<T extends JSONSchema>(schema: T): T {
  return schema;
}

// =============================================================================
// Extensions Envelope Helpers
// =============================================================================

export interface ExtensionEnvelopeSchemaOptions {
  /** Used when specifying data $ref */
  dataRef?: string;
  /** Used when embedding data schema directly */
  dataSchema?: JSONSchemaProperty;
}

export interface ExtensionDataRefOptions {
  /** Base URL for extension data schema */
  baseUrl?: string;
}

/**
 * Generates the $ref URL for an extension data schema.
 *
 * @param extension - Extension with namespace, extension_id, and version
 * @param options - Base URL options
 * @returns URL for data.schema.json
 */
export function buildExtensionDataRef(
  extension: { namespace: string; extension_id: string; version: string },
  options: ExtensionDataRefOptions = {},
): string {
  const baseUrl = options.baseUrl ?? 'https://spec.example.jp/nsb/v2/extensions';
  return `${baseUrl}/${extension.namespace}/${extension.extension_id}/${extension.version}/data.schema.json`;
}

/**
 * Generates an envelope schema within the extensions array.
 *
 * @param options - Options specifying data $ref or schema
 * @returns JSON Schema property
 */
export function extensionEnvelopeSchema(
  options: ExtensionEnvelopeSchemaOptions = {},
): JSONSchemaProperty {
  const dataSchema = options.dataRef
    ? { $ref: options.dataRef }
    : options.dataSchema || { type: 'object' };

  return {
    type: 'object',
    required: ['namespace', 'extension_id', 'version', 'data'],
    properties: {
      namespace: { type: 'string' },
      extension_id: { type: 'string' },
      version: { type: 'string' },
      data: dataSchema,
    },
  };
}

export interface HeaderSchemaOptions {
  /** enum restriction for doc_type */
  docTypes?: string[];
  /** enum restriction for profile */
  profiles?: string[];
  /** enum restriction for profile_version */
  profileVersions?: string[];
  /** enum restriction for schema_version */
  versions?: string[];
}

/**
 * Generates a schema for regional-edi common headers.
 *
 * @param options - enum restriction options
 * @returns JSON Schema property
 */
export function headerSchema(options: HeaderSchemaOptions = {}): JSONSchemaProperty {
  const header: JSONSchemaProperty = {
    type: 'object',
    required: ['schema_version', 'profile', 'doc_type', 'id', 'issue_date'],
    properties: {
      schema_version: { type: 'string' },
      profile: { type: 'string' },
      profile_version: { type: 'string' },
      doc_type: { type: 'string' },
      id: { type: 'string' },
      issue_date: { type: 'string', format: 'date' },
      extensions: { type: 'array', items: { type: 'object' } },
    },
  };

  if (options.versions)
    header.properties!.schema_version = { type: 'string', enum: options.versions };
  if (options.profiles) header.properties!.profile = { type: 'string', enum: options.profiles };
  if (options.profileVersions)
    header.properties!.profile_version = { type: 'string', enum: options.profileVersions };
  if (options.docTypes) header.properties!.doc_type = { type: 'string', enum: options.docTypes };

  return header;
}

// =============================================================================
// Default Values Generation
// =============================================================================

/**
 * Generates default values from a JSON Schema.
 *
 * @param schema - JSON Schema object
 * @returns Default values object
 */
export function generateJSONSchemaDefaults(schema: JSONSchema): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};

  if (!schema.properties) return defaults;

  for (const [key, prop] of Object.entries(schema.properties)) {
    if (prop.default !== undefined) {
      defaults[key] = prop.default;
      continue;
    }

    const type = Array.isArray(prop.type) ? prop.type[0] : prop.type;

    switch (type) {
      case 'string':
        defaults[key] = '';
        break;
      case 'number':
      case 'integer':
        defaults[key] = 0;
        break;
      case 'boolean':
        defaults[key] = false;
        break;
      case 'array':
        defaults[key] = [];
        break;
      case 'object':
        defaults[key] = {};
        break;
      default:
        defaults[key] = undefined;
    }
  }

  return defaults;
}

// =============================================================================
// Code List Enum Helpers
// =============================================================================

/**
 * Returns a JSON Schema with enums populated based on x-codelist.
 *
 * @param schema - JSON Schema
 * @param resolver - Function that returns enum array for a Code List
 * @returns JSON Schema with resolved enums
 */
export function applyCodelistEnums(
  schema: JSONSchema,
  resolver: (config: XCodelistOptions) => string[],
): JSONSchema {
  const applyToProperty = (prop: JSONSchemaProperty): JSONSchemaProperty => {
    const next: JSONSchemaProperty = { ...prop };

    if (!next.enum && next['x-codelist']) {
      next.enum = resolver(next['x-codelist']);
    }

    if (next.properties) {
      const updated: Record<string, JSONSchemaProperty> = {};
      for (const [key, child] of Object.entries(next.properties)) {
        updated[key] = applyToProperty(child);
      }
      next.properties = updated;
    }

    if (Array.isArray(next.prefixItems)) {
      next.prefixItems = next.prefixItems.map(applyToProperty);
    }

    if (next.items && typeof next.items === 'object') {
      next.items = applyToProperty(next.items);
    }

    if (next.additionalProperties && typeof next.additionalProperties === 'object') {
      next.additionalProperties = applyToProperty(next.additionalProperties);
    }

    if (next.unevaluatedProperties && typeof next.unevaluatedProperties === 'object') {
      next.unevaluatedProperties = applyToProperty(next.unevaluatedProperties);
    }

    if (next.dependentSchemas) {
      const updated: Record<string, JSONSchemaProperty> = {};
      for (const [key, child] of Object.entries(next.dependentSchemas)) {
        updated[key] = applyToProperty(child);
      }
      next.dependentSchemas = updated;
    }

    return next;
  };

  return applyToProperty(schema) as JSONSchema;
}

// =============================================================================
// x-rules Evaluation
// =============================================================================

/**
 * Function type that evaluates a JSONPath and returns an array of results.
 *
 * @param data - Target data to evaluate
 * @param jsonpath - JSONPath string
 * @returns Evaluation results as an array
 */
export type JsonPathResolver = (data: unknown, jsonpath: string) => unknown[];

export interface XRuleViolation {
  ruleId: string;
  severity: XRuleDefinition['severity'];
  message?: string;
  errorCode?: string;
  fieldPaths?: string[];
  target?: string;
  rule: XRuleDefinition;
}

/**
 * Evaluates an x-rules operand and returns it as an array.
 *
 * @param data - Target data to evaluate
 * @param operand - JSONPath or literal specification
 * @param resolver - JSONPath evaluation function
 * @returns Array of evaluated values
 */
function resolveOperandValues(
  data: unknown,
  operand: XRuleOperand,
  resolver: JsonPathResolver,
): unknown[] {
  if ('jsonpath' in operand) {
    return resolver(data, operand.jsonpath) ?? [];
  }
  if (Array.isArray(operand.literal)) {
    return operand.literal;
  }
  return [operand.literal];
}

/**
 * Returns number if valid number, otherwise null.
 *
 * @param value - Value to check
 * @returns Number if valid, otherwise null
 */
function coerceNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Evaluates a single x-rule.
 *
 * @param rule - Rule definition
 * @param data - Target data to evaluate
 * @param resolver - JSONPath evaluation function
 * @returns True if the rule is satisfied
 */
function evaluateRule(rule: XRuleDefinition, data: unknown, resolver: JsonPathResolver): boolean {
  if (rule.when?.jsonpath) {
    const hits = resolver(data, rule.when.jsonpath) ?? [];
    if (hits.length === 0) return true;
  }

  const leftValues = resolveOperandValues(data, rule.assert.left, resolver);
  const rightValues = resolveOperandValues(data, rule.assert.right, resolver);

  if (leftValues.length === 0) return false;

  switch (rule.assert.op) {
    case 'eq':
      return leftValues[0] === rightValues[0];
    case 'neq':
      return leftValues[0] !== rightValues[0];
    case 'lt': {
      const left = coerceNumber(leftValues[0]);
      const right = coerceNumber(rightValues[0]);
      return left !== null && right !== null && left < right;
    }
    case 'lte': {
      const left = coerceNumber(leftValues[0]);
      const right = coerceNumber(rightValues[0]);
      return left !== null && right !== null && left <= right;
    }
    case 'gt': {
      const left = coerceNumber(leftValues[0]);
      const right = coerceNumber(rightValues[0]);
      return left !== null && right !== null && left > right;
    }
    case 'gte': {
      const left = coerceNumber(leftValues[0]);
      const right = coerceNumber(rightValues[0]);
      return left !== null && right !== null && left >= right;
    }
    case 'in':
      return leftValues.every((value) => rightValues.includes(value));
    case 'nin':
      return leftValues.every((value) => !rightValues.includes(value));
    case 'regex': {
      const pattern = rightValues[0];
      if (typeof pattern !== 'string') return false;
      const regex = new RegExp(pattern);
      return leftValues.every((value) => typeof value === 'string' && regex.test(value));
    }
    case 'sum_eq': {
      let sum = 0;
      for (const value of leftValues) {
        const num = coerceNumber(value);
        if (num === null) return false;
        sum += num;
      }
      const right = coerceNumber(rightValues[0]);
      return right !== null && sum === right;
    }
  }
}

/**
 * Evaluates x-rules and returns list of violations.
 *
 * @param schema - JSON Schema (containing x-rules)
 * @param data - Target data to validate
 * @param resolver - JSONPath evaluation function
 * @returns Array of violations
 */
export function collectXRuleViolations(
  schema: JSONSchema,
  data: unknown,
  resolver: JsonPathResolver,
): XRuleViolation[] {
  const rules = schema['x-rules'] ?? [];
  const violations: XRuleViolation[] = [];

  for (const rule of rules) {
    const ok = evaluateRule(rule, data, resolver);
    if (!ok) {
      violations.push({
        ruleId: rule.id,
        severity: rule.severity,
        message: rule.message,
        errorCode: rule.error_code,
        fieldPaths: rule.field_paths,
        target: rule.target,
        rule,
      });
    }
  }

  return violations;
}

// =============================================================================
// Reporting Helpers
// =============================================================================

// =============================================================================

/**
 * Converts x-rules violations into a flattened array of errors.
 *
 * @param violations - x-rules violations
 * @returns Flattened array of errors
 */
export function flattenXRuleViolations(violations: XRuleViolation[]): FlatIssue[] {
  return violations.map((rule) => ({
    level: rule.severity,
    code: rule.errorCode ?? rule.ruleId,
    path: rule.fieldPaths?.[0] ?? rule.target ?? '$',
    message: rule.message ?? 'x-rule violation',
  }));
}
// =============================================================================
// Type Guards
// =============================================================================

/**
 * Determines whether a value is a JSONSchema.
 *
 * @param schema - Object to check
 * @returns True if value is a JSONSchema
 */
export function isJSONSchema(schema: unknown): schema is JSONSchema {
  if (!schema || typeof schema !== 'object') return false;
  const s = schema as Record<string, unknown>;
  // JSON Schema has 'properties' at root, legacy has 'fields'
  return 'properties' in s || s.type === 'object' || '$schema' in s;
}

// =============================================================================
// Format Conversion
// =============================================================================

import type { FieldType, FieldDefinition, SchemaDefinition } from './types';

/**
 * Converts JSON Schema type + format to FieldType.
 */
export function jsonSchemaTypeToFieldType(prop: JSONSchemaProperty): FieldType {
  const widget = prop['x-ui']?.widget;
  if (widget === 'textarea') return 'textarea';
  if (widget === 'password') return 'password';
  if (widget === 'prefecture') return 'prefecture';

  if (prop.enum && prop.enum.length > 0) return 'select';

  const type = Array.isArray(prop.type) ? prop.type[0] : prop.type;

  if (type === 'boolean') return 'boolean';
  if (type === 'integer' || type === 'number') return 'number';
  if (type === 'array') return 'array';
  if (type === 'object') return 'object';

  if (prop.format) {
    switch (prop.format) {
      case 'email':
        return 'email';
      case 'password':
        return 'password';
      case 'date':
        return 'date';
      case 'date-time':
        return 'datetime';
      case 'time':
        return 'time';
    }
  }

  if (prop.maxLength && prop.maxLength > 200) return 'textarea';

  return 'text';
}

/**
 * Converts a JSON Schema property to FieldDefinition.
 */
export function jsonSchemaPropertyToFieldDefinition(
  prop: JSONSchemaProperty,
  key: string,
  required: string[],
): FieldDefinition {
  const xui = prop['x-ui'] || {};
  const xdb = prop['x-db'] || {};

  const fieldDef: FieldDefinition = {
    type: jsonSchemaTypeToFieldType(prop),
    label: xui.label || prop.title,
    required: required.includes(key),
    placeholder: xui.placeholder || prop.description,
    description: xui.help || prop.description,
    hidden: xui.hidden,
    disabled: xui.disabled,
    minLength: prop.minLength,
    maxLength: prop.maxLength,
    min: prop.minimum,
    max: prop.maximum,
    pattern: prop.pattern,
    defaultValue: prop.default,
    unique: xdb.unique,
    primaryKey: xdb.primaryKey,
    group: xui.layout?.section,
  };

  // Options from x-ui or enum
  if (xui.options) {
    fieldDef.options = xui.options;
  } else if (prop.enum) {
    fieldDef.enum = prop.enum as (string | number)[];
  }

  // Foreign key
  const foreignKey = xdb.foreignKey || xdb.references;
  if (foreignKey) {
    fieldDef.references = {
      table: foreignKey.table,
      column:
        (foreignKey as { field?: string; column?: string }).field ??
        (foreignKey as { field?: string; column?: string }).column,
      onDelete: foreignKey.onDelete,
    };
  }

  // Nested structures
  if (prop.items) {
    fieldDef.items = jsonSchemaPropertyToFieldDefinition(prop.items, 'item', []);
  }
  if (prop.properties) {
    fieldDef.properties = {};
    for (const [k, p] of Object.entries(prop.properties)) {
      fieldDef.properties[k] = jsonSchemaPropertyToFieldDefinition(p, k, prop.required || []);
    }
  }

  return fieldDef;
}

/**
 * Converts a JSONSchema to SchemaDefinition.
 *
 * Used when components expect the legacy format.
 *
 * @param schema - JSON Schema object
 * @returns SchemaDefinition object
 *
 * @example
 * ```typescript
 * const legacy = jsonSchemaToSchemaDefinition(myJSONSchema);
 * <SchemaDetailPage schema={legacy} />
 * ```
 */
export function jsonSchemaToSchemaDefinition(schema: JSONSchema): SchemaDefinition {
  const required = schema.required || [];
  const fields: Record<string, FieldDefinition> = {};

  if (schema.properties) {
    for (const [key, prop] of Object.entries(schema.properties)) {
      fields[key] = jsonSchemaPropertyToFieldDefinition(prop, key, required);
    }
  }

  return {
    name: schema.title || schema['x-db']?.tableName || 'unnamed',
    table: schema['x-db']?.tableName,
    fields,
  };
}

/**
 * @deprecated Use normalizeToJSONSchema() instead.
 * Accepts a JSONSchema or SchemaDefinition and returns a SchemaDefinition.
 */
export function normalizeSchema(schema: JSONSchema | SchemaDefinition): SchemaDefinition {
  if (isJSONSchema(schema)) {
    return jsonSchemaToSchemaDefinition(schema);
  }
  return schema as SchemaDefinition;
}

// =============================================================================
// SchemaDefinition → JSONSchema Conversion
// =============================================================================

/**
 * Maps FieldType to JSON Schema type and format.
 */
function fieldTypeToJSONSchemaType(fieldType: FieldType): { type: string; format?: string } {
  switch (fieldType) {
    case 'text':
      return { type: 'string' };
    case 'number':
      return { type: 'number' };
    case 'email':
      return { type: 'string', format: 'email' };
    case 'tel':
      return { type: 'string', format: 'phone' };
    case 'zip':
      return { type: 'string' };
    case 'prefecture':
      return { type: 'string' };
    case 'password':
      return { type: 'string', format: 'password' };
    case 'date':
      return { type: 'string', format: 'date' };
    case 'time':
      return { type: 'string', format: 'time' };
    case 'timestring':
      return { type: 'string', format: 'time' };
    case 'datetime':
      return { type: 'string', format: 'date-time' };
    case 'file':
      return { type: 'string', format: 'uri' };
    case 'select':
      return { type: 'string' };
    case 'boolean':
      return { type: 'boolean' };
    case 'textarea':
      return { type: 'string' };
    case 'json':
      return { type: 'object' };
    case 'array':
      return { type: 'array' };
    case 'object':
      return { type: 'object' };
    default:
      return { type: 'string' };
  }
}

/**
 * Converts FieldDefinition to JSONSchemaProperty.
 */
function fieldDefinitionToJSONSchemaProperty(
  field: FieldDefinition,
  _isRequired: boolean,
): JSONSchemaProperty {
  const { type: jsonType, format } = fieldTypeToJSONSchemaType(field.type);
  const prop: JSONSchemaProperty = { type: jsonType as JSONSchemaProperty['type'] };

  if (format) prop.format = format;
  if (field.label) prop.title = field.label;
  if (field.description) prop.description = field.description;
  if (field.defaultValue !== undefined) prop.default = field.defaultValue;
  if (field.minLength !== undefined) prop.minLength = field.minLength;
  if (field.maxLength !== undefined) prop.maxLength = field.maxLength;
  if (field.min !== undefined) prop.minimum = field.min;
  if (field.max !== undefined) prop.maximum = field.max;
  if (field.pattern) prop.pattern = field.pattern;
  if (field.enum) prop.enum = field.enum;

  // x-ui extension
  const xui: Record<string, unknown> = {};
  if (field.label) xui.label = field.label;
  if (field.placeholder) xui.placeholder = field.placeholder;
  if (field.hidden) xui.hidden = true;
  if (field.disabled) xui.disabled = true;
  if (field.step !== undefined) xui.step = field.step;
  if (field.advanced) xui.advanced = true;
  if (field.width) xui.width = field.width;
  if (field.options) xui.options = field.options;

  // Widget inference from FieldType
  if (field.type === 'textarea') xui.widget = 'textarea';
  if (field.type === 'password') xui.widget = 'password';
  if (field.type === 'prefecture') xui.widget = 'prefecture';
  if (field.type === 'select') xui.widget = 'select';
  if (field.type === 'boolean') xui.widget = 'checkbox';

  // Layout section from group
  if (field.group) {
    xui.layout = { section: field.group };
  }
  if (field.span) {
    xui.layout = { ...((xui.layout as Record<string, unknown>) || {}), colSpan: field.span };
  }

  if (Object.keys(xui).length > 0) {
    prop['x-ui'] = xui as JSONSchemaProperty['x-ui'];
  }

  // x-db extension
  const xdb: Record<string, unknown> = {};
  if (field.primaryKey) xdb.primaryKey = true;
  if (field.unique) xdb.unique = true;
  if (field.references) {
    xdb.foreignKey = {
      table: field.references.table,
      field: field.references.column,
      onDelete: field.references.onDelete,
    };
  }
  if (Object.keys(xdb).length > 0) {
    prop['x-db'] = xdb as JSONSchemaProperty['x-db'];
  }

  // Nested structures
  if (field.items) {
    prop.items = fieldDefinitionToJSONSchemaProperty(field.items, false);
  }
  if (field.properties) {
    const nestedRequired: string[] = [];
    const nestedProps: Record<string, JSONSchemaProperty> = {};
    for (const [k, f] of Object.entries(field.properties)) {
      if (f.required) nestedRequired.push(k);
      nestedProps[k] = fieldDefinitionToJSONSchemaProperty(f, f.required || false);
    }
    prop.properties = nestedProps;
    if (nestedRequired.length > 0) prop.required = nestedRequired;
  }

  return prop;
}

/**
 * Converts SchemaDefinition (legacy) to JSONSchema.
 *
 * Converts legacy format schemas to JSON Schema 2020-12 + vendor extensions.
 *
 * @param schema - Legacy SchemaDefinition
 * @returns JSONSchema
 *
 * @example
 * ```typescript
 * const legacy: SchemaDefinition = { name: 'users', table: 'users', fields: { ... } };
 * const jsonSchema = schemaDefinitionToJSONSchema(legacy);
 * ```
 */
export function schemaDefinitionToJSONSchema(schema: SchemaDefinition): JSONSchema {
  const required: string[] = [];
  const properties: Record<string, JSONSchemaProperty> = {};

  for (const [key, field] of Object.entries(schema.fields)) {
    if (field.required) required.push(key);
    properties[key] = fieldDefinitionToJSONSchemaProperty(field, field.required || false);
  }

  const result: JSONSchema = {
    type: 'object',
    title: schema.name,
    properties,
  };

  if (required.length > 0) result.required = required;

  if (schema.table) {
    result['x-db'] = { tableName: schema.table };
  }

  if (schema.steps && schema.steps.length > 0) {
    result['x-steps'] = schema.steps;
  }

  return result;
}

/**
 * Normalizes a schema to JSONSchema (supports both formats).
 *
 * Accepts either JSONSchema or SchemaDefinition and always returns a JSONSchema.
 * UI components use this function internally to normalize inputs.
 *
 * @param schema - Schema in either format
 * @returns JSONSchema
 *
 * @example
 * ```typescript
 * // Both formats work
 * const normalized = normalizeToJSONSchema(legacyOrNewSchema);
 * ```
 */
export function normalizeToJSONSchema(schema: JSONSchema | SchemaDefinition): JSONSchema {
  if (isJSONSchema(schema)) {
    return schema as JSONSchema;
  }
  return schemaDefinitionToJSONSchema(schema as SchemaDefinition);
}
