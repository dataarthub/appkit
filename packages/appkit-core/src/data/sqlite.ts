import type { DataAccessAdapter, Filter, QueryOptions } from './types';

/**
 * Bind values accepted by the SQLite adapter.
 *
 * Objects and arrays are not automatically serialized to JSON.
 * Any necessary conversion must be performed by the caller.
 */

export type SqliteValue = string | number | boolean | bigint | null | Uint8Array;

/** Result of a SQLite write operation. */
export interface SqliteRunResult {
  /** Number of modified rows. Undefined if not returned by the driver. */
  changes?: number;
  /** rowid of the inserted row. Undefined if not returned by the driver. */
  lastInsertRowid?: number | string | bigint;
}

/**
 * Minimal interface specification for SQLite execution capabilities, usable synchronously or asynchronously.
 *
 * Synchronous APIs such as `node:sqlite` or `better-sqlite3` can be converted
 * into this form using {@link createSqliteDriver}. APIs requiring `prepare().bind()`,
 * such as Cloudflare D1, should implement a dedicated driver.
 */
export interface SqliteDriver {
  all<T = Record<string, unknown>>(
    sql: string,
    params: readonly SqliteValue[],
  ): Promise<readonly T[]>;
  get<T = Record<string, unknown>>(sql: string, params: readonly SqliteValue[]): Promise<T | null>;
  run(sql: string, params: readonly SqliteValue[]): Promise<SqliteRunResult>;
}

/** Minimal structural type required for Node SQLite prepared statement. */
export interface SqlitePreparedStatementLike {
  all<T = Record<string, unknown>>(...params: SqliteValue[]): readonly T[];
  get<T = Record<string, unknown>>(...params: SqliteValue[]): T | null;
  run(...params: SqliteValue[]): SqliteRunResult;
}

/** Structural type for Node SQLite database accepted by {@link createSqliteDriver}. */
export interface SqliteDatabaseLike {
  prepare(sql: string): SqlitePreparedStatementLike;
}

/**
 * Configuration for {@link SQLiteDataAccessAdapter}.
 *
 * All settings except `driver` are configured to match the application schema
 * and cache boundary. SQL identifiers are restricted to safe alphanumeric and underscore characters.
 */
export interface SqliteDataAccessAdapterConfig {
  driver: SqliteDriver;
  idColumn?: string;
  readOnly?: boolean;
  cacheScope?: string;
}

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

function quoteIdentifier(value: string): string {
  if (!IDENTIFIER.test(value)) {
    throw new Error(`Unsafe SQLite identifier: ${value}`);
  }
  return `"${value}"`;
}

function toSqliteValue(value: unknown): SqliteValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return value;
  }
  if (value instanceof Uint8Array) return value;
  throw new Error('SQLite adapters only accept scalar filter and row values');
}

function isOperatorObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).some((key) => key.startsWith('$'))
  );
}

function compileFilter(filter: Filter | undefined): { sql: string; params: SqliteValue[] } {
  if (!filter || Object.keys(filter).length === 0) return { sql: '', params: [] };

  const clauses: string[] = [];
  const params: SqliteValue[] = [];
  for (const [field, rawValue] of Object.entries(filter)) {
    const column = quoteIdentifier(field);
    const values = isOperatorObject(rawValue) ? rawValue : { $eq: rawValue };
    for (const [operator, value] of Object.entries(values)) {
      if (operator === '$eq' || operator === '$neq') {
        if (value === null) {
          clauses.push(`${column} IS ${operator === '$neq' ? 'NOT ' : ''}NULL`);
        } else {
          clauses.push(`${column} ${operator === '$neq' ? '<>' : '='} ?`);
          params.push(toSqliteValue(value));
        }
        continue;
      }
      if (operator === '$lt' || operator === '$lte' || operator === '$gt' || operator === '$gte') {
        const sqlOperator = { $lt: '<', $lte: '<=', $gt: '>', $gte: '>=' }[operator];
        clauses.push(`${column} ${sqlOperator} ?`);
        params.push(toSqliteValue(value));
        continue;
      }
      if (operator === '$in' || operator === '$nin') {
        if (!Array.isArray(value)) throw new Error(`${operator} requires an array`);
        if (value.length === 0) {
          clauses.push(operator === '$in' ? '1 = 0' : '1 = 1');
          continue;
        }
        clauses.push(
          `${column} ${operator === '$nin' ? 'NOT ' : ''}IN (${value.map(() => '?').join(', ')})`,
        );
        params.push(...value.map(toSqliteValue));
        continue;
      }
      if (operator === '$regex') {
        throw new Error(
          'SQLite adapters do not assume a REGEXP function; use a provider-specific query for regex filters',
        );
      }
      throw new Error(`Unsupported SQLite filter operator: ${operator}`);
    }
  }
  return { sql: clauses.join(' AND '), params };
}

