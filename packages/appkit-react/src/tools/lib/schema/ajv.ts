import { createAjvValidator, type AjvValidatorOptions } from "@alneas/appkit-core/data";
import type { FieldValues, ResolverResult, FieldErrors } from 'react-hook-form';
import { castValuesBySchema, type SchemaCastOptions } from "@alneas/appkit-core/data";
import { getLocale } from '../../paraglide/runtime.js';
export { createAjvValidator, type AjvValidatorOptions };

/** Options for schema forms. Legacy empty-string omission is retained unless preserve is selected. */
export interface SchemaFormValidationOptions extends AjvValidatorOptions {
  /** Preserve empty strings for ordinary JSON Schema validation, or omit top-level empty strings (legacy default). */
  emptyStrings?: 'preserve' | 'omit';
  /** Optional non-mutating numeric normalization before validation; strict rejects partial numbers. */
  cast?: SchemaCastOptions;
}

/**
 * Ajvを使用した React Hook Form 用の resolver を作成します。
 * このresolverは、アプリケーションの現在の言語設定（Paraglide）と自動的に連動します。
 *
 * @example
 * import { createAjvResolver } from '@alneas/appkit-react/tools/form';
 * const resolver = createAjvResolver({ type: 'object', properties: { hours: { type: 'number' } } }, { emptyStrings: 'preserve', cast: { numericMode: 'strict' } });
 * @param schema - バリデーションに使用する JSON Schema。
 * @param options - バリデーションオプション。localeを省略すると現在の言語設定が使用されます。
 * @returns React Hook Form の resolver プロパティに渡せる関数。
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
