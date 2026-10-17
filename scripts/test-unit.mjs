import {readFileSync,readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
const root=process.cwd();
function tests(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?tests(path.join(dir,e.name)):/\.(test|spec)\.tsx?$/.test(e.name)?[path.join(dir,e.name)]:[]);}
const files=tests(path.join(root,'src')),isVitest=file=>/from\s*['"]vitest['"]/.test(readFileSync(file,'utf8'));
function run(args){const result=spawnSync('bun',args,{cwd:root,stdio:'inherit'});if(result.error)throw result.error;if(result.status!==0)process.exit(result.status??1);}
const bun=files.filter(file=>!isVitest(file));if(bun.length)run(['test',...bun]);
if(files.some(isVitest))run(['x','--no-install','vitest','run','--config',path.resolve(root,'../../scripts/vitest.config.ts')]);
