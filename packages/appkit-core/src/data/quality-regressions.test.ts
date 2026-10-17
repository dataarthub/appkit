import { test, expect } from 'bun:test';
import { SchemaDataConverter, formatJapanesePostalCode, validatePostalCode, parseCodelist } from './index';
import { normalizeExtensionsContainer, parseRegistryFile } from './schema/registry';
import { loadRegistryFile, loadCodelistFile } from './schema/loaders';
import { collectSqlColumns } from './schema/sql-column-inventory';
import { createJsonPathPlusResolver } from './schema/jsonpath';
import { mergePdfTheme, defaultPdfTheme } from './pdf/theme';
import { resolvePdfWorkerSrc } from './pdf/viewer-worker';
import { DatabaseContentAdapter } from './content';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';

test('schema conversion round-trips mapped fields and ignores undeclared database fields',()=>{
 const converter=new SchemaDataConverter({type:'object',properties:{first_name:{type:'string'}}});
 expect(converter.fromDB({first_name:'Ada',secret:'hidden'})).toEqual({firstName:'Ada'});
 expect(converter.toDB({firstName:'Ada'})).toEqual({first_name:'Ada'});
 expect(converter.resolveColumnName('lastName')).toBe('last_name');
});
test('registry/codelist loaders reject malformed data rather than returning unchecked documents',async()=>{
 const base=path.resolve('.verification/tmp');mkdirSync(base,{recursive:true});const dir=mkdtempSync(path.join(base,'schema-load-'));
 try {
  const file=path.join(dir,'bad.json');writeFileSync(file,'{}');
  await expect(loadRegistryFile(file)).rejects.toThrow();await expect(loadCodelistFile(file)).rejects.toThrow();
  expect(()=>parseRegistryFile(null)).toThrow();expect(()=>parseCodelist({codes:[]})).toThrow();
  expect(normalizeExtensionsContainer({})).toEqual([]);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('SQL inventory separates actual columns from comments, literals and other schemas',()=>{
 const columns=collectSqlColumns(`-- CREATE TABLE fake (x int);\nCREATE TABLE public.people (id int, name text DEFAULT 'fake, column'); ALTER TABLE people ADD COLUMN email text; CREATE TABLE other.secret (x int);`);
 expect([...columns.get('people')!]).toEqual(['id','name','email']);expect(columns.has('fake')).toBe(false);expect(columns.has('secret')).toBe(false);
 expect(()=>collectSqlColumns('/* unclosed')).toThrow();
});
test('JSONPath resolver selects nested values',async()=>{
 const select=await createJsonPathPlusResolver();expect(select({rows:[{id:1},{id:2}]},'$.rows[*].id')).toEqual([1,2]);
});
test('PDF theme overrides preserve defaults and worker configuration rejects empty overrides',()=>{
 const before=JSON.stringify(defaultPdfTheme);expect(mergePdfTheme({})).toEqual(defaultPdfTheme);expect(JSON.stringify(defaultPdfTheme)).toBe(before);
 expect(resolvePdfWorkerSrc('6.0.0','/worker.mjs')).toBe('/worker.mjs');expect(()=>resolvePdfWorkerSrc('6.0.0',' ')).toThrow();
 expect(resolvePdfWorkerSrc('6.0.0')).toEndWith('/pdf.worker.min.mjs');
});
test('postal helpers accept valid Japanese postal codes and reject malformed values',()=>{
 expect(formatJapanesePostalCode('1000001')).toBe('100-0001');expect(validatePostalCode('100-0001','JP')).toBe(true);expect(validatePostalCode('bad','JP')).toBe(false);
});
test('database content adapter maps fields and binds the tenant filter',async()=>{
 const calls: unknown[][]=[];
 const db={find:async(...args:unknown[])=>{calls.push(args);return [{slug:'hello',title:'Hello',body:'Body',tags:'["a"]'}];}};
 const adapter=new DatabaseContentAdapter({db:db as never,table:'posts',tenantId:'tenant-a'});
 expect(await adapter.get('hello')).toMatchObject({slug:'hello',tags:['a']});expect(calls[0][0]).toBe('posts');expect(calls[0][1]).toMatchObject({tenant_id:'tenant-a',slug:'hello'});
});
