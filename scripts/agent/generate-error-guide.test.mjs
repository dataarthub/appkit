import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import path from 'node:path';import {readErrorCatalog,renderErrorGuide} from './generate-error-guide.mjs';
test('literal catalog generates every domain anchor without evaluating code',()=>{
 const source=readFileSync(path.resolve(import.meta.dirname,'../../packages/appkit-core/src/ai/errors/catalog.ts'),'utf8');const records=readErrorCatalog(source),guide=renderErrorGuide(records);
 assert.equal(records.length,21);for(const d of records)assert(guide.includes('## '+d.anchor));assert.match(guide,/## Public import/);
 assert.throws(()=>readErrorCatalog('export const ERROR_CATALOG = execute();'),/literal/);
 assert.throws(()=>readErrorCatalog('export const ERROR_CATALOG = {tool:{X:{recovery: process.env.SECRET}}};'),/literal/);
});
