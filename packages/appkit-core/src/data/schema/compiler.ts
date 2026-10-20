import { z } from 'zod';

/** Pure code/DDL generation. No UI or filesystem/DB connections. */
export * from './exporter';
export * from './verifier';
export * from './converter';
export * from './typegen';
export * from './inference';
export type { JSONSchema, JSONSchemaProperty } from './types';

import type { JSONSchema, JSONSchemaProperty, XRLSOptions, XRLSFieldHint } from './types';
import { inferPostgresType, inferConvexValidator, generateJSONSchemaDefaults } from './json-schema';
import { assertTableProperties, isDbNullable } from './db-mapping';

export type FieldType =
  | 'text'
  | 'number'
  | 'email'
  | 'tel'
  | 'zip'
  | 'prefecture'
  | 'password'
  | 'date'
  | 'time'
  | 'timestring'
  | 'datetime'
  | 'file'
  | 'select'
  | 'boolean'
  | 'textarea'
  | 'json'
  | 'array'
  | 'object';

export type RelationInputDisplay = 'key' | 'text' | 'both';
export type RelationSearchMode = 'dialog' | 'rightpane';

/**
 * Width hint for a field.
 * - short: narrow width (~150px) - postal code, prefecture, etc.
 * - medium: medium width (~300px) - form field default
 * - long: wide width (~450px) - address, long text, etc.
 * - full: full width (100%) - textarea, description, etc.
 */
export type FieldWidth = 'short' | 'medium' | 'long' | 'full';

export interface FieldRelationDefinition {
  displayField: string;
  inputDisplay?: RelationInputDisplay;
  validateKey?: boolean;
  searchMode?: RelationSearchMode;
  searchFields?: string[];
  searchTitle?: string;
}

export interface FieldDefinition {
  type: FieldType;
  label?: string;
  group?: string;
  /** Field width hint (used in responsive grid) */
  width?: FieldWidth;
  /** Mark as advanced field (displayed in collapsible section) */
  advanced?: boolean;
  /** Step number in multi-step forms (1-indexed) */
  step?: number;
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  options?: { label: string; value: string | number }[];
  enum?: Array<string | number>;
  placeholder?: string;
  description?: string;
  defaultValue?: unknown;
  unique?: boolean;
  primaryKey?: boolean;
  references?: {
    table: string;
    column?: string;
    onDelete?: 'cascade' | 'restrict' | 'set null' | 'no action';
    multiple?: boolean;
    ui?: FieldRelationDefinition;
  };
  /** UI state: field is disabled/readonly */
  disabled?: boolean;
  /** UI state: field is hidden */
  hidden?: boolean;
  /** Reference to an enum constant name (e.g. 'role', 'prefecture') */
  enumRef?: string;
  /** Grid column span (1-12) */
  span?: number;
  /** For 'array' type: defines the item schema */
  items?: FieldDefinition;
  /** For 'object' type: defines nested field schemas */
  properties?: Record<string, FieldDefinition>;
}

/**
 * Step definition for multi-step forms.
 */
export interface SchemaStep {
  /** Step identifier */
  name: string;
  /** Display title of the step */
  title: string;
  /** Step description (optional) */
  description?: string;
}

export interface SchemaDefinition {
  name: string;
  table?: string;
  fields: Record<string, FieldDefinition>;
  /** Multi-step form step definitions */
  steps?: SchemaStep[];
}

export type MongoFieldType =
  | typeof String
  | typeof Number
  | typeof Boolean
  | typeof Date
  | typeof Object;

export interface MongoFieldDefinition {
  type: MongoFieldType;
  required?: boolean;
  enum?: Array<string | number>;
  default?: unknown;
  unique?: boolean;
}

export type MongoSchemaDefinition = Record<string, MongoFieldDefinition>;

/**
 * Global schema registry.
 *
 * Manages JSONSchema schemas by name.
 * Key is schema.title or schema['x-db']?.tableName.
 */
export const schemaRegistry: Record<string, JSONSchema> = {};

/**
 * Registers a schema into the global registry.
 *
 * Registered schemas can be retrieved by name using getSchema().
 * The schema name is resolved from schema.title or schema['x-db']?.tableName.
 *
 * @param schema - JSONSchema to register
 * @returns Registered schema
 *
 * @example
 * ```typescript
 * import { registerSchema } from '@alneas/appkit-core/data/schema/compiler';
 *
 * registerSchema({
 *     type: 'object',
 *     title: 'users',
 *     properties: {
 *         id: { type: 'string', 'x-db': { primaryKey: true } },
 *         email: { type: 'string', format: 'email' },
 *     },
 *     required: ['id', 'email'],
 * });
 * ```
 */
export function registerSchema(schema: JSONSchema): JSONSchema {
  const name = schema.title || schema['x-db']?.tableName || 'unnamed';
  schemaRegistry[name] = schema;
  return schema;
}

/**
 * Retrieves a schema from the registry by name.
 *
 * @param name - Schema name to retrieve (title or tableName)
 * @returns JSONSchema, or undefined if not found
 *
 * @example
 * ```typescript
 * import { registerSchema, getSchema } from '@alneas/appkit-core/data/schema/compiler';
 *
 * registerSchema({ title: 'users', type: 'object', properties: { name: { type: 'string' } } });
 * const userSchema = getSchema('users');
 * if (userSchema) {
 *     console.log(userSchema.properties);
 * }
 * ```
 */
export function getSchema(name: string): JSONSchema | undefined {
  return schemaRegistry[name];
}

/**
 * Creates a JSONSchema definition.
 *
 * Type-safe helper function for defining schemas.
 * Returns the passed definition as-is, similar to createJSONSchema().
 *
 * @remarks
 * This is an identity helper, not a runtime validator. It does not clone or freeze
 * the schema. Validate data with createAjvValidator and keep compiled schemas immutable.
 *
 * @param schema - JSONSchema definition
 * @returns The same schema definition
 *
 * @example
 * ```typescript
 * import { createSchema } from '@alneas/appkit-core/data/schema/compiler';
 *
 * const userSchema = createSchema({
 *     type: 'object',
 *     title: 'users',
 *     properties: {
 *         id: { type: 'string', 'x-db': { primaryKey: true } },
 *         email: { type: 'string', format: 'email' },
 *     },
 *     required: ['id', 'email'],
 * });
 * ```
 */
export function createSchema<T extends JSONSchema>(schema: T): T {
  return schema;
}

/**
 * @deprecated Use createSchema() with JSONSchema instead.
 */
export function createSchemaLegacy(schema: SchemaDefinition): SchemaDefinition {
  return schema;
}

function getSelectValues(field: FieldDefinition): Array<string | number> | undefined {
  if (field.enum?.length) return field.enum;
  if (field.options?.length) return field.options.map((option) => option.value);
  return undefined;
}

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function formatDefaultValue(field: FieldDefinition): string | undefined {
  const { defaultValue } = field;
  if (defaultValue === undefined) return undefined;
  if (defaultValue === 'now') return 'now()';
  if (defaultValue instanceof Date) return `'${escapeSqlLiteral(defaultValue.toISOString())}'`;
  if (typeof defaultValue === 'string') return `'${escapeSqlLiteral(defaultValue)}'`;
  if (typeof defaultValue === 'number' || typeof defaultValue === 'boolean')
    return String(defaultValue);
  return undefined;
}

