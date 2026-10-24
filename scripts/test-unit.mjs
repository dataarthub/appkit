import {readFileSync,readdirSync,mkdtempSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {validateUnitReport} from './unit-report.mjs';
import {createUnitCache} from './verification/unit-cache.mjs';
const root=process.cwd();
function tests(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?tests(path.join(dir,e.name)):/\.(test|spec)\.tsx?$/.test(e.name)?[path.join(dir,e.name)]:[]);}
const files=tests(path.join(root,'src')),isVitest=file=>/from\s*['"]vitest['"]/.test(readFileSync(file,'utf8'));
if(!files.length)throw Error('No unit tests discovered; refusing an empty pass.');
const candidateRoot=path.resolve(root,'../..');
const repositoryRoot=path.basename(path.dirname(root))==='packages'?candidateRoot:root;
function runGroup(runner,files){
 const cache=createUnitCache({repositoryRoot,packageRoot:root,runner,files});
 console.log(`[unit] ${runner}: ${cache.missing.length} selected, ${cache.reused.length} reused (exact inputs)`);
 if(!cache.missing.length)return;
 for(const reason of new Set(cache.missing.map(row=>row.reason)))console.log(`[unit] cache miss: ${reason}`);
 const missing=new Set(cache.missing.map(row=>path.resolve(root,row.file)));
 const selected=files.filter(file=>missing.has(file));
 const temporary=mkdtempSync(path.join(tmpdir(),'appkit-unit-report-'));
 let fresh;
 cache.begin();
 try{
  const report=path.join(temporary,runner+'.xml');
  const args=runner==='bun'?['test',...selected,'--reporter=junit','--reporter-outfile='+report]:['x','--no-install','vitest','run','--config',path.resolve(root,'../../scripts/vitest.config.ts'),'--reporter=default','--reporter=junit','--outputFile='+report,...selected];
  const result=spawnSync('bun',args,{cwd:root,stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0)throw Error(`Unit runner failed (${result.status??result.signal??'unknown'})`);
  fresh=readFileSync(report,'utf8');validateUnitReport(fresh,selected,root);
 }finally{rmSync(temporary,{recursive:true,force:true});}
 // A receipt is sealed only after normal exit, complete report and successful cleanup.
 cache.record(fresh);
 console.log(`[unit] ${runner}: ${selected.length} executed with complete reports and cleanup`);
}
const bun=files.filter(file=>!isVitest(file));
if(bun.length)runGroup('bun',bun);
const vitest=files.filter(isVitest);
if(vitest.length)runGroup('vitest',vitest);
