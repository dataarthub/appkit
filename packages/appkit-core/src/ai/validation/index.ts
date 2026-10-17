/**
 * @fileoverview AJV Adapter
 *
 * JSON Schema validation helper using Ajv.
 *
 * @module lib/schema/ajv
 */

import Ajv from 'ajv';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import localizeJa from 'ajv-i18n/localize/ja/index.js';
import localizeEn from 'ajv-i18n/localize/en/index.js';

export interface AjvValidatorOptions {
  /** Draft when $schema is not specified. Defaults to draft-07. If explicitly specified, different $schema declarations are rejected. */
  draft?: 'draft-07' | '2020-12';
  /** Ajv configuration options */
  ajvOptions?: Record<string, any>;
  /** Language configuration. Defaults to Ajv default messages when omitted. */
  locale?: 'ja' | 'en';
}

/**
 * Creates an Ajv-based validator.
 *
 * @param options - Validation options.
 * @param options.locale - Error message language ('ja' | 'en'). Uses Ajv default messages if omitted.
 * @returns Validation execution function.
 * @remarks Automatically selects draft-07/2020-12 based on $schema; compiled functions are not shared across instances.
 * Do not modify schemas after compilation; provide a new schema object instead.
 * The returned ajv instance corresponds to the default draft. Specify draft explicitly when using addSchema/addKeyword.
 * The default path disables type coercion and does not insert defaults or remove
 * keys. Explicit ajvOptions can enable input mutation. Unknown x-* keywords are
 * not business validation rules merely because strict mode is disabled.
 * Compilation/configuration failures throw; invalid data returns valid: false.
 * Runtime compilation requires a host that permits AJV's generated functions.
 */
export function createAjvValidator(options: AjvValidatorOptions = {}) {
  const instances = new Map<string, Ajv | Ajv2020>();
  const getInstance = (draft: 'draft-07' | '2020-12') => {
    let instance = instances.get(draft);
    if (!instance) {
      const Constructor = draft === '2020-12' ? Ajv2020 : Ajv;
      instance = new Constructor({
        allErrors: true,
        strict: false,
        coerceTypes: false,
        ...options.ajvOptions,
      });
      addFormats(instance);
      instances.set(draft, instance);
    }
    return instance;
  };
  const ajv = getInstance(options.draft ?? 'draft-07');

  const validateFn = (
    schema: object,
    data: unknown,
    overrides: Partial<AjvValidatorOptions> = {},
  ): { valid: boolean; errors: string[]; rawErrors?: any[] } => {
    const uri = (schema as { $schema?: string }).$schema;
    let draft = options.draft ?? 'draft-07';
    if (uri !== undefined) {
      if (/^https?:\/\/json-schema\.org\/draft-07\/schema#?$/.test(uri)) {
        draft = 'draft-07';
      } else if (/^https?:\/\/json-schema\.org\/draft\/2020-12\/schema#?$/.test(uri)) {
        draft = '2020-12';
      } else {
        throw new Error(`Unsupported JSON Schema draft at /$schema: ${uri}`);
      }
      if (options.draft && draft !== options.draft) {
        throw new Error(`JSON Schema /$schema conflicts with configured draft ${options.draft}`);
      }
    }
    // Ajv already caches compilation per instance and schema identity.
    const validate = getInstance(draft).compile(schema);

    if ('$async' in validate && validate.$async) throw new Error('Asynchronous schemas are not supported by the synchronous validator');
    const ok = validate(data);
    if (ok) return { valid: true, errors: [] };

    const locale = overrides.locale || options.locale;
    if (locale === 'ja') {
      localizeJa(validate.errors);
    } else if (locale === 'en') {
      localizeEn(validate.errors);
    }

    const errors = (validate.errors ?? []).map((error: any) => {
      const field = error.instancePath ? error.instancePath.replace(/^\//, '') : 'root';
      const message = error.message || 'invalid';
      return `[${field}] ${message}`;
    });

    return { valid: false, errors, rawErrors: validate.errors ?? undefined };
  };

  return Object.assign(validateFn, { ajv: ajv as any });
}


// Shared bounded JSON snapshot used by AI boundaries and compatibility modules.
export { jsonSnapshot } from '../internal/json-snapshot';
export type { SnapshotValue } from '../internal/json-snapshot';
