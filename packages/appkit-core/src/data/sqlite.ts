import type { DataAccessAdapter, Filter, QueryOptions } from './types';

/**
 * Bind values forwarded to the SQLite driver. Objects/arrays require caller serialization. Actual scalar support, including booleans and bigint, depends on the selected driver.
 * @see {@link SqliteDriver}.
 */
export type SqliteValue = string | number | boolean | bigint | null | Uint8Array;

/**
 * Driver-provided write metadata; optional fields are not synthesized by createSqliteDriver.
 * @see {@link SqliteDriver.run}.
 */
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
  /**
   * Executes SQL and returns all rows.
   * @typeParam T - Caller-expected row shape; the driver does not validate it.
   * @param sql - SQL text to prepare and execute.
   * @param params - Positional scalar values in placeholder order; compatibility belongs to the selected driver.
   * @returns A promise of the driver row array.
   */
  all<T = Record<string, unknown>>(
    sql: string,
    params: readonly SqliteValue[],
  ): Promise<readonly T[]>;
  /**
   * Executes SQL and returns the first row, or null.
   * @typeParam T - Caller-expected row shape; the driver does not validate it.
   * @param sql - SQL text to prepare and execute.
   * @param params - Positional scalar values in placeholder order; compatibility belongs to the selected driver.
   * @returns A promise of the first row or null.
   */
  get<T = Record<string, unknown>>(sql: string, params: readonly SqliteValue[]): Promise<T | null>;
  /**
   * Executes a write and returns driver metadata.
   * @param sql - SQL text to prepare and execute.
   * @param params - Positional scalar values in placeholder order; compatibility belongs to the selected driver.
   * @returns A promise of write metadata; changes and lastInsertRowid may be absent.
   */
  run(sql: string, params: readonly SqliteValue[]): Promise<SqliteRunResult>;
}

/**
 * Synchronous prepared-statement shape consumed by createSqliteDriver; the host owns statement/database lifetime and binding compatibility.
 * @see {@link createSqliteDriver} for usage.
 */
export interface SqlitePreparedStatementLike {
  /**
   * Executes SQL and returns all rows.
   * @typeParam T - Caller-expected row shape; the driver does not validate it.
   * @param params - Positional scalar values in placeholder order; compatibility belongs to the selected driver.
   * @returns the driver row array.
   */
  all<T = Record<string, unknown>>(...params: SqliteValue[]): readonly T[];
  /**
   * Executes SQL and returns the first row, or null.
   * @typeParam T - Caller-expected row shape; the driver does not validate it.
   * @param params - Positional scalar values in placeholder order; compatibility belongs to the selected driver.
   * @returns the first row or null.
   */
  get<T = Record<string, unknown>>(...params: SqliteValue[]): T | null;
  /**
   * Executes a write and returns driver metadata.
   * @param params - Positional scalar values in placeholder order; compatibility belongs to the selected driver.
   * @returns write metadata; changes and lastInsertRowid may be absent.
   */
  run(...params: SqliteValue[]): SqliteRunResult;
}

/** Structural type for Node SQLite database accepted by {@link createSqliteDriver}. */
export interface SqliteDatabaseLike {
  /**
   * Prepares SQL for execution through the host database.
   * @param sql - SQL text with positional bind placeholders.
   * @returns A synchronous statement; errors propagate through the driver wrapper.
   */
  prepare(sql: string): SqlitePreparedStatementLike;
}

/**
 * Configuration for {@link SQLiteDataAccessAdapter}.
 *
 * All settings except `driver` are configured to match the application schema
 * and cache boundary. SQL identifiers are restricted to safe alphanumeric and underscore characters.
 */
