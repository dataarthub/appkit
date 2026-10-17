/**
 * @fileoverview Proposal Runtime Validation
 *
 * Validation module that strictly verifies external input (AI-generated JSON, imported data, etc.)
 * at runtime, eliminating unauthorized keys and mismatched types to guarantee a safe RecordProposal.
 *
 * @module proposal/validation
 */

import type {
  FieldChange,
  FieldKey,
  ProposalMetadata,
  RecordProposal,
  SupportedPrimitive,
} from './types';

/**
 * Dangerous property names with prototype pollution risks.
 */
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Validation error details.
 */
export type ProposalValidationError = {
  readonly path: string;
  readonly message: string;
};

/**
 * Validation result type.
 */
export type ProposalValidationResult<
  TRecord extends Record<string, unknown> = Record<string, unknown>,
> =
  | {
      readonly ok: true;
      readonly data: RecordProposal<TRecord>;
    }
  | {
      readonly ok: false;
      readonly errors: readonly ProposalValidationError[];
    };

/**
 * Guard function for validating value types of each field.
 */
export type FieldTypeValidator<TValue = unknown> = (value: unknown) => value is TValue;

/**
 * Validation options (field definitions are required).
 *
 * Explicitly specifying allowed fields and value type validation functions eliminates ambiguous
 * type assertions from generic primitive checks and guarantees runtime type safety.
 */
export type ValidateProposalOptions<TRecord extends Record<string, unknown>> = {
  /**
   * Definition map of fields allowed to be modified (required).
   * Unregistered fields are rejected as not modifiable.
   */
  readonly fields: {
    readonly [K in FieldKey<TRecord>]?: FieldTypeValidator<TRecord[K] & SupportedPrimitive>;
  };
};

/**
 * Collection of helper type guards for commonly used primitive types.
 */
export const proposalFieldTypes = {
  string: (val: unknown): val is string => typeof val === 'string',
  finiteNumber: (val: unknown): val is number => typeof val === 'number' && Number.isFinite(val),
  boolean: (val: unknown): val is boolean => typeof val === 'boolean',
  null: (val: unknown): val is null => val === null,
  nullableString: (val: unknown): val is string | null => val === null || typeof val === 'string',
  nullableFiniteNumber: (val: unknown): val is number | null =>
    val === null || (typeof val === 'number' && Number.isFinite(val)),
  nullableBoolean: (val: unknown): val is boolean | null => val === null || typeof val === 'boolean',
} as const;

/**
 * Checks whether a value is a primitive value supported in the initial version (string, finite number, boolean, null).
 *
 * @param value Value to check
 * @returns true if valid primitive
 */
export function isSupportedPrimitive(value: unknown): value is SupportedPrimitive {
  if (value === null) return true;
  if (typeof value === 'string') return true;
  if (typeof value === 'boolean') return true;
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  return false;
}

/**
 * Validates external input and constructs a safe RecordProposal<TRecord>.
 *
 * @template TRecord Record type
 * @param input External input data
 * @param options Validation options (allowed fields and value validators are required)
 * @returns Validation result
 */
export function validateProposalInput<
  TRecord extends Record<string, unknown> = Record<string, unknown>,