function resolvePostgresType(field: FieldDefinition): string {
  switch (field.type) {
    case 'number':
      return 'numeric';
    case 'boolean':
      return 'boolean';
    case 'date':
      return 'timestamptz';
    case 'time':
    case 'timestring':
      return 'time';
    case 'datetime':
      return 'timestamptz';
    case 'file':
      return 'text';
    case 'json':
    case 'array':
    case 'object':
      return 'jsonb';
    case 'text':
    case 'email':
    case 'tel':
    case 'zip':
    case 'prefecture':
    case 'password':
    case 'textarea':
    case 'select':
    default:
      return 'text';
  }
}

/**
 * Helper function that recursively generates a Zod validator from a JSONSchemaProperty.
 */
function constrainEnum<T extends z.ZodTypeAny>(validator: T, values: JSONSchemaProperty['enum']): T {
  if (!values) return validator;
  const equal = (a: unknown, b: unknown): boolean => Object.is(a, b) || (Array.isArray(a) && Array.isArray(b) ? a.length === b.length && a.every((v, i) => equal(v, b[i])) : !!a && !!b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b) && Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(k => Object.hasOwn(b, k) && equal((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])));
  return validator.refine(value => values.some(item => equal(item, value)), 'Value is not in enum');
}

/** Preserve required even for keys not declared in properties, without overriding additionalProperties. */
function objectToZod(prop: JSONSchemaProperty): z.ZodObject<z.ZodRawShape> {
  const shape: Record<string, z.ZodTypeAny> = {};
  const required = prop.required ?? [];
  // Zod intentionally skips this key internally; claiming to validate it would
  // silently accept invalid values. Keep it outside the supported conversion subset.
  if (Object.hasOwn(prop.properties ?? {}, '__proto__') || required.includes('__proto__')) {
    throw new Error('Zod conversion does not support the __proto__ property; validate this schema with AJV');
  }
  for (const [key, property] of Object.entries(prop.properties ?? {})) {
    const validator = jsonSchemaPropertyToZodValidator(property);
    Object.defineProperty(shape, key, { value: required.includes(key) ? validator : validator.optional(), enumerable: true, configurable: true });
  }
  let object = z.object(shape);
  if (prop.additionalProperties === false) object = object.strict();
  else if (prop.additionalProperties && typeof prop.additionalProperties === 'object') object = object.catchall(jsonSchemaPropertyToZodValidator(prop.additionalProperties));
  else object = object.passthrough();
  // Ordinary declared required fields already enforce presence. Avoid adding needless
  // refinements, so callers can still use Zod's .extend() on those object schemas.
  const presenceChecks = required.filter(key => !Object.hasOwn(shape, key) || shape[key].safeParse(undefined).success);
  if (!presenceChecks.length) return object;
  return object.superRefine((data, context) => {
    for (const key of presenceChecks) {
      if (!Object.hasOwn(data, key)) context.addIssue({ code: 'custom', path: [key], message: 'Required property is missing' });
    }
  });
}

function jsonSchemaPropertyToZodValidator(prop: JSONSchemaProperty): z.ZodTypeAny {
  let validator: z.ZodTypeAny;
  const xzod = prop['x-zod'];
  const format = prop.format;

  // Handle union-valued types, e.g. type: ['string', 'null']
  if (Array.isArray(prop.type)) {
    const types = prop.type as string[];
    const nonNullTypes = types.filter((t) => t !== 'null');
    const hasNull = types.includes('null');

    let baseValidator: z.ZodTypeAny;
    if (nonNullTypes.length === 0) {
      if (!hasNull) throw new Error('A type union cannot be empty');
      return constrainEnum(z.null(), prop.enum);
    }
    if (nonNullTypes.length === 1) {
      baseValidator = jsonSchemaPropertyToZodValidator({ ...prop, type: nonNullTypes[0] as any });
    } else {
      const validators = nonNullTypes.map((t) =>
        jsonSchemaPropertyToZodValidator({ ...prop, type: t as any }),
      );
      baseValidator =
        validators.length > 1
          ? z.union(validators as unknown as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]])
          : z.unknown();
    }
    return constrainEnum(hasNull ? baseValidator.nullable() : baseValidator, prop.enum);
  }

  switch (prop.type) {
    case 'null': validator = z.null(); break;
    case 'string': {
      let stringVal = z.string();
      if (format === 'email') stringVal = stringVal.email();
      if (format === 'tel') stringVal = stringVal.regex(/^[0-9+()\-\s]{6,20}$/);
      if (format === 'zip') stringVal = stringVal.regex(/^\d{3}-?\d{4}$/);
      if (format === 'date-time') {
        stringVal = stringVal.datetime();
      }
      if (format === 'time') {
        stringVal = stringVal.regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/);
      }
      // date intentionally checks string type only, while retaining other string constraints.
      if (typeof prop.minLength === 'number') stringVal = stringVal.min(prop.minLength);
      if (typeof prop.maxLength === 'number') stringVal = stringVal.max(prop.maxLength);
      if (prop.pattern) stringVal = stringVal.regex(new RegExp(prop.pattern));
      validator = stringVal;
      break;
    }
    case 'number':
    case 'integer': {
      let numVal = xzod?.coerce ? z.coerce.number() : z.number();
      if (prop.minimum !== undefined) numVal = numVal.min(prop.minimum);
      if (prop.maximum !== undefined) numVal = numVal.max(prop.maximum);
      if (typeof prop.multipleOf === 'number' && prop.multipleOf > 0) {
        numVal = numVal.multipleOf(prop.multipleOf);
      }
      if (prop.type === 'integer') numVal = numVal.int();
      validator = numVal;
      break;
    }
    case 'boolean':
      validator = z.boolean();
      break;
    case 'array': {
      let arrayVal: z.ZodArray<any>;
      if (prop.items && typeof prop.items === 'object' && !Array.isArray(prop.items)) {
        arrayVal = z.array(jsonSchemaPropertyToZodValidator(prop.items as JSONSchemaProperty));
      } else {
        arrayVal = z.array(z.unknown());
      }
      if (typeof prop.minItems === 'number') {
        arrayVal = arrayVal.min(prop.minItems);
      }
      if (typeof prop.maxItems === 'number') {
        arrayVal = arrayVal.max(prop.maxItems);
      }
      validator = arrayVal;
      break;
    }
    case 'object': {
      validator = objectToZod(prop);
      break;
    }
    default: {
      // Handle format-based fallback for file uploads
      if (format === 'uri' || format === 'data-url') {
        const fileSchema = typeof File !== 'undefined' ? z.instanceof(File) : z.never();
        validator = z.union([z.string(), fileSchema]);
      } else {
        validator = z.unknown();
      }
    }
  }


  return constrainEnum(validator, prop.enum);
}

