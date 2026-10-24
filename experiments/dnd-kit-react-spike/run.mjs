import {cpSync,existsSync,mkdirSync,readdirSync,readFileSync} from 'node:fs';
import {spawnSync,execFileSync} from 'node:child_process';
import path from 'node:path';
import {createHash} from 'node:crypto';
const source=import.meta.dirname,root=path.resolve(source,'../..');
const fixture=path.join(root,'.verification/tmp/dnd-kit-migration');
const files=readdirSync(source).filter(name=>name!=='run.mjs'&&name!=='README.md');
mkdirSync(fixture,{recursive:true});mkdirSync(path.join(root,'.verification/logs/dnd-kit-spike'),{recursive:true});
for(const record of JSON.parse(readFileSync(path.join(source,'baseline-sources.json'))).files){
 const historical=execFileSync('git',['show',JSON.parse(readFileSync(path.join(source,'baseline-sources.json'))).commit+':'+record.source],{cwd:root});
 const hash=createHash('sha256').update(historical).digest('hex');
 if(createHash('sha256').update(readFileSync(path.join(source,record.snapshot))).digest('hex')!==record.sha256)throw Error('Baseline snapshot modified: '+record.snapshot);
 if(hash!==record.sha256)throw Error('Baseline source changed; review spike fidelity: '+record.source);
}
for(const name of files)cpSync(path.join(source,name),path.join(fixture,name));
const run=(cmd,args)=>{const result=spawnSync(cmd,args,{cwd:fixture,stdio:'inherit',timeout:300000});if(result.error)throw result.error;if(result.status!==0)throw Error(`${cmd} failed: ${result.status}`);};
run('npm',['ci','--ignore-scripts','--no-audit','--no-fund']);
run(process.execPath,['node_modules/typescript/bin/tsc','--project','tsconfig.json']);
run(process.execPath,['node_modules/typescript/bin/tsc','--project','tsconfig.candidate.json']);
run(process.execPath,['node_modules/vite/bin/vite.js','build']);
run(process.execPath,[path.join(source,'run-guarded.mjs'),fixture]);
