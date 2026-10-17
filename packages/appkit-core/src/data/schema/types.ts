/**
 * @fileoverview JSON Schema Types with Vendor Extensions
 *
 * Standard JSON Schema (2020-12) with x-ui, x-db, x-zod, x-gen, x-rls extensions.
 *
 * @see https://json-schema.org/draft/2020-12/schema
 * @module lib/schema/types
 */

// =============================================================================
// UI Extensions (x-ui)
// =============================================================================

/**
 * Configuration for fetching search suggestions from DataAccess.
 */
export interface XUISearchSourceOptions {
  /** Target collection or table name */
  collection: string;
  /** ID field name (default: id) */
  idField?: string;
  /** Label field name (default: name) */
  labelField?: string;
  /** Description field name (optional) */
  descriptionField?: string;
  /** Additional filter (optional) */
  baseFilter?: Record<string, unknown>;
  /** Number of results to fetch (default: 20) */
  limit?: number;
  /** Allow creating a new record when zero candidates exist */
  createEnabled?: boolean;
}

/**
 * UI display options (x-ui)
 *
 * react-jsonschema-form style UI definition.
 * Defines settings related to form rendering.
 */
export interface XUIOptions {
  /** Input UI component */
  widget?:
    | 'textarea'
    | 'radio'
    | 'color'
    | 'range'
    | 'hidden'
    | 'select'
    | 'checkbox'
    | 'password'
    // Location widgets
    | 'country'
    | 'subdivision'
    | 'postalcode'
    // Subdivision aliases (resolve to subdivision with fixed country)
    | 'prefecture'
    | 'state'
    | 'province';
  /** Display label */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Supplementary help text */
  help?: string;
  /** Hidden flag */
  hidden?: boolean;
  /** Read-only */
  readOnly?: boolean;
  /** Disabled */
  disabled?: boolean;
  /** Auto-focus */
  autoFocus?: boolean;
  /** Prefix icon/text for input field */
  prefix?: string;
  /** Suffix icon/text for input field */
  suffix?: string;
  /** Select options (explicit labels separate from enum) */
  options?: Array<{ label: string; value: string | number }>;
  /** Allow custom arbitrary input outside candidates in `select` */
  allowCustom?: boolean;
  /** Asynchronous search settings using DataAccess */
  searchSource?: XUISearchSourceOptions;
  /** Async search debounce time (ms) */
  searchDebounceMs?: number;
  /** Minimum character count to start async search */
  searchMinLength?: number;
  /** Message when no options match */
  noOptionsMessage?: string;
  /** Dialog title for creating new entry when zero candidates exist */
  createDialogTitle?: string;
  /** ID label for create dialog */
  createIdLabel?: string;
  /** Name label for create dialog */
  createNameLabel?: string;

  // Location widget options
  /** Dependent field name (country field referenced by subdivision) */
  dependsOn?: string;
  /** Country field name (for postal code validation) */
  countryField?: string;
  /** Use ISO format (for prefecture widget) */
  useIsoCode?: boolean;
  /** Automatic formatting (for postal code) */
  autoFormat?: boolean;

  /** Layout settings */
  layout?: {
    /** Grid column span (12-column grid) */
    colSpan?: number | { xs?: number; sm?: number; md?: number; lg?: number };
    /** Row span */
    rowSpan?: number;
    /** Display order */
    order?: number;
    /** Section identifier */
    section?: string;
    /** Break before (new line flag) */
    breakBefore?: boolean;
  };
  /** Style settings */
  style?: {
    /** Maximum width */
    maxWidth?: string;
    /** Minimum height */
    minHeight?: string;
    /** Custom CSS class */
    className?: string;
  };

  // Form layout options (migrated from legacy SchemaDefinition)
  /** Multi-step form: step number (1-based) */
  step?: number;
  /** Progressive disclosure: hide in collapsed "advanced" section */
  advanced?: boolean;
  /** Field grouping label (displayed as section heading) */
  group?: string;
  /** Field width hint for form layout */
  width?: 'short' | 'medium' | 'long' | 'full';
}

