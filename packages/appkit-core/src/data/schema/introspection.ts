/**
 * @fileoverview PostgreSQL DB Introspection
 *
 * Reads physical table metadata from the PostgreSQL information schema.
 *
 * @module lib/schema/introspection
 */
import type { Client as PgClient } from 'pg';
import type { PhysicalTable, PhysicalColumn } from './verifier';

/**
 * Read columns and constraints for a table in an explicit database schema.
 *
 * @param connectionString - PostgreSQL connection string.
 * @param tableName - Unqualified table name, passed as a bound value.
 * @param schemaName - Database schema name; defaults to public.
 * @returns Physical metadata, or null when no matching table exists.
 *
 * @example
 * ```typescript
 * const table = await introspectPostgresTable(process.env.DATABASE_URL, 'users');
 * ```
 */
export async function introspectPostgresTable(
  connectionString: string,
  tableName: string,
  schemaName: string = 'public',
): Promise<PhysicalTable | null> {
  let Client;
  try {
    const pgModule = await import('pg');
    Client = pgModule.default ? (pgModule.default as any).Client : (pgModule as any).Client;
  } catch {
    throw new Error(
      "[@alneas/appkit-core/data] 'pg' モジュールがインストールされていません。Postgresテーブルのイントロスペクション機能を使用するには、'npm install pg' を実行して依存関係を追加してください。"
    );
  }

  const client: PgClient = new Client({ connectionString });

  try {
    await client.connect();

    // 1. カラム情報の取得
    const columnsRes = await client.query(
      `
            SELECT 
                column_name, 
                data_type, 
                is_nullable, 
                column_default,
                udt_name
            FROM information_schema.columns 
            WHERE table_name = $1 AND table_schema = $2 
            ORDER BY ordinal_position
        `,
      [tableName, schemaName],
    );

    if (columnsRes.rows.length === 0) return null;

    // 2. 制約情報の取得 (PK, Unique)
    const constraintsRes = await client.query(
      `
            SELECT 
                kcu.column_name, 
                tco.constraint_type
            FROM information_schema.table_constraints tco
            JOIN information_schema.key_column_usage kcu 
              ON tco.constraint_name = kcu.constraint_name
              AND tco.table_schema = kcu.table_schema
              AND tco.table_name = kcu.table_name
            WHERE tco.table_name = $1 AND tco.table_schema = $2
        `,
      [tableName, schemaName],
    );

    const constraints = new Map<string, string[]>();
    constraintsRes.rows.forEach((row) => {
      const list = constraints.get(row.column_name) || [];
      list.push(row.constraint_type);
      constraints.set(row.column_name, list);
    });

    const columns: PhysicalColumn[] = columnsRes.rows.map((row) => {
      const colConstraints = constraints.get(row.column_name) || [];
      return {
        name: row.column_name,
        type: row.udt_name || row.data_type,
        isNullable: row.is_nullable === 'YES',
        isPrimaryKey: colConstraints.includes('PRIMARY KEY'),
        isUnique: colConstraints.includes('UNIQUE'),
        defaultValue: row.column_default,
      };
    });

    return {
      name: tableName,
      columns,
    };
  } finally {
    await client.end();
  }
}