/**
 * Generates a Zod validation schema from a JSONSchema.
 *
 * Produces appropriate Zod validators according to property type/format,
 * applying implemented JSON Schema constraints and supported x-zod extensions.
 *
 * @remarks
 * Partial conversion, not a JSON Schema evaluator. additionalProperties, type
 * unions and positive multipleOf are supported. Exclusive bounds, composition,
 * references and advanced array constraints are not generally preserved. format: date only
 * checks string type. Use createAjvValidator at the authoritative JSON boundary.
 * Only implemented x-zod options take effect; declarations do not imply support.
 * Root/nested required entries are checked even without properties declarations;
 * enum applies at the root as well as to nested values.
 * Declared/required __proto__ properties are rejected at conversion time.
 *
 * @param schema - JSONSchema schema
 * @returns Zod object schema
 *
 * @example
 * ```typescript
 * import { generateZodSchema, type JSONSchema } from '@alneas/appkit-core/data/schema/compiler';
 *
 * const userSchema = {
 *   title: 'users', type: 'object',
 *   properties: { email: { type: 'string', format: 'email' } }, required: ['email'],
 * } satisfies JSONSchema;
 * const zodSchema = generateZodSchema(userSchema);
 * const result = zodSchema.safeParse({ email: 'ada@example.com' });
 * console.log(result.success); // true
 * ```
 */
export function generateZodSchema(schema: JSONSchema): z.ZodObject<z.ZodRawShape> {
  return constrainEnum(objectToZod(schema), schema.enum);
}

/**
 * @deprecated Use generateZodSchema() with JSONSchema instead.
 */
function fieldToZodValidator(field: FieldDefinition): z.ZodTypeAny {
  let validator: z.ZodTypeAny;

  switch (field.type) {
    case 'text':
    case 'email':
    case 'tel':
    case 'zip':
    case 'prefecture':
    case 'password':
    case 'textarea':
    case 'select': {
      const selectValues = getSelectValues(field);
      if (field.type === 'select' && selectValues?.length) {
        if (selectValues.every((value) => typeof value === 'string')) {
          validator = z.enum(selectValues as [string, ...string[]]);
        } else {
          validator = z.union(
            selectValues.map((value) => z.literal(value)) as unknown as [
              z.ZodTypeAny,
              ...z.ZodTypeAny[],
            ],
          );
        }
        break;
      }

      let stringVal = z.string();
      if (field.type === 'email') stringVal = stringVal.email();
      if (field.type === 'tel') stringVal = stringVal.regex(/^[0-9+()\-\s]{6,20}$/);
      if (field.type === 'zip') stringVal = stringVal.regex(/^\d{3}-?\d{4}$/);
      if (field.minLength) stringVal = stringVal.min(field.minLength);
      if (field.maxLength) stringVal = stringVal.max(field.maxLength);
      if (field.pattern) stringVal = stringVal.regex(new RegExp(field.pattern));
      validator = stringVal;
      break;
    }
    case 'number': {
      let numVal = z.number();
      if (field.min !== undefined) numVal = numVal.min(field.min);
      if (field.max !== undefined) numVal = numVal.max(field.max);
      validator = numVal;
      break;
    }
    case 'boolean':
      validator = z.boolean();
      break;
    case 'date':
      validator = z.date();
      break;
    case 'time':
      validator = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/);
      break;
    case 'timestring':
      validator = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
      break;
    case 'datetime':
      validator = z.string().datetime();
      break;
    case 'file': {
      const fileSchema = typeof File !== 'undefined' ? z.instanceof(File) : z.never();
      validator = z.union([z.string(), fileSchema]);
      break;
    }
    case 'json':
      validator = z.unknown();
      break;
    case 'array': {
      if (field.items) {
        validator = z.array(fieldToZodValidator(field.items));
      } else {
        validator = z.array(z.unknown());
      }
      break;
    }
    case 'object': {
      if (field.properties) {
        const nestedShape: Record<string, z.ZodTypeAny> = {};
        for (const [propKey, propField] of Object.entries(field.properties)) {
          let propValidator = fieldToZodValidator(propField);
          if (propField.required === false) {
            propValidator = propValidator.optional();
          }
          nestedShape[propKey] = propValidator;
        }
        validator = z.object(nestedShape);
      } else {
        validator = z.record(z.string(), z.unknown());
      }
      break;
    }
    default:
      validator = z.string();
  }

  return validator;
}

/**
 * @deprecated Use generateZodSchema() with JSONSchema instead.
 */
export function generateZodSchemaLegacy(schema: SchemaDefinition): z.ZodObject<z.ZodRawShape> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const [key, field] of Object.entries(schema.fields)) {
    let validator = fieldToZodValidator(field);

    if (field.required === false) {
      validator = validator.optional();
    }

    shape[key] = validator;
  }

  return z.object(shape);
}

/**
 * Serializes a JSON Schema into a module that calls generateZodSchema at runtime.
 *
 * @param schema - JSON-serializable schema; title, then x-db.tableName, then
 * "unnamed" supplies the export-name prefix. Non-identifier characters become
 * underscores and a leading digit receives an underscore prefix.
 * @returns Module source importing generateZodSchema from "./compiler" and exporting
 * the named schema by passing JSON.parse of the serialized input to that helper.
 * @throws Throws if JSON serialization fails, for example for cyclic input or BigInt.
 * @remarks
 * The output is not a standalone z.object expression and this function does not
 * validate or compile the schema. Evaluating the emitted module runs the helper
 * and can raise its schema-conversion errors. Provide a sibling compiler module
 * exporting generateZodSchema and a resolver that supports the emitted extensionless
 * import; native Node.js ESM does not resolve that import without adjustment.
 * The runtime helper uses Zod, which is a Core dependency.
 * @example
 * ```typescript
 * import { generateZodSchemaCode } from '@alneas/appkit-core/data/schema/compiler';
 *
 * const code = generateZodSchemaCode({
 *   title: 'users', type: 'object', properties: { name: { type: 'string' } },
 * });
 * console.log(code);
 * // First line: import { generateZodSchema } from "./compiler";
 * // Second line exports usersSchema = generateZodSchema(JSON.parse(...)).
 * // For a bundler that resolves extensionless imports, a sibling compiler.ts can contain:
 * // export { generateZodSchema } from '@alneas/appkit-core/data/schema/compiler';
 * ```
 */
export function generateZodSchemaCode(schema: JSONSchema): string {
  const raw = schema.title || schema['x-db']?.tableName || 'unnamed';
  const name = raw.replace(/[^A-Za-z0-9_$]/g, '_').replace(/^(?=[0-9])/, '_');
  // Keep code and runtime conversion identical. JSON.parse preserves own keys
  // (including __proto__) and string literals cannot escape into generated code.
  return 'import { generateZodSchema } from "./compiler";\n' +
    `export const ${name}Schema = generateZodSchema(JSON.parse(${JSON.stringify(JSON.stringify(schema))}));`;

}

/**
 * @deprecated Use generateZodSchemaCode() with JSONSchema instead.
 */
