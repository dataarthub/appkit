import assert from 'node:assert/strict';
import {resolve} from 'node:path';
const decode=value=>value.replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
function attributes(tag){return Object.fromEntries([...tag.matchAll(/\b([\w]+)="([^"]*)"/g)].map(([,name,value])=>[name,decode(value)]));}
/** Validate only fresh JUnit emitted by pinned Bun/Vitest, not arbitrary external XML. */
export function validateUnitReport(text,files,root){
 const header=text.match(/<testsuites\b[^>]*>/)?.[0];assert(header,'Missing JUnit root');
 const summary=attributes(header),cases=[...text.matchAll(/<testcase\b[^>]*>/g)].map(([tag])=>attributes(tag));
 assert(/^\d+$/.test(summary.tests)&&Number(summary.tests)>0,'Empty JUnit suite');
 assert.equal(Number(summary.tests),cases.length,'JUnit test count mismatch');
 assert(!/<(?:skipped|failure|error)\b/.test(text),'JUnit contains skipped or failed tests');
 for(const [tag]of text.matchAll(/<testsuites?\b[^>]*>/g)){
  const attrs=attributes(tag);for(const field of ['failures','errors','skipped'])if(attrs[field]!==undefined)assert.equal(attrs[field],'0','JUnit has '+field);
 }
 const selected=new Set(files.map(file=>resolve(root,file))),observed=new Set();
 for(const row of cases){const file=row.file??row.classname;assert(file,'Testcase has no file identity');const absolute=resolve(root,file);assert(selected.has(absolute),'Unexpected testcase file: '+file);observed.add(absolute);}
 assert.equal(observed.size,selected.size,'Selected unit files missing executed tests');
}
