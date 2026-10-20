import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..'),manifest=JSON.parse(readFileSync(path.join(root,'docs.manifest.json')));
const packages=Object.fromEntries(['appkit-core','appkit-react'].map(n=>{const p=JSON.parse(readFileSync(path.join(root,'packages',n,'package.json')));return [p.name,p];}));
const selected=new Set(manifest.documents.map(d=>d.source));assert.equal(selected.size,manifest.documents.length,'Duplicate docs');
const files=['README.md','CONTRIBUTING.md','RELEASING.md',...Object.keys(packages).map(n=>'packages/'+n.split('/')[1]+'/README.md'),...selected];
for(const file of files){
 assert(!file.includes('..')&&!path.isAbsolute(file),'Source must be contained');
 const text=readFileSync(path.join(root,file),'utf8');
 assert(!/\/Volumes\/|\/Users\/|file:\/\//.test(text),file+': local path');
 if(selected.has(file)){
  const front=/^---\n([\s\S]*?)\n---\n/.exec(text)?.[1];
  assert(front&&['title','description','archetype','project','tags'].every(key=>new RegExp('^'+key+': .+','m').test(front))&&/^sidebar:\n  order: \d+/m.test(front),file+': portal metadata');
 }
 if(file.includes('/docs/')&&!file.endsWith('/index.md'))assert(text.includes('## Public import'),file+': document the feature subpath');
 for(const match of text.matchAll(/@alneas\/[\w-]+(?:\/[\w./-]+)?/g)){
  const spec=match[0].replace(/[.]+$/,''),parts=spec.split('/'),name=parts.slice(0,2).join('/'),pkg=packages[name];
  assert(pkg,file+': obsolete package '+spec);const entry=parts.length===2?'.':'./'+parts.slice(2).join('/');assert(Object.hasOwn(pkg.exports,entry),file+': unknown public subpath '+spec);
 }
 for(const match of text.matchAll(/\]\(([^)]+)\)/g)){
  const target=match[1].split('#')[0];if(!target||/^[a-z]+:/.test(target)||target.startsWith('/'))continue;
  assert(existsSync(path.resolve(path.dirname(path.join(root,file)),target)),file+': missing link '+target);
 }
}
console.log(`PASS: ${selected.size} approved Public documents, public subpaths and relative links`);