export function generateZodSchemaCodeLegacy(schema: SchemaDefinition): string {
  const lines: string[] = [`export const ${schema.name}Schema = z.object({`];
  for (const [key, field] of Object.entries(schema.fields)) {
    let validatorCode: string;
    switch (field.type) {
      case 'text':
      case 'textarea':
      case 'email':
      case 'tel':
      case 'zip':
      case 'prefecture':
      case 'password':
        validatorCode = 'z.string()';
        if (field.type === 'email') validatorCode += '.email()';
        if (field.minLength) validatorCode += `.min(${field.minLength})`;
        if (field.maxLength) validatorCode += `.max(${field.maxLength})`;
        if (field.pattern) validatorCode += `.regex(/${field.pattern}/)`;
        break;
      case 'number':
        validatorCode = 'z.number()';
        if (field.min !== undefined) validatorCode += `.min(${field.min})`;
        if (field.max !== undefined) validatorCode += `.max(${field.max})`;
        break;
      case 'boolean':
        validatorCode = 'z.boolean()';
        break;
      case 'date':
        validatorCode = 'z.date()';
        break;
      case 'datetime':
        validatorCode = 'z.string().datetime()';
        break;
      case 'select': {
        const values = getSelectValues(field);
        if (values?.length) {
          if (values.every((v) => typeof v === 'string')) {
            validatorCode = `z.enum([${values.map((v) => `'${v}'`).join(', ')}])`;
          } else {
            validatorCode = `z.union([${values.map((v) => `z.literal(${typeof v === 'string' ? `'${v}'` : v})`).join(', ')}])`;
          }
        } else {
          validatorCode = 'z.string()';
        }
        break;
      }
      default:
        validatorCode = 'z.string()';
    }
    if (field.required === false) validatorCode += '.optional()';
    lines.push(`  ${key}: ${validatorCode},`);
  }
  lines.push('});');
  return lines.join('\n');
}

/**
 * Generates a MongoDB/Mongoose schema definition from a JSONSchema.
 *
 * @param schema - JSONSchema schema
 * @returns Mongoose schema definition object
 *
 * @example
 * ```typescript
 * import { generateMongoSchema, type JSONSchema } from '@alneas/appkit-core/data/schema/compiler';
 *
 * const userSchema = {
 *   title: 'users', type: 'object',
 *   properties: { email: { type: 'string', format: 'email' } }, required: ['email'],
 * } satisfies JSONSchema;
 * const mongoSchema = generateMongoSchema(userSchema);
 * console.log(mongoSchema.email); // Definition data; no database connection is created.
 * ```
 */
export function generateMongoSchema(schema: JSONSchema): MongoSchemaDefinition {
  const mongoSchema: MongoSchemaDefinition = {};
  const required = schema.required || [];

  for (const [key, prop] of Object.entries(schema.properties || {})) {
    let type: MongoFieldType;

    switch (prop.type) {
      case 'number':
      case 'integer':
        type = Number;
        break;
      case 'boolean':
        type = Boolean;
        break;
      case 'string':
        if (prop.format === 'date' || prop.format === 'date-time') {
          type = Date;
        } else {
          type = String;
        }
        break;
      case 'object':
        type = Object;
        break;
      case 'array':
        type = Object;
        break;
      default:
        type = String;
    }

    mongoSchema[key] = {
      type,
      required: required.includes(key),
      enum: prop.enum as Array<string | number> | undefined,
      default: prop.default,
      unique: prop['x-db']?.unique,
    };
  }

  return mongoSchema;
}

/**
 * @deprecated Use generateMongoSchema() with JSONSchema instead.
 */
export function generateMongoSchemaLegacy(schema: SchemaDefinition): MongoSchemaDefinition {
  const mongoSchema: MongoSchemaDefinition = {};
  for (const [key, field] of Object.entries(schema.fields)) {
    let type: MongoFieldType;
    switch (field.type) {
      case 'number':
        type = Number;
        break;
      case 'boolean':
        type = Boolean;
        break;
      case 'date':
      case 'datetime':
        type = Date;
        break;
      case 'json':
      case 'object':
      case 'array':
        type = Object;
        break;
      default:
        type = String;
    }
    mongoSchema[key] = {
      type,
      required: field.required === true,
      enum: getSelectValues(field),
      default: field.defaultValue,
      unique: field.unique,
    };
  }
  return mongoSchema;
}

/**
 * @deprecated Use generateSqlFromJSONSchema() instead.
 */
export function generateSupabaseTableSql(schema: SchemaDefinition): string {
  const tableName = schema.table ?? schema.name;
  const columns = Object.entries(schema.fields).map(([key, field]) => {
    const parts: string[] = [quoteIdentifier(key), resolvePostgresType(field)];
    if (field.primaryKey) {
      parts.push('primary key');
    } else if (field.required !== false) {
      parts.push('not null');
    }
    if (field.unique) parts.push('unique');
    const defaultValue = formatDefaultValue(field);
    if (defaultValue) parts.push(`default ${defaultValue}`);
    if (field.references) {
      const column = field.references.column ?? 'id';
      const onDelete = field.references.onDelete ? ` on delete ${field.references.onDelete}` : '';
      parts.push(
        `references ${quoteIdentifier(field.references.table)}(${quoteIdentifier(column)})${onDelete}`,
      );
    }
    return parts.join(' ');
  });
  return `create table ${quoteIdentifier(tableName)} (\n  ${columns.join(',\n  ')}\n);`;
}

/**
 * Generates default values object for forms from a JSONSchema.
 *
 * Delegates to generateJSONSchemaDefaults() in json-schema.ts.
 *
 * @param schema - JSONSchema schema
 * @returns Default values object
 *
 * @example
 * ```typescript
 * import { generateDefaultValues, type JSONSchema } from '@alneas/appkit-core/data/schema/compiler';
 *
 * const userSchema = {
 *   title: 'users', type: 'object',
 *   properties: { name: { type: 'string', default: 'Guest' } },
 * } satisfies JSONSchema;
 * console.log(generateDefaultValues(userSchema).name); // 'Guest'
 * ```
 */
export function generateDefaultValues(schema: JSONSchema): Record<string, unknown> {
  return generateJSONSchemaDefaults(schema);
}

/**
 * @deprecated Use generateDefaultValues() with JSONSchema instead.
 */
export function generateDefaultValuesLegacy(schema: SchemaDefinition): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(schema.fields)) {
    if (field.defaultValue !== undefined) {
      defaults[key] = field.defaultValue;
      continue;
    }
    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
      case 'zip':
      case 'prefecture':
      case 'password':
      case 'textarea':
      case 'select':
      case 'time':
      case 'timestring':
      case 'datetime':
      case 'file':
        defaults[key] = '';
        break;
      case 'number':
        defaults[key] = 0;
        break;
      case 'boolean':
        defaults[key] = false;
        break;
      case 'date':
      case 'json':
        defaults[key] = undefined;
        break;
    }
  }
  return defaults;
}

/**
 * @deprecated Use generateConvexFromJSONSchema() instead.
 */
export function generateConvexSchemaCode(schema: SchemaDefinition): string {
  const tableName = schema.table ?? schema.name;
  const lines: string[] = [
    'import { defineSchema, defineTable } from "convex/server";',
    'import { v } from "convex/values";',
    '',
    'export default defineSchema({',
    `  ${tableName}: defineTable({`,
  ];
  for (const [key, field] of Object.entries(schema.fields)) {
    if (key === '_id' || key === '_creationTime') continue;
    let validatorCode = fieldToConvexValidator(field, '    ');
    if (field.required === false) validatorCode = `v.optional(${validatorCode})`;
    lines.push(`    ${key}: ${validatorCode},`);
  }
  lines.push('  }),');
  lines.push('});');
  return lines.join('\n');
}

