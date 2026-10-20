import {setTimeout} from 'node:timers/promises';
import {publicationDecision} from './contract.mjs';
export async function publishVerified({target, file, verifyArchive, readRegistry, publish, wait = setTimeout}) {
  await verifyArchive();
  const existing = await readRegistry(target.name, target.version);
  const latest = existing === null ? await readRegistry(target.name, 'latest') : null;
  if (latest && latest.name !== target.name) throw Error('Unexpected registry latest package identity');
  const decision = publicationDecision({target, existing, latest: latest?.version ?? null});
  if (decision === 'already-published') return {status: decision, name: target.name, version: target.version, integrity: target.integrity};
  await verifyArchive();
  await publish(file);
  let observed;
  for (let attempt = 0; attempt < 6; attempt++) {
    observed = await readRegistry(target.name, target.version);
    if (observed !== null) break;
    await wait(2000);
  }
  if (observed === null) throw Error('Published version is not yet visible; rerun after registry propagation');
  publicationDecision({target, existing: observed, latest: null});
  return {status: 'published', name: target.name, version: target.version, integrity: target.integrity};
}
