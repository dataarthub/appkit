import {readFileSync, appendFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {releaseContext, root} from './context.mjs';
import {verifyArtifact} from './artifact.mjs';
import {stageVerified, finalizeVerified} from './engine.mjs';
// OIDC can stage or repair tags; approval always requires a maintainer's npm 2FA.
if (process.env.APPKIT_NPM_PUBLISH !== 'true' || !process.env.ACTIONS_ID_TOKEN_REQUEST_URL ||
    !process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN || process.env.NODE_AUTH_TOKEN || process.env.NPM_TOKEN) {
  throw Error('OIDC publication job is required; npm write tokens and local publication are not accepted');
}
const selected = releaseContext();
const directory = path.join(root, '.verification/publish');
const file = path.join(directory, 'package.tgz');
const manifest = JSON.parse(readFileSync(path.join(directory, 'release.json'), 'utf8'));
const completing = process.env.GITHUB_EVENT_NAME === 'workflow_dispatch';
const expectedIntegrity = completing ? manifest.integrity : process.env.VERIFIED_INTEGRITY;
if (!/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(expectedIntegrity ?? '')) throw Error('Verified artifact digest is required');
const target = {...selected, integrity: expectedIntegrity};
async function readRegistry(name, version) {
  const suffix = version === undefined ? '' : '/' + encodeURIComponent(version);
  const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}${suffix}`, {signal: AbortSignal.timeout(30000)});
  if (response.status === 404) return null;
  if (!response.ok) throw Error('Registry check failed: HTTP ' + response.status);
  return response.json();
}
const result = await (completing ? finalizeVerified : stageVerified)({target, file,
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
  stage: (archive, tag) => execFileSync('npm', ['stage', 'publish', archive, '--provenance', '--access', 'public', '--tag', tag,
    '--ignore-scripts', '--workspaces=false', '--registry=https://registry.npmjs.org'], {cwd: directory, stdio: 'inherit', timeout: 180000}),
});
console.log(JSON.stringify(result));

if (completing) {
  const {recordPublication} = await import('./deployment.mjs');
  const {github} = await import('./github.mjs');
  await recordPublication({target, api:github});
}
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,
  `\n### ${result.status}\n\n${target.name}@${target.version}\n\nArchive integrity: ${target.integrity}\n\n` +
  (completing ? 'Registry integrity and required tags confirmed; Deployment recorded.\n' :
    (result.status === 'already-published' ? `This exact archive is already public; run manual completion with staged_run **${process.env.GITHUB_RUN_ID}** to confirm tags and Deployment.\n` :
    `Inspect and approve this version in npm Staged Packages with 2FA. Then run **Publish package release** manually on main, with staged_run **${process.env.GITHUB_RUN_ID}**. Do not rerun staging to finish publication.\n`)));