/**
 * @deprecated Use generateConvexFromJSONSchemaMultiple() instead.
 */
export function generateConvexSchemaCodeMultiple(schemas: SchemaDefinition[]): string {
  const lines: string[] = [
    'import { defineSchema, defineTable } from "convex/server";',
    'import { v } from "convex/values";',
    '',
    'export default defineSchema({',
  ];
  for (const schema of schemas) {
    const tableName = schema.table ?? schema.name;
    lines.push(`  ${tableName}: defineTable({`);
    for (const [key, field] of Object.entries(schema.fields)) {
      if (key === '_id' || key === '_creationTime') continue;
      let validatorCode = fieldToConvexValidator(field, '    ');
      if (field.required === false) validatorCode = `v.optional(${validatorCode})`;
      lines.push(`    ${key}: ${validatorCode},`);
    }
    lines.push('  }),');
  }
  lines.push('});');
  return lines.join('\n');
}

/** @deprecated Legacy helper - use inferConvexValidator from json-schema.ts */
function fieldToConvexValidator(field: FieldDefinition, indent: string = ''): string {
  let validatorCode: string;
  switch (field.type) {
    case 'text':
    case 'email':
    case 'tel':
    case 'zip':
    case 'prefecture':
    case 'password':
    case 'textarea':
    case 'time':
    case 'timestring':
      validatorCode = 'v.string()';
      break;
    case 'number':
      validatorCode = 'v.number()';
      break;
    case 'boolean':
      validatorCode = 'v.boolean()';
      break;
    case 'date':
    case 'datetime':
      validatorCode = 'v.number()';
      break;
    case 'file':
      validatorCode = 'v.string()';
      break;
    case 'select': {
      const values = getSelectValues(field);
      if (values?.length) {
        const literals = values.map((v) =>
          typeof v === 'string' ? `v.literal("${v}")` : `v.literal(${v})`,
        );
        validatorCode = `v.union(${literals.join(', ')})`;
      } else {
        validatorCode = 'v.string()';
      }
      break;
    }
    case 'json':
      validatorCode = 'v.any()';
      break;
    case 'array':
      validatorCode = field.items
        ? `v.array(${fieldToConvexValidator(field.items, indent)})`
        : 'v.array(v.any())';
      break;
    case 'object':
      if (field.properties) {
        const nestedIndent = indent + '  ';
        const props = Object.entries(field.properties).map(([propKey, propField]) => {
          let pv = fieldToConvexValidator(propField, nestedIndent);
          if (propField.required === false) pv = `v.optional(${pv})`;
          return `${nestedIndent}${propKey}: ${pv}`;
        });
        validatorCode = `v.object({\n${props.join(',\n')}\n${indent}})`;
      } else {
        validatorCode = 'v.record(v.string(), v.any())';
      }
      break;
    default:
      validatorCode = 'v.string()';
  }
  if (field.references?.table) {
    validatorCode = `v.id("${field.references.table}")`;
    if (field.references.multiple) validatorCode = `v.array(${validatorCode})`;
  }
  return validatorCode;
}

// =============================================================================
// JSON Schema Based Generators
// =============================================================================

/**
 * Escapes an SQL identifier.
 */
