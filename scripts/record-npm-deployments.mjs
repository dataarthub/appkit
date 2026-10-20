import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const repository = 'dataarthub/appkit';
const prefix = `repos/${repository}`;
const tagPattern = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
export function parseArguments(args) {
  let tag, apply = false;
  while (args.length) {
    const arg = args.shift();
    if (arg === '--tag' && tag === undefined) tag = args.shift();
    else if (arg === '--apply' && !apply) apply = true;
    else throw Error('Usage: node scripts/record-npm-deployments.mjs --tag v0.1.0 [--apply]');
  }
  if (!tagPattern.test(tag ?? '')) throw Error('An explicit version tag such as v0.1.0 is required.');
  return {tag, apply};
}
function github(method, endpoint, body) {
  const args = ['api', '--method', method, '-H', 'Accept: application/vnd.github+json', endpoint];
  if (body !== undefined) args.push('--input', '-');
  return JSON.parse(execFileSync('gh', args, {
    input: body === undefined ? undefined : JSON.stringify(body),
    encoding: 'utf8', timeout: 30000, maxBuffer: 8 * 1024 * 1024,
  }));
}
async function npmVersion(name, version) {
  const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}/${encodeURIComponent(version)}`, {
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw Error(`${name}@${version} is not available: HTTP ${response.status}`);
  return response.json();
}
async function list(api, endpoint) {
  const results = [];
  for (let page = 1; ; page++) {
    const entries = await api('GET', `${endpoint}${endpoint.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
    if (!Array.isArray(entries)) throw Error('Unexpected GitHub list response');
    results.push(...entries);
    if (entries.length < 100) return results;
  }
}
export async function recordDeployments({tag, apply = false, api = github, registry = npmVersion}) {
  if (!tagPattern.test(tag ?? '')) throw Error('An explicit version tag is required.');
  const version = tag.slice(1);
  let {object} = await api('GET', `${prefix}/git/ref/tags/${encodeURIComponent(tag)}`);
  for (let depth = 0; object?.type === 'tag' && depth < 5; depth++) {
    ({object} = await api('GET', `${prefix}/git/tags/${object.sha}`));
  }
  if (object?.type !== 'commit' || !/^[0-9a-f]{40}$/.test(object.sha)) throw Error('Tag does not resolve to a commit.');
  const sha = object.sha;
  const packages = [];
  // Check both registry versions and existing records before the first mutation.
  for (const suffix of ['core', 'react']) {
    const name = '@alneas/appkit-' + suffix;
    const metadata = await registry(name, version);
    if (metadata.name !== name || metadata.version !== version ||
        !/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(metadata.dist?.integrity ?? '')) {
      throw Error(`Invalid npm metadata for ${name}@${version}`);
    }
    const environment = 'npm-' + suffix;
    const url = 'https://www.npmjs.com/package/' + name;
    const payload = {kind: 'npm-publication-record', package: name, version, tag, integrity: metadata.dist.integrity, retrospective: true};
    const query = new URLSearchParams({sha, environment, task: 'record:npm'});
    const existing = await list(api, `${prefix}/deployments?${query}`);
    for (const record of existing) {
      let recorded = record.payload;
      if (typeof recorded === 'string') { try { recorded = JSON.parse(recorded); } catch { recorded = null; } }
      if (record.sha !== sha || record.environment !== environment || record.task !== 'record:npm' ||
          Object.entries(payload).some(([key, value]) => recorded?.[key] !== value)) {
        throw Error(`Found conflicting deployment for ${name}@${version}; review it manually.`);
      }
    }
    if (existing.length > 1) throw Error(`Found conflicting duplicate deployments for ${name}@${version}.`);
    const deployment = existing[0];
    const statuses = deployment ? await list(api, `${prefix}/deployments/${deployment.id}/statuses`) : [];
    packages.push({name, environment, url, payload, deploymentId: deployment?.id,
      successful: statuses[0]?.state === 'success' && statuses[0]?.environment_url === url});
  }
  if (apply) {
    for (const item of packages) {
      if (item.successful) continue;
      if (!item.deploymentId) {
        const deployment = await api('POST', `${prefix}/deployments`, {
          ref: sha, task: 'record:npm', auto_merge: false, required_contexts: [],
          environment: item.environment, production_environment: true, transient_environment: false,
          description: `Retrospective npm publication record: ${item.name}@${version}`,
          payload: item.payload,
        });
        if (!Number.isSafeInteger(deployment.id) || deployment.sha !== sha) throw Error('Unexpected deployment response; no success status recorded.');
        item.deploymentId = deployment.id;
      }
      await api('POST', `${prefix}/deployments/${item.deploymentId}/statuses`, {
        state: 'success', environment_url: item.url, auto_inactive: false,
        description: `npm ${version} exists; recorded retrospectively, not republished`,
      });
      item.successful = true;
    }
  }
  return {repository, tag, sha, apply, packages};
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    console.log(JSON.stringify(await recordDeployments(parseArguments(process.argv.slice(2))), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