// =============================================================================
// Code List Extensions (x-codelist)
// =============================================================================

/**
 * Code List reference configuration (x-codelist)
 */
export interface XCodelistOptions {
  /** Code list identifier (e.g. unit-codes, tax-categories) */
  id: string;
  /** Optional version (e.g. 1.0.0) */
  version?: string;
  /** Label field to use in UI */
  labelField?: 'label_ja' | 'label_en';
  /** Include deprecated codes */
  includeDeprecated?: boolean;
  /** Label fallback order */
  fallbackOrder?: Array<'label_ja' | 'label_en' | 'code'>;
}

// =============================================================================
// Database Extensions (x-db)
// =============================================================================

/**
 * Database definition options (x-db)
 *
 * Database-specific configuration such as Supabase/PostgreSQL, Convex, MongoDB, etc.
 */
export interface XDBOptions {
  /** Table or collection name (Root only) */
  tableName?: string;
  /** Column name override */
  columnName?: string;
  /** Compatibility: alias for columnName */
  column?: string;
  /** Primary key flag */
  primaryKey?: boolean;
  /** DB nullability. Primary key is always false. When omitted, true if type allows null or not required (compatibility rule). */
  nullable?: boolean;
  /** Foreign key configuration */
  foreignKey?: {
    table: string;
    field?: string;
    onDelete?: 'cascade' | 'restrict' | 'set null' | 'no action';
  };
  /** Compatibility: alias for foreignKey */
  references?: {
    table: string;
    column?: string;
    onDelete?: 'cascade' | 'restrict' | 'set null' | 'no action';
  };
  /** Index creation */
  index?: boolean;
  /** Unique constraint */
  unique?: boolean;
  /** DB default value (SQL expression) */
  default?: string;
  /** DB type override */
  type?: string;
  /** Convex-specific type */
  convexType?: string;
  /** CHECK constraint (SQL expression, e.g. "status IN ('draft', 'sent')") */
  check?: string;
  /**
   * Flag to generate definitions in $defs as a separate table.
   * Specifies parent table name and parent ID column name.
   */
  asTable?: {
    /** Generated table name */
    tableName: string;
    /** Foreign key column name to parent table */
    parentColumn?: string;
    /** Cascade on parent table deletion */
    onDeleteCascade?: boolean;
  };
  /** Skip DB generation flag */
  skip?: boolean;
}

// =============================================================================
// Zod Extensions (x-zod)
// =============================================================================

/**
 * Zod validation extensions (x-zod)
 */
export interface XZodOptions {
  /** Custom error messages */
  errorMessages?: {
    required_error?: string;
    invalid_type_error?: string;
    too_small?: string;
    too_big?: string;
    invalid_string?: string;
  };
  /** Type coercion flag */
  coerce?: boolean;
  /** Transform processing */
  transform?: 'trim' | 'toLowerCase' | 'toUpperCase';
  /** Custom validation function name */
  refine?: string;
}

// =============================================================================
// Code Generation Extensions (x-gen)
// =============================================================================

/**
 * Code generation extensions (x-gen)
 */
export interface XGenOptions {
  /** TypeScript type override */
  tsType?: string;
}

// =============================================================================
// RLS Extensions (x-rls)
// =============================================================================

/**
 * RLS policy definition (for individual operations)
 *
 * Policy settings for SELECT, INSERT, UPDATE, and DELETE operations.
 */
export interface XRLSPolicy {
  /** Allowed roles (authenticated, admin, service_role, etc.) */
  roles?: string[];
  /**
   * SQL condition expression (used in USING or WITH CHECK clause)
   * @example "auth.uid() = user_id"
   * @example "auth.role() = 'admin'"
   */
  check?: string;
  /**
   * USING clause (for SELECT/UPDATE/DELETE)
   * Used for access control on existing rows
   */
  using?: string;
  /**
   * WITH CHECK clause (for INSERT/UPDATE)
   * Used for validation on inserting or updating new rows
   */
  withCheck?: string;
  /** Policy name suffix (used during automatic generation) */
  policyName?: string;
}

