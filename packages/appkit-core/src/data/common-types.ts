/**
 * Represents a single search candidate option.
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
 */
export interface HeaderMapping {
  /** CSV column name */
  csvColumn: string;
  /** Database field name */
  dbField: string;
  /** Whether the field is required */
  required: boolean;
  /** Data type */
  dataType: string;
}

/**
 * Represents upload progress and results.
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
