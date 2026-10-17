import {spawnSync} from 'node:child_process';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const bun=spawnSync('bun',['--version'],{encoding:'utf8'});if(bun.status!==0)throw Error('Bun is required');
const env={...process.env,APPKIT_TASK_RUNTIME:JSON.stringify({node:process.version,bun:bun.stdout.trim(),platform:process.platform,arch:process.arch})};
const result=spawnSync(path.join(root,'node_modules/.bin/turbo'),process.argv.slice(2),{cwd:root,env,stdio:'inherit'});if(result.error)throw result.error;process.exitCode=result.status??1;
