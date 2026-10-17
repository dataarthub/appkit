import type { DataAccessAdapter, Filter } from './types';
import type { SearchableSelectOption } from './common-types';

/**
 * Options for creating a search handler.
 */
export interface SearchHandlerOptions {
  /** Target database table/collection name */
  table: string;
  /** Comma-separated list of column names to project when searching records (e.g. 'id, name, code') */
  select: string;
  /** Array of string field names to target for partial match search */
  fields: string[];
  /** Maximum number of records to retrieve (default: 100) */
  max?: number;
  /** Whether to include exact match on 'code' column when the search query is numeric-only */
  includeNumericCode?: boolean;
}

/**
 * Represents the record structure of data that can be mapped to search options.
 */
export type OptionSource = Record<string, unknown> & {
  id?: string | number;
  companyName?: string;
  title?: string;
  fileName?: string;
  name?: string;
  code?: string | number;
  clientSideCode?: string | number;
};

/**
 * Maps a database record source to a `SearchableSelectOption` object.
 * Automatically selects the most appropriate display label from name, title, fileName, companyName, etc.
 *
 * @param item Source database record
 * @returns Mapped select option
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
 * Factory that generates a generic table search handler function.
 * Creates a handler function suitable for passing directly to `onSearch` of searchable select inputs (`SearchableSelectInput`) for foreign key lookups.
 *
 * @param dbAdapter Database access adapter
 * @param options Search condition configuration options
 * @returns Asynchronous search handler function
 */
export function createTableSearchHandler(
  dbAdapter: DataAccessAdapter,
  options: SearchHandlerOptions,
) {
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
