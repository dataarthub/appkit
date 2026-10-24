import test from 'node:test';
import assert from 'node:assert/strict';
import {requireQuality, findBaseline, githubRuns} from './quality-runs.mjs';
const sha = 'a'.repeat(40), older = 'b'.repeat(40);
const run = (overrides = {}) => ({id: 20, head_sha: sha, head_branch: 'main', event: 'push', path: '.github/workflows/ci.yml', name: 'Source quality', status: 'completed', conclusion: 'success', head_repository: {full_name: 'dataarthub/appkit'}, ...overrides});
const list = runs => async () => runs;
test('release requires exact SHA and authoritative main-push workflow success', async () => {
  assert.equal((await requireQuality({sha, list: list([run()])})).id, 20);
  for (const overrides of [{head_sha: older}, {head_branch: 'feature'}, {event: 'workflow_dispatch'}, {path: '.github/workflows/fake.yml'}, {name: 'Other'}, {head_repository: {full_name: 'attacker/appkit'}}, {status: 'in_progress', conclusion: null}, {conclusion: 'failure'}, {conclusion: 'cancelled'}, {conclusion: 'skipped'}]) {
    await assert.rejects(requireQuality({sha, list: list([run(overrides)])}), /Source quality/);
  }
  await assert.rejects(requireQuality({sha, list: list([])}), /Source quality/);
  await assert.rejects(requireQuality({sha, list: async () => {throw Error('API unavailable');}}), /API unavailable/);
});
test('a newer unsuccessful run cannot fall back to an older passing run', async () => {
  await assert.rejects(requireQuality({sha, list: list([run({id: 19}), run({id: 21, status: 'queued', conclusion: null})])}), /Source quality/);
});
test('baseline includes changes from failed and cancelled runs, excluding self and unrelated history', async () => {
  const runs = [run({id: 25}), run({id: 24, head_sha: 'c'.repeat(40), conclusion: 'failure'}), run({id: 23, head_sha: 'd'.repeat(40)}), run({id: 22, head_sha: older})];
  assert.equal(await findBaseline({sha, currentRun: 25, list: list(runs), isAncestor: value => value === older}), older);
  assert.equal(await findBaseline({sha, currentRun: 25, list: list([]), isAncestor: () => true}), null);
  assert.equal(await findBaseline({sha,currentRun:25,list:list([run({id:23,head_sha:older,conclusion:'cancelled'}),run({id:22,head_sha:older})]),isAncestor:()=>true}), null);
});
test('GitHub evidence pagination stays bound to quality.yml, main pushes and exact SHA', async () => {
  const requests=[];
  const listRuns=githubRuns({token:'fixture-auth',fetchImpl:async (url,options)=>{
    requests.push({url,options});
    return {ok:true,json:async()=>({workflow_runs:requests.length===1 ? Array.from({length:100},(_,i)=>run({id:100+i})) : [run()]})};
  }});
  assert.equal((await listRuns({sha})).length,101);
  assert.equal(requests.length,2);
  const url=new URL(requests[1].url);
  assert.equal(url.pathname,'/repos/dataarthub/appkit/actions/workflows/ci.yml/runs');
  for(const [key,value] of Object.entries({branch:'main',event:'push',head_sha:sha,page:'2'})) assert.equal(url.searchParams.get(key),value);
  assert.equal(requests[0].options.headers.Authorization,'Bearer fixture-auth');
});
test('API authorization errors and malformed responses cannot become passing evidence', async () => {
  for(const response of [{ok:false,status:403},{ok:true,json:async()=>({unexpected:[]})}]) {
    await assert.rejects(requireQuality({sha,list:githubRuns({fetchImpl:async()=>response})}),/Source quality/);
  }
});
