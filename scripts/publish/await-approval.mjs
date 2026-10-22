import {readFileSync,appendFileSync} from 'node:fs';
import path from 'node:path';
import {automaticRunId,waitForApproval} from './auto-completion.mjs';
import {releaseTarget} from './contract.mjs';
import {verifyArtifact} from './artifact.mjs';
import {github} from './github.mjs';

if (process.env.GITHUB_ACTIONS !== 'true' || process.env.GITHUB_REPOSITORY !== 'dataarthub/appkit' ||
    process.env.GITHUB_EVENT_NAME !== 'workflow_run' || process.env.GITHUB_REF !== 'refs/heads/main') throw Error('Approval observation requires the trusted main workflow');
const event=JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH,'utf8'));
const id=automaticRunId(event);
const run=event.workflow_run;
if (process.env.STAGING_RUN !== id || process.env.PUBLISH_SOURCE_SHA !== run.head_sha ||
    process.env.PUBLISH_RELEASE_TAG !== run.head_branch || !/^[1-9]\d*$/.test(process.env.VERIFIED_ARTIFACT ?? '')) throw Error('Resolved staging identity does not match the original run');
const target={...releaseTarget(run.head_branch),tag:run.head_branch,sha:run.head_sha};
const directory=path.resolve('.verification/publish');
const manifest=JSON.parse(readFileSync(path.join(directory,'release.json'),'utf8'));
verifyArtifact({file:path.join(directory,'package.tgz'),manifest,target});
const result=await waitForApproval({target:{...target,integrity:manifest.integrity},
  readRegistry:async(name,version,timeoutMs)=>{
    const response=await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}/${encodeURIComponent(version)}`,{signal:AbortSignal.timeout(Math.max(1,Math.floor(timeoutMs)))});
    if (response.status === 404) return null;
    if (!response.ok) throw Error('npm approval observation failed: HTTP '+response.status);
    return response.json();
  },
  dispatch:async()=>{
    // Do not dispatch an old attempt or expired/deleted archive after the wait.
    const current=await github('GET',`actions/runs/${id}`);
    automaticRunId({...event,workflow_run:current});
    if (current.run_attempt !== run.run_attempt || current.head_sha !== run.head_sha) throw Error('Original staging run changed during approval wait');
    const artifact=await github('GET',`actions/artifacts/${process.env.VERIFIED_ARTIFACT}`);
    if (String(artifact.id) !== process.env.VERIFIED_ARTIFACT || artifact.expired !== false ||
        artifact.workflow_run?.id !== run.id || artifact.workflow_run?.head_sha !== run.head_sha) throw Error('Original staging artifact is no longer available');
    await github('POST','actions/workflows/publish.yml/dispatches',{ref:'main',inputs:{staged_run:id}});
  },
});
console.log(JSON.stringify({...result,stagedRun:id}));
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,
  `\n### ${result.status}\n\n${target.name}@${target.version}\n\n`+
  (result.status === 'completion-dispatched'
    ? `Matching public bytes observed; completion requested with original staging run **${id}**. Check the separate Publish npm packages completion run; this observer is not release success.\n`
    : `The 30-minute observation window ended without confirmed public approval. The release remains pending. Approve in npm, then run Publish npm packages on main with staged_run **${id}**. Do not re-stage.\n`));
