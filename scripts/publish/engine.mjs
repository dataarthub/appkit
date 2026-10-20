import {setTimeout} from 'node:timers/promises';
import {publicationDecision} from './contract.mjs';
import {requiredDistTags, planTagUpdates} from './dist-tags.mjs';

// A successful stage is deliberately not a successful public deployment.
export async function stageVerified({target, file, verifyArchive, readRegistry, readTags, stage}) {
  await verifyArchive();
  const existing = await readRegistry(target.name, target.version);
  const decision = publicationDecision({target, existing, latest:null});
  planTagUpdates(target.version, await readTags(target.name));
  if (decision === 'already-published') return {status:decision, name:target.name, version:target.version};
  await verifyArchive();
  // Never retry an ambiguous upload: the version may already be reserved in staging.
  await stage(file, 'staged');
  return {status:'awaiting-approval', name:target.name, version:target.version, integrity:target.integrity};
}

export async function finalizeVerified({target, verifyArchive, readRegistry, readTags, setTag, wait = setTimeout, attempts = 60}) {
  await verifyArchive();
  let observed = null;
  for (let attempt=0; attempt<attempts; attempt++) {
    observed = await readRegistry(target.name, target.version);
    if (observed !== null) break;
    await wait(5000);
  }
  if (observed === null) throw Error('Approval not yet visible on npm; approve with 2FA, then retry completion (no re-staging)');
  publicationDecision({target, existing:observed, latest:null});
  const required = requiredDistTags(target.version);
  for (const tag of required) {
    const missing = planTagUpdates(target.version, await readTags(target.name));
    if (missing.includes(tag)) await setTag(target.name, target.version, tag);
  }
  for (let attempt=0; attempt<attempts; attempt++) {
    if (planTagUpdates(target.version, await readTags(target.name)).length === 0) {
      return {status:'published', name:target.name, version:target.version, integrity:target.integrity, tags:required};
    }
    await wait(5000);
  }
  throw Error('Required npm dist-tags were not confirmed; retry completion without re-staging');
}