function projectionSql(options?: QueryOptions): string {
  if (Array.isArray(options?.projection)) {
    if (options.projection.length === 0) return '*';
    return options.projection.map((field) => quoteIdentifier(String(field))).join(', ');
  }
  if (options?.projection && typeof options.projection === 'object') {
    const fields = Object.entries(options.projection)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([field]) => field);
    if (fields.length > 0) return fields.map(quoteIdentifier).join(', ');
  }
  return '*';
}

function queryTail(options?: QueryOptions): { sql: string; params: SqliteValue[] } {
  const sql: string[] = [];
  const params: SqliteValue[] = [];
  if (options?.sort) {
    const order = Object.entries(options.sort).map(([field, direction]) => {
      if (direction !== 1 && direction !== -1)
        throw new Error('SQLite sort directions must be 1 or -1');
      return `${quoteIdentifier(field)} ${direction === -1 ? 'DESC' : 'ASC'}`;
    });
    if (order.length > 0) sql.push(`ORDER BY ${order.join(', ')}`);
  }
  if (options?.limit !== undefined) {
    if (!Number.isInteger(options.limit) || options.limit < 0)
      throw new Error('SQLite limit must be a non-negative integer');
    sql.push('LIMIT ?');
    params.push(options.limit);
  }
  if (options?.skip !== undefined) {
    if (!Number.isInteger(options.skip) || options.skip < 0)
      throw new Error('SQLite skip must be a non-negative integer');
    if (options.limit === undefined) sql.push('LIMIT -1');
    sql.push('OFFSET ?');
    params.push(options.skip);
  }
  return { sql: sql.join(' '), params };
}

/**
 * Converts Node SQLite `prepare().all/get/run()` API to the common driver interface.
 *
 * @param database Node SQLite compatible database providing `prepare`
 * @returns Asynchronous driver suitable for passing to `SQLiteDataAccessAdapter`
 * @example
 * ```ts
 * import { SQLiteDataAccessAdapter, createSqliteDriver } from "./sqlite";
 * import { DatabaseSync } from 'node:sqlite';
 *
 * const db = new DatabaseSync('content.db');
 * const adapter = new SQLiteDataAccessAdapter({ driver: createSqliteDriver(db) });
 * ```
 */
export function createSqliteDriver(database: SqliteDatabaseLike): SqliteDriver {
  return {
    async all<T>(sql: string, params: readonly SqliteValue[]) {
      return database.prepare(sql).all<T>(...params);
    },
    async get<T>(sql: string, params: readonly SqliteValue[]) {
      return database.prepare(sql).get<T>(...params);
    },
    async run(sql: string, params: readonly SqliteValue[]) {
      return database.prepare(sql).run(...params);
    },
  };
}

/**
 * `DataAccessAdapter` implementation for Node SQLite.
 *
 * Filters, projections, sorting, and limit/skip are compiled into standard parameterized SQL.
 * Table names and column names are validated as identifiers, and values are passed as bind variables.
 * Authentication, destination selection, and EAOS or Cloudflare specific integrations are not handled here.
 *
 * @example
 * ```ts
 * import { SQLiteDataAccessAdapter } from "./sqlite";
 *
 * const adapter = new SQLiteDataAccessAdapter({ driver, readOnly: true });
 * const posts = await adapter.find('posts', { status: 'published' });
 * ```
 */
export class SQLiteDataAccessAdapter implements DataAccessAdapter {
  /** Optional namespace used as cache boundary for DataAccessProvider. */
  readonly cacheScope?: string;
  private readonly driver: SqliteDriver;
  private readonly idColumn: string;
  private readonly readOnly: boolean;

  /**
   * Initializes DataAccessAdapter with a SQLite driver.
   *
   * @param config SQLite driver and adapter configuration
   */
  constructor(config: SqliteDataAccessAdapterConfig) {
    this.driver = config.driver;
    this.idColumn = config.idColumn ?? 'id';
    quoteIdentifier(this.idColumn);
    this.readOnly = config.readOnly ?? false;
    this.cacheScope = config.cacheScope;
  }

  private assertWritable(): void {
    if (this.readOnly) throw new Error('This SQLite data access adapter is read-only');
  }

  private selectSql(
    collection: string,
    filter?: Filter,
    options?: QueryOptions,
  ): { sql: string; params: SqliteValue[] } {
    const table = quoteIdentifier(collection);
    const where = compileFilter(filter);
    const tail = queryTail(options);
    const parts = [`SELECT ${projectionSql(options)} FROM ${table}`];
    if (where.sql) parts.push(`WHERE ${where.sql}`);
    if (tail.sql) parts.push(tail.sql);
    return { sql: parts.join(' '), params: [...where.params, ...tail.params] };
  }

