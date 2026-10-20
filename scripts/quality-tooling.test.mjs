import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync,mkdirSync,copyFileSync,symlinkSync,readFileSync,renameSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {localGitleaks} from './quality-tools.mjs';
const root=path.resolve(import.meta.dirname,'..');
function fixture(run){
 const dir=mkdtempSync(path.join(tmpdir(),'appkit-quality-'));
 const env={...process.env,APPKIT_GITLEAKS_BINARY:process.env.APPKIT_GITLEAKS_BINARY || (existsSync(localGitleaks) ? localGitleaks : 'gitleaks')};
 for(const name of Object.keys(env))if(name.startsWith('GIT_'))delete env[name];
 const git=args=>{const r=spawnSync('git',args,{cwd:dir,env,encoding:'utf8'});assert.equal(r.status,0,'Fixture Git operation failed');};
 try{git(['init','--quiet']);copyFileSync(path.join(root,'.gitleaks.toml'),path.join(dir,'.gitleaks.toml'));writeFileSync(path.join(dir,'README.md'),'Temporary test fixture.\n');git(['add','README.md']);git(['-c','user.name=Appkit fixture','-c','user.email=fixture@example.invalid','commit','--quiet','-m','fixture']);return run({dir,env,git,scan:(extra={})=>spawnSync(process.execPath,[path.join(root,'scripts/check-secrets.mjs'),'--staged'],{cwd:dir,env:{...env,...extra},encoding:'utf8'})});}finally{rmSync(dir,{recursive:true,force:true});}
}
test('secret check accepts clean staged data and leaves unstaged changes alone',()=>fixture(({dir,git,scan})=>{
 writeFileSync(path.join(dir,'safe.ts'),'export const value = 1;\n');git(['add','safe.ts']);writeFileSync(path.join(dir,'unstaged.txt'),'token = "'+['ghp',randomBytes(27).toString('base64url')].join('_')+'"\n');const r=scan();assert.equal(r.status,0,r.stderr);
}));
test('staged canary credential blocks a commit without printing its value',()=>fixture(({dir,git,scan})=>{
 const credential=['ghp',randomBytes(27).toString('base64url').replaceAll('-','a').replaceAll('_','b')].join('_');writeFileSync(path.join(dir,'credential.txt'),'token = "'+credential+'"\n');git(['add','credential.txt']);const r=scan();assert.equal(r.status,1);assert.match(r.stdout+r.stderr,/leaks? found|secrets? detected/i);assert.equal((r.stdout+r.stderr).includes(credential),false,'Credentials must stay redacted');
}));
test('missing scanner fails closed with setup instructions',()=>fixture(({scan})=>{
 const r=scan({APPKIT_GITLEAKS_BINARY:'/nonexistent/appkit-gitleaks'});assert.equal(r.status,2);assert.match(r.stderr,/bun run secrets:setup/);
}));

test('installed pre-commit hook blocks a lint failure and permits a clean staged file',()=>fixture(({dir,env,git})=>{
 // Dependencies are read from this checkout; fixture Git metadata remains independent.
 const packageFile = path.join(dir,'package.json');
 writeFileSync(packageFile,JSON.stringify({private:true,type:'module',scripts:{'secrets:staged':'node scanner.mjs --staged','lint:staged':'lint-staged --no-stash --no-hide-partially-staged'}}));
 const scannerURL = new URL('./check-secrets.mjs',import.meta.url).href;
 writeFileSync(path.join(dir,'scanner.mjs'),'import '+JSON.stringify(scannerURL)+';\n');
 setupHookFixture(dir);
 const installed=spawnSync(process.execPath,[path.join(root,'node_modules/husky/bin.js')],{cwd:dir,env,encoding:'utf8'});assert.equal(installed.status,0,installed.stderr);
 writeFileSync(path.join(dir,'staged.ts'),'debugger;\n');git(['add','staged.ts']);
 const blocked=spawnSync('git',['-c','user.name=Appkit fixture','-c','user.email=fixture@example.invalid','commit','-m','blocked'],{cwd:dir,env,encoding:'utf8'});assert.notEqual(blocked.status,0);assert.match(blocked.stdout+blocked.stderr,/noDebugger/);
 writeFileSync(path.join(dir,'staged.ts'),'export const value = 1;\n');git(['add','staged.ts']);
 writeFileSync(path.join(dir,'not-staged.ts'),'debugger;\n');
 const accepted=spawnSync('git',['-c','user.name=Appkit fixture','-c','user.email=fixture@example.invalid','commit','-m','clean'],{cwd:dir,env,encoding:'utf8'});assert.equal(accepted.status,0,accepted.stdout+accepted.stderr);
 assert.equal(readFileSync(path.join(dir,'not-staged.ts'),'utf8'),'debugger;\n');
}));
function setupHookFixture(dir){
 mkdirSync(path.join(dir,'.husky'));copyFileSync(path.join(root,'.husky/pre-commit'),path.join(dir,'.husky/pre-commit'));
 for(const file of ['biome.json','lint-staged.config.mjs','.gitleaks.toml'])copyFileSync(path.join(root,file),path.join(dir,file));
 symlinkSync(path.join(root,'node_modules'),path.join(dir,'node_modules'),'dir');
 writeFileSync(path.join(dir,'.gitignore'),'node_modules\n.husky/_\n');
}

test('provider-shaped dummy tokens are blocked by the project rule even at low entropy',()=>fixture(({dir,git,scan})=>{
 const credential=['sk','a'.repeat(24)].join('-');writeFileSync(path.join(dir,'dummy.txt'),credential+'\n');git(['add','dummy.txt']);const config=path.join(dir,'.gitleaks.toml'),saved=path.join(dir,'saved-config.toml');renameSync(config,saved);const withoutProjectRule=scan();assert.equal(withoutProjectRule.status,0);renameSync(saved,config);const r=scan();assert.equal(r.status,1);assert.match(r.stdout+r.stderr,/leaks? found/i);assert.equal((r.stdout+r.stderr).includes(credential),false);
}));
test('pre-push delegates to the shared verification command and propagates failure',()=>fixture(({dir,env})=>{
 const bin=path.join(dir,'fake-bin');mkdirSync(bin);const marker=path.join(dir,'called.json');
 const fake='#!/usr/bin/env node\nrequire("node:fs").writeFileSync('+JSON.stringify(marker)+',JSON.stringify(process.argv.slice(2)));process.exit(23);\n';
 writeFileSync(path.join(bin,'bun'),fake,{mode:0o755});
 const r=spawnSync('sh',[path.join(root,'.husky/pre-push')],{cwd:dir,env:{...env,PATH:bin+path.delimiter+env.PATH},encoding:'utf8'});assert.equal(r.status,23);assert.deepEqual(JSON.parse(readFileSync(marker,'utf8')),['run','verify:push']);
}));
