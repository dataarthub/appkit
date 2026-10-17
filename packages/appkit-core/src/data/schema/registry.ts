/**
 * @fileoverview Registry Helpers
 *
 * Utilities for working with extension registries.
 *
 * @module lib/schema/registry
 */

// Node-only imports are moved inside functions or used via safe accessors
import { satisfies, valid, validRange } from 'semver';
import type {
  DirectoryCapabilities,
  DocumentHeader,
  ExtensionEnvelope,
  ExtensionsContainer,
  RegistryExtensionEntry,
  RegistryFile,
  FlatIssue,
} from './types';
import { flattenXRuleViolations } from './json-schema';

export interface ExtensionMatchOptions {
  docType?: string;
  status?: string[];
}

export interface ExtensionValidationResult {
  ok: boolean;
  reason?: 'not_found' | 'status_not_allowed' | 'doc_type_mismatch' | 'version_out_of_range';
  entry?: RegistryExtensionEntry;
}

export interface ExtensionsValidationResult {
  ok: boolean;
  results: ExtensionValidationResult[];
}

export interface ExtensionsValidationOptions extends ExtensionMatchOptions {
  /** Stop on first failure */
  shortCircuit?: boolean;
  /** Return only failed results */
  failuresOnly?: boolean;
}

export interface EnabledExtensionSpec {
  namespace: string;
  extension_id: string;
  version_range: string;
}

export interface DirectoryExtensionValidationResult {
  ok: boolean;
  reason?: 'not_enabled' | 'version_out_of_range';
  extension: ExtensionEnvelope;
  enabledSpec?: EnabledExtensionSpec;
}

export interface DirectoryValidationResult {
  ok: boolean;
  profileOk: boolean;
  extensionResults: DirectoryExtensionValidationResult[];
}

export interface HeaderValidationOptions {
  allowedProfiles?: string[];
  allowedProfileVersions?: string[];
  allowedDocTypes?: string[];
  allowedSchemaVersions?: string[];
}

export interface HeaderValidationResult {
  ok: boolean;
  reasons: Array<
    | 'profile_not_allowed'
    | 'profile_version_not_allowed'
    | 'doc_type_not_allowed'
    | 'schema_version_not_allowed'
  >;
}

// Keep FlatIssue in json-schema.ts; re-export from index if needed.

export interface RegistryExampleValidationResult {
  ok: boolean;
  reason?: 'data_invalid' | 'schema_missing' | 'schema_validation_failed';
  errors?: string[];
  schemaRef?: string;
  entry: RegistryExtensionEntry;
  example: ExtensionEnvelope;
}

export interface RegistryExampleValidationOptions {
  /** Generates the reference URL for data.schema.json */
  buildDataRef?: (entry: RegistryExtensionEntry, example: ExtensionEnvelope) => string;
  /** Loads data.schema.json */
  loadSchema?: (
    ref: string,
    entry: RegistryExtensionEntry,
    example: ExtensionEnvelope,
  ) => Promise<unknown> | unknown;
  /** Schema validation function */
  validate?: (schema: unknown, data: unknown) => string[] | null | undefined;
}

export interface RegistryExampleDiskOptions {
  /** Root directory of regional-edi */
  rootDir: string;
}

interface ExtensionApplicability {
  ok: boolean;
  reason?: 'status_not_allowed' | 'doc_type_mismatch';
}

/**
 * Returns whether a Registry entry is applicable and the reason if not.
 *
 * @param entry - Registry entry
 * @param options - Match conditions for doc_type and status
 * @returns Applicability status and reason
 */
function getExtensionApplicability(
  entry: RegistryExtensionEntry,
  options: ExtensionMatchOptions = {},
): ExtensionApplicability {
  const allowedStatuses = options.status ?? ['active', 'draft'];
  if (!allowedStatuses.includes(entry.status)) {
    return { ok: false, reason: 'status_not_allowed' };
  }

  if (options.docType && entry.applies_to && entry.applies_to.length > 0) {
    if (!entry.applies_to.includes(options.docType)) {
      return { ok: false, reason: 'doc_type_mismatch' };
    }
  }

  return { ok: true };
}

/**
 * Finds an entry in the Registry matching namespace + extension_id.
 *
 * @param registry - Registry file
 * @param namespace - Extension namespace
 * @param extensionId - Extension extension_id
 * @returns Found entry, or undefined if not found
 */
