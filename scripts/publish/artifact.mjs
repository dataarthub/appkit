import {readFileSync, lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
export function archiveIntegrity(file) {
  const stat = lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 100 * 1024 * 1024) throw Error('Invalid release archive');
  return 'sha512-' + createHash('sha512').update(readFileSync(file)).digest('base64');
}
export function verifyArtifact({file, manifest, target, expectedIntegrity = manifest.integrity}) {
  if (manifest.schemaVersion !== 1 || Object.entries(target).some(([key, value]) => manifest[key] !== value)) throw Error('Release artifact identity mismatch');
  if (manifest.integrity !== expectedIntegrity || archiveIntegrity(file) !== expectedIntegrity) throw Error('Release artifact integrity mismatch');
  const tar = args => execFileSync('tar', args, {encoding: 'utf8', timeout: 30000, maxBuffer: 20 * 1024 * 1024});
  const members = tar(['-tzf', file]).trim().split('\n');
  for (const entry of members) {
    if (entry === 'package/') continue;
    if (entry.split('/').some(p => p === '..') || /\.env|node_modules|\.verification|\.(test|spec)\./.test(entry) ||
        !/^package\/(dist\/|docs\/|consumer-ai\/|README.md$|CHANGELOG.md$|LICENSE$|THIRD_PARTY_NOTICES.md$|package.json$|llms(?:-full)?\.txt$)/.test(entry)) throw Error('Unexpected release archive member: ' + entry);
  }
  const pkg = JSON.parse(tar(['-xOf', file, 'package/package.json']));
  if (pkg.name !== target.name || pkg.version !== target.version || pkg.publishConfig?.access !== 'public' ||
      pkg.publishConfig.registry !== 'https://registry.npmjs.org') throw Error('Packed package identity or registry mismatch');
  if (pkg.files?.includes('CHANGELOG.md') && !members.includes('package/CHANGELOG.md')) throw Error('Missing packed changelog');
  if (members.includes('package/CHANGELOG.md')) {
    const heading = `## [${pkg.version}]`;
    if (!tar(['-xOf', file, 'package/CHANGELOG.md']).split('\n').some(line => line === heading || line.startsWith(heading + ' - '))) throw Error('Packed changelog version mismatch');
  }
  function exported(value) {
    if (typeof value === 'string') {
      if (!members.includes('package/' + value.replace(/^\.\//, ''))) throw Error('Missing packed export: ' + value);
    } else Object.values(value).forEach(exported);
  }
  Object.values(pkg.exports).forEach(exported);
  return pkg;
}
