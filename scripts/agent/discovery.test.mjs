import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'../..');
test('direct instructions and metadata retain compatibility exports and explicit packed files',()=>{
 for(const name of ['appkit-core','appkit-react']){const dir=path.join(root,'packages',name),pkg=JSON.parse(readFileSync(path.join(dir,'package.json')));
  assert.equal(pkg.appkit?.agent?.instructions,'./consumer-ai/SKILL.md');
  assert.equal(pkg.exports['./ai-instructions'],'./dist/consumer-ai/SKILL.md');
  for(const file of ['consumer-ai/SKILL.md','consumer-ai/package-context.json','consumer-ai/api-index.json'])assert(pkg.files.includes(file));
 }
});
test('temporary generation routes all fresh discovery files without touching normal output',()=>{
 const out=mkdtempSync(path.join(tmpdir(),'appkit-discovery-'));const before=readFileSync(path.join(root,'docs/index.md'));
 try{execFileSync(process.execPath,['scripts/generate-docs.mjs','--output-dir',out],{cwd:root,stdio:'pipe'});
  assert.match(readFileSync(path.join(out,'llms.txt'),'utf8'),/Core[\s\S]*React/);
  for(const name of ['appkit-core','appkit-react'])for(const file of ['SKILL.md','package-context.json','api-index.json'])assert.deepEqual(readFileSync(path.join(file==='SKILL.md'?root:out,'packages',name,'consumer-ai',file)),readFileSync(path.join(out,'packages',name,'dist/consumer-ai',file)));
  assert.deepEqual(readFileSync(path.join(root,'docs/index.md')),before);
 }finally{rmSync(out,{recursive:true,force:true});}
});
test('package-only generation leaves repository and sibling outputs absent',()=>{
 const out=mkdtempSync(path.join(tmpdir(),'appkit-package-docs-'));try{
  execFileSync(process.execPath,['scripts/generate-docs.mjs','--package','appkit-core','--output-dir',out],{cwd:root,stdio:'pipe'});
  assert(!existsSync(path.join(out,'llms.txt')));assert(!existsSync(path.join(out,'packages/appkit-react')));
 }finally{rmSync(out,{recursive:true,force:true});}
});