  /**
   * Retrieves records matching the criteria.
   *
   * @param collection Table name
   * @param filter Parameterized filter
   * @param options Query options such as projection, sort, limit, and offset
   */
  async find<T = unknown>(
    collection: string,
    filter?: Filter,
    options?: QueryOptions,
  ): Promise<T[]> {
    const query = this.selectSql(collection, filter, options);
    return [...(await this.driver.all<T>(query.sql, query.params))];
  }

  /** Retrieves a single record by ID without additional conditions. */
  async findOne<T = unknown>(
    collection: string,
    id: string,
    options?: QueryOptions,
  ): Promise<T | null> {
    const filter: Filter = { [this.idColumn]: id };
    return (await this.find<T>(collection, filter, { ...options, limit: 1 }))[0] ?? null;
  }

  /** Inserts a single record. */
  async create<T = unknown>(collection: string, data: Record<string, unknown>): Promise<T> {
    this.assertWritable();
    const entries = Object.entries(data);
    if (entries.length === 0) throw new Error('SQLite create requires at least one field');
    const table = quoteIdentifier(collection);
    const columns = entries.map(([key]) => quoteIdentifier(key));
    const params = entries.map(([, value]) => toSqliteValue(value));
    const result = await this.driver.run(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${entries.map(() => '?').join(', ')})`,
      params,
    );
    const id = data[this.idColumn];
    if (id !== undefined)
      return (await this.findOne<T>(collection, String(id))) ?? ({ ...data } as T);
    if (result.lastInsertRowid !== undefined) {
      try {
        const rows = await this.driver.all<T>(`SELECT * FROM ${table} WHERE rowid = ? LIMIT 1`, [
          toSqliteValue(result.lastInsertRowid),
        ]);
        if (rows[0]) return rows[0];
      } catch {
        // WITHOUT ROWID tables may not expose rowid; returning the inserted values is still useful.
      }
    }
    return { ...data } as T;
  }

  /** Partially updates a record by ID. */
  async update<T = unknown>(
    collection: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<T> {
    this.assertWritable();
    const entries = Object.entries(data);
    if (entries.length === 0)
      return (await this.findOne<T>(collection, id)) ?? ({ [this.idColumn]: id } as T);
    const table = quoteIdentifier(collection);
    const params = entries.map(([, value]) => toSqliteValue(value));
    params.push(id);
    await this.driver.run(
      `UPDATE ${table} SET ${entries.map(([key]) => `${quoteIdentifier(key)} = ?`).join(', ')} WHERE ${quoteIdentifier(this.idColumn)} = ?`,
      params,
    );
    return (await this.findOne<T>(collection, id)) ?? ({ [this.idColumn]: id, ...data } as T);
  }

  /** Replaces a record via partial update matching `update`. */
  async replace<T = unknown>(
    collection: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<T> {
    return this.update<T>(collection, id, data);
  }

  /** Deletes the record with the specified ID and returns its value prior to deletion. */
  async delete<T = unknown>(collection: string, id: string): Promise<T> {
    this.assertWritable();
    const previous = await this.findOne<T>(collection, id);
    await this.driver.run(
      `DELETE FROM ${quoteIdentifier(collection)} WHERE ${quoteIdentifier(this.idColumn)} = ?`,
      [id],
    );
    return previous ?? ({ [this.idColumn]: id } as T);
  }

  /** Returns the count of records matching the criteria. */
  async count(collection: string, filter?: Filter): Promise<number> {
    const table = quoteIdentifier(collection);
    const where = compileFilter(filter);
    const row = await this.driver.get<{ count: number | string }>(
      `SELECT COUNT(*) AS count FROM ${table}${where.sql ? ` WHERE ${where.sql}` : ''}`,
      where.params,
    );
    return Number(row?.count ?? 0);
  }

  /** Inserts multiple records sequentially. */
  async createMany<T = unknown>(collection: string, data: Record<string, unknown>[]): Promise<T[]> {
    const result: T[] = [];
    for (const item of data) result.push(await this.create<T>(collection, item));
    return result;
  }

  /** Partially updates all records matching the criteria. */
  async updateMany<T = unknown>(
    collection: string,
    filter: Filter,
    data: Record<string, unknown>,
  ): Promise<T[]> {
    const rows = await this.find<Record<string, unknown>>(collection, filter, {
      projection: [this.idColumn],
    });
    return Promise.all(
      rows.map((row) => this.update<T>(collection, String(row[this.idColumn]), data)),
    );
  }

  /** Deletes all records matching the criteria. */
  async deleteMany<T = unknown>(collection: string, filter: Filter): Promise<T[]> {
    this.assertWritable();
    const rows = await this.find<T>(collection, filter);
    const where = compileFilter(filter);
    await this.driver.run(
      `DELETE FROM ${quoteIdentifier(collection)}${where.sql ? ` WHERE ${where.sql}` : ''}`,
      where.params,
    );
    return rows;
  }
}
