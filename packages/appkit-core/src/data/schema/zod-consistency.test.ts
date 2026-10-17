import { describe, expect, it } from 'bun:test';
import { generateZodSchema } from './compiler';
import { createAjvValidator } from './ajv';
import type { JSONSchema } from './compiler';

describe('JSON Schema to Zod consistency regression tests', () => {
  it('preserves undeclared required keys and root enums with every additional-property policy', () => {
    const ajv = createAjvValidator();
    for (const additionalProperties of [undefined, true, false, {type:'string' as const}]) {
      for (const nested of [false,true]) {
        const object: JSONSchema = {type:'object',properties:{},required:['id'],additionalProperties};
        const schema: JSONSchema = nested ? {type:'object',properties:{value:object},required:['value']} : object;
        for (const value of [{},{id:'x'},{id:123}]) {
          const data = nested ? {value} : value;
          expect(generateZodSchema(schema).safeParse(data).success).toBe(ajv(schema,data).valid);
        }
      }
    }
    const schema: JSONSchema = {type:'object',properties:{},enum:[null]};
    expect(generateZodSchema(schema).safeParse({}).success).toBe(false);
    expect(ajv(schema,{}).valid).toBe(false);
    // Runtime JSON Schema can contain object-valued enums, beyond the current scalar enum TS type.
    const objectEnum = JSON.parse('{"type":"object","properties":{"n":{"type":"number"}},"enum":[{"n":1}]}') as JSONSchema;
    for (const data of [{n:1},{n:2},{n:1,extra:true}]) expect(generateZodSchema(objectEnum).safeParse(data).success).toBe(ajv(objectEnum,data).valid);
    expect(typeof generateZodSchema(objectEnum).extend).toBe('function');
    expect(()=>generateZodSchema({type:'object',properties:{id:{type:'string'}},required:['id']}).extend({})).not.toThrow();
    for (const property of [JSON.parse('{"type":"object","properties":{"__proto__":{"type":"string"}}}'), {type:'object',required:['__proto__']}]) {
      expect(()=>generateZodSchema(property)).toThrow('__proto__');
      expect(()=>generateZodSchema({type:'object',properties:{nested:property}})).toThrow('__proto__');
    }
  });
  it('enforces minItems and maxItems on arrays consistently with AJV', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        tagList: {
          type: 'array',
          items: { type: 'string' },
          minItems: 2,
          maxItems: 4,
        },
      },
      required: ['tagList'],
    };

    const zodValidator = generateZodSchema(schema);
    const ajvValidate = createAjvValidator();

    // Valid: 2 items
    expect(zodValidator.safeParse({ tagList: ['a', 'b'] }).success).toBe(true);
    expect(ajvValidate(schema, { tagList: ['a', 'b'] }).valid).toBe(true);

    // Invalid: 1 item (fails minItems)
    expect(zodValidator.safeParse({ tagList: ['a'] }).success).toBe(false);
    expect(ajvValidate(schema, { tagList: ['a'] }).valid).toBe(false);

    // Invalid: 5 items (fails maxItems)
    expect(zodValidator.safeParse({ tagList: ['a', 'b', 'c', 'd', 'e'] }).success).toBe(false);
    expect(ajvValidate(schema, { tagList: ['a', 'b', 'c', 'd', 'e'] }).valid).toBe(false);
  });

  it('enforces multipleOf on numeric fields consistently with AJV', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        step: {
          type: 'number',
          multipleOf: 5,
        },
      },
      required: ['step'],
    };

    const zodValidator = generateZodSchema(schema);
    const ajvValidate = createAjvValidator();

    // Valid: 15 is multiple of 5
    expect(zodValidator.safeParse({ step: 15 }).success).toBe(true);
    expect(ajvValidate(schema, { step: 15 }).valid).toBe(true);

    // Invalid: 12 is not multiple of 5
    expect(zodValidator.safeParse({ step: 12 }).success).toBe(false);
    expect(ajvValidate(schema, { step: 12 }).valid).toBe(false);
  });

  it('enforces additionalProperties: false consistently with AJV', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      required: ['name'],
      additionalProperties: false,
    };

    const zodValidator = generateZodSchema(schema);
    const ajvValidate = createAjvValidator();

    // Valid: only defined properties
    expect(zodValidator.safeParse({ name: 'Alice' }).success).toBe(true);
    expect(ajvValidate(schema, { name: 'Alice' }).valid).toBe(true);

    // Invalid: unexpected extra property
    expect(zodValidator.safeParse({ name: 'Alice', extra: 123 }).success).toBe(false);
    expect(ajvValidate(schema, { name: 'Alice', extra: 123 }).valid).toBe(false);
  });

  it('enforces maxLength: 0 rejecting non-empty strings consistently with AJV', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        emptyField: {
          type: 'string',
          maxLength: 0,
        },
      },
      required: ['emptyField'],
    };

    const zodValidator = generateZodSchema(schema);
    const ajvValidate = createAjvValidator();

    // Valid: empty string
    expect(zodValidator.safeParse({ emptyField: '' }).success).toBe(true);
    expect(ajvValidate(schema, { emptyField: '' }).valid).toBe(true);

    // Invalid: non-empty string
    expect(zodValidator.safeParse({ emptyField: 'a' }).success).toBe(false);
    expect(ajvValidate(schema, { emptyField: 'a' }).valid).toBe(false);
  });

  it('enforces typed additionalProperties rejecting invalid extra types consistently with AJV', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        id: { type: 'string' },
      },
      required: ['id'],
      additionalProperties: { type: 'integer' },
    };

    const zodValidator = generateZodSchema(schema);
    const ajvValidate = createAjvValidator();

    // Valid: additional integer
    expect(zodValidator.safeParse({ id: 'x', score: 100 }).success).toBe(true);
    expect(ajvValidate(schema, { id: 'x', score: 100 }).valid).toBe(true);

    // Invalid: additional string when integer required
    expect(zodValidator.safeParse({ id: 'x', score: 'not-int' }).success).toBe(false);
    expect(ajvValidate(schema, { id: 'x', score: 'not-int' }).valid).toBe(false);
  });

  it('enforces string | null union rejecting numbers consistently with AJV', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        comment: {
          type: ['string', 'null'],
        },
      },
      required: ['comment'],
    };

    const zodValidator = generateZodSchema(schema);
    const ajvValidate = createAjvValidator();

    // Valid: string
    expect(zodValidator.safeParse({ comment: 'hello' }).success).toBe(true);
    expect(ajvValidate(schema, { comment: 'hello' }).valid).toBe(true);

    // Valid: null
    expect(zodValidator.safeParse({ comment: null }).success).toBe(true);
    expect(ajvValidate(schema, { comment: null }).valid).toBe(true);

    // Invalid: number
    expect(zodValidator.safeParse({ comment: 123 }).success).toBe(false);
    expect(ajvValidate(schema, { comment: 123 }).valid).toBe(false);
  });
});