/**
 * RLS configuration (x-rls)
 *
 * Table-wide Row Level Security configuration.
 * Used to automatically generate Supabase/PostgreSQL RLS policies.
 */
export interface XRLSOptions {
  /** Enable RLS (default: true) */
  enabled?: boolean;
  /** Force mode (default: false) */
  force?: boolean;
  /** SELECT policy */
  select?: XRLSPolicy;
  /** INSERT policy */
  insert?: XRLSPolicy;
  /** UPDATE policy */
  update?: XRLSPolicy;
  /** DELETE policy */
  delete?: XRLSPolicy;
  /** Common policy for all operations (individual settings take precedence) */
  all?: XRLSPolicy;
  /** Compatibility: policies array format */
  policies?: XRLSLegacyPolicy[];
}

/** Compatibility: legacy RLS policy format */
export interface XRLSLegacyPolicy {
  name: string;
  operation: string[] | string;
  roles?: string[];
  using?: string;
  withCheck?: string;
}

/** Compatibility: field-level RLS hint */
export interface XRLSFieldHint {
  column?: string;
  policy?: string;
}

// =============================================================================
// Validation Rules Extensions (x-rules)
// =============================================================================

/** x-rules operators */
export type XRuleOp =
  | 'eq'
  | 'neq'
  | 'lt'
  | 'lte'
  | 'gt'
  | 'gte'
  | 'in'
  | 'nin'
  | 'regex'
  | 'sum_eq';

/** x-rules literal values */
export type XRuleLiteral =
  | string
  | number
  | boolean
  | null
  | Array<string | number | boolean | null>;

/** x-rules operand */
export type XRuleOperand = { jsonpath: string } | { literal: XRuleLiteral };

/** x-rules assert condition */
export interface XRuleAssert {
  op: XRuleOp;
  left: XRuleOperand;
  right: XRuleOperand;
}

/** x-rules when condition */
export interface XRuleCondition {
  jsonpath: string;
}

/** x-rules rule definition */
export interface XRuleDefinition {
  id: string;
  severity: 'error' | 'warning' | 'info';
  scope: 'document' | 'data' | 'item' | string;
  target?: string;
  when?: XRuleCondition;
  assert: XRuleAssert;
  message?: string;
  error_code?: string;
  field_paths?: string[];
}

// =============================================================================
// JSON Schema Property with Extensions
// =============================================================================

/**
 * JSON Schema 2020-12 property (with extensions)
 *
 * Standard JSON Schema 2020-12 + vendor extensions
 */
export interface JSONSchemaProperty {
  // Standard JSON Schema fields
  type?:
    | 'string'
    | 'number'
    | 'integer'
    | 'boolean'
    | 'array'
    | 'object'
    | 'null'
    | ('string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null')[];
  format?: 'email' | 'date' | 'date-time' | 'time' | 'uri' | 'uuid' | 'password' | string;
  title?: string;
  description?: string;
  default?: unknown;
  enum?: readonly (string | number | boolean | null)[];
  const?: unknown;

  $ref?: string; // 2020-12: Reference to another schema
  readOnly?: boolean;
  writeOnly?: boolean;

  // String constraints
  minLength?: number;
  maxLength?: number;
  pattern?: string;

  // Number constraints
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;

  // Array constraints
  items?: JSONSchemaProperty | false;
  prefixItems?: JSONSchemaProperty[]; // 2020-12: Tuple validation
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;

  // Object constraints
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean | JSONSchemaProperty;
  unevaluatedProperties?: boolean | JSONSchemaProperty; // 2020-12
  dependentRequired?: Record<string, string[]>; // 2020-12: Conditional requirements
  dependentSchemas?: Record<string, JSONSchemaProperty>; // 2020-12

