import {readFileSync, appendFileSync} from 'node:fs';
import {execFileSync, spawnSync} from 'node:child_process';
import path from 'node:path';
import {releaseTarget, validateRelease} from './contract.mjs';
export const root = path.resolve(import.meta.dirname, '../..');
export function releaseContext(env = process.env) {
  if (env.GITHUB_EVENT_NAME !== 'release' || env.GITHUB_REPOSITORY !== 'dataarthub/appkit' || env.GITHUB_ACTIONS !== 'true') throw Error('This command requires the GitHub release workflow');
  const event = JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, 'utf8'));
  releaseTarget(event.release?.tag_name);
  const git = args => execFileSync('git', args, {cwd: root, encoding: 'utf8', timeout: 10000}).trim();
  const headSha = git(['rev-parse', 'HEAD']);
  if (headSha !== env.GITHUB_SHA) throw Error('Checked-out commit differs from release event SHA');
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
