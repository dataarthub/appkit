import { validateFilter, comparisonOperators, quoteSqlIdentifier, validatePagination } from './internal/query-safety';
import { DataAccessAdapter, Filter, QueryOptions, OperationResult, normalizePopulateOptions } from './types';

/**
 * Configuration options for the Neon DB adapter.
 */
export interface NeonConfig {
  /**
   * Neon (PostgreSQL) connection string.
   * Example: `postgres://user:pass@ep-xyz.neon.tech/neondb?sslmode=require`
   * If `queryFn` is not specified, connection is established using `@neondatabase/serverless`.
   */
  connectionString?: string;

  /**
   * Custom SQL execution function.
   * Used when directly injecting a `@neondatabase/serverless` `neon()` instance or
   * a function that executes SQL via a backend API.
   * @param query SQL query string
   * @param params Parameter array
   */
  queryFn?: (query: string, params?: unknown[]) => Promise<unknown[]>;

  /**
   * Primary key column name (default: `'id'`)
   */
  idColumn?: string;
}

/**
 * DataAccessAdapter implementation using Neon (PostgreSQL).
 * 
 * Converts MongoDB-style Filter objects into PostgreSQL parameterized SQL,
 * executing CRUD operations while preventing SQL injection.
 * Usable on both client-side and server-side (BFF / Edge runtime / Node.js).
 */
export class NeonAdapter implements DataAccessAdapter {
  private config: NeonConfig;
  private idColumn: string;
  private neonQueryFn?: (query: string, params?: unknown[]) => Promise<unknown[]>;

  /**
   * Creates a new instance of NeonAdapter.
   * @param config Configuration for Neon adapter
   */
  constructor(config: NeonConfig) {
    this.config = config;
    this.idColumn = config.idColumn || 'id';
    if (config.queryFn) {
      this.neonQueryFn = config.queryFn;
    }
  }

  /**
   * Obtains the query execution function.
   * Dynamically loads the `neon` function from `@neondatabase/serverless` if `queryFn` is not configured.
   */
  private async getQueryFn(): Promise<(query: string, params?: unknown[]) => Promise<unknown[]>> {
    if (this.neonQueryFn) {
      return this.neonQueryFn;
    }

    if (!this.config.connectionString) {
      throw new Error(
        '[NeonAdapter] Either connectionString or queryFn must be specified.'
      );
    }

    try {
      const neonModule = await import('@neondatabase/serverless');
      const neon = neonModule.neon;
      if (!neon) {
        throw new Error('neon function not found in @neondatabase/serverless');
      }
      const sqlClient = neon(this.config.connectionString);
      this.neonQueryFn = async (query: string, params?: unknown[]) => {
        const res = await sqlClient.query(query, params || []);
        return Array.isArray(res) ? res : [res];
      };
      return this.neonQueryFn;
    } catch {
      throw new Error(
        "[NeonAdapter] Could not load '@neondatabase/serverless' module. Run 'bun add @neondatabase/serverless' or provide the queryFn option."
      );
    }
  }

  /**
   * Safely escapes SQL identifiers (table names, column names).
   * Double protection with whitelist validation + double quote escaping.
   */
  private escapeIdentifier(identifier: string): string {
    return quoteSqlIdentifier(identifier, true);
  }

  /**
   * Resolves relations (populate) in-memory.
   * Same logic as OracleSqlAdapter.
   */
  private async applyPopulate<T>(results: T[], options?: QueryOptions): Promise<T[]> {
    if (!options?.populate || options.populate.length === 0 || results.length === 0) {
      return results;
    }

    for (const p of options.populate) {
      const normalized = normalizePopulateOptions(p);
      const foreignKeyValues = results
        .map((r) => (r as Record<string, unknown>)[normalized.localRef])
        .filter((val) => val !== null && val !== undefined);

      if (foreignKeyValues.length === 0) continue;

      const uniqueValues = [...new Set(foreignKeyValues.map(String))];
      const related = await this.find<Record<string, unknown>>(normalized.collection, {
        [normalized.foreignRef]: { $in: uniqueValues },
      });

      const relatedMap = new Map(related.map((r) => [String(r[normalized.foreignRef]), r]));

      for (const item of results) {
        const record = item as Record<string, unknown>;
        const fkValue = String(record[normalized.localRef]);
        record[normalized.as] = relatedMap.get(fkValue) || null;
      }
    }

    return results;
  }