export function findRegistryEntry(
  registry: RegistryFile,
  namespace: string,
  extensionId: string,
): RegistryExtensionEntry | undefined {
  return registry.extensions.find(
    (entry) => entry.namespace === namespace && entry.extension_id === extensionId,
  );
}

/**
 * Determines whether a Registry entry is applicable to the specified document.
 *
 * @param entry - Registry entry
 * @param options - Match conditions for doc_type and status
 * @returns True if applicable
 */
export function isExtensionApplicable(
  entry: RegistryExtensionEntry,
  options: ExtensionMatchOptions = {},
): boolean {
  return getExtensionApplicability(entry, options).ok;
}

/**
 * Validates a single extension envelope against the Registry.
 *
 * @param registry - Registry file
 * @param extension - Extension envelope
 * @param options - Match conditions for doc_type and status
 * @returns Validation result
 */
export function validateExtensionEnvelope(
  registry: RegistryFile,
  extension: ExtensionEnvelope,
  options: ExtensionMatchOptions = {},
): ExtensionValidationResult {
  const entry = findRegistryEntry(registry, extension.namespace, extension.extension_id);
  if (!entry) {
    return { ok: false, reason: 'not_found' };
  }

  const applicability = getExtensionApplicability(entry, options);
  if (!applicability.ok) {
    return { ok: false, reason: applicability.reason, entry };
  }

  if (!isVersionInRange(extension.version, entry.version_range)) {
    return { ok: false, reason: 'version_out_of_range', entry };
  }

  return { ok: true, entry };
}

/**
 * Validates multiple extension envelopes together.
 *
 * @param registry - Registry file
 * @param extensions - Array of extensions
 * @param options - Configuration for doc_type, status, short-circuiting, or failures-only
 * @returns Array of validation results and overall ok status
 */
export function validateExtensions(
  registry: RegistryFile,
  extensions: ExtensionEnvelope[],
  options: ExtensionsValidationOptions = {},
): ExtensionsValidationResult {
  const results: ExtensionValidationResult[] = [];

  for (const extension of extensions) {
    const result = validateExtensionEnvelope(registry, extension, options);
    if (!options.failuresOnly || !result.ok) {
      results.push(result);
    }
    if (options.shortCircuit && !result.ok) {
      break;
    }
  }

  return {
    ok: results.every((result) => result.ok),
    results,
  };
}

/**
 * Returns only the failed extension envelopes.
 *
 * @param registry - Registry file
 * @param extensions - Array of extensions
 * @param options - Match conditions for doc_type and status
 * @returns Validation results for failed extensions only
 */
export function validateExtensionsFailures(
  registry: RegistryFile,
  extensions: ExtensionEnvelope[],
  options: ExtensionMatchOptions = {},
): ExtensionValidationResult[] {
  return validateExtensions(registry, extensions, {
    ...options,
    failuresOnly: true,
  }).results;
}

/**
 * Accepts an ExtensionsContainer and validates its extensions array.
 *
 * @param registry - Registry file
 * @param doc - Document containing extensions
 * @param options - Configuration for doc_type, status, short-circuiting, or failures-only
 * @returns Validation result
 */
export function validateExtensionsForDocument(
  registry: RegistryFile,
  doc: ExtensionsContainer,
  options: ExtensionsValidationOptions = {},
): ExtensionsValidationResult {
  return validateExtensions(registry, doc.extensions ?? [], options);
}

/**
 * Accepts an ExtensionsContainer and returns only failed extensions.
 *
 * @param registry - Registry file
 * @param doc - Document containing extensions
 * @param options - Match conditions for doc_type and status
 * @returns Validation results for failed extensions only
 */
export function validateExtensionsFailuresForDocument(
  registry: RegistryFile,
  doc: ExtensionsContainer,
  options: ExtensionMatchOptions = {},
): ExtensionValidationResult[] {
  return validateExtensionsFailures(registry, doc.extensions ?? [], options);
}

/**
 * Normalizes ExtensionsContainer extensions to an array.
 *
 * @param doc - Document containing extensions
 * @returns Array of extensions (empty array if undefined)
 */
export function normalizeExtensionsContainer(doc: ExtensionsContainer): ExtensionEnvelope[] {
  return doc.extensions ?? [];
}

/**
 * Determines whether a value matches the ExtensionEnvelope shape.
 *
 * @param value - Target value to test
 * @returns True if ExtensionEnvelope
 */
