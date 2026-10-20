import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {generateCatalog} from './generate-catalog.mjs';
function fixture(run){const dir=mkdtempSync(path.join(tmpdir(),'appkit-catalog-'));try{
 mkdirSync(path.join(dir,'dist'));mkdirSync(path.join(dir,'docs'));mkdirSync(path.join(dir,'consumer-ai'));
 const targets={import:{types:'./dist/index.d.ts',default:'./dist/index.js'},require:{types:'./dist/index.d.cts',default:'./dist/index.cjs'}};
 writeFileSync(path.join(dir,'package.json'),JSON.stringify({name:'@alneas/appkit-core',version:'0.1.0',exports:{'.':targets,'./alias':targets},peerDependencies:{sdk:'1'}}));
 const declarations='export { original as renamed } from "./leaf.js"; export type { Shape } from "./leaf.js";';
 for(const [ext,js] of [['d.ts','js'],['d.cts','cjs']]){
  writeFileSync(path.join(dir,'dist/index.'+ext),declarations.replaceAll('.js','.actor').replaceAll('.actor','.'+js));
  writeFileSync(path.join(dir,'dist/leaf.'+ext),'/** Useful function */\nexport declare function original(value: string): string;\nexport declare function original(value: number): number;\nexport interface Shape {value: import("sdk").External;}');
 }
 writeFileSync(path.join(dir,'dist/index.js'),'');writeFileSync(path.join(dir,'dist/index.cjs'),'');
 writeFileSync(path.join(dir,'docs/exports.md'),'# Exports');writeFileSync(path.join(dir,'docs/index.md'),'# Core');writeFileSync(path.join(dir,'consumer-ai/SKILL.md'),'Read context.');
 run(dir,{schemaVersion:1,packages:{'@alneas/appkit-core':{description:'Core',rules:[{import:'.',guide:'docs/index.md',requiredPeers:{},providers:[],styles:[]}]}}});
}finally{rmSync(dir,{recursive:true,force:true});}}
test('resolves aliases, type exports, overloads, comments and missing external type names',()=>fixture((dir,policy)=>{
 const c=generateCatalog({packageDir:dir,policy});
 assert.deepEqual(c.symbols.filter(s=>s.name==='renamed').map(s=>s.importPath),['@alneas/appkit-core','@alneas/appkit-core/alias']);
 assert.equal(c.symbols.find(s=>s.name==='renamed').signatures.length,2);
 assert.match(c.symbols.find(s=>s.name==='renamed').summary,/Useful/);
 assert.equal(c.symbols.find(s=>s.name==='Shape').kind,'type');
 assert.equal(JSON.stringify(c).includes(dir),false);
 assert.deepEqual(generateCatalog({packageDir:dir,policy}),c);
}));
test('fails missing public declarations and incompatible conditions',()=>fixture((dir,policy)=>{
 rmSync(path.join(dir,'dist/index.d.ts'));assert.throws(()=>generateCatalog({packageDir:dir,policy}),/declaration/);
 writeFileSync(path.join(dir,'dist/index.d.ts'),'export declare const different: number;');
 assert.throws(()=>generateCatalog({packageDir:dir,policy}),/conditions/);
}));
test('rejects unknown policy peers and missing guide',()=>fixture((dir,policy)=>{
 policy.packages['@alneas/appkit-core'].rules[0].requiredPeers={missing:'1'};
 assert.throws(()=>generateCatalog({packageDir:dir,policy}),/peer/);
}));
