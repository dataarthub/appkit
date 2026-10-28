import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync,readdirSync,chmodSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createUnitCache} from './unit-cache.mjs';

function fixture(action){
 const root=mkdtempSync(join(tmpdir(),'appkit-unit-cache-'));
 const put=(name,value)=>{mkdirSync(join(root,name,'..'),{recursive:true});writeFileSync(join(root,name),value);};
 try{
  put('package.json','{"private":true}');put('bun.lock','locked');
  put('packages/example/package.json','{"name":"example"}');
  put('packages/example/src/a.ts','export const a=1;');
  put('packages/example/src/b.ts','export const b=1;');
  put('packages/example/src/a.test.ts',"import {a} from './a.js'; export const value=a;");
  put('packages/example/src/b.test.ts',"import {b} from './b.js'; export const value=b;");
  const options={repositoryRoot:root,packageRoot:join(root,'packages/example'),runner:'vitest',files:['src/a.test.ts','src/b.test.ts'],identity:{node:'v26.5.0',bun:'1.4.0',platform:'darwin',arch:'arm64'},env:{CI:'true'}};
  const plan=(overrides={})=>{const p=createUnitCache({...options,...overrides});const record=p.record;p.record=()=>record('<testsuites tests=\"'+p.missing.length+'\" failures=\"0\">'+p.missing.map(x=>'<testcase file=\"'+x.file+'\" name=\"ok\" />').join('')+'</testsuites>');return p;};
  return action({root,put,options,plan});
 }finally{rmSync(root,{recursive:true,force:true});}
}

test('isolated Vitest file receipts reuse exact transitive inputs and only invalidate their dependents',()=>fixture(({put,plan})=>{
 let p=plan();assert.equal(p.missing.length,2);p.record();
 p=plan();assert.equal(p.reused.length,2);
 put('packages/example/src/a.ts','export const a=2;');
 p=plan();assert.deepEqual(p.missing.map(x=>x.file),['src/a.test.ts']);assert.deepEqual(p.reused.map(x=>x.file),['src/b.test.ts']);
 p.record();put('packages/example/src/b.test.ts',"import {a} from './a.js'; export const value=a;");
 assert.deepEqual(plan().missing.map(x=>x.file),['src/b.test.ts']);
}));

test('Bun keeps joint selection and package inputs together without changing isolation',()=>fixture(({put,plan})=>{
 const p=plan({runner:'bun'});p.record();assert.equal(plan({runner:'bun'}).missing.length,0);
 put('packages/example/src/a.ts','export const a=2;');assert.equal(plan({runner:'bun'}).missing.length,2);
 assert.equal(plan({runner:'bun',files:['src/b.test.ts']}).missing.length,1);
}));

test('dynamic imports, raw assets, filesystem reads and unresolved edges conservatively rerun' ,()=>fixture(({put,plan})=>{
 for(const text of ["export const load=(name)=>import(name);", "import value from './value.txt?raw';", "import fs from 'node:fs'; export const data=fs.readFileSync('fixture.txt');", "import value from './missing.js';"]){
  put('packages/example/src/a.ts',text);let p=plan();assert.match(p.missing[0].reason,/conservative/);p.record();assert.equal(plan().missing[0].file,'src/a.test.ts');
  put('fixtures/unknown.data',text);p=plan();assert.deepEqual(p.missing.map(x=>x.file),['src/a.test.ts']);
 }
}));

test('runtime, lock, shared config/setup, verifier and environment changes invalidate exact passes',()=>fixture(({put,plan,options})=>{
 plan().record();
 assert.equal(plan({identity:{...options.identity,node:'v26.6.0'}}).missing.length,2);
 assert.equal(plan({env:{CI:'false'}}).missing.length,2);
 put('bun.lock','different');assert.equal(plan().missing.length,2);plan().record();
 put('scripts/vitest.config.ts','export default {test:{setupFiles:["./setup.ts"]}};');assert.equal(plan().missing.length,2);
 plan().record();put('packages/example/setup.ts','globalThis.changed=true;');assert.equal(plan().missing.length,2);
}));

