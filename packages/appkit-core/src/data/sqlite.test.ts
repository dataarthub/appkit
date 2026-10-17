import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { D1DataAccessAdapter, type D1DatabaseLike, type D1PreparedStatementLike } from './d1';
import { SQLiteDataAccessAdapter, type SqliteDriver, type SqliteValue } from './sqlite';

function recordingDriver(
  rows: Record<string, unknown>[] = [],
): SqliteDriver & { calls: Array<{ sql: string; params: readonly SqliteValue[] }> } {
  const calls: Array<{ sql: string; params: readonly SqliteValue[] }> = [];
  return {
    calls,
    async all<T>(sql: string, params: readonly SqliteValue[]) {
      calls.push({ sql, params });
      return rows as T[];
    },
    async get<T>(sql: string, params: readonly SqliteValue[]) {
      calls.push({ sql, params });
      return (rows[0] as T | undefined) ?? null;
    },
    async run(sql: string, params: readonly SqliteValue[]) {
      calls.push({ sql, params });
      return { changes: 1, lastInsertRowid: 7 };
    },
  };
}

describe('SQLiteDataAccessAdapter', () => {
  test('compiles parameterized filters, sorting, projection and pagination', async () => {
    const driver = recordingDriver([{ id: 'a', title: 'Hello' }]);
    const adapter = new SQLiteDataAccessAdapter({ driver });

    const rows = await adapter.find(
      'articles',
      { status: 'published', views: { $gte: 10 } },
      {
        projection: ['id', 'title'],
        sort: { views: -1 },
        limit: 10,
        skip: 20,
      },
    );

    assert.deepEqual(rows, [{ id: 'a', title: 'Hello' }]);

    assert.deepEqual(driver.calls[0], {
      sql: 'SELECT "id", "title" FROM "articles" WHERE "status" = ? AND "views" >= ? ORDER BY "views" DESC LIMIT ? OFFSET ?',
      params: ['published', 10, 10, 20],
    });
  });

  test('supports the generic Node SQLite prepare API and protects writes in read-only mode', async () => {
    const driver = recordingDriver();
    const adapter = new SQLiteDataAccessAdapter({ driver, readOnly: true });
    await assert.rejects(adapter.create('articles', { id: 'a', title: 'Hello' }), /read-only/);
  });
});

describe('D1DataAccessAdapter', () => {
  test('bridges D1 prepare/bind/all to the shared SQLite adapter', async () => {
    const calls: Array<{ sql: string; params: readonly SqliteValue[] }> = [];
    const db: D1DatabaseLike = {
      prepare(sql) {
        let params: readonly SqliteValue[] = [];
        const statement: D1PreparedStatementLike = {
          bind(...values) {
            params = values;
            return statement;
          },
          async all<T>() {
            calls.push({ sql, params });
            return { results: [{ id: 'a' } as T] };
          },
          async first<T>() {
            calls.push({ sql, params });
            return { id: 'a' } as T;
          },
          async run() {
            calls.push({ sql, params });
            return { success: true, meta: { changes: 1, last_row_id: 1 } };
          },
        };
        return statement;
      },
    };
    const adapter = new D1DataAccessAdapter({ db });

    assert.deepEqual(await adapter.findOne('articles', 'a'), { id: 'a' });
    assert.deepEqual(calls[0], {
      sql: 'SELECT * FROM "articles" WHERE "id" = ? LIMIT ?',
      params: ['a', 1],
    });
  });
});
