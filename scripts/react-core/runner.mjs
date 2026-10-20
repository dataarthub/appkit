import {readFileSync, realpathSync, existsSync, lstatSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {matrixVerdict} from './policy.mjs';
const json = file => JSON.parse(readFileSync(file, 'utf8'));
export function verifyInstalledCore(root, expected) {
  const core = path.join(root, 'node_modules/@alneas/appkit-core');
  if (lstatSync(core).isSymbolicLink() || !realpathSync(core).startsWith(realpathSync(root) + path.sep)) throw Error('Core symlink or resolution outside isolated consumer');
  const nested = path.join(root, 'node_modules/@alneas/appkit-react/node_modules/@alneas/appkit-core');
  if (existsSync(nested) && realpathSync(nested) !== realpathSync(core)) throw Error('React resolves a different Core');
  for (const manifest of ['package.json', 'node_modules/@alneas/appkit-react/package.json']) {
    const entry = realpathSync(createRequire(path.join(root, manifest)).resolve('@alneas/appkit-core'));
    if (!entry.startsWith(realpathSync(core) + path.sep)) throw Error('React resolves a different Core');
  }
  const installed = json(path.join(core, 'package.json'));
  const locked = json(path.join(root, 'package-lock.json')).packages?.['node_modules/@alneas/appkit-core'];
  if (installed.name !== '@alneas/appkit-core' || installed.version !== expected.version || locked?.integrity !== expected.integrity) throw Error('Installed Core version or archive integrity mismatch');
  return {version: installed.version, integrity: locked.integrity};
}
export async function runMatrix(probe) {
  const lanes = {};
  for (const name of ['current', 'candidate']) {
    try {
      const result = await probe(name);
      if (result?.passed !== true) throw Error('Lane did not return a verified pass');
      lanes[name] = result;
    } catch (error) {lanes[name] = {passed: false, error: error.message};}
  }
  return {...matrixVerdict({current: lanes.current.passed, candidate: lanes.candidate.passed}), lanes};
}