test('unchanged process.env values are bound, secrets stay out of receipts, and changed inputs cannot be sealed',()=>fixture(({put,plan,root})=>{
 put('packages/example/src/a.ts','export const a=process.env.MY_SETTING;');
 plan({env:{CI:'true',MY_SETTING:'one',GITHUB_TOKEN:'private-token'}}).record();
 assert.equal(plan({env:{CI:'true',MY_SETTING:'two',GITHUB_TOKEN:'private-token'}}).missing.length,2);
 const p=plan();put('packages/example/src/a.ts','export const a=3;');assert.throws(()=>p.record(),/changed/);
 const dir=join(root,'.verification/records/unit-checks');for(const f of readdirSync(dir))assert(!readFileSync(join(dir,f),'utf8').includes('private-token'));
}));

test('failed, incomplete, tampered and empty selections do not become reusable passes',()=>fixture(({plan,root,options})=>{
 // A caller that fails or is interrupted never calls record after validated report and cleanup.
 plan();assert.equal(plan().missing.length,2);
 plan().record();const dir=join(root,'.verification/records/unit-checks');
 const f=readdirSync(dir)[0];writeFileSync(join(dir,f),'{"status":"passed"}');assert.equal(plan().missing.length,1);
 assert.throws(()=>plan({files:[]}),/Empty/);
 assert.throws(()=>plan({files:['../escape.test.ts']}),/package/);
 assert.equal(options.runner,'vitest');
}));

test('CI ignores untrusted stored receipts and accepts only explicitly authenticated restoration',()=>fixture(({plan})=>{
 plan().record();
 const ci={CI:'true',GITHUB_ACTIONS:'true'};
 assert.equal(plan({env:ci}).missing.length,2);
 assert.equal(plan({env:{...ci,SOURCE_CHECKS_RESTORE_TRUSTED:'1'}}).reused.length,2);
 const fresh=plan({env:ci});fresh.begin();
 assert.equal(plan().missing.length,2,'Starting a failed/interrupted rerun clears former success');
 fresh.record();assert.equal(plan({env:ci}).reused.length,2,'Same process fresh validated evidence is reusable');
}));

test('record requires a complete passing report for exactly the missing selection',()=>fixture(({options})=>{
 const p=createUnitCache(options);
 for(const report of ['', '<testsuites tests="0" />', '<testsuites tests="1"><testcase file="src/a.test.ts" name="ok" /></testsuites>', '<testsuites tests="2"><testcase file="src/a.test.ts" name="ok" /><testcase file="src/b.test.ts" name="bad"><failure /></testcase></testsuites>'])assert.throws(()=>p.record(report));
 assert.equal(createUnitCache(options).missing.length,2);
}));


test('implicit Babel configuration and non-isolated custom setup retain conservative group execution',()=>fixture(({put,plan})=>{
 plan().record();put('packages/example/.babelrc','{"plugins":[]}');assert.equal(plan().missing.length,2);plan().record();
 put('scripts/vitest.config.ts','export default {test:{isolate:false}};');let p=plan();assert.equal(p.missing.length,2);p.record();assert.equal(plan().reused.length,2);
 put('packages/example/src/a.ts','export const a=9;');assert.equal(plan().missing.length,2);
}));


test('local package declaration resolution also binds emitted runtime bytes',()=>fixture(({put,plan})=>{
 put('packages/example/src/a.ts',"import {value} from '../dist/value.js';export const a=value;");
 put('packages/example/dist/value.d.ts','export declare const value: number;');put('packages/example/dist/value.js','export const value=1;');
 plan().record();assert.equal(plan().reused.length,2);
 put('packages/example/dist/value.js','export const value=2;');assert.deepEqual(plan().missing.map(x=>x.file),['src/a.test.ts']);
}));