  /**
   * Converts a MongoDB-style Filter to a PostgreSQL WHERE clause and parameter array.
   */
  private buildWhereClause(
    filter?: Filter,
    paramOffset = 1
  ): { sql: string; params: unknown[]; nextOffset: number } {
    validateFilter(filter, [...comparisonOperators, '$ilike'], ['$or', '$and']);
    if (!filter || Object.keys(filter).length === 0) {
      return { sql: '', params: [], nextOffset: paramOffset };
    }

    const conditions: string[] = [];
    const params: unknown[] = [];
    let currentOffset = paramOffset;

    for (const [key, value] of Object.entries(filter)) {
      if (key === '$or' && Array.isArray(value)) {
        const orConditions: string[] = [];
        for (const subFilter of value) {
          const res = this.buildWhereClause(subFilter, currentOffset);
          if (res.sql) {
            orConditions.push(`(${res.sql})`);
            params.push(...res.params);
            currentOffset = res.nextOffset;
          }
        }
        if (orConditions.length > 0) {
          conditions.push(`(${orConditions.join(' OR ')})`);
        }
        continue;
      }

      if (key === '$and' && Array.isArray(value)) {
        const andConditions: string[] = [];
        for (const subFilter of value) {
          const res = this.buildWhereClause(subFilter, currentOffset);
          if (res.sql) {
            andConditions.push(`(${res.sql})`);
            params.push(...res.params);
            currentOffset = res.nextOffset;
          }
        }
        if (andConditions.length > 0) {
          conditions.push(`(${andConditions.join(' AND ')})`);
        }
        continue;
      }

      const escapedKey = this.escapeIdentifier(key);

      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        const objVal = value as Record<string, unknown>;
        for (const [op, val] of Object.entries(objVal)) {
          switch (op) {
            case '$eq':
              if (val === null) conditions.push(`${escapedKey} IS NULL`);
              else { conditions.push(`${escapedKey} = $${currentOffset++}`); params.push(val); }
              break;
            case '$ne':
            case '$neq':
              if (val === null) conditions.push(`${escapedKey} IS NOT NULL`);
              else { conditions.push(`${escapedKey} <> $${currentOffset++}`); params.push(val); }
              break;
            case '$gt':
              conditions.push(`${escapedKey} > $${currentOffset++}`);
              params.push(val);
              break;
            case '$gte':
              conditions.push(`${escapedKey} >= $${currentOffset++}`);
              params.push(val);
              break;
            case '$lt':
              conditions.push(`${escapedKey} < $${currentOffset++}`);
              params.push(val);
              break;
            case '$lte':
              conditions.push(`${escapedKey} <= $${currentOffset++}`);
              params.push(val);
              break;
            case '$in':
              if (Array.isArray(val)) {
                if (val.length === 0) {
                  conditions.push('1 = 0');
                } else {
                  conditions.push(`${escapedKey} = ANY($${currentOffset++})`);
                  params.push(val);
                }
              }
              break;
            case '$nin':
              if (Array.isArray(val)) {
                if (val.length === 0) {
                  conditions.push('1 = 1');
                } else {
                  conditions.push(`NOT (${escapedKey} = ANY($${currentOffset++}))`);
                  params.push(val);
                }
              }
              break;
            case '$ilike':
              conditions.push(`${escapedKey} ILIKE $${currentOffset++}`);
              params.push(val);
              break;
            case '$regex':
              conditions.push(`${escapedKey} ~ $${currentOffset++}`);
              params.push(val);
              break;
            default:
              throw new Error(`Unsupported filter operator: ${op}`);
          }
        }
      } else {
        if (value === null) {
          conditions.push(`${escapedKey} IS NULL`);
        } else {
          conditions.push(`${escapedKey} = $${currentOffset++}`);
          params.push(value);
        }
      }
    }

