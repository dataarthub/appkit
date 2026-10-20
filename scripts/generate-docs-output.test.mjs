import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, cpSync, copyFileSync, readFileSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { checkGenerated } from './check-generated.mjs';
const source=resolve(import.meta.dirname,'..');
function fixture(run){
 const root=mkdtempSync(join(tmpdir(),'appkit-generation-')),out=mkdtempSync(join(tmpdir(),'appkit-fresh-'));
 try{
  mkdirSync(join(root,'scripts'));
  copyFileSync(join(source,'scripts/generate-docs.mjs'),join(root,'scripts/generate-docs.mjs'));
  cpSync(join(source,'scripts/agent'),join(root,'scripts/agent'),{recursive:true});
  copyFileSync(join(source,'agent-policy.json'),join(root,'agent-policy.json'));
  symlinkSync(join(source,'node_modules'),join(root,'node_modules'),'dir');
  for(const f of ['README.md','CONTRIBUTING.md','RELEASING.md'])copyFileSync(join(source,f),join(root,f));
  for(const name of ['appkit-core','appkit-react']){
   const dir=join(root,'packages',name);mkdirSync(dir,{recursive:true});
   for(const f of ['README.md','package.json'])copyFileSync(join(source,'packages',name,f),join(dir,f));
   for(const f of ['docs','consumer-ai'])cpSync(join(source,'packages',name,f),join(dir,f),{recursive:true});
   if(name==='appkit-core'){mkdirSync(join(dir,'src/ai/errors'),{recursive:true});copyFileSync(join(source,'packages/appkit-core/src/ai/errors/catalog.ts'),join(dir,'src/ai/errors/catalog.ts'));}
   const pkg=JSON.parse(readFileSync(join(dir,'package.json')));
   function emit(v){if(typeof v==='string'){if(!v.startsWith('./dist/'))return;mkdirSync(resolve(dir,v,'..'),{recursive:true});writeFileSync(resolve(dir,v),/\.d\.(?:ts|cts)$/.test(v)?'export declare function fixtureFunction(): void;':'fixture');}else Object.values(v).forEach(emit);}
   Object.values(pkg.exports).forEach(emit);
  }
  const generate=(args=[])=>{const p=spawnSync(process.execPath,['scripts/generate-docs.mjs',...args],{cwd:root,encoding:'utf8'});assert.equal(p.status,0,p.stderr);};
  generate();
  run(root,out,generate,JSON.parse(readFileSync(join(source,'generated-policy.json'),'utf8')));
 }finally{rmSync(root,{recursive:true,force:true});rmSync(out,{recursive:true,force:true});}
}
test('missing generated pages are still included in fresh manifests and AI indexes',()=>fixture((root,out,generate)=>{
 rmSync(join(root,'packages/appkit-core/docs/index.md'));
 generate(['--output-dir',out]);
 const manifest=JSON.parse(readFileSync(join(out,'docs.manifest.json'),'utf8'));
 assert(manifest.documents.some(doc=>doc.source==='packages/appkit-core/docs/index.md'));
 assert.match(readFileSync(join(out,'packages/appkit-core/llms-full.txt'),'utf8'),/<!-- docs\/index.md -->/);
}));
test('README changes are detected and fresh indexes consume new landing content',()=>fixture((root,out,generate,config)=>{
 const file=join(root,'packages/appkit-core/README.md');writeFileSync(file,readFileSync(file,'utf8')+'\nUnique changed source sentence.\n');
 const differences=checkGenerated(root,config).flatMap(r=>r.differences);
 assert(differences.some(d=>d.path==='packages/appkit-core/docs/index.md'&&d.kind==='changed'));
 assert(differences.some(d=>d.path==='packages/appkit-core/llms-full.txt'&&d.kind==='changed'));
 generate(['--output-dir',out]);
 const full=readFileSync(join(out,'packages/appkit-core/llms-full.txt'),'utf8');
 assert.equal(full.split('Unique changed source sentence.').length-1,2,'README and freshly rendered landing both contain the new source');
}));
test('obsolete consumer AI files are detected, not silently left in a package',()=>fixture((root,out,generate,config)=>{
 writeFileSync(join(root,'packages/appkit-core/dist/consumer-ai/obsolete.md'),'outdated');
 assert(checkGenerated(root,config).flatMap(r=>r.differences).some(d=>d.path.endsWith('/obsolete.md')&&d.kind==='extra'));
}));

test('portal landing links target approved package pages and preserve README anchors',()=>fixture((root,out,generate)=>{
 const readme=join(root,'README.md');
 writeFileSync(readme,readFileSync(readme,'utf8')+'\n[Core highlights](packages/appkit-core/README.md#key-highlights)\n');
 generate(['--output-dir',out]);
 const landing=readFileSync(join(out,'docs/index.md'),'utf8');
 assert.match(landing,/\]\(\.\.\/packages\/appkit-core\/docs\/index\.md#quickstart\)/);
 assert.match(landing,/\]\(\.\.\/packages\/appkit-core\/docs\/index\.md#key-highlights\)/);
 const manifest=JSON.parse(readFileSync(join(out,'docs.manifest.json'),'utf8'));
 assert(manifest.documents.some(doc=>doc.source==='packages/appkit-core/docs/index.md'));
}));