function quoteId(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function getReferenceColumn(reference: { field?: string; column?: string }): string {
  return reference.field ?? reference.column ?? 'id';
}

/**
 * Generates Supabase/PostgreSQL CREATE TABLE SQL from a JSON Schema.
 *
 * @param schema - JSON Schema object
 * @returns CREATE TABLE SQL statement
 * @throws When /properties is empty or unspecified (bundle callers should explicitly pass selected tables).
 * @remarks Prioritizes x-db.nullable; respects nullable types if unspecified. Primary keys are always NOT NULL.
 *
 * @example
 * ```typescript
 * import { generateSqlFromJSONSchema, type JSONSchema } from '@alneas/appkit-core/data/schema/compiler';
 *
 * const userSchema = {
 *   title: 'users', type: 'object',
 *   properties: { id: { type: 'string', 'x-db': { primaryKey: true } }, name: { type: 'string' } },
 * } satisfies JSONSchema;
 * console.log(generateSqlFromJSONSchema(userSchema)); // Review the generated DDL before execution.
 * ```
 */
export function generateSqlFromJSONSchema(schema: JSONSchema): string {
  const tableName = schema['x-db']?.tableName || schema.title || 'unnamed';
  const required = schema.required || [];
  const tableChecks: string[] = [];

  assertTableProperties(schema);

  const columns = Object.entries(schema.properties).map(([key, prop]) => {
    const xdb = prop['x-db'] || {};
    const columnName = xdb.columnName || xdb.column || key;
    const parts: string[] = [quoteId(columnName), inferPostgresType(prop)];

    // Primary key with optional default
    if (xdb.primaryKey) {
      parts.push('primary key');
      if (xdb.default) {
        parts.push(`default ${xdb.default}`);
      }
    } else if (!isDbNullable(prop, required.includes(key))) {
      parts.push('not null');
    }

    if (xdb.unique) {
      parts.push('unique');
    }

    // Default value (skip if already added for primary key)
    if (!xdb.primaryKey && xdb.default) {
      parts.push(`default ${xdb.default}`);
    } else if (!xdb.primaryKey && prop.default !== undefined) {
      if (typeof prop.default === 'string') {
        parts.push(`default '${prop.default.replace(/'/g, "''")}'`);
      } else if (typeof prop.default === 'number' || typeof prop.default === 'boolean') {
        parts.push(`default ${prop.default}`);
      }
    }

    // CHECK constraint from x-db.check
    if (xdb.check) {
      parts.push(`check (${xdb.check})`);
    }
    // CHECK constraint from enum (if not using x-db.check)
    else if (prop.enum && prop.enum.length > 0 && prop.type === 'string') {
      const enumValues = prop.enum.map((v) => `'${String(v).replace(/'/g, "''")}'`).join(', ');
      tableChecks.push(`check (${quoteId(columnName)} in (${enumValues}))`);
    }

    const foreignKey = xdb.foreignKey || xdb.references;
    if (foreignKey) {
      const refColumn = getReferenceColumn(foreignKey);
      const onDelete = foreignKey.onDelete ? ` on delete ${foreignKey.onDelete}` : '';
      parts.push(`references ${quoteId(foreignKey.table)}(${quoteId(refColumn)})${onDelete}`);
    }

    return parts.join(' ');
  });

  // Add table-level CHECK constraints
  const allConstraints = [...columns, ...tableChecks];
  const mainTableSql = `create table ${quoteId(tableName)} (\n  ${allConstraints.join(',\n  ')}\n);`;

  // Generate sub-tables from $defs
  const subTablesSql: string[] = [];
  if (schema.$defs) {
    for (const [, defSchema] of Object.entries(schema.$defs)) {
      const defXdb = defSchema['x-db'] as
        | { asTable?: { tableName: string; parentColumn?: string; onDeleteCascade?: boolean } }
        | undefined;
      if (defXdb?.asTable) {
        const subTableName = defXdb.asTable.tableName;
        const parentColumn = defXdb.asTable.parentColumn || `${tableName.replace(/s$/, '')}_id`;
        const onDeleteCascade = defXdb.asTable.onDeleteCascade !== false;

        const subColumns: string[] = [
          `${quoteId('id')} uuid primary key default gen_random_uuid()`,
          `${quoteId(parentColumn)} uuid not null references ${quoteId(tableName)}(id)${onDeleteCascade ? ' on delete cascade' : ''}`,
        ];

        // Add columns from $defs properties
        if (defSchema.properties) {
          const defRequired = defSchema.required || [];
          for (const [propKey, propDef] of Object.entries(defSchema.properties)) {
            if (propKey === 'id') continue; // Skip id, already added
            const propXdb = propDef['x-db'] || {};
            const colName = propXdb.columnName || propXdb.column || propKey;
            const colParts: string[] = [quoteId(colName), inferPostgresType(propDef)];

            if (!isDbNullable(propDef, defRequired.includes(propKey))) {
              colParts.push('not null');
            }
            if (propXdb.default) {
              colParts.push(`default ${propXdb.default}`);
            } else if (propDef.default !== undefined) {
              if (typeof propDef.default === 'string') {
                colParts.push(`default '${propDef.default.replace(/'/g, "''")}'`);
              } else if (
                typeof propDef.default === 'number' ||
                typeof propDef.default === 'boolean'
              ) {
                colParts.push(`default ${propDef.default}`);
              }
            }
            if (propXdb.check) {
              colParts.push(`check (${propXdb.check})`);
            } else if (propDef.enum && propDef.enum.length > 0 && propDef.type === 'string') {
              const enumValues = propDef.enum
                .map((v) => `'${String(v).replace(/'/g, "''")}'`)
                .join(', ');
              colParts.push(`check (${quoteId(colName)} in (${enumValues}))`);
            }

            const propFk = propXdb.foreignKey || propXdb.references;
            if (propFk) {
              const refCol = getReferenceColumn(propFk);
              const del = propFk.onDelete ? ` on delete ${propFk.onDelete}` : '';
              colParts.push(`references ${quoteId(propFk.table)}(${quoteId(refCol)})${del}`);
            }

            subColumns.push(colParts.join(' '));
          }
        }

        subTablesSql.push(
          `create table ${quoteId(subTableName)} (\n  ${subColumns.join(',\n  ')}\n);`,
        );
      }
    }
  }

  // Combine main table and sub-tables
  if (subTablesSql.length > 0) {
    return mainTableSql + '\n\n' + subTablesSql.join('\n\n');
  }
  return mainTableSql;
}

/**
 * Generates Convex schema.ts code from a JSON Schema.
 *
 * @param schema - JSON Schema object
 * @returns Code string for Convex schema.ts
 *
 * @example
 * ```typescript
 * import { generateConvexFromJSONSchema, type JSONSchema } from '@alneas/appkit-core/data/schema/compiler';
 *
 * const userSchema = {
 *   title: 'users', type: 'object',
 *   properties: { name: { type: 'string' } }, required: ['name'],
 * } satisfies JSONSchema;
 * console.log(generateConvexFromJSONSchema(userSchema)); // Generated source text; no Convex client is required here.
 * ```
 */
export function generateConvexFromJSONSchema(schema: JSONSchema): string {
  const tableName = schema['x-db']?.tableName || schema.title || 'unnamed';
  const required = schema.required || [];

  const lines: string[] = [
    'import { defineSchema, defineTable } from "convex/server";',
    'import { v } from "convex/values";',
    '',
    'export default defineSchema({',
    `  ${tableName}: defineTable({`,
  ];

  if (schema.properties) {
    for (const [key, prop] of Object.entries(schema.properties)) {
      // Skip Convex system fields
      if (key === '_id' || key === '_creationTime') continue;

      let validatorCode = inferConvexValidator(prop, '    ');

      if (!required.includes(key)) {
        validatorCode = `v.optional(${validatorCode})`;
      }

      lines.push(`    ${key}: ${validatorCode},`);
    }
  }

  lines.push('  }),');
  lines.push('});');

  return lines.join('\n');
}

/**
 * Generates a single Convex schema.ts code string from multiple JSON Schemas.
 *
 * @param schemas - Array of JSON Schema objects
 * @returns Code string for Convex schema.ts
 */
export function generateConvexFromJSONSchemaMultiple(schemas: JSONSchema[]): string {
  const lines: string[] = [
    'import { defineSchema, defineTable } from "convex/server";',
    'import { v } from "convex/values";',
    '',
    'export default defineSchema({',
  ];

  for (const schema of schemas) {
    if (schema['x-db']?.skip) continue;
    const tableName = schema['x-db']?.tableName || schema.title || 'unnamed';
    const required = schema.required || [];
    lines.push(`  ${tableName}: defineTable({`);

    if (schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        if (key === '_id' || key === '_creationTime') continue;

        let validatorCode = inferConvexValidator(prop, '    ');

        if (!required.includes(key)) {
          validatorCode = `v.optional(${validatorCode})`;
        }

        lines.push(`    ${key}: ${validatorCode},`);
      }
    }

    lines.push('  }),');
  }

  lines.push('});');

  return lines.join('\n');
}

// =============================================================================
// RLS Policy Generator
// =============================================================================

/**
 * Generates PostgreSQL RLS policy SQL from a JSON Schema.
 *
 * Generates ALTER TABLE ENABLE ROW LEVEL SECURITY and
 * CREATE POLICY statements based on x-rls extensions.
 *
 * @param schema - JSON Schema object
 * @returns RLS policy SQL statement (empty string if RLS is disabled or no policy)
 *
 * @example
 * ```typescript
 * import { generateRLSFromJSONSchema, type JSONSchema } from '@alneas/appkit-core/data/schema/compiler';
 *
 * const postSchema = {
 *   title: 'posts', type: 'object',
 *   properties: { user_id: { type: 'string' } },
 *   'x-rls': { enabled: true, select: { roles: ['authenticated'], using: 'auth.uid() = user_id' } },
 * } satisfies JSONSchema;
 * console.log(generateRLSFromJSONSchema(postSchema));
 * // Generates ENABLE ROW LEVEL SECURITY and a SELECT policy using the supplied expression.
 * // Review the SQL and host authentication setup before execution.
 * ```
 */
