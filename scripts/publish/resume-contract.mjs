import {candidates as recoveryCandidates} from './recovery.mjs';
import {releaseTarget} from './contract.mjs';
export function resumeTarget(run, artifacts, jobs) {
  if (run?.repository?.full_name !== 'dataarthub/appkit' || run.head_repository?.full_name !== 'dataarthub/appkit' || !['release','workflow_dispatch'].includes(run.event) ||
      run.path !== '.github/workflows/publish.yml' || run.status !== 'completed' || run.conclusion !== 'success' ||
      !Number.isSafeInteger(run.id) || !Number.isSafeInteger(run.run_attempt) || !/^[a-f0-9]{40}$/.test(run.head_sha ?? '')) throw Error('A successful original release workflow run is required');
  if (!Array.isArray(jobs) || !jobs.some(job => job.name === 'Stage package for approval' && job.status === 'completed' && job.conclusion === 'success')) throw Error('Run has no successful staging job');
  const recovery=run.event==='workflow_dispatch'?Object.values(recoveryCandidates).find(c=>run.display_title===`Recover ${c.id}`&&run.head_branch==='main'&&run.run_attempt===1):null;
  if(run.event==='workflow_dispatch'&&!recovery)throw Error('Unknown recovered staging producer');
  const tag=recovery?.tag??run.head_branch;releaseTarget(tag);
  const candidates = artifacts.filter(a => a.name === `npm-package-${run.id}-${run.run_attempt}`);
  if (candidates.length !== 1 || candidates[0].expired !== false || !Number.isSafeInteger(candidates[0].id) ||
      candidates[0].workflow_run?.id !== run.id || candidates[0].workflow_run?.head_sha !== run.head_sha) throw Error('Missing, expired or ambiguous original verified artifact');
  return {sha:recovery?.sha??run.head_sha, tag, artifact:String(candidates[0].id),control:run.head_sha,attempt:String(run.run_attempt)};
}
