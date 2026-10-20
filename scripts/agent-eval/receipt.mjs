import {readFileSync,readdirSync,writeFileSync,renameSync,mkdirSync} from 'node:fs';import path from 'node:path';
import {canonicalDigest} from '../agent/catalog-contract.mjs';
export function evaluatorDigest(root=path.resolve(import.meta.dirname,'..')){
 const inputs=[];for(const name of ['agent-eval','agent']){function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isDirectory())walk(file);else if(e.isFile())inputs.push({path:path.relative(root,file).replaceAll('\\','/'),bytes:readFileSync(file)});}}walk(path.join(root,name));}
 for(const file of ['run-agent-eval.mjs','check-agent-eval.mjs'])try{inputs.push({path:file,bytes:readFileSync(path.join(root,file))});}catch{}
 return canonicalDigest(inputs);
}
export function writeReceipt(file,receipt){mkdirSync(path.dirname(file),{recursive:true});const tmp=file+'.tmp';writeFileSync(tmp,JSON.stringify(receipt,null,2)+'\n',{mode:0o600});renameSync(tmp,file);}
export const successful=a=>!!a&&a.apiConformant===true&&a.typecheckPassed===true&&a.behavior?.passed===true&&a.unsupportedApiCount===0;
