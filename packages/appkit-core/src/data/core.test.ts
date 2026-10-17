import { describe, test, expect } from 'bun:test';
import { createResourceService, getAdapterCacheScope, getInstanceCacheScope, normalizePopulateOptions } from './index';
import type { DataAccessAdapter } from './types';
import { createTableSearchHandler } from './search-handlers';

describe('independent record services', () => {
  test('forwards CRUD, preserves falsy data, and combines find options without mutation', async () => {
    const calls: unknown[][] = [];
    const row = { id: 'a', amount: 0, active: false };
    const adapter = Object.fromEntries(['find', 'findOne', 'create', 'update', 'delete', 'createMany', 'updateMany'].map(method => [method, async (...args: unknown[]) => { calls.push([method, ...args]); return ['find', 'createMany', 'updateMany'].includes(method) ? [row] : row; }])) as unknown as DataAccessAdapter;
    const defaults = { limit: 20, sort: { id: 1 } };
    const service = createResourceService<typeof row>(adapter, 'records', { defaultQueryOptions: defaults });
    expect(await service.find({ active: false }, { limit: 2 })).toEqual([row]);
    expect(calls[0]).toEqual(['find', 'records', { active: false }, { limit: 2, sort: { id: 1 } }]);
    expect(defaults.limit).toBe(20);
    await service.findOne('a'); await service.create(row); await service.update('a', { amount: 0 }); await service.delete('a');
    await service.bulkCreate([row]); await service.bulkUpdate({ id: 'a' }, { active: false });
    expect(calls.map(call => call[0])).toEqual(['find', 'findOne', 'create', 'update', 'delete', 'createMany', 'updateMany']);
    expect(calls[3]).toEqual(['update', 'records', 'a', { amount: 0 }, undefined]);
  });
  test('reports unsupported bulk operations and propagates backend errors', async () => {
    const failure = new Error('backend unavailable');
    const service = createResourceService({ find: async () => { throw failure; } } as unknown as DataAccessAdapter, 'records');
    await expect(service.bulkCreate([])).rejects.toThrow('does not support bulkCreate');
    await expect(service.bulkUpdate({}, {})).rejects.toThrow('does not support bulkUpdate');
    await expect(service.find()).rejects.toBe(failure);
  });
  test('attachment callbacks accept application-owned metadata without a storage dependency', async () => {
    const seen: unknown[] = [];
    const service = createResourceService<{ id: string }, { source: string }>( {} as DataAccessAdapter, 'records', {
      attachFile: async (...args) => { seen.push(args); return '/uploaded'; },
    });
    const file = new File(['text'], 'sample.txt');
    expect(await service.attachFile?.(file, 'a', { source: 'example' })).toBe('/uploaded');
    expect(seen[0]).toEqual([file, 'a', { source: 'example' }]);
  });
  test('normalizes historical relation aliases', () => {
    expect(normalizePopulateOptions({ collection: 'users', field: 'user_id', foreignField: 'id' })).toEqual({ collection: 'users', localRef: 'user_id', foreignRef: 'id', as: 'user', unwind: true });
  });
  test('isolates cache identity and explicitly shares only a declared scope', () => {
    const a = {}, b = {};
    expect(getAdapterCacheScope(a)).toBe(getAdapterCacheScope(a));
    expect(getAdapterCacheScope(a)).not.toBe(getAdapterCacheScope(b));
    expect(getAdapterCacheScope({ cacheScope: 'tenant-1' })).toBe(getAdapterCacheScope({ cacheScope: 'tenant-1' }));
    expect(getInstanceCacheScope({ cacheScope: 'same' })).not.toBe(getInstanceCacheScope({ cacheScope: 'same' }));
  });
  test('builds explicit searchable fields, projection and a bounded result request', async () => {
    let request: unknown[] = [];
    const adapter = { find: async (...args: unknown[]) => { request = args; return [{ id: '42', name: 'Item', code: 'X' }]; } } as unknown as DataAccessAdapter;
    const search = createTableSearchHandler(adapter, { table: 'items', fields: ['name'], select: 'id, name', max: 5, includeNumericCode: true });
    expect(await search('42')).toEqual([{ value: '42', label: 'Item', name: 'Item', description: 'X', code: 'X' }]);
    expect(request).toEqual(['items', { $or: [{ name: { $ilike: '%42%' } }, { code: { $eq: '42' } }] }, { projection: ['id', 'name'], limit: 5 }]);
  });
});
