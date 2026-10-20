import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {releaseContext, root} from './context.mjs';
import {verifyArtifact} from './artifact.mjs';
import {publishVerified} from './engine.mjs';
// No manual/local publication mode. Tests inject a fake publisher into the engine.
if (process.env.APPKIT_NPM_PUBLISH !== 'true' || !process.env.ACTIONS_ID_TOKEN_REQUEST_URL ||
    !process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN || process.env.NODE_AUTH_TOKEN || process.env.NPM_TOKEN) {
  throw Error('OIDC publication job is required; npm write tokens and local publication are not accepted');
}
const selected = releaseContext();
const directory = path.join(root, '.verification/publish');
const file = path.join(directory, 'package.tgz');
const manifest = JSON.parse(readFileSync(path.join(directory, 'release.json'), 'utf8'));
const expectedIntegrity = process.env.VERIFIED_INTEGRITY;
if (!/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(expectedIntegrity ?? '')) throw Error('Verified artifact digest is required');
const target = {...selected, integrity: expectedIntegrity};
async function readRegistry(name, version) {
  const suffix = version === undefined ? '' : '/' + encodeURIComponent(version);
  const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}${suffix}`, {signal: AbortSignal.timeout(30000)});
  if (response.status === 404) return null;
  if (!response.ok) throw Error('Registry check failed: HTTP ' + response.status);
  return response.json();
}
const result = await publishVerified({target, file,
  verifyArchive: () => verifyArtifact({file, manifest, target: selected, expectedIntegrity}),
  readRegistry,
  readTags: async name => {
    const metadata = await readRegistry(name);
    if (metadata === null) return {};
    if (metadata.name !== name || !metadata['dist-tags']) throw Error('Unexpected registry package or dist-tags response');
    return metadata['dist-tags'];
  },
  setTag: (name, version, tag) => execFileSync('npm', ['dist-tag', 'add', `${name}@${version}`, tag,
    '--registry=https://registry.npmjs.org'], {cwd: directory, stdio: 'inherit', timeout: 60000}),
  publish: (archive, tag) => execFileSync('npm', ['publish', archive, '--provenance', '--access', 'public', '--tag', tag,
    '--ignore-scripts', '--workspaces=false', '--registry=https://registry.npmjs.org'], {cwd: directory, stdio: 'inherit', timeout: 180000}),
});
console.log(JSON.stringify(result));