export function generateRLSFromJSONSchema(schema: JSONSchema): string {
  const tableName = schema['x-db']?.tableName || schema.title || 'unnamed';
  const rls = schema['x-rls'];

  // RLS disabled or undefined
  if (!rls || typeof rls !== 'object' || (rls as XRLSOptions).enabled === false) {
    return '';
  }

  const statements: string[] = [];

  const fieldRlsUsing = (policyName?: string): string | null => {
    if (!schema.properties) return null;

    const hints: Array<{ policy?: string; column: string }> = [];

    for (const [key, prop] of Object.entries(schema.properties)) {
      const hint = (prop as JSONSchemaProperty & { 'x-rls'?: XRLSFieldHint })['x-rls'];
      if (!hint || typeof hint !== 'object' || Array.isArray(hint)) continue;
      if ('enabled' in hint) continue;

      const xdb = prop['x-db'] || {};
      const column = (hint.column as string | undefined) || xdb.columnName || xdb.column || key;
      hints.push({ policy: hint.policy as string | undefined, column });
    }

    if (policyName) {
      const matched = hints.find((hint) => hint.policy === policyName);
      if (matched) {
        if (matched.column === 'user_id') {
          return `${matched.column} = auth.uid()`;
        }
        return `${matched.column} = auth.jwt() ->> '${matched.column}'`;
      }
    }

    if (hints.length === 1) {
      if (hints[0].column === 'user_id') {
        return `${hints[0].column} = auth.uid()`;
      }
      return `${hints[0].column} = auth.jwt() ->> '${hints[0].column}'`;
    }

    return null;
  };

  // Enable RLS
  if ((rls as XRLSOptions).force) {
    statements.push(`ALTER TABLE ${quoteId(tableName)} ENABLE ROW LEVEL SECURITY;`);
    statements.push(`ALTER TABLE ${quoteId(tableName)} FORCE ROW LEVEL SECURITY;`);
  } else {
    statements.push(`ALTER TABLE ${quoteId(tableName)} ENABLE ROW LEVEL SECURITY;`);
  }

  const operations = ['select', 'insert', 'update', 'delete'] as const;

  if ('policies' in rls && Array.isArray(rls.policies)) {
    for (const policy of rls.policies) {
      const ops = Array.isArray(policy.operation) ? policy.operation : [policy.operation];
      const normalizedOps = ops.map((op) => op.toString().toLowerCase());
      const multipleOps = normalizedOps.length > 1;

      for (const op of normalizedOps) {
        const opName = op === 'all' ? 'ALL' : op.toUpperCase();
        const policyName = multipleOps ? `${policy.name}_${op}` : policy.name;
        let sql = `CREATE POLICY ${quoteId(policyName)} ON ${quoteId(tableName)} FOR ${opName}`;

        if (policy.roles?.length) {
          sql += ` TO ${policy.roles.join(', ')}`;
        }

        const usingExpr = policy.using || fieldRlsUsing(policy.name);
        const withCheckExpr = policy.withCheck ?? policy.using ?? fieldRlsUsing(policy.name);

        if (usingExpr && opName !== 'INSERT') {
          sql += ` USING (${usingExpr})`;
        }
        if (withCheckExpr && (opName === 'INSERT' || opName === 'UPDATE' || opName === 'ALL')) {
          sql += ` WITH CHECK (${withCheckExpr})`;
        }

        statements.push(sql + ';');
      }
    }
  } else {
    for (const op of operations) {
      const policy = (rls as XRLSOptions)[op] || (rls as XRLSOptions).all;
      if (!policy) continue;

      const policyName = policy.policyName || `${tableName}_${op}_policy`;

      let sql = `CREATE POLICY ${quoteId(policyName)} ON ${quoteId(tableName)} FOR ${op.toUpperCase()}`;

      // Roles (TO clause)
      if (policy.roles?.length) {
        sql += ` TO ${policy.roles.join(', ')}`;
      }

      // USING clause (for SELECT, UPDATE, DELETE)
      const usingExpr =
        policy.using || fieldRlsUsing(policy.policyName) || (op !== 'insert' ? policy.check : null);
      if (usingExpr && op !== 'insert') {
        sql += ` USING (${usingExpr})`;
      }

      // WITH CHECK clause (for INSERT, UPDATE)
      const withCheckExpr =
        policy.withCheck ||
        fieldRlsUsing(policy.policyName) ||
        (op === 'insert' || op === 'update' ? policy.check : null);
      if (withCheckExpr && (op === 'insert' || op === 'update')) {
        sql += ` WITH CHECK (${withCheckExpr})`;
      }

      statements.push(sql + ';');
    }
  }

  return statements.join('\n');
}

/**
 * Generates RLS policy SQL in batch from multiple JSON Schemas.
 *
 * @param schemas - Array of JSON Schema objects
 * @returns RLS policy SQL statement
 */
export function generateRLSFromJSONSchemaMultiple(schemas: JSONSchema[]): string {
  const statements: string[] = [];

  for (const schema of schemas) {
    const sql = generateRLSFromJSONSchema(schema);
    if (sql) {
      statements.push(`-- ${schema['x-db']?.tableName || schema.title || 'unnamed'}`);
      statements.push(sql);
      statements.push('');
    }
  }

  return statements.join('\n').trim();
}

// =============================================================================
// Migration Generator (ALTER TABLE support, batch generation)
// =============================================================================

/**
 * Migration generation options.
 */
export interface MigrationOptions {
  /** Existing table name (generates ALTER TABLE when specified) */
  existingTable?: string;
  /** Include index generation */
  includeIndexes?: boolean;
  /** Include RLS policy generation */
  includeRLS?: boolean;
  /** Include updated_at trigger generation */
  includeUpdatedAtTrigger?: boolean;
  /** Include table comment generation */
  includeComments?: boolean;
}

/**
 * Generates ALTER TABLE SQL from a JSON Schema.
 *
 * Generates ALTER TABLE statements to add new columns to an existing table.
 *
 * @param schema - JSON Schema object
 * @param existingColumns - Array of existing column names (these will not be generated)
 * @returns ALTER TABLE SQL statement
 *
 * @example
 * ```typescript
 * import { generateAlterTableFromJSONSchema, type JSONSchema } from '@alneas/appkit-core/data/schema/compiler';
 *
 * const userSchema = {
 *   title: 'users', type: 'object',
 *   properties: { id: { type: 'string' }, name: { type: 'string' }, email: { type: 'string' } },
 * } satisfies JSONSchema;
 * console.log(generateAlterTableFromJSONSchema(userSchema, ['id', 'name']));
 * // Generates ADD COLUMN for email; review the DDL before execution.
 * ```
 */
export function generateAlterTableFromJSONSchema(
  schema: JSONSchema,
  existingColumns: string[] = [],
): string {
  const tableName = schema['x-db']?.tableName || schema.title || 'unnamed';

  if (!schema.properties) {
    return '';
  }

  const statements: string[] = [];
  const existingSet = new Set(existingColumns.map((c) => c.toLowerCase()));

  for (const [key, prop] of Object.entries(schema.properties)) {
    const xdb = prop['x-db'] || {};
    const columnName = xdb.columnName || xdb.column || key;

    // Skip existing columns
    if (existingSet.has(columnName.toLowerCase())) {
      continue;
    }

    const parts: string[] = [
      `ADD COLUMN IF NOT EXISTS ${quoteId(columnName)}`,
      inferPostgresType(prop),
    ];

    // Do not add NOT NULL for non-PRIMARY KEY columns (ALTER TABLE requires default value)
    // if (xdb.primaryKey) {
    //     parts.push('PRIMARY KEY');
    // }

    if (xdb.unique) {
      parts.push('UNIQUE');
    }

    if (xdb.default) {
      parts.push(`DEFAULT ${xdb.default}`);
    } else if (prop.default !== undefined) {
      if (typeof prop.default === 'string') {
        parts.push(`DEFAULT '${prop.default.replace(/'/g, "''")}'`);
      } else if (typeof prop.default === 'number' || typeof prop.default === 'boolean') {
        parts.push(`DEFAULT ${prop.default}`);
      }
    }

    const foreignKey = xdb.foreignKey || xdb.references;
    if (foreignKey) {
      const refColumn = getReferenceColumn(foreignKey);
      const onDelete = foreignKey.onDelete ? ` ON DELETE ${foreignKey.onDelete}` : '';
      parts.push(`REFERENCES ${quoteId(foreignKey.table)}(${quoteId(refColumn)})${onDelete}`);
    }

    statements.push(parts.join(' '));
  }

  if (statements.length === 0) {
    return '';
  }

  return `ALTER TABLE ${quoteId(tableName)}\n  ${statements.join(',\n  ')};`;
}

