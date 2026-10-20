import {createHash} from 'node:crypto';
export const PACKAGE_NAMES=['@alneas/appkit-core','@alneas/appkit-react'];
export const MAX_CATALOG_BYTES=16*1024*1024;
const fail=()=>{throw new Error('Invalid catalog');};
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const text=(x,max=65536)=>typeof x==='string'&&x.length<=max&&!/\/(Users|Volumes|home)\/|file:\/\//.test(x);
export function relativePath(value){return text(value,512)&&value.length>0&&!value.startsWith('/')&&!/^[a-z]+:/i.test(value)&&!value.includes('\\')&&!value.split('/').includes('..');}
export function canonicalDigest(inputs){
 const hash=createHash('sha256');
 for(const {path,bytes} of [...inputs].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0)){
  if(!relativePath(path))throw new Error('Invalid digest path');
  hash.update(JSON.stringify([path,bytes.length])+'\n');hash.update(bytes);
 }return hash.digest('hex');
}
export function validateCatalog(c){
 if(!object(c)||c.schemaVersion!==1||!PACKAGE_NAMES.includes(c.packageName)||!text(c.packageVersion,512)||!c.packageVersion||!/^[a-f0-9]{64}$/.test(c.inputDigest)||!Array.isArray(c.entries)||c.entries.length>4096||!Array.isArray(c.symbols)||c.symbols.length>100000)fail();
 const imports=new Set(),symbols=new Set();
 const spec=x=>text(x,512)&&(x===c.packageName||x.startsWith(c.packageName+'/'))&&!x.split('/').includes('..');
 for(const e of c.entries){
  if(!object(e)||!spec(e.importPath)||imports.has(e.importPath)||!['module','stylesheet','metadata'].includes(e.kind)||!object(e.targets)||!Object.values(e.targets).every(relativePath))fail();
  imports.add(e.importPath);const r=e.requirements;
  if(!object(r)||!['documented','consult-guide'].includes(r.requirementsStatus)||!relativePath(r.guide)||!object(r.requiredPeers)||!Object.entries(r.requiredPeers).every(([k,v])=>text(k,512)&&text(v,512))||![r.providers,r.styles].every(a=>Array.isArray(a)&&a.length<=256&&a.every(v=>text(v,512))))fail();
 }
 for(const s of c.symbols){
  if(!object(s)||!imports.has(s.importPath)||!text(s.name,512)||!s.name||!['value','type','both'].includes(s.kind)||!Array.isArray(s.signatures)||s.signatures.length>64||!s.signatures.every(x=>text(x))||!text(s.summary)||!relativePath(s.guide)||!Array.isArray(s.tags)||s.tags.length>256||!s.tags.every(t=>object(t)&&text(t.name,512)&&text(t.text)))fail();
  const key=JSON.stringify([s.importPath,s.name]);if(symbols.has(key))fail();symbols.add(key);
 }
 if(Buffer.byteLength(JSON.stringify(c))>MAX_CATALOG_BYTES)fail();return c;
}
