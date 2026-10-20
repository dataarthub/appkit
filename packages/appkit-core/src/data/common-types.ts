/**
 * Represents a single search candidate option.
 * @example
 * ```ts
 * import type { SearchableSelectOption } from '@alneas/appkit-core/data/common-types';
 * const option: SearchableSelectOption = { value: 'item-1', label: 'Notebook', code: 'NB' };
 * ```
 */
export interface SearchableSelectOption {
  /** Value to be saved (e.g., ID) */
  value: string | number;
  /** Display label (e.g., name) */
  label: string;
  /** Optional supplementary description */
  description?: string;
  /** Optional human-readable name */
  name?: string;
  /** Optional human-readable code */
  code?: string;
}

/**
 * Definition for mapping a CSV column to a database field.
 * Requiredness and dataType are instructions for the consuming ingestion implementation;
 * this interface does not validate or convert values itself.
 * @example
 * ```ts
 * import type { HeaderMapping } from '@alneas/appkit-core/data/common-types';
 * const mapping: HeaderMapping = { csvColumn: 'Title', dbField: 'title', required: true, dataType: 'string' };
 * ```
 */
export interface HeaderMapping {
  /** CSV column name */
  csvColumn: string;
  /** Database field name */
  dbField: string;
  /** Whether the field is required */
  required: boolean;
  /** Host-defined conversion identifier, such as string; this interface imposes no vocabulary. */
  dataType: string;
}

/**
 * Represents upload progress and results.
 * Counter updates and error-message contents are owned by the ingestion implementation.
 * @example
 * ```ts
 * import type { UploadProgress } from '@alneas/appkit-core/data/common-types';
 * const progress: UploadProgress = { total: 2, processed: 1, successful: 1, failed: 0, errors: [] };
 * ```
 */
export interface UploadProgress {
  /** Total number of records */
  total: number;
  /** Number of processed records */
  processed: number;
  /** Number of successful records */
  successful: number;
  /** Number of failed records */
  failed: number;
  /** List of error messages */
  errors: string[];
}
