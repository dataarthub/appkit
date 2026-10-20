import test from 'node:test';import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,symlinkSync} from 'node:fs';import path from 'node:path';
import {loadCatalogs} from './load-catalogs.mjs';import {catalog,temp,install} from './test-fixtures.mjs';
test('legacy installed Core never uses a newer bundle',()=>temp(root=>{
 const bundle=install(path.join(root,'bundle'));install(root,'@alneas/appkit-core',{legacy:true});
 const value=loadCatalogs({root,scope:'all',bundledCoreDir:bundle});assert.equal(value.loaded.length,0);assert.equal(value.unavailable[0].code,'catalog-unavailable');
}));
test('Core-only search uses installed version, reports missing React and never executes JS',()=>temp(root=>{
 install(root);const result=loadCatalogs({root,scope:'all',bundledCoreDir:'/not-used'});
 assert.equal(result.loaded[0].source,'installed');assert.equal(result.unavailable[0].packageName,'@alneas/appkit-react');
 assert.equal(loadCatalogs({root,scope:'react',bundledCoreDir:'/not-used'}).loaded.length,0);
}));
test('missing Core can use its bundle but corrupt/version-mismatched Core cannot',()=>temp(root=>{
 const bundle=install(path.join(root,'bundle'));assert.equal(loadCatalogs({root,scope:'core',bundledCoreDir:bundle}).loaded[0].source,'bundled');
 install(root,'@alneas/appkit-core',{value:catalog('@alneas/appkit-core','99.0.0')});assert.equal(loadCatalogs({root,scope:'core',bundledCoreDir:bundle}).unavailable[0].code,'invalid-catalog');
}));
test('rejects package escape, symlink escape and oversized catalogs',()=>temp(root=>{
 const dir=install(root);writeFileSync(path.join(dir,'consumer-ai/api-index.json'),' '.repeat(16*1024*1024+1));
 assert.equal(loadCatalogs({root,scope:'core',bundledCoreDir:dir}).unavailable[0].code,'invalid-catalog');
 const escape=install(path.join(root,'escape'),'@alneas/appkit-core',{catalogPath:'../../outside.json'});
 assert.equal(loadCatalogs({root:path.join(root,'escape'),scope:'core',bundledCoreDir:escape}).unavailable[0].code,'invalid-catalog');
}));
