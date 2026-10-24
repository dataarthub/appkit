import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync, spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import * as module from '../paired-public.mjs';
const env = {GITHUB_ACTIONS:'true', GITHUB_REPOSITORY:'dataarthub/appkit', GITHUB_SHA:'a'.repeat(40), GITHUB_RUN_ID:'123', GITHUB_RUN_ATTEMPT:'2', GITHUB_WORKFLOW_REF:'dataarthub/appkit/.github/workflows/ci.yml@refs/heads/main', GITHUB_WORKFLOW_SHA:'a'.repeat(40), GITHUB_EVENT_NAME:'push', GITHUB_REF:'refs/heads/main'};

test('public side derives a bounded reviewed plan and binds complete producer identity', () => {
  assert.equal(typeof module.publicPlan, 'function');
  const plan = module.publicPlan(env);
  assert.equal(plan.revision, env.GITHUB_SHA);
  assert.equal(plan.taskId, 'appkit-release-compatibility-v1');
  assert.equal(plan.side, 'public');
  assert.ok(plan.checks.length > 0);
  assert.ok(plan.checks.every(check => check.timeoutMs > 0 && check.timeoutMs <= 60000));
  const producer = module.producerIdentity(env);
  assert.equal(producer.runId, '123');
  assert.equal(producer.runAttempt, '2');
  assert.equal(producer.workflowRef, env.GITHUB_WORKFLOW_REF);
  for (const key of ['GITHUB_SHA','GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT','GITHUB_WORKFLOW_REF','GITHUB_WORKFLOW_SHA']) {
    assert.throws(() => module.publicPlan({...env, [key]:''}));
  }
  assert.throws(() => module.publicPlan({...env, GITHUB_REPOSITORY:'example/other'}));
  assert.throws(() => module.publicPlan({...env, GITHUB_WORKFLOW_REF:'dataarthub/appkit/.github/workflows/other.yml@refs/heads/main'}));
});

test('pull request producer distinguishes tested merge source from API head SHA', () => {
  const dir = mkdtempSync(join(tmpdir(), 'appkit-public-event-'));
  try {
    const path = join(dir, 'event.json'), head = 'b'.repeat(40);
    writeFileSync(path, JSON.stringify({pull_request:{head:{sha:head}}}));
    const producer = module.producerIdentity({...env, GITHUB_EVENT_NAME:'pull_request', GITHUB_REF:'refs/pull/1/merge', GITHUB_EVENT_PATH:path});
    assert.equal(producer.sourceSha, env.GITHUB_SHA);
    assert.equal(producer.headShaFromEvent, head);
    writeFileSync(path, JSON.stringify({pull_request:{head:{sha:'missing'}}}));
    assert.throws(() => module.producerIdentity({...env, GITHUB_EVENT_NAME:'pull_request', GITHUB_EVENT_PATH:path}));
  } finally {rmSync(dir,{recursive:true,force:true});}
});

test('dirty or mismatched source removes obsolete evidence instead of retaining a pass', () => {
  assert.equal(typeof module.runPublicSide, 'function');
  const dir = mkdtempSync(join(tmpdir(), 'appkit-public-side-test-'));
  try {
    const root = join(dir,'source'), outputDir = join(dir,'evidence');
    mkdirSync(root); mkdirSync(outputDir);
    execFileSync('git',['init','-q',root]);
    writeFileSync(join(root,'source.txt'),'public fixture\n');
    execFileSync('git',['-C',root,'add','.']);
    execFileSync('git',['-C',root,'-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixture']);
    const revision = execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
    for (const mode of ['mismatched','dirty']) {
      writeFileSync(join(outputDir,'public-receipt.json'),'obsolete pass');
      writeFileSync(join(outputDir,'producer.json'),'obsolete producer');
      if (mode === 'dirty') writeFileSync(join(root,'source.txt'),'changed\n');
      assert.throws(() => module.runPublicSide({root,outputDir,env:{...env,GITHUB_SHA:mode==='dirty'?revision:env.GITHUB_SHA}}));
      assert.throws(() => readFileSync(join(outputDir,'public-receipt.json')));
      assert.throws(() => readFileSync(join(outputDir,'producer.json')));
    }
  } finally {rmSync(dir,{recursive:true,force:true});}
});

test('the reviewed shared checker bytes retain their source hashes', () => {
  const manifest=JSON.parse(readFileSync('scripts/paired-maintenance-source.json','utf8'));
  for(const [file,hash] of Object.entries(manifest.files)) {
    assert.equal(createHash('sha256').update(readFileSync(`scripts/${file}`)).digest('hex'),hash);
  }
  const result=spawnSync(process.execPath,['scripts/paired-public.mjs'],{encoding:'utf8',env:{...process.env,GITHUB_ACTIONS:'',RUNNER_TEMP:''}});
  assert.notEqual(result.status,0,'local execution without CI identity cannot produce evidence');
});
