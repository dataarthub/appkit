import { test, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import { createSqliteDriver, SQLiteDataAccessAdapter } from './sqlite';
import type { SqliteDatabaseLike } from './sqlite';

test('real in-memory SQLite CRUD and parameter binding resist SQL payloads', async () => {
  const db = new Database(':memory:');
  try {
    db.exec('CREATE TABLE records (id TEXT PRIMARY KEY, title TEXT, amount INTEGER)');
    const adapter = new SQLiteDataAccessAdapter({ driver: createSqliteDriver(db as unknown as SqliteDatabaseLike) });
    const payload = "x'); DROP TABLE records; --";
    await adapter.create('records', { id: 'a', title: payload, amount: 0 });
    expect(await adapter.findOne('records', 'a')).toEqual({ id: 'a', title: payload, amount: 0 });
    await adapter.update('records', 'a', { title: '日本語' });
    expect((await adapter.find<{ title: string }>('records', { amount: { $gte: 0 } }, { limit: 1 }))[0]?.title).toBe('日本語');
    expect(await adapter.count('records')).toBe(1);
    await adapter.delete('records', 'a');
    expect(await adapter.findOne('records', 'a')).toBeNull();
    await expect(adapter.find('records; DROP TABLE records', {})).rejects.toThrow('Unsafe SQLite identifier');
  } finally { db.close(); }
});
