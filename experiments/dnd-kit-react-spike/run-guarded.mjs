import {runGuarded} from '../../scripts/lib/guarded-process.mjs';
import {writeFileSync} from 'node:fs';
import path from 'node:path';
const fixture=process.argv[2]??path.resolve(import.meta.dirname,'../../.verification/tmp/dnd-kit-migration');
const result=await runGuarded(process.execPath,['driver.mjs'],{cwd:fixture,memoryLimitMiB:2048,timeoutMs:240000});
writeFileSync(path.resolve(fixture,'../../logs/dnd-kit-spike/guard.json'),JSON.stringify(result,null,2)+'\n');
console.log(result);process.exitCode=result.ok?0:1;
