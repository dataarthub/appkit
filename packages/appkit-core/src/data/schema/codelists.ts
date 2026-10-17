/**
 * @fileoverview Code List Helpers
 *
 * Utilities for working with centralized code lists.
 *
 * @module lib/schema/codelists
 */

import type { XCodelistOptions } from './types';

export interface CodelistCode {
  code: string;
  label_ja?: string;
  label_en?: string;
  status?: 'active' | 'deprecated' | string;
}

export interface Codelist {
  codelist_id: string;
  version: string;
  title?: string;
  codes: CodelistCode[];
}

export interface CodelistOption {
  label: string;
  value: string;
}

export interface CodelistResolveOptions {
  labelField?: 'label_ja' | 'label_en';
  includeDeprecated?: boolean;
  /** Fallback order for label resolution */
  fallbackOrder?: Array<'label_ja' | 'label_en' | 'code'>;
}

/**
 * Determines whether a value matches the CodelistCode shape.
 *
 * @param value - Value to check
 * @returns True if value is a CodelistCode
 */
export function isCodelistCode(value: unknown): value is CodelistCode {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.code === 'string';
}

/**
 * Determines whether a value matches the Codelist shape.
 *
 * @param value - Value to check
 * @returns True if value is a Codelist
 */
export function isCodelist(value: unknown): value is Codelist {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (typeof record.codelist_id !== 'string') return false;
  if (typeof record.version !== 'string') return false;
  if (!Array.isArray(record.codes)) return false;
  return record.codes.every(isCodelistCode);
}

/**
 * Validates a value and returns it as a Codelist if valid.
 *
 * @param value - Input value
 * @returns Valid Codelist
 * @throws When format is invalid
 */
export function parseCodelist(value: unknown): Codelist {
  if (!isCodelist(value)) {
    throw new Error('Invalid codelist');
  }
  return value;
}

/**
 * Converts a Code List into an array of enum values.
 *
 * @param codelist - Code List object
 * @param options - Options for handling deprecated codes
 * @returns Array of code strings for enum
 */
export function resolveCodelistEnum(
  codelist: Codelist,
  options: { includeDeprecated?: boolean } = {},
): string[] {
  const includeDeprecated = options.includeDeprecated ?? false;

  return codelist.codes
    .filter((code) => includeDeprecated || code.status !== 'deprecated')
    .map((code) => code.code);
}

/**
 * Generates an enum array using the schema's x-codelist configuration.
 *
 * @param codelist - Code List object
 * @param config - Schema x-codelist configuration
 * @returns Array of code strings for enum
 */
export function resolveCodelistEnumFromSchema(
  codelist: Codelist,
  config?: XCodelistOptions,
): string[] {
  return resolveCodelistEnum(codelist, {
    includeDeprecated: config?.includeDeprecated,
  });
}

/**
 * Converts a Code List into an array of UI options.
 *
 * @param codelist - Code List object
 * @param options - Label language and deprecated code handling options
 * @returns Array of { label, value } for UI
 */
export function resolveCodelistOptions(
  codelist: Codelist,
  options: CodelistResolveOptions = {},
): CodelistOption[] {
  const labelField = options.labelField ?? 'label_ja';
  const fallbackOrder = options.fallbackOrder ?? [labelField, 'label_en', 'code'];
  const includeDeprecated = options.includeDeprecated ?? false;

  return codelist.codes
    .filter((code) => includeDeprecated || code.status !== 'deprecated')
    .map((code) => ({
      value: code.code,
      label: resolveLabel(code, fallbackOrder),
    }));
}

/**
 * Converts a Code List into UI options using the schema's x-codelist configuration.
 *
 * @param codelist - Code List object
 * @param config - Schema x-codelist configuration
 * @returns Array of { label, value } for UI
 */
export function resolveCodelistOptionsFromSchema(
  codelist: Codelist,
  config?: XCodelistOptions,
): CodelistOption[] {
  return resolveCodelistOptions(codelist, {
    labelField: config?.labelField,
    includeDeprecated: config?.includeDeprecated,
    fallbackOrder: config?.fallbackOrder,
  });
}

/**
 * Resolves a Code List label according to fallback order.
 *
 * @param code - Code List item
 * @param order - Fallback priority order
 * @returns Resolved label
 */
function resolveLabel(code: CodelistCode, order: Array<'label_ja' | 'label_en' | 'code'>): string {
  for (const key of order) {
    if (key === 'code') return code.code;
    const value = code[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return code.code;
}
