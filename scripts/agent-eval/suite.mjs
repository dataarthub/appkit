import {readFileSync,readdirSync} from 'node:fs';import path from 'node:path';
import {existsSync} from 'node:fs';import {seedStatements} from './seed-evidence.mjs';
import {TASK_IDS,validateTask} from './contracts.mjs';import {canonicalDigest} from '../agent/catalog-contract.mjs';
export const defaultTaskRoot=path.join(import.meta.dirname,'tasks');
export function loadSuite(taskRoot=defaultTaskRoot){
 if(readdirSync(taskRoot).filter(x=>!x.startsWith('.')).sort().join(',')!==[...TASK_IDS].sort().join(','))throw Error('Expected exactly six tasks');
 return TASK_IDS.map(id=>{const dir=path.join(taskRoot,id),data=validateTask(JSON.parse(readFileSync(path.join(dir,'task.json'),'utf8')));if(data.id!==id)throw Error('Task identity mismatch');data.seedReferences=data.seedReferences.map(reference=>({...reference,statements:data.allowedOutputPaths.flatMap(file=>{const starter=path.join(dir,'starter',file);return existsSync(starter)?seedStatements(readFileSync(starter,'utf8'),file,reference):[];}).sort()}));return {...data,prompt:readFileSync(path.join(dir,'prompt.md'),'utf8'),contract:readFileSync(path.join(dir,'contract.d.ts'),'utf8'),directory:dir};});
}
export function suiteDigest(taskRoot=defaultTaskRoot){
 const files=[];function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())walk(f);else if(e.isFile())files.push({path:path.relative(taskRoot,f).replaceAll('\\','/'),bytes:readFileSync(f)});else throw Error('Unexpected task symlink');}}walk(taskRoot);return canonicalDigest(files);
}
