import { test, expect } from 'bun:test';
import { NeonAdapter } from './neon-adapter';
import { validateFilter, comparisonOperators } from './internal/query-safety';
test('malformed destructive filters fail before any SQL executes', async () => {
  let calls = 0;
  const adapter = new NeonAdapter({queryFn:async()=>{calls++;return [];}});
  for (const filter of [{id:{$in:'bad'}},{id:{$unknown:1}},{$or:[]},{$and:[{}]},{id:undefined},{id:{$gt:Infinity}}]) {
    await expect(adapter.deleteMany('items',filter)).rejects.toThrow();
    await expect(adapter.updateMany('items',filter,{title:'x'})).rejects.toThrow();
  }
  expect(calls).toBe(0);
});
test('Neon quotes qualified names and preserves null and empty-list predicates', async () => {
  const calls: string[] = [];
  const adapter = new NeonAdapter({queryFn:async(sql)=>{calls.push(sql);return [];}});
  await adapter.find('app.items',{gone:{$eq:null},live:{$ne:null},id:{$in:[]}});
  expect(calls[0]).toContain('"app"."items"');
  expect(calls[0]).toContain('"gone" IS NULL');
  expect(calls[0]).toContain('"live" IS NOT NULL');
  expect(calls[0]).toContain('1 = 0');
  await expect(adapter.find('items',{}, {limit:-1})).rejects.toThrow();
});
test('capability validation rejects unsupported logical and field operations', () => {
  for (const filter of [{$or:[{id:1}]},{id:{$where:'1=1'}},{id:{$in:{}}}]) expect(()=>validateFilter(filter,comparisonOperators)).toThrow();
  expect(()=>validateFilter({id:{$in:[]}},comparisonOperators)).not.toThrow();
});
