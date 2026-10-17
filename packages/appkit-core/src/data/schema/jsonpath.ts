/**
 * @fileoverview JSONPath Adapters
 *
 * Runtime adapters for JSONPath libraries.
 *
 * @module lib/schema/jsonpath
 */

import type { JsonPathResolver } from './json-schema';

/**
 * Creates a JSONPath resolver using jsonpath-plus.
 *
 * @returns JSONPath resolver function
 * @throws When jsonpath-plus is not found
 */
export async function createJsonPathPlusResolver(): Promise<JsonPathResolver> {
  try {
    const mod = await import('jsonpath-plus');
    const JSONPath =
      (mod as { JSONPath?: unknown }).JSONPath || (mod as { default?: unknown }).default || mod;
    if (typeof JSONPath !== 'function') {
      throw new Error('jsonpath-plus: JSONPath function not found');
    }
    return (data, jsonpath) =>
      (JSONPath as (args: { path: string; json: unknown; resultType?: 'value' }) => unknown[])({
        path: jsonpath,
        json: data,
        resultType: 'value',
      });
  } catch {
    throw new Error(
      'jsonpath-plus is not installed. Install it or provide your own JsonPathResolver.',
    );
  }
}