export function isExtensionEnvelope(value: unknown): value is ExtensionEnvelope {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.namespace === 'string' &&
    typeof record.extension_id === 'string' &&
    typeof record.version === 'string' &&
    typeof record.data === 'object' &&
    record.data !== null
  );
}

/**
 * Determines whether a value matches the ExtensionsContainer shape.
 *
 * @param value - Target value to test
 * @returns True if ExtensionsContainer
 */
export function isExtensionsContainer(value: unknown): value is ExtensionsContainer {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (record.extensions === undefined) return true;
  if (!Array.isArray(record.extensions)) return false;
  return record.extensions.every(isExtensionEnvelope);
}

/**
 * Determines whether a value matches the RegistryFile shape.
 *
 * Also validates simple ISO dates for updated_at and version_range patterns.
 *
 * @param value - Target value to test
 * @returns True if RegistryFile
 */
export function isRegistryFile(value: unknown): value is RegistryFile {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (typeof record.registry_version !== 'string') return false;
  if (record.updated_at !== undefined && typeof record.updated_at !== 'string') return false;
  if (typeof record.updated_at === 'string' && !isIsoDate(record.updated_at)) return false;
  if (!Array.isArray(record.extensions)) return false;
  return record.extensions.every(isRegistryExtensionEntry);
}

/**
 * Determines whether a value matches the RegistryExtensionEntry shape.
 *
 * @param value - Target value to test
 * @returns True if RegistryExtensionEntry
 */
export function isRegistryExtensionEntry(value: unknown): value is RegistryExtensionEntry {
  if (!value || typeof value !== 'object') return false;
  const ext = value as Record<string, unknown>;
  if (
    !(
      typeof ext.namespace === 'string' &&
      typeof ext.extension_id === 'string' &&
      typeof ext.version_range === 'string' &&
      typeof ext.status === 'string' &&
      typeof ext.title === 'string'
    )
  ) {
    return false;
  }
  if (!isVersionRange(ext.version_range)) return false;

  if (ext.applies_to !== undefined && !Array.isArray(ext.applies_to)) return false;
  if (Array.isArray(ext.applies_to) && !ext.applies_to.every((v) => typeof v === 'string'))
    return false;

  if (ext.core_touchpoints !== undefined && !Array.isArray(ext.core_touchpoints)) return false;
  if (
    Array.isArray(ext.core_touchpoints) &&
    !ext.core_touchpoints.every((v) => typeof v === 'string')
  )
    return false;

  if (ext.validation !== undefined && !Array.isArray(ext.validation)) return false;
  if (Array.isArray(ext.validation) && !ext.validation.every((v) => typeof v === 'string'))
    return false;

  if (ext.examples !== undefined && !Array.isArray(ext.examples)) return false;
  if (Array.isArray(ext.examples) && !ext.examples.every(isRegistryExtensionExample)) return false;

  return true;
}

/**
 * Determines whether a value matches the RegistryExtensionExample shape.
 *
 * @param value - Target value to test
 * @returns True if RegistryExtensionExample
 */
export function isRegistryExtensionExample(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const example = value as Record<string, unknown>;
  return (
    typeof example.namespace === 'string' &&
    typeof example.extension_id === 'string' &&
    typeof example.version === 'string' &&
    typeof example.data === 'object' &&
    example.data !== null
  );
}

/**
 * Validates a RegistryFile and returns it if valid.
 *
 * @param value - Input value
 * @returns Valid RegistryFile
 * @throws When format is invalid
 */
export function parseRegistryFile(value: unknown): RegistryFile {
  if (!isRegistryFile(value)) {
    throw new Error('Invalid registry file');
  }
  return value;
}

/**
 * Generates the directory name under registry/extensions.
 *
 * @param entry - Registry entry
 * @returns Directory name
 */
export function buildRegistryExtensionDirName(entry: RegistryExtensionEntry): string {
  return `${entry.namespace}.${entry.extension_id}`;
}

/**
 * Generates the path to data.schema.json.
 *
 * @param entry - Registry entry
 * @param version - Extension version
 * @param rootDir - regional-edi root directory
 * @returns Path to data.schema.json
 */
export function buildRegistryExtensionSchemaPath(
  entry: RegistryExtensionEntry,
  version: string,
  rootDir: string,
): string {
  // Basic slash join for browser compatibility (mostly for display/URLs)
  // For Node.js execution, this is usually called from contexts that handle paths properly.
  const parts = [
    rootDir,
    'registry',
    'extensions',
    buildRegistryExtensionDirName(entry),
    version,
    'data.schema.json',
  ];
  return parts.join('/').replace(/\/+/g, '/');
}

