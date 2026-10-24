import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {github} from './github.mjs';
export const candidates=Object.freeze({'core-0.2.1':Object.freeze(JSON.parse(readFileSync(new URL('./recoveries/core-0.2.1.json',import.meta.url))))});
export function publicationPhase(env,event){
 assert(env.GITHUB_ACTIONS==='true'&&env.GITHUB_REPOSITORY==='dataarthub/appkit','Trusted repository required');
 if(env.GITHUB_EVENT_NAME==='release')return 'stage';
 assert(env.GITHUB_EVENT_NAME==='workflow_dispatch'&&env.GITHUB_REF==='refs/heads/main','Dispatch requires main');
 const {staged_run='',recover_release=''}=event.inputs??{};
 if(recover_release){assert(candidates[recover_release]&&staged_run==='','Reviewed exclusive recovery required');return 'stage';}
 assert(/^[1-9]\d{0,15}$/.test(staged_run),'Successful staging run required');return 'complete';
}
export function validateRecovery({candidate:c,run:r,release,ref,tag,jobs,artifacts}){
 assert(r?.id===c.run&&r.run_attempt===c.attempt&&r.event==='release'&&r.path==='.github/workflows/publish.yml'&&r.head_sha===c.sha&&r.head_branch===c.tag&&r.status==='completed'&&r.conclusion==='failure'&&r.repository?.full_name==='dataarthub/appkit'&&r.head_repository?.full_name==='dataarthub/appkit','Original failed release run changed');
 assert(release?.id===c.release&&release.tag_name===c.tag&&release.target_commitish===c.sha&&release.draft===false&&release.prerelease===false,'Original Release changed');
 assert(ref?.object?.type==='tag'&&ref.object.sha===c.tagObject&&tag?.sha===c.tagObject&&tag.tag===c.tag&&tag.object?.type==='commit'&&tag.object.sha===c.sha,'Original immutable tag changed');
 assert(artifacts?.total_count===0&&Array.isArray(artifacts.artifacts)&&artifacts.artifacts.length===0,'Original run already produced an archive; do not re-stage');
 assert(Array.isArray(jobs)&&jobs.filter(j=>j.name==='Stage package for approval').length===1&&jobs.some(j=>j.name==='Stage package for approval'&&j.status==='completed'&&j.conclusion==='skipped'),'Original writer did not remain skipped');
 return c;
}
export async function authenticateRecovery(c,{api=github}={}){
 const run=await api('GET',`actions/runs/${c.run}`);
 const [release,ref,tag,artifacts,jobs]=await Promise.all([
  api('GET',`releases/${c.release}`),api('GET',`git/ref/tags/${c.tag}`),api('GET',`git/tags/${c.tagObject}`),api('GET',`actions/runs/${c.run}/artifacts?per_page=100`),api('GET',`actions/runs/${c.run}/attempts/${c.attempt}/jobs?per_page=100`)
 ]);
 assert(jobs.total_count<=100,'Ambiguous original jobs');
 return validateRecovery({candidate:c,run,release,ref,tag,artifacts,jobs:jobs.jobs});
}
export function validateFresh(fresh,ctx){
 for(const k of ['source','control','run','attempt'])assert.equal(fresh?.[k],ctx[k],`Fresh verification ${k} changed`);
 assert(fresh.status==='passed'&&Array.isArray(fresh.nodes)&&fresh.nodes.length===2,'Full fresh verification required');
 assert.deepEqual(fresh.nodes.map(n=>n.major).sort(),[24,26],'Both required runtimes must be freshly checked');
 for(const n of fresh.nodes)assert(n.status==='passed'&&n.identity?.node&&n.identity.image,'Fresh runtime verification failed');
}
export function validateRecoveryProducer(c,run,runs){
 assert(run?.event==='workflow_dispatch'&&run.head_branch==='main'&&run.path==='.github/workflows/publish.yml'&&run.display_title===`Recover ${c.id}`&&run.run_attempt===1&&run.repository?.full_name==='dataarthub/appkit'&&run.head_repository?.full_name==='dataarthub/appkit','Invalid recovery producer');
 const prior=runs.filter(r=>r.display_title===`Recover ${c.id}`).sort((a,b)=>a.id-b.id);
 assert(prior.length&&prior[0].id===run.id,'Recovery candidate already used; never repeat ambiguous staging');
}
export async function authenticateRecoveryProducer(c,{api=github,env=process.env}={}){
 const run=await api('GET',`actions/runs/${env.GITHUB_RUN_ID}`);
 const listed=await api('GET','actions/workflows/publish.yml/runs?event=workflow_dispatch&per_page=100');
 assert(listed.total_count<=100&&Array.isArray(listed.workflow_runs),'Recovery history exceeds bounded inspection');
 validateRecoveryProducer(c,run,listed.workflow_runs);
 assert(run.head_sha===env.GITHUB_SHA&&run.run_attempt===Number(env.GITHUB_RUN_ATTEMPT),'Recovery workflow source or attempt changed');
 return run;
}
