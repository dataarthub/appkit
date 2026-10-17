/**
 * @fileoverview Schema Verifier (Logical vs Physical)
 *
 * Detects mismatches between design (JSON Schema) and physical DB schema to generate verification results.
 *
 * @module lib/schema/verifier
 */
import type { JSONSchema } from './types';
import { inferPostgresType } from './json-schema';
import { isDbNullable } from './db-mapping';

/**
 * Physical database column metadata.
 */
export interface PhysicalColumn {
  /** Column name */
  name: string;
  /** Data type (e.g., udt_name) */
  type: string;
  /** Nullable flag */
  isNullable: boolean;
  /** Primary key flag */
  isPrimaryKey: boolean;
  /** Unique constraint flag */
  isUnique: boolean;
  /** Default value */
  defaultValue?: string | null;
}

/**
 * Physical database table metadata.
 */
export interface PhysicalTable {
  /** Table name */
  name: string;
  /** Array of column definitions */
  columns: PhysicalColumn[];
}

/**
 * Issue detected during verification.
 */
export interface VerificationIssue {
  /** Type of issue */
  type: 'missing_table' | 'missing_column' | 'type_mismatch' | 'constraint_mismatch';
  /** Path where issue occurred */
  path: string;
  /** Expected value or state */
  expected: string;
  /** Actual value or state */
  actual: string;
  /** Severity level */
  severity: 'error' | 'warning';
  /** Human-readable error message */
  message: string;
}

/**
 * Verification result report.
 */
export interface VerificationResult {
  /** Whether valid without errors (zero severity: error issues) */
  isValid: boolean;
  /** List of detected issues */
  issues: VerificationIssue[];
}

/**
 * Compares and verifies a JSON Schema (design) against a physical table (actual DB structure).
 *
 * @param schema - Target JSON Schema to verify (design)
 * @param physical - Physical structure retrieved from the database (actual)
 * @returns Verification result
 * @remarks Uses the same type and NULL mapping as PostgreSQL generation. Nullability mismatches are errors in both directions.
 * Type mismatches remain warnings as before; inspect issues directly for strict validation.
 */
export function verifySchema(schema: JSONSchema, physical: PhysicalTable): VerificationResult {
  const issues: VerificationIssue[] = [];
  const tableName = schema['x-db']?.tableName || schema.title;

  if (!tableName) {
    issues.push({
      type: 'missing_table',
      path: 'root',
      expected: 'tableName or title',
      actual: 'undefined',
      severity: 'error',
      message: 'スキーマにテーブル名(x-db.tableName または title)が定義されていません。',
    });
    return { isValid: false, issues };
  }

  if (tableName !== physical.name) {
    issues.push({
      type: 'missing_table',
      path: 'tableName',
      expected: tableName,
      actual: physical.name,
      severity: 'error',
      message: `テーブル名が一致しません。期待: ${tableName}, 実際: ${physical.name}`,
    });
  }

  const properties = schema.properties || {};
  const physicalColumns = new Map(physical.columns.map((c) => [c.name, c]));

  for (const [key, prop] of Object.entries(properties)) {
    const columnName = prop['x-db']?.columnName || prop['x-db']?.column || key;
    const physicalCol = physicalColumns.get(columnName);

    if (!physicalCol) {
      issues.push({
        type: 'missing_column',
        path: `properties.${key}`,
        expected: columnName,
        actual: 'missing',
        severity: 'error',
        message: `カラム '${columnName}' が物理テーブルに存在しません。`,
      });
      continue;
    }

    // Type comparison (simplified)
    const expectedType = inferPostgresType(prop);
    if (!isCompatibleType(expectedType, physicalCol.type)) {
      issues.push({
        type: 'type_mismatch',
        path: `properties.${key}.type`,
        expected: expectedType,
        actual: physicalCol.type,
        severity: 'warning',
        message: `'${columnName}' の型が一致しません。設計: ${expectedType}, 物理: ${physicalCol.type}`,
      });
    }

    // Required / Nullability comparison
    const nullable = isDbNullable(prop, (schema.required || []).includes(key));
    if (nullable !== physicalCol.isNullable) {
      issues.push({
        type: 'constraint_mismatch',
        path: `properties.${key}.x-db.nullable`,
        expected: nullable ? 'NULLABLE' : 'NOT NULL',
        actual: physicalCol.isNullable ? 'NULLABLE' : 'NOT NULL',
        severity: 'error',
        message: `'${columnName}' のDB NULL許可が設計と一致しません。`,
      });
    }

    // Primary key comparison
    const isPK = prop['x-db']?.primaryKey;
    if (isPK && !physicalCol.isPrimaryKey) {
      issues.push({
        type: 'constraint_mismatch',
        path: `properties.${key}.x-db.primaryKey`,
        expected: 'PRIMARY KEY',
        actual: 'NOT PRIMARY KEY',
        severity: 'error',
        message: `'${columnName}' は主キー(PK)設定ですが、物理DBで主キーになっていません。`,
      });
    }
  }

  return {
    isValid: issues.filter((i) => i.severity === 'error').length === 0,
    issues,
  };
}

/**
 * Checks type compatibility (simplified version).
 */
function isCompatibleType(expected: string, actual: string): boolean {
  const e = expected.toLowerCase();
  const a = actual.toLowerCase();

  if (e === a) return true;

  // Consider type aliases
  const aliases: Record<string, string[]> = {
    text: ['varchar', 'character varying', 'character'],
    integer: ['int', 'int4', 'serial'],
    bigint: ['int8', 'bigserial'],
    timestamp: ['timestamp without time zone'],
    timestamptz: ['timestamp with time zone'],
    numeric: ['decimal', 'real', 'double precision', 'float'],
  };

  for (const [base, matched] of Object.entries(aliases)) {
    if ((e === base || matched.includes(e)) && (a === base || matched.includes(a))) {
      return true;
    }
  }

  return false;
}