test('inherited compiler settings and implicit Babel extends invalidate transformed test inputs',()=>fixture(({put,plan})=>{
 put('packages/example/tsconfig.json','{"extends":"../../config/base.json"}');
 put('config/base.json','{"compilerOptions":{"target":"ES2022","moduleResolution":"NodeNext","module":"NodeNext"}}');
 plan().record();assert.equal(plan().reused.length,2);
 put('config/base.json','{"compilerOptions":{"target":"ES2023","moduleResolution":"NodeNext","module":"NodeNext"}}');assert.equal(plan().missing.length,2);
 put('packages/example/.babelrc','{"extends":"../../config/babel-base.json"}');put('config/babel-base.json','{"plugins":[]}');plan().record();
 put('config/babel-base.json','{"plugins":["fixture"]}');assert.equal(plan().missing.length,2);
}));


test('owned temporary/cache locations do not invalidate units unless tests explicitly read them',()=>fixture(({put,plan})=>{
 plan({runner:'bun',env:{CI:'true',BUN_INSTALL_CACHE_DIR:'/one',NODE_COMPILE_CACHE:'/one'}}).record();
 assert.equal(plan({runner:'bun',env:{CI:'true',BUN_INSTALL_CACHE_DIR:'/two',NODE_COMPILE_CACHE:'/two'}}).reused.length,2);
 put('packages/example/src/a.ts','export const a=process.env.BUN_INSTALL_CACHE_DIR;');
 plan({env:{CI:'true',BUN_INSTALL_CACHE_DIR:'/one'}}).record();
 assert.deepEqual(plan({env:{CI:'true',BUN_INSTALL_CACHE_DIR:'/two'}}).missing.map(x=>x.file),['src/a.test.ts']);
}));

test('bounded Bun group ignores unrelated prose and source while dependent/selection changes invalidate the group',()=>fixture(({put,plan})=>{
 plan({runner:'bun'}).record();
 put('README.md','# Unrelated prose\n');put('docs/guide.md','Documentation only\n');
 put('packages/example/src/unrelated.ts','export const unrelated=1;');
 put('packages/other/src/unrelated.ts','export const unrelated=2;');
 assert.equal(plan({runner:'bun'}).reused.length,2,'Unchanged transitive inputs preserve a joint group pass');
 assert.equal(plan({runner:'bun',files:['src/b.test.ts','src/a.test.ts']}).missing.length,2,'Different joint execution order needs a distinct pass');
 put('packages/example/src/a.ts','export const a=2;');assert.equal(plan({runner:'bun'}).missing.length,2,'One changed dependency reruns the whole group');
 assert.equal(plan({runner:'bun',files:['src/b.test.ts']}).missing.length,1,'A different joint selection requires its own pass');
 assert.equal(plan({runner:'bun',files:['src/b.test.ts','src/a.test.ts']}).missing.length,2,'Joint execution order is part of selection identity');
}));


test('uncacheable graph does not fingerprint unrelated private source archives',()=>fixture(({put,plan,root})=>{
 put('packages/example/src/a.ts','export const load=(name)=>import(name);');
 put('third-party-sources/unrelated-source.tgz','archive bytes must not be read');
 const archive=join(root,'third-party-sources/unrelated-source.tgz');chmodSync(archive,0);
 try{
  const result=plan({files:['src/a.test.ts']});assert.equal(result.missing.length,1);assert.match(result.missing[0].reason,/cannot be fully bounded/);
 }finally{chmodSync(archive,0o600);}
}));

test('Promise.resolve and ordinary globalThis calls are bounded logic rather than module/resource resolution',()=>fixture(({put,plan})=>{
 put('packages/example/src/a.ts','export const a=Promise.resolve(globalThis.Math.max(1,2));');
 plan({runner:'bun'}).record();assert.equal(plan({runner:'bun'}).reused.length,2);
}));
