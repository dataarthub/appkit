import {readFileSync,readdirSync,mkdtempSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {validateUnitReport} from './unit-report.mjs';
const root=process.cwd();
function tests(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?tests(path.join(dir,e.name)):/\.(test|spec)\.tsx?$/.test(e.name)?[path.join(dir,e.name)]:[]);}
const files=tests(path.join(root,'src')),isVitest=file=>/from\s*['"]vitest['"]/.test(readFileSync(file,'utf8'));
if(!files.length)throw Error('No unit tests discovered; refusing an empty pass.');
const temporary=mkdtempSync(path.join(tmpdir(),'appkit-unit-report-'));
function run(args,report,selected){
 const result=spawnSync('bun',args,{cwd:root,stdio:'inherit'});
 if(result.error)throw result.error;
 if(result.status!==0)throw Error(`Unit runner failed (${result.status??result.signal??'unknown'})`);
 validateUnitReport(readFileSync(report,'utf8'),selected,root);
}
try{
 const bun=files.filter(file=>!isVitest(file));
 if(bun.length){const report=path.join(temporary,'bun.xml');run(['test',...bun,'--reporter=junit','--reporter-outfile='+report],report,bun);}
 if(files.some(isVitest)){const report=path.join(temporary,'vitest.xml');run(['x','--no-install','vitest','run','--config',path.resolve(root,'../../scripts/vitest.config.ts'),'--reporter=junit','--outputFile='+report],report,files.filter(isVitest));}
}finally{rmSync(temporary,{recursive:true,force:true});}
