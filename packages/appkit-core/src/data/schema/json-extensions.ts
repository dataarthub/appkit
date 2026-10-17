export type SchemaDialect = 'sqlite' | 'oracle' | 'postgres';

export interface VirtualColumnDefinition {
  name: string;
  /** Expression to extract from the JSON column, e.g. "$.plugins.hotel.roomId" */
  jsonPath: string;
  /** Physical target data type for each dialect */
  type: Partial<Record<SchemaDialect, string>> & { default: string };
  /** Optional documentation */
  description?: string;
  /** Optional foreign key reference (must be tenant-scoped) */
  references?: {
    table: string;
    /** Foreign key columns, default is ["tenant_id", "id"] */
    columns: [string, string];
  };
  /** Whether to create a unique constraint or partial unique index */
  unique?: boolean;
}

export interface JsonSchemaValidationDefinition {
  name: string;
  /** JSON path inside the document to validate, e.g. "$.plugins.hotel" */
  jsonPath?: string;
  /** JSON Schema (Draft 2020-12 compatible object) */
  schema: Record<string, unknown>;
  description?: string;
}

export interface TableJsonExtensions {
  /** Column name storing the JSON document. Defaults to "payload" */
  jsonColumn?: string;
  /** Virtual / generated column definitions */
  virtualColumns?: VirtualColumnDefinition[];
  /** JSON Schema validation constraints */
  validations?: JsonSchemaValidationDefinition[];
}

/**
 * Generates SQL statements across Dialects for adding virtual/generated columns and schema constraints.
 * Follows zero-downtime guidelines:
 * - Oracle / OCI ADB uses NOVALIDATE / Virtual columns
 * - Postgres uses NOT VALID / STORED generated columns
 * - SQLite uses STORED generated columns
 */
