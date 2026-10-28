import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readdirSync,chmodSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {validateUnitReport} from '../unit-report.mjs';
const runner=resolve('scripts/test-unit.mjs');
function fixture(source,work){const root=mkdtempSync(join(tmpdir(),'appkit-unit-runner-'));try{mkdirSync(join(root,'src'));if(source!==null)writeFileSync(join(root,'src/fixture.test.ts'),source);return work(root);}finally{rmSync(root,{recursive:true,force:true});}}
function run(root,env=process.env){return spawnSync(process.execPath,[runner],{cwd:root,encoding:'utf8',env});}
test('unit runner rejects no discovered tests and empty test files',()=>{
 for(const source of [null,'export const value=1;'])fixture(source,root=>assert.notEqual(run(root).status,0));
});
test('unit runner rejects skipped tests despite successful process status',()=>fixture("import {test} from 'bun:test'; test.skip('skipped',()=>{});",root=>assert.notEqual(run(root).status,0)));
test('unit runner propagates failures and accepts a nonempty passing suite',()=>{
 fixture("import {test,expect} from 'bun:test'; test('failed',()=>expect(1).toBe(2));",root=>assert.notEqual(run(root).status,0));
 fixture("import {test,expect} from 'bun:test'; test('passed',()=>expect(1).toBe(1));",root=>{const local={...process.env,GITHUB_ACTIONS:'false',SOURCE_CHECKS_RESTORE_TRUSTED:'0'};const result=run(root,local);assert.equal(result.status,0,result.stderr);assert.deepEqual(readdirSync(root).sort(),['.verification','src']);assert.deepEqual(readdirSync(join(root,'.verification')),['records']);assert.equal(readdirSync(join(root,'.verification/records/unit-checks')).length,1);const reused=run(root,local);assert.equal(reused.status,0,reused.stderr);assert.match(reused.stdout,/0 selected, 1 reused/);assert.doesNotMatch(reused.stderr,/1 pass/);});
});
test('CI subprocesses reject untrusted stored passes and reuse only after explicit authenticated restoration',()=>fixture("import {test,expect} from 'bun:test'; test('passed',()=>expect(1).toBe(1));",root=>{
 const ci={...process.env,GITHUB_ACTIONS:'true',SOURCE_CHECKS_RESTORE_TRUSTED:'0',ImageOS:'fixture-linux',ImageVersion:'fixture-image'};
 for(let attempt=0;attempt<2;attempt++){const result=run(root,ci);assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/1 selected, 0 reused/);assert.match(result.stdout,/1 executed with complete reports and cleanup/);}
 const restored=run(root,{...ci,SOURCE_CHECKS_RESTORE_TRUSTED:'1'});assert.equal(restored.status,0,restored.stderr);assert.match(restored.stdout,/0 selected, 1 reused/);assert.doesNotMatch(restored.stderr,/1 pass/);
}));
test('a passing file cannot hide an empty selected file',()=>fixture('export const noTests=true;',root=>{
 writeFileSync(join(root,'src/passing.test.ts'),"import {test,expect} from 'bun:test'; test('pass',()=>expect(true).toBe(true));");
 assert.notEqual(run(root).status,0);
}));

test('Bun and Vitest reports bind executed cases to selected files and reject missing/failure evidence',()=>{
 const bun='<testsuites tests="1" failures="0" skipped="0"><testcase file="src/a.test.ts" name="ok" /></testsuites>';
 const vitest='<testsuites tests="1" failures="0" errors="0"><testsuite tests="1" failures="0" errors="0" skipped="0"><testcase classname="src/a.test.ts" name="ok" /></testsuite></testsuites>';
 for(const report of [bun,vitest]){
  validateUnitReport(report,['src/a.test.ts'],'/fixture');
  assert.throws(()=>validateUnitReport(report,['src/b.test.ts'],'/fixture'));
  assert.throws(()=>validateUnitReport(report,['src/a.test.ts','src/b.test.ts'],'/fixture'));
  assert.throws(()=>validateUnitReport(report.replace('tests="1"','tests="2"'),['src/a.test.ts'],'/fixture'));
  assert.throws(()=>validateUnitReport(report.replace('failures="0"','failures="1"'),['src/a.test.ts'],'/fixture'));
 }
 for(const report of ['', '<testsuites tests="0" />',vitest.replace('skipped="0"','skipped="1"')])assert.throws(()=>validateUnitReport(report,['src/a.test.ts'],'/fixture'));
});

test('Vitest retains human-readable failure diagnostics alongside strict JUnit evidence',()=>fixture("import {test} from 'vitest'; test('failure-details',()=>{});",root=>{
 const bin=join(root,'bin');mkdirSync(bin);
 const executable=join(bin,'bun');
 writeFileSync(executable,'#!'+process.execPath+'\n'+`const args=process.argv.slice(2);
if(args[0]==='--version'){console.log('1.4.0');process.exit(0);}
if(!args.includes('--reporter=default')||!args.includes('--reporter=junit'))process.exit(31);
console.error('FAIL src/fixture.test.ts > failure-details: expected visible diagnostic');
process.exit(7);
`);chmodSync(executable,0o755);
 const result=spawnSync(process.execPath,[runner],{cwd:root,encoding:'utf8',env:{...process.env,PATH:bin+':'+process.env.PATH}});
 assert.notEqual(result.status,0);
 assert.match(result.stderr,/failure-details: expected visible diagnostic/);
 assert.match(result.stderr,/Unit runner failed \(7\)/);
}));
