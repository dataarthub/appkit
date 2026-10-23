import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createPlan} from './plan.mjs';
async function fixture(fn) {
 const root=mkdtempSync(path.join(tmpdir(),'appkit-plan-'));
 const env=Object.fromEntries(Object.entries(process.env).filter(([name])=>!name.startsWith('GIT_')));
 const git=args=>execFileSync('git',args,{cwd:root,env,encoding:'utf8'}).trim();
 const put=(file,text)=>{mkdirSync(path.dirname(path.join(root,file)),{recursive:true});writeFileSync(path.join(root,file),text);};
 const commit=()=>{git(['add','.']);git(['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','-c','core.hooksPath=/dev/null','commit','-qm','fixture']);return git(['rev-parse','HEAD']);};
 try {
  git(['init','-q']);put('README.md','initial');const base=commit();git(['update-ref','refs/remotes/origin/main',base]);
  await fn({root,git,put,commit,base});
 } finally {rmSync(root,{recursive:true,force:true});}
}
test('local plan includes committed, staged, unstaged, deleted and untracked paths with spaces',()=>fixture(async ({root,put,commit})=>{
 put('notes.md','first');commit();put('README.md','changed');put('new file.md','untracked');
 const plan=await createPlan({directory:root});
 assert.deepEqual(plan.changedFiles.sort(),['README.md','new file.md','notes.md']);
 assert.equal(plan.full,false);assert.equal(plan.packages,false);assert.deepEqual(plan.stories,[]);
}));
test('CI diffs all changes after the last passing ancestor, not just the last push',()=>fixture(async ({root,put,commit,base})=>{
 put('first.md','failed run change');const failed=commit();put('second.md','latest change');const sha=commit();
 const authoritative={event:'push',head_branch:'main',path:'.github/workflows/ci.yml',name:'Source quality',head_repository:{full_name:'dataarthub/appkit'},status:'completed'};
 const list=async()=>[{...authoritative,id:3,head_sha:sha,conclusion:null},{...authoritative,id:2,head_sha:failed,conclusion:'failure'},{...authoritative,id:1,head_sha:base,conclusion:'success'}];
 const env={GITHUB_EVENT_NAME:'push',GITHUB_REF:'refs/heads/main',GITHUB_SHA:sha,GITHUB_RUN_ID:'3'};
 const plan=await createPlan({directory:root,ci:true,env,list});
 assert.equal(plan.base,base);assert.deepEqual(plan.changedFiles.sort(),['first.md','second.md']);
 const fallback=await createPlan({directory:root,ci:true,env,list:async()=>{throw Error('network unavailable');}});
 assert.equal(fallback.full,true);assert.equal(fallback.packages,true);
 const manual=await createPlan({directory:root,ci:true,env:{...env,GITHUB_EVENT_NAME:'workflow_dispatch'},list});
 assert.equal(manual.full,true);
}));
test('inherited hook Git variables cannot redirect selection to another repository',()=>fixture(async ({root,put})=>{
 put('changed.md','pending');
 const names=['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE'];
 const saved=Object.fromEntries(names.map(name=>[name,process.env[name]]));
 try {
  process.env.GIT_DIR='/nonexistent/foreign.git';process.env.GIT_WORK_TREE='/nonexistent';process.env.GIT_INDEX_FILE='/nonexistent/index';
  const plan=await createPlan({directory:root});
  assert.deepEqual(plan.changedFiles,['changed.md']);assert.equal(plan.full,false);
 } finally {for(const name of names) if(saved[name]===undefined) delete process.env[name];else process.env[name]=saved[name];}
}));
test('real Git metadata diff provides before/after contents for release fast path',()=>fixture(async({root,put,commit,git})=>{
 put('packages/appkit-core/package.json','{"name":"@alneas/appkit-core","version":"0.2.0"}');
 put('packages/appkit-react/stories/example.stories.tsx','export const Basic={};');
 const baseline=commit();git(['update-ref','refs/remotes/origin/main',baseline]);
 put('packages/appkit-core/package.json','{"name":"@alneas/appkit-core","version":"0.2.1"}');
 const plan=await createPlan({directory:root});
 assert.deepEqual(plan.stories,[]);assert.equal(plan.packages,false);assert.equal(plan.release,true);
}));