export function generateJsonExtensionSql(
  tableName: string,
  extensions: TableJsonExtensions,
  dialect: SchemaDialect
): string[] {
  const jsonCol = extensions.jsonColumn ?? 'payload';
  const statements: string[] = [];

  // 1. Virtual Columns
  for (const vc of extensions.virtualColumns ?? []) {
    const colType = vc.type[dialect] ?? vc.type.default;

    if (dialect === 'postgres') {
      const pgPathExpr = convertJsonPathToPg(jsonCol, vc.jsonPath);
      statements.push(
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${vc.name} ${colType} GENERATED ALWAYS AS (${pgPathExpr}::${colType}) STORED;`
      );
      if (vc.references) {
        const [refTenant, refId] = vc.references.columns;
        statements.push(
          `ALTER TABLE ${tableName} ADD CONSTRAINT fk_${tableName}_${vc.name} FOREIGN KEY (tenant_id, ${vc.name}) REFERENCES ${vc.references.table} (${refTenant}, ${refId}) NOT VALID;`
        );
      }
      if (vc.unique) {
        statements.push(
          `CREATE UNIQUE INDEX IF NOT EXISTS uq_${tableName}_${vc.name} ON ${tableName} (tenant_id, ${vc.name}) WHERE ${vc.name} IS NOT NULL;`
        );
      }
    } else if (dialect === 'oracle') {
      statements.push(
        `ALTER TABLE ${tableName} ADD (${vc.name} ${colType} GENERATED ALWAYS AS (JSON_VALUE(${jsonCol}, '${vc.jsonPath}' RETURNING ${colType} NULL ON EMPTY)));`
      );
      if (vc.references) {
        const [refTenant, refId] = vc.references.columns;
        statements.push(
          `ALTER TABLE ${tableName} ADD CONSTRAINT fk_${tableName}_${vc.name} FOREIGN KEY (tenant_id, ${vc.name}) REFERENCES ${vc.references.table} (${refTenant}, ${refId}) ENABLE NOVALIDATE;`
        );
      }
      if (vc.unique) {
        statements.push(
          `CREATE UNIQUE INDEX uq_${tableName}_${vc.name} ON ${tableName} (tenant_id, ${vc.name});`
        );
      }
    } else if (dialect === 'sqlite') {
      statements.push(
        `ALTER TABLE ${tableName} ADD COLUMN ${vc.name} ${colType} GENERATED ALWAYS AS (json_extract(${jsonCol}, '${vc.jsonPath}')) STORED;`
      );
      if (vc.unique) {
        statements.push(
          `CREATE UNIQUE INDEX IF NOT EXISTS uq_${tableName}_${vc.name} ON ${tableName} (tenant_id, ${vc.name}) WHERE ${vc.name} IS NOT NULL;`
        );
      }
    }
  }

  // 2. Schema Validations (Conditional CHECK constraints)
  for (const val of extensions.validations ?? []) {
    const schemaStr = JSON.stringify(val.schema).replace(/'/g, "''");
    const constraintName = `chk_${tableName}_${val.name}`;

    if (dialect === 'postgres') {
      if (val.jsonPath) {
        const pgPathExpr = convertJsonPathToPg(jsonCol, val.jsonPath, false);
        statements.push(
          `ALTER TABLE ${tableName} ADD CONSTRAINT ${constraintName} CHECK (${pgPathExpr} IS NULL OR jsonb_matches_schema('${schemaStr}'::json, ${pgPathExpr})) NOT VALID;`
        );
      } else {
        statements.push(
          `ALTER TABLE ${tableName} ADD CONSTRAINT ${constraintName} CHECK (${jsonCol} IS NULL OR jsonb_matches_schema('${schemaStr}'::json, ${jsonCol})) NOT VALID;`
        );
      }
    } else if (dialect === 'oracle') {
      if (val.jsonPath) {
        statements.push(
          `ALTER TABLE ${tableName} ADD CONSTRAINT ${constraintName} CHECK (JSON_EXISTS(${jsonCol}, '${val.jsonPath}') = 0 OR JSON_VALUE(${jsonCol}, '${val.jsonPath}') IS JSON VALIDATE '${schemaStr}') ENABLE NOVALIDATE;`
        );
      } else {
        statements.push(
          `ALTER TABLE ${tableName} ADD CONSTRAINT ${constraintName} CHECK (${jsonCol} IS NULL OR ${jsonCol} IS JSON VALIDATE '${schemaStr}') ENABLE NOVALIDATE;`
        );
      }
    }
  }

  return statements;
}

function convertJsonPathToPg(jsonCol: string, jsonPath: string, asText = true): string {
  const parts = jsonPath.replace(/^\$\.?/, '').split('.');
  if (parts.length === 0) return jsonCol;
  if (parts.length === 1) {
    return asText ? `(${jsonCol}->>'${parts[0]}')` : `(${jsonCol}->'${parts[0]}')`;
  }
  const leading = parts.slice(0, -1).map(p => `'${p}'`).join('->');
  const last = parts[parts.length - 1];
  return asText
    ? `(${jsonCol}->${leading}->>'${last}')`
    : `(${jsonCol}->${leading}->'${last}')`;
}

/**
 * Builds a dialect-specific partial JSON update (merge/set) expression or statement.
 * This ensures updating one plugin's attributes does NOT overwrite or drop other plugins'
 * data or custom fields in the shared document.
 */
export interface JsonMergeQuery {
  /** The SQL expression representing the new JSON value after merge */
  valueExpression: string;
  /** Parameterized placeholder or serialized value */
  paramValue: unknown;
}

export function buildJsonMergeExpression(
  jsonColumn: string,
  jsonPath: string,
  value: unknown,
  dialect: SchemaDialect,
  paramPlaceholder?: string
): JsonMergeQuery {
  // Normalize path like '$.plugins.hotel' or 'plugins.hotel'
  const path = jsonPath.startsWith('$.') ? jsonPath : `$.${jsonPath.replace(/^\./, '')}`;
  const parts = path.replace(/^\$\.?/, '').split('.');
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new Error('A JSON value is required');
  const placeholder = paramPlaceholder ?? (dialect === 'postgres' ? '$1' : dialect === 'oracle' ? ':json_val' : '?');

  if (dialect === 'postgres') {
    // jsonb_set(COALESCE(col, '{}'::jsonb), '{plugins,hotel}', $1::jsonb, true)
    const pgPathArray = `'{${parts.join(',')}}'`;
    return {
      valueExpression: `jsonb_set(COALESCE(${jsonColumn}, '{}'::jsonb), ${pgPathArray}, ${placeholder}::jsonb, true)`,
      paramValue: serialized,
    };
  } else if (dialect === 'oracle') {
    // JSON_TRANSFORM(COALESCE(col, JSON('{}')), SET '$.plugins.hotel' = :json_val)
    return {
      valueExpression: `JSON_TRANSFORM(COALESCE(${jsonColumn}, JSON('{}')), SET '${path}' = ${placeholder} FORMAT JSON)`,
      paramValue: serialized,
    };
  } else {
    // SQLite: json_set(COALESCE(col, '{}'), '$.plugins.hotel', json(?))
    return {
      valueExpression: `json_set(COALESCE(${jsonColumn}, '{}'), '${path}', json(${placeholder}))`,
      paramValue: serialized,
    };
  }
}
