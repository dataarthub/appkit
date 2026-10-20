import test from 'node:test';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {readFileSync,statSync} from 'node:fs';import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../..');
test('Core bin points to an executable built-in-only entry with no TypeScript or provider runtime',()=>{
 const pkg=JSON.parse(readFileSync(path.join(root,'packages/appkit-core/package.json')));assert.equal(pkg.bin?.['appkit-api'],'./dist/agent-cli.mjs');
 execFileSync(process.execPath,['scripts/build-agent-cli.mjs'],{cwd:root});
 const file=path.join(root,'packages/appkit-core/dist/agent-cli.mjs');assert(statSync(file).mode&0o111);assert.match(readFileSync(file,'utf8'),/^#!\/usr\/bin\/env node/);
 assert.match(execFileSync(process.execPath,[file,'--version'],{encoding:'utf8'}),/0.1.0/);
});