  // Vendor extensions
  'x-ui'?: XUIOptions;
  'x-db'?: XDBOptions;
  'x-zod'?: XZodOptions;
  'x-gen'?: XGenOptions;
  'x-rules'?: XRuleDefinition[];
  'x-codelist'?: XCodelistOptions;
}

// =============================================================================
// Root JSON Schema with Extensions
// =============================================================================

/**
 * Root JSON Schema object (with extensions)
 */
export interface JSONSchema extends JSONSchemaProperty {
  $schema?: string;
  $id?: string;
  $defs?: Record<string, JSONSchemaProperty>; // 2020-12: Reusable definitions
  $anchor?: string; // 2020-12: In-document reference
  'x-db'?: XDBOptions & { tableName: string };
  'x-rls'?: XRLSOptions | XRLSFieldHint;
  /** Multi-step form step definitions (migrated from legacy SchemaDefinition.steps) */
  'x-steps'?: Array<{ name: string; title: string; description?: string }>;
}

/** @deprecated Use JSONSchema instead */
export type JSONSchemaExt = JSONSchema;

// =============================================================================
// Registry Metadata
// =============================================================================

/** Registry example data */
export interface RegistryExtensionExample {
  namespace: string;
  extension_id: string;
  version: string;
  data: Record<string, unknown>;
}

/** Registry extension entry */
export interface RegistryExtensionEntry {
  namespace: string;
  extension_id: string;
  version_range: string;
  status: 'active' | 'draft' | 'deprecated' | string;
  title: string;
  description?: string;
  applies_to?: string[];
  core_touchpoints?: string[];
  validation?: string[];
  examples?: RegistryExtensionExample[];
}

/** Registry file */
export interface RegistryFile {
  registry_version: string;
  updated_at?: string;
  extensions: RegistryExtensionEntry[];
}

// =============================================================================
// Extensions Envelope (Data Compatibility)
// =============================================================================

/** Extension envelope */
export interface ExtensionEnvelope {
  namespace: string;
  extension_id: string;
  version: string;
  data: Record<string, unknown>;
}

/** Document containing an extensions array */
export interface ExtensionsContainer {
  extensions?: ExtensionEnvelope[];
}

// =============================================================================
// Directory / Header Metadata
// =============================================================================

/** Document common header */
export interface DocumentHeader {
  schema_version: string;
  profile: string;
  profile_version?: string;
  doc_type: string;
  id: string;
  issue_date: string;
  extensions?: ExtensionEnvelope[];
}

/** Directory capability information */
export interface DirectoryCapabilities {
  enabled_profiles: string[];
  enabled_extensions: string[];
}

// =============================================================================
// Validation Report Types
// =============================================================================

/** Flattened validation error */
export interface FlatIssue {
  level: 'error' | 'warning' | 'info';
  code: string;
  path: string;
  message: string;
}

/** Validation report */
export interface ValidationReport {
  header: import('./registry').HeaderValidationResult;
  registry: import('./registry').ExtensionsValidationResult;
  rules: import('./json-schema').XRuleViolation[];
  registryExamples?: import('./registry').RegistryExampleValidationResult[];
}

/** Validation report + flattened array */
export interface FormatValidationReportResult {
  report: ValidationReport;
  flat: FlatIssue[];
}

// =============================================================================
// Legacy Type Aliases (Backward Compatibility)
// =============================================================================

/** @deprecated Use JSONSchemaProperty instead */
export type FieldType =
  | 'text'
  | 'number'
  | 'email'
  | 'tel'
  | 'zip'
  | 'prefecture'
  | 'password'
  | 'date'
  | 'time'
  | 'timestring'
  | 'datetime'
  | 'file'
  | 'select'
  | 'boolean'
  | 'textarea'
  | 'json'
  | 'array'
  | 'object';

