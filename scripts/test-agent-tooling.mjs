import {readdirSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const files=['scripts/agent','scripts/agent-eval'].filter(existsSync).flatMap(dir=>readdirSync(dir).filter(n=>n.endsWith('.test.mjs')).sort().map(n=>dir+'/'+n));
const result=spawnSync(process.execPath,['--test','--test-concurrency=2',...files],{stdio:'inherit'});
if(result.error)throw result.error;process.exitCode=result.status??1;