/**
 * Parses the enabled_extensions string of a Directory.
 *
 * @param value - Format "namespace.extension_id@1.x"
 * @returns Parsed result, or null on failure
 */
export function parseEnabledExtensionSpec(value: string): EnabledExtensionSpec | null {
  const [fullName, range] = value.split('@');
  if (!fullName || !range) return null;
  const lastDot = fullName.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === fullName.length - 1) return null;

  return {
    namespace: fullName.slice(0, lastDot),
    extension_id: fullName.slice(lastDot + 1),
    version_range: range,
  };
}

/**
 * Validates consistency between Directory enabled_extensions and actual data.
 *
 * @param extensions - extensions array
 * @param directory - Directory capabilities info
 * @returns Validation results
 */
export function validateExtensionsAgainstDirectory(
  extensions: ExtensionEnvelope[],
  directory: DirectoryCapabilities,
): DirectoryExtensionValidationResult[] {
  const enabledSpecs = directory.enabled_extensions
    .map(parseEnabledExtensionSpec)
    .filter((spec): spec is EnabledExtensionSpec => !!spec);

  return extensions.map((extension) => {
    const spec = enabledSpecs.find(
      (entry) =>
        entry.namespace === extension.namespace && entry.extension_id === extension.extension_id,
    );

    if (!spec) {
      return { ok: false, reason: 'not_enabled', extension };
    }

    if (!isVersionInRange(extension.version, spec.version_range)) {
      return { ok: false, reason: 'version_out_of_range', extension, enabledSpec: spec };
    }

    return { ok: true, extension, enabledSpec: spec };
  });
}

/**
 * Validates compatibility between Directory and document.
 *
 * @param header - Document common header
 * @param directory - Directory capabilities info
 * @returns Validation result
 */
export function validateDocumentAgainstDirectory(
  header: { profile: string; extensions?: ExtensionEnvelope[] },
  directory: DirectoryCapabilities,
): DirectoryValidationResult {
  const profileOk = directory.enabled_profiles.includes(header.profile);
  const extensionResults = validateExtensionsAgainstDirectory(header.extensions ?? [], directory);

  return {
    ok: profileOk && extensionResults.every((result) => result.ok),
    profileOk,
    extensionResults,
  };
}

/**
 * Validates document common header against allowlists.
 *
 * @param header - Document common header
 * @param options - Allowlists for profile/doc_type/schema_version
 * @returns Validation result
 */
export function validateDocumentHeader(
  header: DocumentHeader,
  options: HeaderValidationOptions = {},
): HeaderValidationResult {
  const reasons: HeaderValidationResult['reasons'] = [];

  if (options.allowedProfiles && !options.allowedProfiles.includes(header.profile)) {
    reasons.push('profile_not_allowed');
  }

  if (options.allowedProfileVersions) {
    if (
      !header.profile_version ||
      !options.allowedProfileVersions.includes(header.profile_version)
    ) {
      reasons.push('profile_version_not_allowed');
    }
  }

  if (options.allowedDocTypes && !options.allowedDocTypes.includes(header.doc_type)) {
    reasons.push('doc_type_not_allowed');
  }

  if (
    options.allowedSchemaVersions &&
    !options.allowedSchemaVersions.includes(header.schema_version)
  ) {
    reasons.push('schema_version_not_allowed');
  }

  return { ok: reasons.length === 0, reasons };
}

/**
 * Converts Header validation results into a flat error array.
 *
 * @param result - Header validation result
 * @returns Flat error array
 */
export function flattenHeaderValidation(
  result: HeaderValidationResult,
): import('./types').FlatIssue[] {
  return result.reasons.map((reason) => ({
    level: 'error',
    code: reason,
    path: '$.header',
    message: `Header validation failed: ${reason}`,
  }));
}

/**
 * Converts Registry validation results into a flat error array.
 *
 * @param result - Registry validation result
 * @returns Flat error array
 */
export function flattenRegistryValidation(
  result: ExtensionsValidationResult,
): import('./types').FlatIssue[] {
  return result.results
    .filter((entry) => !entry.ok)
    .map((entry) => ({
      level: 'error',
      code: entry.reason ?? 'extension_invalid',
      path: '$.extensions[]',
      message: `Extension not allowed: ${entry.reason ?? 'unknown'}`,
    }));
}

export type { ValidationReport, FormatValidationReportResult } from './types';

