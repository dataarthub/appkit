import { createAjvValidator, type AjvValidatorOptions } from "@alneas/appkit-core/data";
import type { FieldValues, ResolverResult, FieldErrors } from 'react-hook-form';
import { castValuesBySchema, type SchemaCastOptions } from "@alneas/appkit-core/data";
import { getLocale } from '../../paraglide/runtime.js';
export { createAjvValidator, type AjvValidatorOptions };

/**
 * JSON Schema validation/casting settings for React Hook Form.
 * @remarks Legacy top-level empty-string omission is default; preserve opts into ordinary schema validation.
 * @see createAjvResolver for usage.
 */
export interface SchemaFormValidationOptions extends AjvValidatorOptions {
  /** Preserve empty strings for ordinary JSON Schema validation, or omit top-level empty strings (legacy default). */
  emptyStrings?: 'preserve' | 'omit';
  /** Optional non-mutating numeric normalization before validation; strict rejects partial numbers. */
  cast?: SchemaCastOptions;
}

/**
 * Creates an asynchronous React Hook Form resolver using Core Ajv validation.
 * @typeParam T - Form values shape; defaults to FieldValues.
 * @param schema - JSON Schema accepted by Core validation.
 * @param options - Ajv options plus optional numeric casting and empty-string handling; defaults to {}.
 * @returns Resolver accepting values and optional ignored context/options, resolving normalized
 * values with no errors on success or empty values plus nested field errors on failure.
 * @throws Resolver rejects if schema compilation, casting or validator execution throws.
 * @remarks Optional cast runs first without mutating input. Unless emptyStrings is preserve,
 * top-level empty strings become undefined; nested empty strings are retained. Locale
 * uses options.locale, otherwise browser Paraglide locale, otherwise ja on the server.
 * Unsafe error-path keys map to a root error. No provider or CSS is required to create it.
 * @example
 * ```ts
 * import { createAjvResolver } from '@alneas/appkit-react/tools/form';
 * const resolver = createAjvResolver<{ hours: number }>({ type: 'object', properties: { hours: { type: 'number' } } }, { emptyStrings: 'preserve', cast: { numericMode: 'strict' } });
 * ```
 */
export function createAjvResolver<T extends FieldValues = FieldValues>(schema: object, options: SchemaFormValidationOptions = {}): (values: T, context?: unknown, resolverOptions?: unknown) => Promise<ResolverResult<T>> {
  const validator = createAjvValidator(options);

  return async (values) => {
    // Resolve current locale: priority is options.locale > paraglide.getLocale() > 'ja'
    const currentLocale = options.locale || (typeof window !== 'undefined' ? getLocale() : 'ja');

    // Pre-process values: convert empty strings to undefined.
    // This is necessary because React Hook Form often defaults to "" for text inputs,
    // which can trigger "invalid format" errors (e.g. for email) even if the field is not required.
    const normalized = options.cast ? castValuesBySchema(values, schema, options.cast) : values;
    const processedValues = options.emptyStrings === 'preserve' ? normalized : Object.fromEntries(
      Object.entries(normalized).map(([key, value]) => [key, value === '' ? undefined : value]),
    );

    const {
      valid,
      rawErrors,
    } = validator(schema, processedValues, {
      ...options,
      locale: currentLocale as any,
    });

    if (valid) {
      return { values: processedValues, errors: {} };
    }

    const errors: any = {};
    rawErrors?.forEach((error) => {
      // Convert instancePath (/field/subfield) to dot notation (field.subfield)
      const parts = (error.instancePath ? error.instancePath.substring(1).split('/') : []).map((part: string) => part.replace(/~1/g, '/').replace(/~0/g, '~'));
      if (error.keyword === 'required' && error.params?.missingProperty) parts.push(error.params.missingProperty);
      const keys: string[] = parts.length ? parts.flatMap((part: string) => part.split('.')) : ['root'];
      if (keys.some(key => ['__proto__', 'constructor', 'prototype'].includes(key))) {
        errors.root = { type: error.keyword, message: 'Unsupported field path' };
        return;
      }
      let target = errors;
      for (const key of keys.slice(0, -1)) {
        if (!Object.hasOwn(target, key)) Object.defineProperty(target, key, {
          value: {}, enumerable: true, configurable: true, writable: true,
        });
        target = target[key];
      }
      const leaf = keys.at(-1)!;
      if (!Object.hasOwn(target, leaf)) Object.defineProperty(target, leaf, {
        value: { message: error.message, type: error.keyword }, enumerable: true, configurable: true, writable: true,
      });
    });

    return {
      values: {},
      errors: errors as FieldErrors<T>,
    };
  };
}