    const sql = conditions.length > 0 ? conditions.join(' AND ') : '';
    return { sql, params, nextOffset: currentOffset };
  }

  /**
   * Searches for multiple records.
   */
  async find<T = unknown>(
    collection: string,
    filter?: Filter,
    options?: QueryOptions
  ): Promise<T[]> {
    validatePagination(options);
    const queryFn = await this.getQueryFn();
    const table = this.escapeIdentifier(collection);

    // Generate projection
    let selectClause = '*';
    if (options?.projection) {
      if (Array.isArray(options.projection) && options.projection.length > 0) {
        selectClause = options.projection.map((col) => this.escapeIdentifier(col)).join(', ');
      } else if (typeof options.projection === 'object') {
        const cols = Object.entries(options.projection)
          .filter(([, v]) => Boolean(v))
          .map(([k]) => this.escapeIdentifier(k));
        if (cols.length > 0) {
          selectClause = cols.join(', ');
        }
      }
    }

    const { sql: whereSql, params } = this.buildWhereClause(filter, 1);
    let query = `SELECT ${selectClause} FROM ${table}`;
    if (whereSql) {
      query += ` WHERE ${whereSql}`;
    }

    // Sort conditions
    if (options?.sort && Object.keys(options.sort).length > 0) {
      const sortParts = Object.entries(options.sort).map(
        ([col, dir]) => `${this.escapeIdentifier(col)} ${dir === -1 ? 'DESC' : 'ASC'}`
      );
      query += ` ORDER BY ${sortParts.join(', ')}`;
    }

    // Limit / offset
    if (typeof options?.limit === 'number') {
      query += ` LIMIT ${options.limit}`;
    }
    if (typeof options?.skip === 'number') {
      query += ` OFFSET ${options.skip}`;
    }

    const rows = await queryFn(query, params);
    return this.applyPopulate<T>(rows as T[], options);
  }

  /**
   * Retrieves a single record by ID.
   */
  async findOne<T = unknown>(
    collection: string,
    id: string,
    options?: QueryOptions
  ): Promise<T | null> {
    const filter: Filter = { [this.idColumn]: id };
    const rows = await this.find<T>(collection, filter, { ...options, limit: 1 });
    return rows[0] || null;
  }

  /**
   * Creates a new record.
   */
  async create<T = unknown>(
    collection: string,
    data: Record<string, unknown>,
    _options?: QueryOptions
  ): Promise<T> {
    const queryFn = await this.getQueryFn();
    const table = this.escapeIdentifier(collection);

    const keys = Object.keys(data);
    if (keys.length === 0) {
      const query = `INSERT INTO ${table} DEFAULT VALUES RETURNING *`;
      const rows = await queryFn(query, []);
      return rows[0] as T;
    }

    const columns = keys.map((k) => this.escapeIdentifier(k)).join(', ');
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const params = keys.map((k) => data[k]);

    const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`;
    const rows = await queryFn(query, params);
    return rows[0] as T;
  }

  /**
   * Updates a record.
   */
  async update<T = unknown>(
    collection: string,
    id: string,
    data: Record<string, unknown>,
    _options?: QueryOptions
  ): Promise<T> {
    const queryFn = await this.getQueryFn();
    const table = this.escapeIdentifier(collection);
    const idCol = this.escapeIdentifier(this.idColumn);

    const keys = Object.keys(data);
    if (keys.length === 0) {
      return this.findOne<T>(collection, id) as Promise<T>;
    }

    const setClause = keys.map((k, i) => `${this.escapeIdentifier(k)} = $${i + 1}`).join(', ');
    const params = keys.map((k) => data[k]);
    params.push(id);

    const query = `UPDATE ${table} SET ${setClause} WHERE ${idCol} = $${params.length} RETURNING *`;
    const rows = await queryFn(query, params);
    return rows[0] as T;
  }

  /**
   * Replaces a record (dynamically compatible with update).
   */
  async replace<T = unknown>(
    collection: string,
    id: string,
    data: Record<string, unknown>,
    options?: QueryOptions
  ): Promise<T> {
    return this.update<T>(collection, id, data, options);
  }

  /**
   * Deletes a record.
   */
  async delete<T = unknown>(
    collection: string,
    id: string,
    _options?: QueryOptions
  ): Promise<T> {
    const queryFn = await this.getQueryFn();
    const table = this.escapeIdentifier(collection);
    const idCol = this.escapeIdentifier(this.idColumn);

    const query = `DELETE FROM ${table} WHERE ${idCol} = $1 RETURNING *`;
    const rows = await queryFn(query, [id]);
    return rows[0] as T;
  }

  /**
   * Counts the number of records matching the filter.
   */
  async count(
    collection: string,
    filter?: Filter,
    _options?: QueryOptions
  ): Promise<number> {
    const queryFn = await this.getQueryFn();
    const table = this.escapeIdentifier(collection);
    const { sql: whereSql, params } = this.buildWhereClause(filter, 1);

    let query = `SELECT COUNT(*)::int AS count FROM ${table}`;
    if (whereSql) {
      query += ` WHERE ${whereSql}`;
    }

    const rows = await queryFn(query, params);
    const row = rows[0] as { count: number | string } | undefined;
    if (!row) return 0;
    return typeof row.count === 'number' ? row.count : parseInt(row.count, 10) || 0;
  }

  /**
   * Bulk creates multiple records.
   */
  async createMany<T = unknown>(
    collection: string,
    data: Record<string, unknown>[],
    _options?: QueryOptions
  ): Promise<T[]> {
    if (data.length === 0) return [];
    const queryFn = await this.getQueryFn();
    const table = this.escapeIdentifier(collection);

    // Collect all column keys from all records
    const keysSet = new Set<string>();
    data.forEach((d) => Object.keys(d).forEach((k) => keysSet.add(k)));
    const keys = Array.from(keysSet);

    if (keys.length === 0) {
      const results: T[] = [];
      for (const d of data) {
        results.push(await this.create<T>(collection, d));
      }
      return results;
    }

    const columns = keys.map((k) => this.escapeIdentifier(k)).join(', ');
    const valueTuples: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    for (const item of data) {
      const tuplePlaceholders: string[] = [];
      for (const key of keys) {
        tuplePlaceholders.push(`$${paramIndex++}`);
        params.push(item[key] !== undefined ? item[key] : null);
      }
      valueTuples.push(`(${tuplePlaceholders.join(', ')})`);
    }

    const query = `INSERT INTO ${table} (${columns}) VALUES ${valueTuples.join(', ')} RETURNING *`;
    const rows = await queryFn(query, params);
    return rows as T[];
  }

  /**
   * Bulk updates multiple records matching the criteria.
   */
  async updateMany<T = unknown>(
    collection: string,
    filter: Filter,
    data: Record<string, unknown>,
    _options?: QueryOptions
  ): Promise<T[]> {
    const keys = Object.keys(data);
    if (keys.length === 0) {
      return this.find<T>(collection, filter);
    }

    const queryFn = await this.getQueryFn();
    const table = this.escapeIdentifier(collection);

    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    for (const key of keys) {
      setClauses.push(`${this.escapeIdentifier(key)} = $${paramIndex++}`);
      params.push(data[key]);
    }

    const { sql: whereSql, params: whereParams } = this.buildWhereClause(filter, paramIndex);
    params.push(...whereParams);

    let query = `UPDATE ${table} SET ${setClauses.join(', ')}`;
    if (whereSql) {
      query += ` WHERE ${whereSql}`;
    }
    query += ' RETURNING *';

    const rows = await queryFn(query, params);
    return rows as T[];
  }

  /**
   * Bulk deletes multiple records matching the criteria.
   */
  async deleteMany<T = unknown>(
    collection: string,
    filter: Filter,
    _options?: QueryOptions
  ): Promise<T[]> {
    const queryFn = await this.getQueryFn();
    const table = this.escapeIdentifier(collection);

    const { sql: whereSql, params } = this.buildWhereClause(filter, 1);
    let query = `DELETE FROM ${table}`;
    if (whereSql) {
      query += ` WHERE ${whereSql}`;
    }
    query += ' RETURNING *';

    const rows = await queryFn(query, params);
    return rows as T[];
  }

  /**
   * Inserts a single record and returns the outcome as an OperationResult.
   */
  async insertOne(
    collection: string,
    data: Record<string, unknown>,
    options?: QueryOptions
  ): Promise<OperationResult> {
    const record = await this.create<Record<string, unknown>>(collection, data, options);
    const insertedId = record && record[this.idColumn] ? String(record[this.idColumn]) : undefined;
    return {
      acknowledged: true,
      matchedCount: 1,
      modifiedCount: 1,
      insertedId,
    };
  }

  /**
   * Deletes a single record and returns the outcome as an OperationResult.
   */
  async deleteOne(
    collection: string,
    filter: Filter,
    options?: QueryOptions
  ): Promise<OperationResult> {
    const rows = await this.find<Record<string, unknown>>(collection, filter, { ...options, limit: 1 });
    if (rows.length === 0) {
      return { acknowledged: true, deletedCount: 0 };
    }
    const id = String(rows[0][this.idColumn]);
    await this.delete(collection, id, options);
    return { acknowledged: true, deletedCount: 1 };
  }
}
