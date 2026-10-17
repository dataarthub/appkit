import { test, expect } from 'bun:test';
import { SchemaAwareSupabaseAdapter } from './data-access/schema-aware-adapter';
import { loadExcelize } from './excel/excelize';
import { introspectPostgresTable } from './schema/introspection';
import { execFileSync } from 'node:child_process';

test('schema-aware adapter converts database columns on find',async()=>{
 const selected:string[]=[];
 const client={from:(table:string)=>{selected.push(table);return {select:()=>Promise.resolve({data:[{first_name:'Ada'}],error:null})};}};
 const adapter=new SchemaAwareSupabaseAdapter(client as never,{schemas:{people:{type:'object',properties:{first_name:{type:'string'}}}}});
 expect(await adapter.find('people')).toEqual([{firstName:'Ada'}]);expect(selected).toEqual(['people']);
});
test('Excelize refuses missing WASM paths before initialization',async()=>{
 await expect(loadExcelize('')).rejects.toThrow('wasmPath');await expect(loadExcelize(' ')).rejects.toThrow('wasmPath');
});
test('Postgres introspection binds identifiers and always closes the connection',()=>{
 // Module mocking lives in a child so it cannot contaminate real PostgreSQL suites.
 expect(typeof introspectPostgresTable).toBe('function');
 const source=new URL('./schema/introspection.ts',import.meta.url).href;
 execFileSync(process.execPath,['-e',`import {mock} from 'bun:test';import assert from 'node:assert/strict';
 let closed=0;const bindings=[];
 class Client {async connect(){} async end(){closed++;} async query(sql,args){bindings.push(args);return {rows:[]};}}
 mock.module('pg',()=>({default:{Client},Client}));
 const {introspectPostgresTable}=await import(${JSON.stringify(source)});
 assert.equal(await introspectPostgresTable('unused','people;DROP TABLE secret','tenant'),null);
 assert.deepEqual(bindings,[['people;DROP TABLE secret','tenant']]);assert.equal(closed,1);`],{stdio:'pipe'});
});