/**
 * Generates index creation SQL from a JSON Schema.
 */
export function generateIndexesFromJSONSchema(schema: JSONSchema): string {
  const tableName = schema['x-db']?.tableName || schema.title || 'unnamed';

  if (!schema.properties) {
    return '';
  }

  const indexes: string[] = [];

  for (const [key, prop] of Object.entries(schema.properties)) {
    const xdb = prop['x-db'] || {};
    if (xdb.index && !xdb.primaryKey) {
      const columnName = xdb.columnName || xdb.column || key;
      const indexName = `idx_${tableName}_${columnName}`;
      indexes.push(
        `CREATE INDEX IF NOT EXISTS ${quoteId(indexName)} ON ${quoteId(tableName)}(${quoteId(columnName)});`,
      );
    }
  }

  return indexes.join('\n');
}

/**
 * Generates updated_at trigger SQL from a JSON Schema.
 */
export function generateUpdatedAtTriggerFromJSONSchema(schema: JSONSchema): string {
  const tableName = schema['x-db']?.tableName || schema.title || 'unnamed';

  if (!schema.properties || !schema.properties['updated_at']) {
    return '';
  }

  const triggerName = `handle_${tableName}_updated_at`;
  return `CREATE TRIGGER ${quoteId(triggerName)} BEFORE UPDATE ON ${quoteId(tableName)}
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime('updated_at');`;
}

/**
 * Generates complete migration SQL from a JSON Schema.
 *
 * Generates complete migration SQL including CREATE TABLE or ALTER TABLE,
 * indexes, RLS, and triggers.
 *
 * @param schema - JSON Schema object
 * @param options - Migration options
 * @returns Complete migration SQL
 */
export function generateMigrationFromJSONSchema(
  schema: JSONSchema,
  options: MigrationOptions = {},
): string {
  const {
    existingTable,
    includeIndexes = true,
    includeRLS = true,
    includeUpdatedAtTrigger = true,
    includeComments = true,
  } = options;

  const tableName = schema['x-db']?.tableName || schema.title || 'unnamed';
  const description = schema.description || '';
  const sections: string[] = [];

  // Header
  sections.push(`-- ${tableName}`);
  if (description) {
    sections.push(`-- ${description}`);
  }
  sections.push('');

  // Table DDL
  if (existingTable) {
    const alterSql = generateAlterTableFromJSONSchema(schema, []);
    if (alterSql) {
      sections.push(alterSql);
      sections.push('');
    }
  } else {
    sections.push(generateSqlFromJSONSchema(schema));
    sections.push('');
  }

  // Indexes
  if (includeIndexes) {
    const indexSql = generateIndexesFromJSONSchema(schema);
    if (indexSql) {
      sections.push(indexSql);
      sections.push('');
    }
  }

  // Table comment
  if (includeComments && description) {
    sections.push(
      `COMMENT ON TABLE ${quoteId(tableName)} IS '${description.replace(/'/g, "''")}';`,
    );
    sections.push('');
  }

  // RLS
  if (includeRLS) {
    const rlsSql = generateRLSFromJSONSchema(schema);
    if (rlsSql) {
      sections.push(rlsSql);
      sections.push('');
    }
  }

  // Updated at trigger
  if (includeUpdatedAtTrigger) {
    const triggerSql = generateUpdatedAtTriggerFromJSONSchema(schema);
    if (triggerSql) {
      sections.push(triggerSql);
      sections.push('');
    }
  }

  return sections.join('\n').trim();
}

/**
 * Generates batch migration SQL from multiple JSON Schemas.
 *
 * Sorts schemas taking foreign key dependencies into account,
 * and outputs to a single migration file.
 *
 * @param schemas - Array of JSON Schema objects
 * @param options - Migration options
 * @returns Complete migration SQL
 */
export function generateMigrationFromJSONSchemaMultiple(
  schemas: JSONSchema[],
  options: MigrationOptions = {},
): string {
  // Filter out schemas with skip flag
  const filtered = schemas.filter((s) => !s['x-db']?.skip);

  // Analyze foreign key dependencies and sort
  const sorted = sortSchemasByDependency(filtered);

  const sections: string[] = [];
  sections.push('-- Generated migration from JSON Schemas');
  sections.push(`-- Timestamp: ${new Date().toISOString()}`);
  sections.push('');
  sections.push('-- ============================================');
  sections.push('-- TABLE DEFINITIONS');
  sections.push('-- ============================================');
  sections.push('');

  for (const schema of sorted) {
    sections.push(generateMigrationFromJSONSchema(schema, options));
    sections.push('');
    sections.push('-- --------------------------------------------');
    sections.push('');
  }

  return sections.join('\n').trim();
}

/**
 * Sorts schemas based on foreign key dependencies.
 */
function sortSchemasByDependency(schemas: JSONSchema[]): JSONSchema[] {
  // Map of tableName -> Schema
  const schemaMap = new Map<string, JSONSchema>();
  for (const schema of schemas) {
    const tableName = schema['x-db']?.tableName || schema.title || 'unnamed';
    schemaMap.set(tableName, schema);
  }

  // Build dependency graph
  const dependencies = new Map<string, Set<string>>();
  for (const schema of schemas) {
    const tableName = schema['x-db']?.tableName || schema.title || 'unnamed';
    const deps = new Set<string>();

    if (schema.properties) {
      for (const prop of Object.values(schema.properties)) {
        const xdb = prop['x-db'] || {};
        const foreignKey = xdb.foreignKey || xdb.references;
        if (foreignKey && foreignKey.table) {
          // Ignore self-references
          if (foreignKey.table !== tableName && schemaMap.has(foreignKey.table)) {
            deps.add(foreignKey.table);
          }
        }
      }
    }

    dependencies.set(tableName, deps);
  }

  // Topological sort
  const sorted: JSONSchema[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(tableName: string) {
    if (visited.has(tableName)) return;
    if (visiting.has(tableName)) {
      // Circular dependency detected (warning only)
      console.warn(`Circular dependency detected involving: ${tableName}`);
      return;
    }

    visiting.add(tableName);

    const deps = dependencies.get(tableName) || new Set();
    for (const dep of deps) {
      visit(dep);
    }

    visiting.delete(tableName);
    visited.add(tableName);

    const schema = schemaMap.get(tableName);
    if (schema) {
      sorted.push(schema);
    }
  }

  for (const tableName of schemaMap.keys()) {
    visit(tableName);
  }

  return sorted;
}
