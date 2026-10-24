import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import ts from 'typescript';
const root=path.resolve(import.meta.dirname,'..');
const packages=['appkit-core','appkit-react'];
test('selected package changelogs match their version and are linked from npm README',()=>{
 for(const name of packages){
  const dir=path.join(root,'packages',name),pkg=JSON.parse(readFileSync(path.join(dir,'package.json')));
  if(!pkg.files?.includes('CHANGELOG.md'))continue;
  const notes=readFileSync(path.join(dir,'CHANGELOG.md'),'utf8'),heading=`## [${pkg.version}]`;
  assert(notes.split('\n').some(line=>line===heading||line.startsWith(heading+' - ')),name+': missing release entry');
  assert(readFileSync(path.join(dir,'README.md'),'utf8').includes(`https://github.com/dataarthub/appkit/blob/main/packages/${name}/CHANGELOG.md`),name+': missing npm-compatible history link');
 }
});
function sources(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?sources(path.join(dir,e.name)):/\.(ts|tsx)$/.test(e.name)?[path.join(dir,e.name)]:[]);}
test('migrated source imports use only the two published package names',()=>{
 const bad=[];
 for(const pkg of packages)for(const file of sources(path.join(root,'packages',pkg,'src'))){
  const source=ts.createSourceFile(file,readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
  function visit(node){
   if(ts.isStringLiteral(node)&&node.text.startsWith('@alneas/')&&!/^@alneas\/appkit-(core|react)(\/|$)/.test(node.text))bad.push(path.relative(root,file)+': '+node.text);
   ts.forEachChild(node,visit);
  }visit(source);
 }
 assert.deepEqual(bad,[]);
});
test('production imports have declared runtime dependencies or explicit peers',()=>{
 const missing=[];
 for(const pkg of packages){const dir=path.join(root,'packages',pkg),m=JSON.parse(readFileSync(path.join(dir,'package.json'))),declared=new Set([m.name,...Object.keys(m.dependencies??{}),...Object.keys(m.peerDependencies??{})]);
  for(const file of sources(path.join(dir,'src')).filter(f=>! /\.(test|spec)\.tsx?$/.test(f))){const ast=ts.createSourceFile(file,readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
   function visit(node){
    const spec=(ts.isImportDeclaration(node)||ts.isExportDeclaration(node))?node.moduleSpecifier:ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword?node.arguments[0]:null;
    if(spec&&ts.isStringLiteral(spec)&&!spec.text.startsWith('.')&&!spec.text.startsWith('node:')&&!spec.text.startsWith('bun:')){const name=spec.text.startsWith('@')?spec.text.split('/').slice(0,2).join('/'):spec.text.split('/')[0];if(!declared.has(name))missing.push(path.relative(root,file)+': '+name);}
    ts.forEachChild(node,visit);
   }visit(ast);
  }
 }
 assert.deepEqual(missing,[]);
});
test('emitted declarations reference only declared packages',()=>{
 const missing=[];
 function declarations(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?declarations(path.join(dir,e.name)):/\.d\.(ts|cts)$/.test(e.name)?[path.join(dir,e.name)]:[]);}
 for(const pkg of packages){const dir=path.join(root,'packages',pkg),m=JSON.parse(readFileSync(path.join(dir,'package.json'))),declared=new Set([m.name,...Object.keys(m.dependencies??{}),...Object.keys(m.peerDependencies??{})]);
  for(const file of declarations(path.join(dir,'dist'))){const ast=ts.createSourceFile(file,readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);function visit(node){
   const spec=(ts.isImportDeclaration(node)||ts.isExportDeclaration(node))?node.moduleSpecifier:ts.isImportTypeNode(node)&&ts.isLiteralTypeNode(node.argument)?node.argument.literal:null;
   if(spec&&ts.isStringLiteral(spec)&&!spec.text.startsWith('.')&&!spec.text.startsWith('node:')){const name=spec.text.startsWith('@')?spec.text.split('/').slice(0,2).join('/'):spec.text.split('/')[0];if(!declared.has(name))missing.push(path.relative(root,file)+': '+name);}
   ts.forEachChild(node,visit);
  }visit(ast);}
 }assert.deepEqual(missing,[]);
});
test('every package export and npm documentation file exists',()=>{
 for(const pkg of packages){const dir=path.join(root,'packages',pkg),m=JSON.parse(readFileSync(path.join(dir,'package.json')));
  function target(v){if(typeof v==='string')assert(existsSync(path.join(dir,v)),pkg+': '+v);else Object.values(v).forEach(target);}
  Object.values(m.exports).forEach(target);
  for(const file of ['README.md','LICENSE','llms.txt','llms-full.txt',...(pkg==='appkit-react'?['THIRD_PARTY_NOTICES.md']:[])])assert(existsSync(path.join(dir,file)),pkg+': '+file);
 }
});
test('native ESM and CommonJS load every public JavaScript entry',()=>{
 for(const pkg of packages){const dir=path.join(root,'packages',pkg),m=JSON.parse(readFileSync(path.join(dir,'package.json')));
  for(const [entry,v] of Object.entries(m.exports)){if(typeof v!=='object')continue;
   execFileSync(process.execPath,['--input-type=module','-e','await import('+JSON.stringify(path.join(dir,v.import.default))+')'],{stdio:'pipe'});
   execFileSync(process.execPath,['-e','require('+JSON.stringify(path.join(dir,v.require.default))+')'],{stdio:'pipe'});
  }
 }
});
test('documented React form and table APIs are exported from the root',()=>{
 const dir=path.join(root,'packages/appkit-react');
 execFileSync(process.execPath,['--input-type=module','-e',`import assert from 'node:assert/strict';const m=await import(${JSON.stringify(path.join(dir,'dist/index.js'))});for(const key of ['FormView','DataTable','ThemeProvider','DataAccessProvider'])assert.notEqual(m[key],undefined,key);`],{stdio:'pipe'});
});

test('AI recovery APIs keep native Error behavior in both runtime formats',()=>{
 const dir=path.join(root,'packages/appkit-core/dist/ai/index');
 execFileSync(process.execPath,['--input-type=module','-e',`import assert from 'node:assert/strict'; const m=await import(${JSON.stringify(dir+'.js')}); const e=new m.AIChatError('AI_INCOMPLETE_STREAM','original');assert(e instanceof Error);assert.equal(e.message,'original');assert(m.getAIErrorInfo('tool','INVALID_INPUT').docsUrl);`]);
 execFileSync(process.execPath,['-e',`const assert=require('node:assert/strict'),m=require(${JSON.stringify(dir+'.cjs')});assert(new m.AIChatError('AI_INVALID_STREAM','original') instanceof Error);`]);
});

test('Bun workspace version metadata matches each release candidate manifest',()=>{
 const parsed=ts.parseConfigFileTextToJson('bun.lock',readFileSync(path.join(root,'bun.lock'),'utf8'));
 assert.equal(parsed.error,undefined);
 for(const name of packages){
  const pkg=JSON.parse(readFileSync(path.join(root,'packages',name,'package.json'),'utf8'));
  assert.equal(parsed.config.workspaces['packages/'+name].version,pkg.version,name+': stale workspace release version');
 }
});
