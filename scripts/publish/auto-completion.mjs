import {setTimeout} from 'node:timers/promises';
import {publicationDecision, releaseTarget} from './contract.mjs';

export function automaticRunId(event) {
  const run=event?.workflow_run;
  if (event?.action !== 'completed' || event.repository?.full_name !== 'dataarthub/appkit' ||
      run?.repository?.full_name !== 'dataarthub/appkit' || run.head_repository?.full_name !== 'dataarthub/appkit' ||
      run.event !== 'release' || run.path !== '.github/workflows/publish.yml' || run.status !== 'completed' ||
      run.conclusion !== 'success' || !Number.isSafeInteger(run.id) || run.id < 1 ||
      !Number.isSafeInteger(run.run_attempt) || run.run_attempt < 1 || !/^[a-f0-9]{40}$/.test(run.head_sha ?? '')) {
    throw Error('Automatic completion requires the original successful release run');
  }
  releaseTarget(run.head_branch);
  return String(run.id);
}

export async function waitForApproval({target, readRegistry, dispatch, now=()=>performance.now(), wait=setTimeout,
  timeoutMs=30*60*1000, intervalMs=30000}) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 30*60*1000 ||
      !Number.isFinite(intervalMs) || intervalMs <= 0) throw Error('Invalid approval waiting budget');
  const deadline=now()+timeoutMs;
  while (now() < deadline) {
    const existing=await readRegistry(target.name,target.version,Math.min(10000,deadline-now()));
    if (now() >= deadline) break;
    if (existing !== null) {
      publicationDecision({target,existing,latest:null});
      await dispatch();
      return {status:'completion-dispatched'};
    }
    await wait(Math.min(intervalMs,Math.max(0,deadline-now())));
  }
  return {status:'approval-pending'};
}
