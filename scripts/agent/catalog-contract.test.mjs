import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCatalog, canonicalDigest} from './catalog-contract.mjs';
export function exampleCatalog(name='@alneas/appkit-core',version='0.1.0') {
 const requirements={requirementsStatus:'documented',guide:'docs/ai.md',requiredPeers:{},providers:[],styles:[]};
 return {schemaVersion:1,packageName:name,packageVersion:version,inputDigest:'a'.repeat(64),entries:[{importPath:name+'/ai',kind:'module',targets:{esm:'./dist/ai.js'},requirements}],symbols:[{importPath:name+'/ai',name:'validate',kind:'value',signatures:['(): boolean'],summary:'Validate input',tags:[],guide:'docs/ai.md'}]};
}
test('validates limits, duplicates, links and host paths without repairing data',()=>{
 const good=exampleCatalog();assert.equal(validateCatalog(good),good);
 for(const mutate of [x=>x.schemaVersion=2,x=>x.entries.push(x.entries[0]),x=>x.symbols.push(x.symbols[0]),x=>x.entries[0].requirements.guide='../private',x=>x.symbols[0].signatures=['import("/Users/secret/a").A'],x=>x.symbols[0].summary='x'.repeat(65537),x=>x.symbols[0].importPath='@alneas/other']){
  const value=structuredClone(good);mutate(value);assert.throws(()=>validateCatalog(value),/Invalid catalog/);
 }
});
test('digest has deterministic ordering and unambiguous byte boundaries',()=>{
 const a={path:'a',bytes:Buffer.from('hello')},b={path:'b',bytes:Buffer.from('world')};
 assert.equal(canonicalDigest([a,b]),canonicalDigest([b,a]));
 assert.notEqual(canonicalDigest([a]),canonicalDigest([{...a,bytes:Buffer.from('Hello')}]));
 assert.throws(()=>canonicalDigest([{path:'../private',bytes:Buffer.from('x')}]),/path/);
});
