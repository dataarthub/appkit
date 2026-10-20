import type { DataAccessAdapter, Filter } from './types';
import type { SearchableSelectOption } from './common-types';

/**
 * Configures backend filtering and projection for createTableSearchHandler. No option escapes SQL wildcard characters, authorizes access or adds debounce/cancellation.
 * @see {@link createTableSearchHandler} for a public-import example.
 */
export interface SearchHandlerOptions {
  /** Target database table/collection name */
  table: string;
  /** Comma-separated list of column names to project when searching records (e.g. 'id, name, code') */
  select: string;
  /**
   * Fields combined with $or and $ilike using `%query%`; supported operators and wildcard interpretation depend on the supplied adapter. An empty array still produces an empty $or unless an ID/code alternative is added.
   */
  fields: string[];
  /**
   * Requested result limit, defaulting to 100 when nullish. This factory does not validate positive/range limits or paginate.
   */
  max?: number;
  /**
   * When true, a query containing only ASCII digits adds an exact code match with the original string. Leading zeroes are retained.
   */
  includeNumericCode?: boolean;
}

/**
 * Loose input record for mapToOption; field types are trusted without runtime validation. Missing identifiers become the literal string `undefined`.
 * @see {@link mapToOption} for precedence and an example.
 */
export type OptionSource = Record<string, unknown> & {
  /**
   * Identifier stringified into option.value; also the final display-name fallback.
   */
  id?: string | number;
  /**
   * First truthy display-name choice, before title, fileName and name.
   */
  companyName?: string;
  /**
   * Display-name choice after companyName and before fileName.
   */
  title?: string;
  /**
   * Display-name choice after title and before name.
   */
  fileName?: string;
  /**
   * Last named display-label choice before the stringified id.
   */
  name?: string;
  /**
   * First truthy code choice; numeric zero is treated as absent.
   */
  code?: string | number;
  /**
   * Fallback truthy code choice when code is falsy.
   */
  clientSideCode?: string | number;
};

/**
 * Maps a loose record to a searchable option using truthy field precedence.
 * @param item - Record providing id and optional companyName, title, fileName, name, code or clientSideCode.
 * @returns A new option with string value/name/label. Name precedence is companyName, title, fileName, name, then String(id). Code uses code, then clientSideCode, then an empty string; description is undefined when no truthy code exists.
 * @remarks Values such as an empty name or numeric code zero are skipped. Records are not validated or mutated.
 * @example
 * ```ts
 * import { mapToOption } from '@alneas/appkit-core/data/search-handlers';
 * console.log(mapToOption({ id: 7, title: 'Notebook', code: 'NB' }));
 * // { value: '7', label: 'Notebook', description: 'NB', code: 'NB', name: 'Notebook' }
 * ```
 */
export function mapToOption(item: OptionSource): SearchableSelectOption {
  const name = item.companyName || item.title || item.fileName || item.name || String(item.id);
  const code = item.code || item.clientSideCode || '';
  return {
    value: String(item.id),
    label: String(name),
    description: code ? String(code) : undefined,
    code: code ? String(code) : '',
    name: String(name),
  };
}

/**
 * Creates an asynchronous search function backed by one adapter query per invocation.
 * @param dbAdapter - Host-created adapter supporting $or/$ilike filtering and projection; credentials and authorization remain the host's responsibility.
 * @param options - Target table, comma-separated projection and search fields, with optional limit/code matching.
 * @returns A function accepting an untrimmed query string and returning mapped select options. Empty strings still query; queries longer than 30 UTF-16 code units add exact id matching. Adapter rejections propagate. No debounce, cache, deduplication, sorting or cancellation is added.
 * @remarks The query is interpolated into a pattern without escaping percent or underscore. Behavior depends on the adapter's operator support.
 * @example
 * ```ts
 * import { createTableSearchHandler } from '@alneas/appkit-core/data/search-handlers';
 * import type { DataAccessAdapter } from '@alneas/appkit-core/data';
 * export function makeTaskSearch(adapter: DataAccessAdapter) {
 *   return createTableSearchHandler(adapter, {
 *     table: 'tasks', select: 'id,title,code', fields: ['title'], max: 20,
 *   });
 * }
 * ```
 */
export function createTableSearchHandler(
  dbAdapter: DataAccessAdapter,
  options: SearchHandlerOptions,
) {
  /**
   * Searches configured fields and maps the returned records to select options.
   * @param q - Untrimmed query text inserted into each %query% pattern. ASCII digit-only
   * queries may add code equality, and strings longer than 30 code units add id equality.
   * @returns Adapter results mapped with mapToOption; adapter failures propagate.
   * @example
   * ```ts
   * import { createTableSearchHandler } from '@alneas/appkit-core/data/search-handlers';
   * import type { DataAccessAdapter } from '@alneas/appkit-core/data';
   * export async function searchTasks(adapter: DataAccessAdapter, query: string) {
   *   const search = createTableSearchHandler(adapter, {
   *     table: 'tasks', select: 'id,title', fields: ['title'], max: 20,
   *   });
   *   return search(query);
   * }
   * ```
   */
  return async (q: string): Promise<SearchableSelectOption[]> => {
    const filter: Filter = {
      $or: options.fields.map((field) => ({ [field]: { $ilike: `%${q}%` } })),
    };

    if (options.includeNumericCode && /^\d+$/.test(q)) {
      (filter.$or as Record<string, unknown>[]).push({ code: { $eq: q } });
    }

    if (q.length > 30) {
      (filter.$or as Record<string, unknown>[]).push({ id: { $eq: q } });
    }

    const camelData = await dbAdapter.find(options.table, filter, {
      projection: options.select.split(',').map((s) => s.trim()),
      limit: options.max ?? 100,
    });

    return (camelData || []).map((item) => mapToOption(item as OptionSource));
  };
}
