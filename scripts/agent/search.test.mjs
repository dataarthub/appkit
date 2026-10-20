import test from 'node:test';import assert from 'node:assert/strict';import {searchCatalogs,showCatalogEntry} from './search.mjs';import {catalog} from './test-fixtures.mjs';
test('literal matching ranks exact symbols first and returns stable empty/show results',()=>{
 const c=catalog();c.symbols.push({...c.symbols[0],name:'other',summary:'validate'});const loaded=[{catalog:c,source:'installed'}];
 assert.equal(searchCatalogs(loaded,'validate',20)[0].symbol,'validate');assert.deepEqual(searchCatalogs(loaded,'[.*',20),[]);
 assert.equal(showCatalogEntry(loaded,c.packageName+'/ai','validate').length,1);
 assert.deepEqual(searchCatalogs(loaded,'missing',20),[]);
});
test('query and limit boundaries are enforced, Unicode/control data stays plain',()=>{
 const c=catalog();c.symbols[0].summary='日本語\u001b[31m';const loaded=[{catalog:c,source:'installed'}];assert.equal(searchCatalogs(loaded,'日本語',1).length,1);
 for(const [q,l]of [['',20],['x'.repeat(501),20],['x',0],['x',101]])assert.throws(()=>searchCatalogs(loaded,q,l),/query|limit/);
 assert.doesNotThrow(()=>searchCatalogs(loaded,'x'.repeat(500),100));
});
