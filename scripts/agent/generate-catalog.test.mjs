import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,renameSync,symlinkSync,rmSync} from 'node:fs';
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
function coreDependency(dir,version='0.2.0'){
 const manifest=path.join(dir,'package.json'),pkg=JSON.parse(readFileSync(manifest,'utf8'));
 pkg.name='@alneas/appkit-react';pkg.type='module';pkg.dependencies={'@alneas/appkit-core':'0.2.0'};
 writeFileSync(manifest,JSON.stringify(pkg));
 const dependency=path.join(dir,'node_modules/@alneas/appkit-core');mkdirSync(dependency,{recursive:true});
 writeFileSync(path.join(dependency,'package.json'),JSON.stringify({name:'@alneas/appkit-core',version,type:'module',exports:{'.':{import:{types:'./index.d.ts',default:'./index.js'},require:{types:'./index.d.cts',default:'./index.cjs'}}}}));
 for(const ext of ['d.ts','d.cts']){
  writeFileSync(path.join(dir,'dist/index.'+ext),'export type { External } from "@alneas/appkit-core";');
  writeFileSync(path.join(dependency,'index.'+ext),'/** Core version one. */\nexport interface External {value: string;}');
 }
 return dependency;
}
function reactPolicy(policy){return {schemaVersion:1,packages:{'@alneas/appkit-react':policy.packages['@alneas/appkit-core']}};}
test('rejects stale or missing installed Core instead of generating a plausible catalog',()=>fixture((dir,policy)=>{
 const dependency=coreDependency(dir,'0.1.0');
 assert.throws(()=>generateCatalog({packageDir:dir,policy:reactPolicy(policy)}),/Core.*0\.1\.0.*0\.2\.0/);
 rmSync(dependency,{recursive:true});
 assert.throws(()=>generateCatalog({packageDir:dir,policy:reactPolicy(policy)}),/Core.*0\.2\.0/);
}));
test('dependency declaration comments affect catalog identity without leaking install paths',()=>fixture((dir,policy)=>{
 const dependency=coreDependency(dir),options={packageDir:dir,policy:reactPolicy(policy)};
 const before=generateCatalog(options);
 for(const ext of ['d.ts','d.cts'])writeFileSync(path.join(dependency,'index.'+ext),'/** Core version two. */\nexport interface External {value: string;}');
 const after=generateCatalog(options);
 assert.notEqual(after.inputDigest,before.inputDigest);
 assert.equal(after.symbols[0].summary,'Core version two.');
 assert.equal(JSON.stringify(after).includes(dir),false);
 assert.deepEqual(generateCatalog(options),after);
}));
test('checks the CommonJS Core resolution independently of a valid ESM target',()=>fixture((dir,policy)=>{
 const dependency=coreDependency(dir);
 rmSync(path.join(dependency,'index.d.cts'));
 assert.throws(()=>generateCatalog({packageDir:dir,policy:reactPolicy(policy)}),/Core.*0\.2\.0/);
}));
test('registry and workspace installations give the same declaration digest',()=>fixture((dir,policy)=>{
 const dependency=coreDependency(dir),options={packageDir:dir,policy:reactPolicy(policy)};
 const registry=generateCatalog(options),workspace=mkdtempSync(path.join(tmpdir(),'appkit-core-workspace-'));
 try{
  const target=path.join(workspace,'core');renameSync(dependency,target);symlinkSync(target,dependency,'dir');
  assert.deepEqual(generateCatalog(options),registry);
 }finally{rmSync(workspace,{recursive:true,force:true});}
}));

test('caret Core catalogs bind the actual compatible resolved version and reject incompatible versions',()=>fixture((dir,policy)=>{
 coreDependency(dir,'0.2.1');
 const file=path.join(dir,'package.json'),pkg=JSON.parse(readFileSync(file,'utf8'));pkg.dependencies['@alneas/appkit-core']='^0.2.0';writeFileSync(file,JSON.stringify(pkg));
 const first=generateCatalog({packageDir:dir,policy:reactPolicy(policy)});
 const dependency=path.join(dir,'node_modules/@alneas/appkit-core/package.json'),installed=JSON.parse(readFileSync(dependency,'utf8'));installed.version='0.2.2';writeFileSync(dependency,JSON.stringify(installed));
 const second=generateCatalog({packageDir:dir,policy:reactPolicy(policy)});assert.notEqual(first.inputDigest,second.inputDigest);
 installed.version='0.3.0';writeFileSync(dependency,JSON.stringify(installed));assert.throws(()=>generateCatalog({packageDir:dir,policy:reactPolicy(policy)}),/Core/);
}));
