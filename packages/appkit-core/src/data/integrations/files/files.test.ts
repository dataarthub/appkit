import { afterEach, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { createSqliteDriver, SQLiteDataAccessAdapter, type SqliteDatabaseLike } from "../../sqlite";
import type { DataAccessAdapter } from "../../types";
import type { StorageAdapter, StorageObject } from "../../../storage/portable";
import { DataAccessFileProvider, FileProviderOperationError, type DataAccessFileProviderOptions, type FileRecord } from './index';

const databases: Database[] = [];
afterEach(() => { for (const db of databases.splice(0)) db.close(); });
function fixture(options: Partial<DataAccessFileProviderOptions> = {}) {
  const db = new Database(':memory:'); databases.push(db);
  db.exec('CREATE TABLE files (id TEXT PRIMARY KEY, folder TEXT, filename TEXT, physical_key TEXT, size INTEGER, content_type TEXT, tags TEXT, updated_at TEXT, kind TEXT)');
  const dataAccess = new SQLiteDataAccessAdapter({ driver: createSqliteDriver(db as unknown as SqliteDatabaseLike) });
  const objects = new Map<string, { bytes: Uint8Array; object: StorageObject }>();
  const deleted: string[] = [];
  const storage: StorageAdapter = {
    async upload(key, value, config) {
      const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value instanceof Uint8Array ? value : new Uint8Array(await new Response(value).arrayBuffer());
      const object = { key, size: bytes.length, contentType: config?.contentType, lastModified: new Date() };
      objects.set(key, { bytes, object }); return object;
    },
    async download(key) { return objects.get(key)?.bytes ?? null; },
    async getUrl(key) { return 'https://example.test/' + key; },
    async delete(key) { deleted.push(key); return objects.delete(key); },
    async exists(key) { return objects.has(key); },
    async head(key) { return objects.get(key)?.object ?? null; },
    async list() { return { objects: [...objects.values()].map(value => value.object), hasMore: false }; },
  };
  let sequence = 0;
  const config = { dataAccess, storage, createId: () => `id-${++sequence}`, ...options };
  return { dataAccess, storage, objects, deleted, config, provider: new DataAccessFileProvider(config) };
}
function intercept(adapter: DataAccessAdapter, changes: Partial<DataAccessAdapter>): DataAccessAdapter {
  return new Proxy(adapter, { get(target, key) {
    const override = Reflect.get(changes, key); if (override !== undefined) return override;
    const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value;
  }});
}
const blob = () => new Blob(['日本語 binary \0'], { type: 'text/plain' });
const compensation = { uploadFailurePolicy: 'compensate', canCompensateUpload: () => true } as const;
async function failedUpload(f: ReturnType<typeof fixture>, options: Partial<DataAccessFileProviderOptions> = {}, ack = false) {
  const cause = new Error('DB create failed');
  const dataAccess = intercept(f.dataAccess, { async create<T>(collection: string, row: Record<string, unknown>): Promise<T> { if (ack) await f.dataAccess.create(collection, row); throw cause; } });
  const provider = new DataAccessFileProvider({ ...f.config, dataAccess, ...options });
  const error = await provider.uploadFile('docs/', blob(), '見積.txt').catch(error => error as unknown);
  expect(error).toBeInstanceOf(FileProviderOperationError);
  return { cause, error: error as FileProviderOperationError };
}

test('real SQLite metadata + blob round-trip, physical/logical separation and CRUD', async () => {
  const f = fixture();
  const node = await f.provider.uploadFile('docs/', blob(), '見積.txt');
  expect(node.physicalKey).toBe('vault/id-1.txt');
  expect(new TextDecoder().decode(new Uint8Array((await f.storage.download(node.physicalKey!))!))).toBe('日本語 binary \0');
  expect((await f.dataAccess.findOne<FileRecord>('files', node.id))?.filename).toBe('見積.txt');
  expect(await f.provider.getUrl(node)).toBe('https://example.test/vault/id-1.txt');
  expect((await f.provider.renameNode(node.id, '請求.txt')).physicalKey).toBe(node.physicalKey);
  expect((await f.provider.moveNode(node.id, 'archive/')).name).toBe('請求.txt');
  expect((await f.provider.updateMetadata(node.id, { tags: '経理, 未処理', ignored: 'no column' })).metadata?.tags).toBe('経理, 未処理');
  expect((await f.provider.listNodes('docs/')).nodes).toEqual([]);
  expect((await f.provider.listNodes('archive/')).nodes[0].id).toBe(node.id);
  const folder = await f.provider.createFolder('', 'archive');
  expect(folder.kind).toBe('folder'); expect(folder.size).toBeUndefined();
  expect((await f.provider.listNodes('')).nodes[0].size).toBeUndefined();
  expect((await f.provider.listNodes('')).nodes[0].contentType).toBeUndefined();
  await expect(f.provider.getUrl(folder)).rejects.toThrow('Physical key is missing');
});
test('records use the actual returned storage key; display-derived extensions cannot create key paths', async () => {
  const f = fixture(); const upload = f.storage.upload.bind(f.storage);
  f.storage.upload = (key, value, options) => upload('rewritten/' + key, value, options);
  const result = await f.provider.uploadFile('', blob(), 'report.txt');
  expect((await f.dataAccess.findOne<FileRecord>('files', result.id))?.physical_key).toBe('rewritten/vault/id-1.txt');
  expect((await f.provider.uploadFile('', blob(), 'danger.ext/../name')).physicalKey).toBe('rewritten/vault/id-2');
});
test('portable search treats regex characters literally and matches comma tags by exact AND membership', async () => {
  const f = fixture();
  const a = await f.provider.uploadFile('a/', blob(), 'Report[1].txt');
  await f.provider.updateMetadata(a.id, { tags: '営業, 日本語,営業' });
  const b = await f.provider.uploadFile('b/', blob(), 'Report1.txt');
  await f.provider.updateMetadata(b.id, { tags: '営業部,日本語' });
  expect((await f.provider.searchNodes({ query: '[1]' })).map(node => node.id)).toEqual([a.id]);
  expect((await f.provider.searchNodes({ query: 'REPORT', tags: [' 営業 ', '日本語'] })).map(node => node.id)).toEqual([a.id]);
  expect(await f.provider.searchNodes({ tags: ['営業', '日本語', 'missing'] })).toEqual([]);
  expect((await f.provider.searchNodes({})).map(node => node.id)).toEqual([a.id, b.id]);
  await expect(new DataAccessFileProvider({ ...f.config, maxSearchRecords: 1 }).searchNodes({})).rejects.toThrow('maxSearchRecords');
});
test('legacy mode preserves the old adapter filters exactly, while custom candidates use portable predicates', async () => {
  const f = fixture(); const calls: unknown[] = [];
  const dataAccess = intercept(f.dataAccess, { async find<T>(...args: Parameters<DataAccessAdapter['find']>): Promise<T[]> { calls.push(args); return []; } });
  await new DataAccessFileProvider({ ...f.config, dataAccess, searchMode: 'legacy-adapter' }).searchNodes({ query: '^Report', tags: ['a'] });
  expect(calls[0]).toEqual(['files', { filename: { $regex: '^Report', $options: 'i' }, tags: { $all: ['a'] } }]);
  const a = await f.provider.uploadFile('', blob(), 'A.txt');
  const records = await f.dataAccess.find<FileRecord>('files');
  const custom = new DataAccessFileProvider({ ...f.config, searchRecords: async criteria => { criteria.tags?.push('mutated'); return records; } });
  expect((await custom.searchNodes({ query: 'a', tags: [] }))[0].id).toBe(a.id);
});
test('default metadata-only deletion retains blobs and does not look up or guess physical keys', async () => {
  const f = fixture(); const node = await f.provider.uploadFile('', blob(), 'a.txt');
  const dataAccess = intercept(f.dataAccess, { async findOne() { throw new Error('Must not look up'); } });
  await new DataAccessFileProvider({ ...f.config, dataAccess }).deleteNodes([node.id]);
  expect(await f.dataAccess.findOne('files', node.id)).toBeNull();
  expect(f.objects.has(node.physicalKey!)).toBe(true); expect(f.deleted).toEqual([]);
});
test('physical deletion uses the stored key, is retryable for missing objects, and never recursively deletes folders', async () => {
  const f = fixture({ deleteMode: 'storage-and-metadata' });
  const node = await f.provider.uploadFile('folder/', blob(), 'a.txt');
  const folder = await f.provider.createFolder('', 'folder');
  await f.provider.deleteNodes([folder.id, 'missing-id']);
  expect(f.deleted).toEqual([]); expect(await f.dataAccess.findOne('files', node.id)).not.toBeNull();
  f.objects.delete(node.physicalKey!);
  await f.provider.deleteNodes([node.id]);
  expect(f.deleted).toEqual([node.physicalKey!]); expect(await f.dataAccess.findOne('files', node.id)).toBeNull();
});
test('false/throwing storage deletion keeps metadata and reports the completed prefix of a batch', async () => {
  const f = fixture({ deleteMode: 'storage-and-metadata' });
  const nodes = await Promise.all(['a.txt', 'b.txt', 'c.txt'].map(name => f.provider.uploadFile('', blob(), name)));
  const original = f.storage.delete.bind(f.storage);
  f.storage.delete = async key => key === nodes[1].physicalKey ? false : original(key);
  const error = await f.provider.deleteNodes(nodes.map(node => node.id)).catch(error => error as FileProviderOperationError);
  expect(error).toMatchObject({ stage: 'delete-storage', completedIds: [nodes[0].id], nodeId: nodes[1].id, physicalKey: nodes[1].physicalKey });
  expect(await f.dataAccess.findOne('files', nodes[0].id)).toBeNull();
  expect(await f.dataAccess.findOne('files', nodes[1].id)).not.toBeNull();
  expect(f.objects.has(nodes[2].physicalKey!)).toBe(true);
});
test('DB deletion failure after key deletion is explicit and a retry can reconcile it', async () => {
  const f = fixture(); const node = await f.provider.uploadFile('', blob(), 'a.txt');
  const dataAccess = intercept(f.dataAccess, { async delete() { throw new Error('DB delete failed'); } });
  const error = await new DataAccessFileProvider({ ...f.config, dataAccess, deleteMode: 'storage-and-metadata' }).deleteNodes([node.id]).catch(error => error as FileProviderOperationError);
  expect(error).toMatchObject({ stage: 'delete-record', storageDeleted: true, completedIds: [], physicalKey: node.physicalKey });
  expect(await f.dataAccess.findOne('files', node.id)).not.toBeNull();
  await new DataAccessFileProvider({ ...f.config, deleteMode: 'storage-and-metadata' }).deleteNodes([node.id]);
  expect(await f.dataAccess.findOne('files', node.id)).toBeNull();
});
test('default upload failure retains the object and exposes its key and original cause', async () => {
  const f = fixture(); const { error, cause } = await failedUpload(f);
  expect(error.cause).toBe(cause); expect(error.compensation).toBe('not-requested'); expect(error.physicalKey).toBe('vault/id-1.txt');
  expect(f.objects.has(error.physicalKey!)).toBe(true); expect(f.deleted).toEqual([]);
});
test('confirmed non-commit compensation removes a newly uploaded key, while lost acknowledgements retain it', async () => {
  const f = fixture(); const first = await failedUpload(f, compensation);
  expect(first.error.compensation).toBe('deleted'); expect(f.objects.size).toBe(0);
  const lost = await failedUpload(f, compensation, true);
  expect(lost.error.compensation).toBe('retained'); expect(f.objects.has(lost.error.physicalKey!)).toBe(true);
  expect(await f.dataAccess.findOne('files', lost.error.nodeId)).not.toBeNull();
});
test('unconfirmed create results and failed cleanup never silently discard recovery details', async () => {
  const f = fixture(); const cause = new Error('create');
  const dataAccess = intercept(f.dataAccess, { async create() { throw cause; }, async findOne() { throw new Error('lookup'); } });
  const unconfirmed = await failedUpload(f, { ...compensation, dataAccess });
  expect(unconfirmed.error.compensation).toBe('unconfirmed'); expect(unconfirmed.error.compensationError).toBeInstanceOf(Error); expect(f.objects.size).toBe(1);
  f.storage.delete = async () => false;
  const failed = await failedUpload(f, compensation);
  expect(failed.error.compensation).toBe('failed'); expect(failed.error.cause).toBe(failed.cause); expect(failed.error.compensationError).toBeInstanceOf(Error);
  const retained = await failedUpload(f, { ...compensation, canCompensateUpload: () => false });
  expect(retained.error.compensation).toBe('retained');
});
test('configuration fails before side effects for invalid modes/limits and unsafe IDs', async () => {
  const f = fixture();
  expect(() => new DataAccessFileProvider({ ...f.config, uploadFailurePolicy: 'compensate' })).toThrow('confirmation');
  expect(() => new DataAccessFileProvider({ ...f.config, maxSearchRecords: 0 })).toThrow('positive');
  await expect(new DataAccessFileProvider({ ...f.config, createId: () => '../unsafe' }).uploadFile('', blob(), 'a.txt')).rejects.toThrow('safe ID');
  expect(f.objects.size).toBe(0);
});

test('storage/read-back throws and invalid DB identity stop destructive deletion before removing metadata', async () => {
  for (const mode of ['delete-throws', 'head-throws', 'wrong-id'] as const) {
    const f = fixture(); const node = await f.provider.uploadFile('', blob(), 'a.txt');
    const dataAccess = mode === 'wrong-id' ? intercept(f.dataAccess, { async findOne<T>(): Promise<T | null> { return { id: 'another-id', kind: 'file', physical_key: node.physicalKey } as T; } }) : f.dataAccess;
    if (mode === 'delete-throws') f.storage.delete = async () => { throw new Error('storage offline'); };
    if (mode === 'head-throws') { f.storage.delete = async () => false; f.storage.head = async () => { throw new Error('head unavailable'); }; }
    const error = await new DataAccessFileProvider({ ...f.config, dataAccess, deleteMode: 'storage-and-metadata' }).deleteNodes([node.id]).catch(error => error as FileProviderOperationError);
    expect(error).toMatchObject({ stage: mode === 'wrong-id' ? 'lookup-record' : 'delete-storage', completedIds: [] });
    expect(await f.dataAccess.findOne('files', node.id)).not.toBeNull(); expect(f.objects.has(node.physicalKey!)).toBe(true);
  }
  const f = fixture();
  const failed = await failedUpload(f, { ...compensation, canCompensateUpload: () => { throw new Error('cannot confirm ownership'); } });
  expect(failed.error.compensation).toBe('unconfirmed'); expect(failed.error.compensationError).toBeInstanceOf(Error); expect(f.objects.has(failed.error.physicalKey!)).toBe(true);
});
