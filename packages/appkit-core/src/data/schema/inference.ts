/**
 * @fileoverview Schema Type Inference Utilities & Zod Conversion
 *
 * Bi-directional conversion adapters and type completion utilities between Zod schemas and JSON Schema.
 *
 * @module lib/schema/inference
 */

import { z } from 'zod';
import type { JSONSchema, JSONSchemaProperty } from './types';

// =============================================================================
// Zod to JSON Schema Converter
// =============================================================================

/**
 * Generates a JSON Schema (2020-12 compatible) from a Zod schema.
 *
 * @remarks
 * A partial adapter that inspects supported Zod shapes, including internal shape
 * information. It is not a lossless conversion: nullable types, defaults,
 * refinements and transforms are not generally preserved. Compare intended valid
 * and invalid cases before using the result as an external contract.
 *
 * @param zodSchema - Target Zod object schema to convert
 * @param meta - Additional metadata such as title and description
 * @returns JSONSchema
 *
 * @example
 * ```typescript
 * const userZod = z.object({
 *   name: z.string().min(1),
 *   email: z.string().email(),
 *   role: z.enum(['admin', 'member']),
 *   age: z.number().optional(),
 * });
 *
 * const userJsonSchema = zodToJSONSchema(userZod, { title: 'User' });
 * ```
 */
export function zodToJSONSchema(
  zodSchema: z.ZodTypeAny,
  meta?: { title?: string; description?: string },
): JSONSchema {
  const properties: Record<string, JSONSchemaProperty> = {};
  const required: string[] = [];

  let schema: any = zodSchema;
  while (schema?._def?.schema) {
    schema = schema._def.schema;
  }

  const shape =
    typeof schema?.shape === 'function'
      ? schema.shape()
      : schema?.shape || (typeof schema?._def?.shape === 'function' ? schema._def.shape() : schema?._def?.shape);

  if (shape) {
    for (const [key, propDef] of Object.entries(shape)) {
      const { propSchema, isRequired } = convertZodField(propDef as z.ZodTypeAny);
      properties[key] = propSchema as JSONSchemaProperty;
      if (isRequired) {
        required.push(key);
      }
    }
  }

  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    title: meta?.title,
    description: meta?.description,
    properties,
    required: required.length > 0 ? required : undefined,
  };
}

function convertZodField(field: z.ZodTypeAny): { propSchema: Record<string, any>; isRequired: boolean } {
  let current: any = field;
  let isRequired = true;
  const propSchema: Record<string, any> = {};

  // Unwrap modifiers
  while (
    current?._def?.typeName === 'ZodOptional' ||
    current?._def?.typeName === 'ZodNullable' ||
    current?._def?.typeName === 'ZodDefault' ||
    current?._def?.typeName === 'ZodEffects' ||
    current?.unwrap ||
    current?._def?.innerType
  ) {
    const typeName = current._def?.typeName;
    if (typeName === 'ZodOptional' || current.isOptional?.() || current?._def?.type === 'optional') {
      isRequired = false;
    }
    if (typeName === 'ZodDefault' && typeof current._def?.defaultValue === 'function') {
      isRequired = false;
      propSchema.default = current._def.defaultValue();
    }
    if (current.unwrap) {
      current = current.unwrap();
    } else if (current._def?.innerType) {
      current = current._def.innerType;
    } else if (current._def?.schema) {
      current = current._def.schema;
    } else {
      break;
    }
  }

  const typeName = current?._def?.typeName || current?.type || current?._def?.type;

  if (typeName === 'string' || typeName === 'ZodString' || current instanceof z.ZodString) {
    propSchema.type = 'string';
    if (current.minLength !== undefined && current.minLength !== null) propSchema.minLength = current.minLength;
    if (current.maxLength !== undefined && current.maxLength !== null) propSchema.maxLength = current.maxLength;
    if (current.format) propSchema.format = current.format;

    // Checks fallback
    const checks = current._def?.checks || [];
    for (const c of checks) {
      const checkDef = c?._zod?.def || c;
      if (checkDef.check === 'min_length' && checkDef.minimum !== undefined) propSchema.minLength = checkDef.minimum;
      if (checkDef.check === 'max_length' && checkDef.maximum !== undefined) propSchema.maxLength = checkDef.maximum;
      if (checkDef.format === 'email' || checkDef.check === 'email') propSchema.format = 'email';
      if (checkDef.pattern && propSchema.format !== 'email') propSchema.pattern = checkDef.pattern.source;
    }
  } else if (typeName === 'number' || typeName === 'ZodNumber' || current instanceof z.ZodNumber) {
    const isInt = current.isInt || current._def?.checks?.some((c: any) => c?._zod?.def?.check === 'int' || c?.kind === 'int');
    propSchema.type = isInt ? 'integer' : 'number';
    if (current.minValue !== undefined && current.minValue !== null && Number.isFinite(current.minValue)) propSchema.minimum = current.minValue;
    if (current.maxValue !== undefined && current.maxValue !== null && Number.isFinite(current.maxValue)) propSchema.maximum = current.maxValue;

    const checks = current._def?.checks || [];
    for (const c of checks) {
      const checkDef = c?._zod?.def || c;
      if ((checkDef.check === 'greater_than' || checkDef.check === 'min') && checkDef.value !== undefined) {
        propSchema.minimum = checkDef.value;
      }
      if ((checkDef.check === 'less_than' || checkDef.check === 'max') && checkDef.value !== undefined) {
        propSchema.maximum = checkDef.value;
      }
    }
  } else if (typeName === 'boolean' || typeName === 'ZodBoolean' || current instanceof z.ZodBoolean) {
    propSchema.type = 'boolean';
  } else if (typeName === 'enum' || typeName === 'ZodEnum' || current?._def?.values) {
    propSchema.type = 'string';
    const vals = current.options || current._def?.values || current?.values;
    if (Array.isArray(vals)) {
      propSchema.enum = vals;
    } else if (vals && typeof vals === 'object') {
      propSchema.enum = Object.values(vals);
    }
  } else if (typeName === 'array' || typeName === 'ZodArray' || current instanceof z.ZodArray) {
    propSchema.type = 'array';
    const element = current.element || current._def?.type || current?._def?.element;
    if (element) {
      const inner = convertZodField(element);
      propSchema.items = inner.propSchema;
    } else {
      propSchema.items = { type: 'string' };
    }
  } else if (typeName === 'object' || typeName === 'ZodObject' || current instanceof z.ZodObject) {
    propSchema.type = 'object';
    const nested = zodToJSONSchema(current);
    propSchema.properties = nested.properties;
    if (nested.required) propSchema.required = nested.required;
  } else {
    propSchema.type = 'string';
  }

  if (current?.description) {
    propSchema.description = current.description;
  }

  return { propSchema, isRequired };
}
