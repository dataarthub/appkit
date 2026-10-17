import type { SqliteDataAccessAdapterConfig, SqliteDriver, SqliteRunResult } from './sqlite';
import { SQLiteDataAccessAdapter } from './sqlite';

/** Minimal structural type required for Cloudflare D1 prepared statement. */
export interface D1PreparedStatementLike {
  bind(...values: import('./sqlite').SqliteValue[]): D1PreparedStatementLike;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<{ success?: boolean; meta?: { changes?: number; last_row_id?: number | string } }>;
}

/** Minimal structural type required for Cloudflare Worker D1 binding. */
export interface D1DatabaseLike {
  prepare(sql: string): D1PreparedStatementLike;
}

function createD1Driver(database: D1DatabaseLike): SqliteDriver {
  const statement = (sql: string, params: readonly import('./sqlite').SqliteValue[]) =>
    database.prepare(sql).bind(...params);
  return {
    async all<T>(sql: string, params: readonly import('./sqlite').SqliteValue[]) {
      return (await statement(sql, params).all<T>()).results;
    },
    async get<T>(sql: string, params: readonly import('./sqlite').SqliteValue[]) {
      return statement(sql, params).first<T>();
    },
    async run(
      sql: string,
      params: readonly import('./sqlite').SqliteValue[],
    ): Promise<SqliteRunResult> {
      const result = await statement(sql, params).run();
      return {
        changes: result.meta?.changes,
        lastInsertRowid: result.meta?.last_row_id,
      };
    },
  };
}

/** Configuration for creating `D1DataAccessAdapter` from a D1 binding. */
export interface D1DataAccessAdapterConfig extends Omit<SqliteDataAccessAdapterConfig, 'driver'> {
  /** D1 binding injected from Cloudflare Workers. */
  db: D1DatabaseLike;
}

/**
 * `DataAccessAdapter` implementation for Cloudflare D1 binding.
 *
 * D1 is SQLite-compatible at the SQL level, but its asynchronous binding API
 * is not compatible with Node synchronous SQLite drivers. This difference is
 * encapsulated at the driver boundary, sharing the SQL compilation layer.
 */
export class D1DataAccessAdapter extends SQLiteDataAccessAdapter {
  /**
   * Creates an adapter from a D1 binding.
   *
   * SQL compilation and DataAccessAdapter behavior are shared with Node SQLite,
   * while D1's specific `prepare().bind().all/first/run` async API is converted
   * to a dedicated driver at the boundary of this class.
   *
   * @param config D1 binding and common SQLite configuration
   * @example
   * ```ts
   * import { D1DataAccessAdapter } from "./d1";
   *
   * const adapter = new D1DataAccessAdapter({ db: env.CONTENT_DB });
   * const documents = await adapter.find('documents', { locale: 'ja' });
   * ```
   */
  constructor(config: D1DataAccessAdapterConfig) {
    super({ ...config, driver: createD1Driver(config.db) });
  }
}

/**
 * Creates a `DataAccessAdapter` for a D1 binding.
 *
 * @param config D1 binding and common SQLite configuration
 * @returns Adapter encapsulating the D1-specific driver
 */
export function createD1DataAccessAdapter(config: D1DataAccessAdapterConfig): D1DataAccessAdapter {
  return new D1DataAccessAdapter(config);
}
