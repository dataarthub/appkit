import {readFileSync, appendFileSync} from 'node:fs';
import {execFileSync, spawnSync} from 'node:child_process';
import path from 'node:path';
import {releaseTarget, validateRelease} from './contract.mjs';
export const root = path.resolve(import.meta.dirname, '../..');
export function releaseContext(env = process.env) {
  if (!['release','workflow_dispatch'].includes(env.GITHUB_EVENT_NAME) || env.GITHUB_REPOSITORY !== 'dataarthub/appkit' || env.GITHUB_ACTIONS !== 'true') throw Error('This command requires the GitHub release workflow');
  let event = JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, 'utf8'));
  const resume = env.GITHUB_EVENT_NAME === 'workflow_dispatch';
  if (resume) {
    if (env.GITHUB_REF !== 'refs/heads/main' || !/^[a-f0-9]{40}$/.test(env.PUBLISH_SOURCE_SHA ?? '')) throw Error('Validated completion context is required');
    releaseTarget(env.PUBLISH_RELEASE_TAG);
    const release = JSON.parse(execFileSync('gh', ['api', `repos/dataarthub/appkit/releases/tags/${env.PUBLISH_RELEASE_TAG}`], {encoding:'utf8', timeout:30000, env}));
    event = {action:'published', repository:{full_name:'dataarthub/appkit'}, release};
  }
  releaseTarget(event.release?.tag_name);
  const git = args => execFileSync('git', args, {cwd: root, encoding: 'utf8', timeout: 10000}).trim();
  const headSha = git(['rev-parse', 'HEAD']);
  if (headSha !== (resume ? env.PUBLISH_SOURCE_SHA : env.GITHUB_SHA)) throw Error('Checked-out commit differs from release event SHA');
  const tagSha = git(['rev-parse', '--verify', `refs/tags/${event.release.tag_name}^{commit}`]);
  const onMain = spawnSync('git', ['merge-base', '--is-ancestor', headSha, 'refs/remotes/origin/main'], {cwd: root}).status === 0;
  const manifests = Object.fromEntries(['core', 'react'].map(key => [key, JSON.parse(readFileSync(path.join(root, 'packages/appkit-' + key, 'package.json')))]));
  return validateRelease({event, headSha, tagSha, onMain, manifests});
}
export function outputs(target) {
  if (!process.env.GITHUB_OUTPUT) throw Error('GITHUB_OUTPUT is required');
  for (const [key, value] of Object.entries(target)) {
    if (typeof value !== 'string' || /[\r\n]/.test(value) || !/^[a-z]+$/.test(key)) throw Error('Invalid workflow output');
    appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
  }
}