/** @deprecated Use XUIOptions.layout.section instead */
export type FieldWidth = 'short' | 'medium' | 'long' | 'full';

/** @deprecated Use x-db.foreignKey with x-ui options instead */
export type RelationInputDisplay = 'key' | 'text' | 'both';
export type RelationSearchMode = 'dialog' | 'rightpane';

/** @deprecated Use x-db.foreignKey with x-ui options instead */
export interface FieldRelationDefinition {
  displayField: string;
  inputDisplay?: RelationInputDisplay;
  validateKey?: boolean;
  searchMode?: RelationSearchMode;
  searchFields?: string[];
  searchTitle?: string;
}

/** @deprecated Use JSONSchemaProperty instead */
export interface FieldDefinition {
  type: FieldType;
  label?: string;
  group?: string;
  width?: FieldWidth;
  advanced?: boolean;
  step?: number;
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  options?: { label: string; value: string | number }[];
  enum?: Array<string | number>;
  placeholder?: string;
  description?: string;
  defaultValue?: unknown;
  unique?: boolean;
  primaryKey?: boolean;
  references?: {
    table: string;
    column?: string;
    onDelete?: 'cascade' | 'restrict' | 'set null' | 'no action';
    multiple?: boolean;
    ui?: FieldRelationDefinition;
  };
  disabled?: boolean;
  hidden?: boolean;
  enumRef?: string;
  span?: number;
  items?: FieldDefinition;
  properties?: Record<string, FieldDefinition>;
}

/** @deprecated Use JSONSchema instead */
export interface SchemaDefinition {
  name: string;
  table?: string;
  fields: Record<string, FieldDefinition>;
  steps?: Array<{ name: string; title: string; description?: string }>;
}

// =============================================================================
// FromSchema Utility Types
// =============================================================================

/**
 * Maps JSON Schema types to TypeScript types
 */
type JSONSchemaTypeToTS<T extends string> = T extends 'string'
  ? string
  : T extends 'number' | 'integer'
    ? number
    : T extends 'boolean'
      ? boolean
      : T extends 'null'
        ? null
        : T extends 'array'
          ? unknown[]
          : T extends 'object'
            ? Record<string, unknown>
            : unknown;

/**
 * Infers TypeScript type from a JSON Schema property
 */
type PropertyToTS<P> = P extends { type: infer _T extends string; enum: readonly (infer E)[] }
  ? E
  : P extends { type: infer T extends string }
    ? JSONSchemaTypeToTS<T>
    : P extends { enum: readonly (infer E)[] }
      ? E
      : P extends { const: infer C }
        ? C
        : unknown;

/**
 * Retrieves required property keys
 */
type RequiredKeys<S> = S extends { required: readonly (infer K)[] } ? K : never;

/**
 * Retrieves optional property keys
 */
type OptionalKeys<S, Props extends string> = Exclude<Props, RequiredKeys<S>>;

/**
 * Derives TypeScript type from JSON Schema
 *
 * @example
 * ```typescript
 * import type { FromSchema } from "./types";
 * const userSchema = { properties: { id: { type: 'string' }, name: { type: 'string' } }, required: ['id', 'name'] } as const;
 * type User = FromSchema<typeof userSchema>;
 * // => { id: string; name: string; email?: string; ... }
 * ```
 */
export type FromSchema<S> = S extends {
  properties: infer P extends Record<string, unknown>;
}
  ? // Required properties
    {
      [K in keyof P as K extends RequiredKeys<S> ? K : never]: PropertyToTS<P[K]>;
    } & {
      // Optional properties
      [K in keyof P as K extends OptionalKeys<S, Extract<keyof P, string>>
        ? K
        : never]?: PropertyToTS<P[K]>;
    } extends infer O
    ? { [K in keyof O]: O[K] }
    : never
  : never;

/**
 * Retrieves table name from JSON Schema
 */
export type TableNameFromSchema<S> = S extends { 'x-db': { tableName: infer T } } ? T : string;
