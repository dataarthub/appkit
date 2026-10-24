import {readFileSync} from 'node:fs';
import {github} from './github.mjs';
import {outputs} from './context.mjs';
import {releaseTarget} from './contract.mjs';
import {resumeTarget} from './resume-contract.mjs';
import {automaticRunId} from './auto-completion.mjs';
if (process.env.GITHUB_ACTIONS !== 'true' || process.env.GITHUB_REPOSITORY !== 'dataarthub/appkit' ||
    !['workflow_dispatch','workflow_run'].includes(process.env.GITHUB_EVENT_NAME) || process.env.GITHUB_REF !== 'refs/heads/main') throw Error('Completion must be resolved from main');
const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH,'utf8'));
const automatic=process.env.GITHUB_EVENT_NAME === 'workflow_run';
const id = automatic ? automaticRunId(event) : event.inputs?.staged_run;
if (!/^[1-9]\d{0,15}$/.test(id ?? '')) throw Error('Original staging run ID is required');
const run = await github('GET',`actions/runs/${id}`);
if (automatic && (run.run_attempt !== event.workflow_run.run_attempt || run.head_sha !== event.workflow_run.head_sha)) throw Error('Staging run changed after automatic completion was triggered');
const artifacts=[];
for(let page=1;;page++) {
  const response=await github('GET',`actions/runs/${id}/artifacts?per_page=100&page=${page}`);
  if (!Array.isArray(response.artifacts)) throw Error('Invalid artifact API response');
  artifacts.push(...response.artifacts);
  if(response.artifacts.length<100) break;
}
const jobs = await github('GET',`actions/runs/${id}/attempts/${run.run_attempt}/jobs?per_page=100`);
const target = resumeTarget(run,artifacts,jobs.jobs);
outputs({...target, run:id, environment:releaseTarget(target.tag).environment});