export interface SqliteDataAccessAdapterConfig {
  /**
   * Host-created driver executing SQL and managing connection/authorization lifecycle.
   */
  driver: SqliteDriver;
  /**
   * Primary identifier column; defaults to id when nullish. Must match the restricted SQL identifier syntax.
   */
  idColumn?: string;
  /**
   * When true, mutation operations that reach a write reject. Defaults to false; this adapter flag does not change database permissions.
   */
  readOnly?: boolean;
  /**
   * Optional shared cache namespace exposed unchanged; it is not a credential or authorization policy.
   */
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
 * Wraps synchronous prepare/all/get/run calls in an asynchronous driver interface. Each operation prepares a statement and spreads positional values; the wrapper does not close the database, add transactions or normalize driver results.
 * @param database - Host-managed database matching SqliteDatabaseLike.
 * @returns A driver whose promises resolve to the host results or reject with host errors.
 * @example
 * ```ts
 * import { SQLiteDataAccessAdapter, createSqliteDriver } from '@alneas/appkit-core/data/sqlite';
 * import type { SqliteDatabaseLike } from '@alneas/appkit-core/data/sqlite';
 * export function readOnlyAdapter(database: SqliteDatabaseLike) {
 *   return new SQLiteDataAccessAdapter({ driver: createSqliteDriver(database), readOnly: true });
 * }
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
 * Compiles collection CRUD into parameterized SQLite SQL using a host-managed driver. Identifiers accept ASCII letters/underscore followed by letters/digits/underscore. Values are scalar binds; this adapter adds no schema creation, authorization, joins, transaction or cancellation support.
 * @remarks find supports projection, sorting, limit and skip. Unsupported QueryOptions are ignored; filter operators are explicitly restricted. Read/write sequences are not atomic.
 * @example
 * ```ts
 * import { SQLiteDataAccessAdapter, createSqliteDriver } from '@alneas/appkit-core/data/sqlite';
 * import type { SqliteDatabaseLike } from '@alneas/appkit-core/data/sqlite';
 * export function readOnlyAdapter(database: SqliteDatabaseLike) {
 *   return new SQLiteDataAccessAdapter({ driver: createSqliteDriver(database), readOnly: true });
 * }
 * ```
 */
export class SQLiteDataAccessAdapter implements DataAccessAdapter {
  /** Optional namespace used as cache boundary for DataAccessProvider. */
  readonly cacheScope?: string;
  private readonly driver: SqliteDriver;
  private readonly idColumn: string;
  private readonly readOnly: boolean;

  /**
   * Stores the driver and validates the identifier column without opening or creating a database.
   * @param config - Driver plus optional idColumn (id), readOnly (false) and cacheScope.
   * @throws An error when idColumn fails identifier validation.
   * @example
   * ```ts
   * import { SQLiteDataAccessAdapter, createSqliteDriver } from '@alneas/appkit-core/data/sqlite';
   * import type { SqliteDatabaseLike } from '@alneas/appkit-core/data/sqlite';
   * export function readOnlyAdapter(database: SqliteDatabaseLike) {
   *   return new SQLiteDataAccessAdapter({ driver: createSqliteDriver(database), readOnly: true });
   * }
   * ```
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
   * Selects rows using restricted filters, projection, sort, limit and skip.
   * @typeParam T - Expected result shape, trusted without runtime validation; defaults to unknown.
   * @param collection - Validated table identifier; no schema creation is performed.
   * @param filter - Restricted field filter; absence or an empty object selects all rows.
   * @param options - Optional projection, sort, limit and skip. Other QueryOptions, including signal and populate, are not implemented.
   * @returns Matching rows copied into a mutable array; no default ordering is imposed.
   * @throws Rejects for invalid identifiers, unsupported filters/binds/pagination, driver failures, and mutation attempts blocked by readOnly when a write is reached.
   * @example
   * ```ts
   * import { SQLiteDataAccessAdapter } from '@alneas/appkit-core/data/sqlite';
   * export async function findTasks(adapter: SQLiteDataAccessAdapter) {
   *   return adapter.find('tasks', { status: 'open' }, { limit: 20 });
   * }
   * ```
   */
  async find<T = unknown>(
    collection: string,
    filter?: Filter,
    options?: QueryOptions,
  ): Promise<T[]> {
    const query = this.selectSql(collection, filter, options);
    return [...(await this.driver.all<T>(query.sql, query.params))];
  }

  /**
   * Reads by the configured identifier column with limit forced to one.
   * @typeParam T - Expected result shape, trusted without runtime validation; defaults to unknown.
   * @param collection - Validated table identifier; no schema creation is performed.
   * @param id - Identifier bound against the configured idColumn.
   * @param options - Optional projection, sort, limit and skip. Other QueryOptions, including signal and populate, are not implemented.
   * @returns First row or null; projection and skip still apply.
   * @throws Rejects for invalid identifiers, unsupported filters/binds/pagination, driver failures, and mutation attempts blocked by readOnly when a write is reached.
   * @example
   * ```ts
   * import { SQLiteDataAccessAdapter } from '@alneas/appkit-core/data/sqlite';
   * export async function findOneTasks(adapter: SQLiteDataAccessAdapter) {
   *   return adapter.findOne('tasks', 'task-1');
   * }
   * ```
   */
  async findOne<T = unknown>(
    collection: string,
    id: string,
    options?: QueryOptions,
  ): Promise<T | null> {
    const filter: Filter = { [this.idColumn]: id };
    return (await this.find<T>(collection, filter, { ...options, limit: 1 }))[0] ?? null;
  }

  /**
   * Inserts scalar fields, then attempts to read the created row.
   * @typeParam T - Expected result shape, trusted without runtime validation; defaults to unknown.
   * @param collection - Validated table identifier; no schema creation is performed.
   * @param data - Scalar field values; object/array/undefined values are rejected.
   * @returns A row read by explicit id or lastInsertRowid, otherwise a shallow copy of input. A successful write may still be followed by a failing explicit-id lookup.
   * @throws Rejects for invalid identifiers, unsupported filters/binds/pagination, driver failures, and mutation attempts blocked by readOnly when a write is reached.
   * @example
   * ```ts
   * import { SQLiteDataAccessAdapter } from '@alneas/appkit-core/data/sqlite';
   * export async function createTasks(adapter: SQLiteDataAccessAdapter) {
   *   return adapter.create('tasks', { id: 'task-1', title: 'Draft' });
   * }
   * ```
   */
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

  /**
   * Partially updates supplied fields, then reads the row by the original identifier.
   * @typeParam T - Expected result shape, trusted without runtime validation; defaults to unknown.
   * @param collection - Validated table identifier; no schema creation is performed.
   * @param id - Identifier bound against the configured idColumn.
   * @param data - Scalar field values; object/array/undefined values are rejected.
   * @returns The reread row, or a fallback object containing id and input fields. Empty data only reads. Missing rows do not cause a dedicated not-found error.
   * @throws Rejects for invalid identifiers, unsupported filters/binds/pagination, driver failures, and mutation attempts blocked by readOnly when a write is reached.
   * @example
   * ```ts
   * import { SQLiteDataAccessAdapter } from '@alneas/appkit-core/data/sqlite';
   * export async function updateTasks(adapter: SQLiteDataAccessAdapter) {
   *   return adapter.update('tasks', 'task-1', { title: 'Reviewed' });
   * }
   * ```
   */
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

  /**
   * Delegates to partial update; omitted columns remain stored.
   * @typeParam T - Expected result shape, trusted without runtime validation; defaults to unknown.
   * @param collection - Validated table identifier; no schema creation is performed.
   * @param id - Identifier bound against the configured idColumn.
   * @param data - Scalar field values; object/array/undefined values are rejected.
   * @returns Exactly update's read/fallback result; this does not implement whole-record replacement.
   * @throws Rejects for invalid identifiers, unsupported filters/binds/pagination, driver failures, and mutation attempts blocked by readOnly when a write is reached.
   * @example
   * ```ts
   * import { SQLiteDataAccessAdapter } from '@alneas/appkit-core/data/sqlite';
   * export async function replaceTasks(adapter: SQLiteDataAccessAdapter) {
   *   return adapter.replace('tasks', 'task-1', { title: 'Reviewed' });
   * }
   * ```
   */
  async replace<T = unknown>(
    collection: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<T> {
    return this.update<T>(collection, id, data);
  }

  /**
   * Reads one row, then deletes rows matching the configured identifier.
   * @typeParam T - Expected result shape, trusted without runtime validation; defaults to unknown.
   * @param collection - Validated table identifier; no schema creation is performed.
   * @param id - Identifier bound against the configured idColumn.
   * @returns The earlier row, or an id-only object when absent. Read/delete is not atomic.
   * @throws Rejects for invalid identifiers, unsupported filters/binds/pagination, driver failures, and mutation attempts blocked by readOnly when a write is reached.
   * @example
   * ```ts
   * import { SQLiteDataAccessAdapter } from '@alneas/appkit-core/data/sqlite';
   * export async function deleteTasks(adapter: SQLiteDataAccessAdapter) {
   *   return adapter.delete('tasks', 'task-1');
   * }
   * ```
   */
  async delete<T = unknown>(collection: string, id: string): Promise<T> {
    this.assertWritable();
    const previous = await this.findOne<T>(collection, id);
    await this.driver.run(
      `DELETE FROM ${quoteIdentifier(collection)} WHERE ${quoteIdentifier(this.idColumn)} = ?`,
      [id],
    );
    return previous ?? ({ [this.idColumn]: id } as T);
  }

  /**
   * Counts rows matching the restricted filter.
   * @param collection - Validated table identifier; no schema creation is performed.
   * @param filter - Restricted field filter; absence or an empty object selects all rows.
   * @returns Number(row.count), defaulting to zero when no row/count exists; the result is not otherwise range-validated.
   * @throws Rejects for invalid identifiers, unsupported filters/binds/pagination, driver failures, and mutation attempts blocked by readOnly when a write is reached.
   * @example
   * ```ts
   * import { SQLiteDataAccessAdapter } from '@alneas/appkit-core/data/sqlite';
   * export async function countTasks(adapter: SQLiteDataAccessAdapter) {
   *   return adapter.count('tasks', { status: 'open' });
   * }
   * ```
   */
  async count(collection: string, filter?: Filter): Promise<number> {
    const table = quoteIdentifier(collection);
    const where = compileFilter(filter);
    const row = await this.driver.get<{ count: number | string }>(
      `SELECT COUNT(*) AS count FROM ${table}${where.sql ? ` WHERE ${where.sql}` : ''}`,
      where.params,
    );
    return Number(row?.count ?? 0);
  }

  /**
   * Inserts inputs sequentially by calling create for each row.
   * @typeParam T - Expected result shape, trusted without runtime validation; defaults to unknown.
   * @param collection - Validated table identifier; no schema creation is performed.
   * @param data - Rows of scalar values; inserted sequentially.
   * @returns Results in input order. Empty input resolves to an empty array even in readOnly mode. Failure leaves earlier successful writes committed unless the driver provides external transaction control.
   * @throws Rejects for invalid identifiers, unsupported filters/binds/pagination, driver failures, and mutation attempts blocked by readOnly when a write is reached.
   * @example
   * ```ts
   * import { SQLiteDataAccessAdapter } from '@alneas/appkit-core/data/sqlite';
   * export async function createManyTasks(adapter: SQLiteDataAccessAdapter) {
   *   return adapter.createMany('tasks', [{ id: 'task-1', title: 'Draft' }]);
   * }
   * ```
   */
  async createMany<T = unknown>(collection: string, data: Record<string, unknown>[]): Promise<T[]> {
    const result: T[] = [];
    for (const item of data) result.push(await this.create<T>(collection, item));
    return result;
  }

  /**
   * Selects matching identifiers, then calls update concurrently for each.
   * @typeParam T - Expected result shape, trusted without runtime validation; defaults to unknown.
   * @param collection - Validated table identifier; no schema creation is performed.
   * @param filter - Restricted field filter; absence or an empty object selects all rows.
   * @param data - Scalar field values; object/array/undefined values are rejected.
   * @returns Results in selection order; this is a separate read followed by writes with no shared transaction. No matches yield an empty array, including in readOnly mode.
   * @throws Rejects for invalid identifiers, unsupported filters/binds/pagination, driver failures, and mutation attempts blocked by readOnly when a write is reached.
   * @example
   * ```ts
   * import { SQLiteDataAccessAdapter } from '@alneas/appkit-core/data/sqlite';
   * export async function updateManyTasks(adapter: SQLiteDataAccessAdapter) {
   *   return adapter.updateMany('tasks', { status: 'open' }, { status: 'closed' });
   * }
   * ```
   */
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

  /**
   * Reads matching rows, then executes one filtered DELETE.
   * @typeParam T - Expected result shape, trusted without runtime validation; defaults to unknown.
   * @param collection - Validated table identifier; no schema creation is performed.
   * @param filter - Restricted field filter; absence or an empty object selects all rows.
   * @returns Rows observed before deletion; concurrent changes may make this differ from actual deleted rows. An empty filter deletes all rows.
   * @throws Rejects for invalid identifiers, unsupported filters/binds/pagination, driver failures, and mutation attempts blocked by readOnly when a write is reached.
   * @example
   * ```ts
   * import { SQLiteDataAccessAdapter } from '@alneas/appkit-core/data/sqlite';
   * export async function deleteManyTasks(adapter: SQLiteDataAccessAdapter) {
   *   return adapter.deleteMany('tasks', { status: 'archived' });
   * }
   * ```
   */
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
