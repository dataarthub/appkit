import {test,expect} from 'bun:test';
import {S3ContentAdapter} from './s3-content-adapter';
import type {StorageAdapter} from '../storage/types';
import type {ContentItem} from './types';
function fixture(format:'json'|'markdown'='markdown',indexFile?:string){
  const data=new Map<string,Uint8Array>();let failDelete=false;let pages=0;
  const storage={download:async(k:string)=>data.get(k)??null,upload:async(k:string,v:string|Uint8Array)=>{data.set(k,typeof v==='string'?new TextEncoder().encode(v):v);return {key:k};},exists:async(k:string)=>data.has(k),delete:async(k:string)=>failDelete?false:data.delete(k),list:async({cursor}:{cursor?:string})=>{pages++;const keys=[...data.keys()].sort();const i=cursor?Number(cursor):0;return {objects:keys.slice(i,i+1).map(key=>({key})),hasMore:i+1<keys.length,nextCursor:i+1<keys.length?String(i+1):undefined};}} as unknown as StorageAdapter;
  return {data,adapter:new S3ContentAdapter({storage,keyPrefix:'posts/',format,indexFile}),fail:()=>{failDelete=true;},pages:()=>pages};
}
const item:ContentItem={slug:'a',contentType:'post',title:'He said "hi"',body:'\n  body  \n',status:'draft',metadata:{nested:{quote:'a:b'}},tenantId:'t1',tags:['a,b','日本語']};
test('Markdown preserves body, quotes, custom metadata, tags and tenant',async()=>{
  const {adapter}=fixture();await adapter.save(item);const loaded=await adapter.get('a');
  for(const key of ['body','title','metadata','tenantId','tags'] as const)expect(loaded?.[key]).toEqual(item[key]);
});
test('index collisions are rejected before writing, for first/existing and custom indexes',async()=>{
  for(const [format,indexFile,slug] of [['json',undefined,'_index'],['json','internal/list.json','internal/list'],['markdown','internal/list.md','internal/list']] as const){
    const {adapter,data}=fixture(format,indexFile);
    await expect(adapter.save({...item,slug})).rejects.toThrow('index');expect(data.size).toBe(0);
    await adapter.save(item);const before=[...data.entries()].map(([key,value])=>[key,Array.from(value)]);
    await expect(adapter.save({...item,slug})).rejects.toThrow('index');
    await expect(adapter.delete(slug)).rejects.toThrow('index');
    expect([...data.entries()].map(([key,value])=>[key,Array.from(value)])).toEqual(before);
    expect((await adapter.list()).map(value=>value.slug)).toEqual(['a']);
  }
  const {adapter,data}=fixture('json');
  for(const slug of ['a/../_index','/_index','a\\..\\_index','./_index','a//../_index']) await expect(adapter.save({...item,slug})).rejects.toThrow('paths');
  expect(data.size).toBe(0);
  expect(()=>fixture('json','a/../_index.json')).toThrow('paths');
});
test('sync compares publication and metadata, ignores only bookkeeping timestamps',async()=>{
  const {adapter}=fixture();await adapter.save(item);
  expect((await adapter.sync([{...item,status:'published',metadata:{changed:true}}])).updated).toBe(1);
  expect((await adapter.sync([{...item,status:'published',metadata:{changed:true},updatedAt:'old',lastSyncedAt:'old'}])).unchanged).toBe(1);
});
test('fallback follows pages and first index retains existing content during concurrent saves',async()=>{
  const {adapter,data,pages}=fixture('json');
  data.set('posts/old.json',new TextEncoder().encode(JSON.stringify({...item,slug:'old'})));
  await Promise.all([adapter.save(item),adapter.save({...item,slug:'b'})]);
  expect((await adapter.list()).map(x=>x.slug).sort()).toEqual(['a','b','old']);
  expect(pages()).toBeGreaterThan(1);expect(await adapter.list({limit:0})).toEqual([]);
});
test('failed deletion preserves the index and rejects mutation',async()=>{
  const {adapter,fail}=fixture();await adapter.save(item);fail();await expect(adapter.delete('a')).rejects.toThrow('deletion failed');
  expect((await adapter.list()).map(x=>x.slug)).toEqual(['a']);
});
