import {setTimeout} from 'node:timers/promises';
import {publicationDecision} from './contract.mjs';
import {requiredDistTags, planTagUpdates} from './dist-tags.mjs';
export async function publishVerified({target, file, verifyArchive, readRegistry, readTags, setTag, publish, wait = setTimeout}) {
  await verifyArchive();
  const existing = await readRegistry(target.name, target.version);
  // Tag planning checks both channels, including retries of existing archives.
  planTagUpdates(target.version, await readTags(target.name));
  const decision = publicationDecision({target, existing, latest: null});
  const required = requiredDistTags(target.version);
  if (decision === 'publish') {
    await verifyArchive();
    await publish(file, required[0]);
    let observed;
    for (let attempt = 0; attempt < 6; attempt++) {
      observed = await readRegistry(target.name, target.version);
      if (observed !== null) break;
      await wait(2000);
    }
    if (observed === null) throw Error('Published version is not yet visible; rerun after registry propagation');
    publicationDecision({target, existing: observed, latest: null});
  }
  for (const tag of required) {
    // Re-read before each write so a newer observed version is never overwritten.
    const missing = planTagUpdates(target.version, await readTags(target.name));
    if (missing.includes(tag)) await setTag(target.name, target.version, tag);
  }
  for (let attempt = 0; attempt < 6; attempt++) {
    if (planTagUpdates(target.version, await readTags(target.name)).length === 0) {
      return {status: decision === 'publish' ? 'published' : decision, name: target.name, version: target.version, integrity: target.integrity, tags: required};
    }
    await wait(2000);
  }
  throw Error('Required npm dist-tags were not confirmed; rerun to repair missing tags without republishing');
}