>(
  input: unknown,
  options: ValidateProposalOptions<TRecord>
): ProposalValidationResult<TRecord> {
  const errors: ProposalValidationError[] = [];

  if (!options || typeof options !== 'object' || !options.fields) {
    return {
      ok: false,
      errors: [
        {
          path: 'options.fields',
          message: 'ValidateProposalOptions with explicit field definitions is required',
        },
      ],
    };
  }

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      ok: false,
      errors: [{ path: '', message: 'Proposal must be a non-null object' }],
    };
  }

  const raw = input as Record<string, unknown>;

  // Check forbidden keys
  for (const key of Object.keys(raw)) {
    if (FORBIDDEN_KEYS.has(key)) {
      errors.push({ path: key, message: `Forbidden property name: ${key}` });
    }
  }

  // Validate id
  if (typeof raw.id !== 'string' || raw.id.trim() === '') {
    errors.push({ path: 'id', message: 'Proposal id must be a non-empty string' });
  }

  // Validate targetId
  if (typeof raw.targetId !== 'string' || raw.targetId.trim() === '') {
    errors.push({ path: 'targetId', message: 'Proposal targetId must be a non-empty string' });
  }

  // Validate baseVersion (string or finite number)
  if (
    typeof raw.baseVersion !== 'string' &&
    (typeof raw.baseVersion !== 'number' || !Number.isFinite(raw.baseVersion))
  ) {
    errors.push({
      path: 'baseVersion',
      message: 'Proposal baseVersion must be a string or finite number',
    });
  }

  // Validate changes array
  if (!Array.isArray(raw.changes)) {
    errors.push({ path: 'changes', message: 'Proposal changes must be an array' });
  } else if (raw.changes.length === 0) {
    errors.push({ path: 'changes', message: 'Proposal changes must not be empty' });
  }

  // Set for detecting duplicate field keys
  const seenFields = new Set<string>();
  const validatedChanges: FieldChange<TRecord>[] = [];

  if (Array.isArray(raw.changes)) {
    raw.changes.forEach((item, index) => {
      const pathPrefix = `changes[${index}]`;

      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        errors.push({ path: pathPrefix, message: 'Change item must be an object' });
        return;
      }

      const changeObj = item as Record<string, unknown>;

      for (const k of Object.keys(changeObj)) {
        if (FORBIDDEN_KEYS.has(k)) {
          errors.push({ path: `${pathPrefix}.${k}`, message: `Forbidden property name: ${k}` });
        }
      }

      // Validate field
      const field = changeObj.field;
      if (typeof field !== 'string' || field.trim() === '') {
        errors.push({ path: `${pathPrefix}.field`, message: 'Field name must be a non-empty string' });
        return;
      }

      if (FORBIDDEN_KEYS.has(field)) {
        errors.push({ path: `${pathPrefix}.field`, message: `Forbidden field name: ${field}` });
        return;
      }

      // Duplicate check
      if (seenFields.has(field)) {
        errors.push({
          path: `${pathPrefix}.field`,
          message: `Duplicate field change detected for '${field}'`,
        });
        return;
      }
      seenFields.add(field);

      // Check allowed fields (must be own property of options.fields and a function)
      const fieldKey = field as FieldKey<TRecord>;
      const hasField = Object.prototype.hasOwnProperty.call(options.fields, fieldKey);
      const validator = hasField ? options.fields[fieldKey] : undefined;
      if (!hasField || typeof validator !== 'function') {
        errors.push({
          path: `${pathPrefix}.field`,
          message: `Field '${field}' is not defined in allowed fields options`,
        });
        return;
      }

      // Generic primitive check
      if (!isSupportedPrimitive(changeObj.before)) {
        errors.push({
          path: `${pathPrefix}.before`,
          message: `Value for 'before' in field '${field}' must be a supported primitive (string, finite number, boolean, or null)`,
        });
      }
      if (!isSupportedPrimitive(changeObj.after)) {
        errors.push({
          path: `${pathPrefix}.after`,
          message: `Value for 'after' in field '${field}' must be a supported primitive (string, finite number, boolean, or null)`,
        });
      }

      // Execute field-specific type validator
      if (!validator(changeObj.before)) {
        errors.push({
          path: `${pathPrefix}.before`,
          message: `Value for 'before' in field '${field}' failed field-specific type validation`,
        });
      }
      if (!validator(changeObj.after)) {
        errors.push({
          path: `${pathPrefix}.after`,
          message: `Value for 'after' in field '${field}' failed field-specific type validation`,
        });
      }

      // Validate label and reason (optional strings)
      if (changeObj.label !== undefined && typeof changeObj.label !== 'string') {
        errors.push({ path: `${pathPrefix}.label`, message: 'Label must be a string if specified' });
      }
      if (changeObj.reason !== undefined && typeof changeObj.reason !== 'string') {
        errors.push({ path: `${pathPrefix}.reason`, message: 'Reason must be a string if specified' });
      }

      validatedChanges.push({
        field: fieldKey,
        label: changeObj.label as string | undefined,
        before: changeObj.before as TRecord[typeof fieldKey] & SupportedPrimitive,
        after: changeObj.after as TRecord[typeof fieldKey] & SupportedPrimitive,
        reason: changeObj.reason as string | undefined,
      } as FieldChange<TRecord>);
    });
  }

  // Eliminate shared reference in metadata (restricted to primitive values, creating an isolated clone)
  let clonedMetadata: ProposalMetadata | undefined = undefined;
  if (raw.metadata !== undefined) {
    if (!raw.metadata || typeof raw.metadata !== 'object' || Array.isArray(raw.metadata)) {
      errors.push({ path: 'metadata', message: 'Metadata must be an object if specified' });
    } else {
      const metaObj = raw.metadata as Record<string, unknown>;
      const safeMeta: Record<string, SupportedPrimitive> = {};
      for (const [mKey, mVal] of Object.entries(metaObj)) {
        if (FORBIDDEN_KEYS.has(mKey)) {
          errors.push({ path: `metadata.${mKey}`, message: `Forbidden property name: ${mKey}` });
        } else if (!isSupportedPrimitive(mVal)) {
          errors.push({
            path: `metadata.${mKey}`,
            message: `Metadata values must be supported primitives (string, finite number, boolean, null)`,
          });
        } else {
          safeMeta[mKey] = mVal;
        }
      }
      clonedMetadata = Object.freeze(safeMeta);
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  // Construct as immutable object
  const safeProposal: RecordProposal<TRecord> = Object.freeze({
    id: String(raw.id),
    targetId: String(raw.targetId),
    targetName: typeof raw.targetName === 'string' ? raw.targetName : undefined,
    baseVersion: typeof raw.baseVersion === 'number' ? raw.baseVersion : String(raw.baseVersion),
    changes: Object.freeze(validatedChanges.map((c) => Object.freeze({ ...c }))),
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    metadata: clonedMetadata,
  });

  return { ok: true, data: safeProposal };
}

