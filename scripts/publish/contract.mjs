const repository = 'https://github.com/dataarthub/appkit.git';
function stableVersion(text) {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(text ?? '');
  if (!match || match[0] !== text || match.slice(1).some(n => !Number.isSafeInteger(Number(n)))) throw Error('Expected a stable X.Y.Z version');
  return match.slice(1).map(Number);
}
export function releaseTarget(tag) {
  const match = /^appkit-(core|react)-v(.+)$/.exec(tag ?? '');
  if (!match || match[0] !== tag) throw Error('Expected appkit-core-vX.Y.Z or appkit-react-vX.Y.Z');
  const [, key, version] = match;
  stableVersion(version);
  const name = '@alneas/appkit-' + key;
  return {key, name, version, directory: 'packages/appkit-' + key, environment: 'npm-' + key, url: 'https://www.npmjs.com/package/' + name};
}
export function validateRelease({event, headSha, tagSha, onMain, manifests}) {
  if (event?.action !== 'published' || event.repository?.full_name !== 'dataarthub/appkit' ||
      event.release?.draft !== false || event.release?.prerelease !== false) throw Error('Only a published stable release in dataarthub/appkit can publish');
  const target = releaseTarget(event.release.tag_name);
  if (!/^[a-f0-9]{40}$/.test(headSha ?? '') || headSha !== tagSha || onMain !== true) throw Error('Release tag must identify this exact commit on main');
  const pkg = manifests[target.key];
  if (pkg?.name !== target.name || pkg.version !== target.version || pkg.repository?.url !== repository ||
      pkg.publishConfig?.access !== 'public' || (pkg.publishConfig.registry && pkg.publishConfig.registry !== 'https://registry.npmjs.org')) throw Error('Tag and public package manifest do not agree');
  return {...target, tag: event.release.tag_name, sha: headSha};
}
export function publicationDecision({target, existing, latest}) {
  if (existing !== null) {
    if (existing?.name !== target.name || existing.version !== target.version || existing.dist?.integrity !== target.integrity) throw Error('Existing npm version has different identity or integrity; refusing to overwrite or claim success');
    return 'already-published';
  }
  const wanted = stableVersion(target.version);
  if (latest !== null) {
    const previous = stableVersion(latest);
    const index = wanted.findIndex((n, i) => n !== previous[i]);
    if (index === -1 || wanted[index] < previous[index]) throw Error('Refusing to move npm latest backwards; use a separate maintenance-release policy');
  }
  return 'publish';
}