/**
 * Flattens validation results and returns them aggregated.
 *
 * @param report - Collection of validation results
 * @returns Report body and flat issues array
 */
export function formatValidationReport(
  report: import('./types').ValidationReport,
): import('./types').FormatValidationReportResult {
  const flat: FlatIssue[] = [
    ...flattenHeaderValidation(report.header),
    ...flattenRegistryValidation(report.registry),
    ...flattenXRuleViolations(report.rules),
  ];

  return { report, flat };
}

/**
 * Determines whether a value matches the DirectoryCapabilities shape.
 *
 * @param value - Target value to test
 * @returns True if DirectoryCapabilities
 */
export function isDirectoryCapabilities(value: unknown): value is DirectoryCapabilities {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.enabled_profiles)) return false;
  if (!Array.isArray(record.enabled_extensions)) return false;
  return (
    record.enabled_profiles.every((v) => typeof v === 'string') &&
    record.enabled_extensions.every((v) => typeof v === 'string')
  );
}

/**
 * Validates DirectoryCapabilities and returns it if valid.
 *
 * @param value - Input value
 * @returns Valid DirectoryCapabilities
 * @throws When format is invalid
 */
export function parseDirectoryCapabilities(value: unknown): DirectoryCapabilities {
  if (!isDirectoryCapabilities(value)) {
    throw new Error('Invalid directory capabilities');
  }
  return value;
}

/**
 * Validates Registry examples against schemas.
 *
 * @param registry - Registry file
 * @param options - Reference URL, schema loader, and validation function
 * @returns Array of validation results
 */
export async function validateRegistryExamples(
  registry: RegistryFile,
  options: RegistryExampleValidationOptions = {},
): Promise<RegistryExampleValidationResult[]> {
  const results: RegistryExampleValidationResult[] = [];

  for (const entry of registry.extensions) {
    for (const example of entry.examples ?? []) {
      if (!example.data || typeof example.data !== 'object') {
        results.push({
          ok: false,
          reason: 'data_invalid',
          entry,
          example,
        });
        continue;
      }

      const schemaRef = options.buildDataRef?.(entry, example);
      let schema: unknown | undefined;

      if (schemaRef && options.loadSchema) {
        schema = await options.loadSchema(schemaRef, entry, example);
      }

      if (schemaRef && !schema) {
        results.push({
          ok: false,
          reason: 'schema_missing',
          schemaRef,
          entry,
          example,
        });
        continue;
      }

      if (schema && options.validate) {
        const errors = options.validate(schema, example.data) ?? [];
        if (errors.length > 0) {
          results.push({
            ok: false,
            reason: 'schema_validation_failed',
            errors,
            schemaRef,
            entry,
            example,
          });
          continue;
        }
      }

      results.push({
        ok: true,
        schemaRef,
        entry,
        example,
      });
    }
  }

  return results;
}

/**
 * Automatically validates registry/examples against data.schema.json on disk.
 *
 * @param registry - Registry file
 * @param options - rootDir option
 * @param validate - Schema validation function
 * @returns Validation results
 */
export async function validateRegistryExamplesFromDisk(
  registry: RegistryFile,
  options: RegistryExampleDiskOptions,
  validate?: (schema: unknown, data: unknown) => string[] | null | undefined,
): Promise<RegistryExampleValidationResult[]> {
  const { readFile } = await import('node:fs/promises');
  return validateRegistryExamples(registry, {
    buildDataRef: (entry, example) =>
      buildRegistryExtensionSchemaPath(entry, example.version, options.rootDir),
    loadSchema: async (ref) => {
      const content = await readFile(ref, 'utf-8');
      return JSON.parse(content);
    },
    validate,
  });
}

/**
 * Determines whether a string is a simple ISO date format (YYYY-MM-DD).
 *
 * @param value - Target value to test
 * @returns True if ISO date format
 */
function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * Checks if a version range matches a valid semver range pattern.
 *
 * Example: "1.x", "1.2.x", "1.0.0"
 *
 * @param value - Target value to test
 * @returns True if pattern matches
 */
function isVersionRange(value: string): boolean {
  return !!validRange(value, { loose: true });
}

/**
 * Determines whether a version satisfies a range.
 *
 * @param version - Version string
 * @param range - Range string (e.g. 1.x)
 * @returns True if compatible
 */
function isVersionInRange(version: string, range: string): boolean {
  const normalized = valid(version, { loose: true });
  if (!normalized) return false;
  return satisfies(normalized, range, { loose: true });
}
