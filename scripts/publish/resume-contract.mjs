import {releaseTarget} from './contract.mjs';
export function resumeTarget(run, artifacts, jobs) {
  if (run?.repository?.full_name !== 'dataarthub/appkit' || run.head_repository?.full_name !== 'dataarthub/appkit' || run.event !== 'release' ||
      run.path !== '.github/workflows/publish.yml' || run.status !== 'completed' || run.conclusion !== 'success' ||
      !Number.isSafeInteger(run.id) || !Number.isSafeInteger(run.run_attempt) || !/^[a-f0-9]{40}$/.test(run.head_sha ?? '')) throw Error('A successful original release workflow run is required');
  if (!Array.isArray(jobs) || !jobs.some(job => job.name === 'Stage package for approval' && job.status === 'completed' && job.conclusion === 'success')) throw Error('Run has no successful staging job');
  releaseTarget(run.head_branch);
  const candidates = artifacts.filter(a => a.name === `npm-package-${run.id}-${run.run_attempt}`);
  if (candidates.length !== 1 || candidates[0].expired !== false || !Number.isSafeInteger(candidates[0].id) ||
      candidates[0].workflow_run?.id !== run.id || candidates[0].workflow_run?.head_sha !== run.head_sha) throw Error('Missing, expired or ambiguous original verified artifact');
  return {sha:run.head_sha, tag:run.head_branch, artifact:String(candidates[0].id)};
}
