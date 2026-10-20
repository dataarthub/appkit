function version(text) {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.exec(text ?? '');
  if (!match || match[0] !== text || match[4]?.split('.').some(n => /^\d+$/.test(n) && n.length > 1 && n[0] === '0')) throw Error('Invalid npm tag version: ' + text);
  return {numbers: match.slice(1,4).map(BigInt), prerelease: match[4]?.split('.')};
}
export function compareTagVersions(a, b) {
  a = version(a); b = version(b);
  for (let i=0;i<3;i++) if (a.numbers[i] !== b.numbers[i]) return a.numbers[i] > b.numbers[i] ? 1 : -1;
  if (!a.prerelease || !b.prerelease) return a.prerelease ? -1 : b.prerelease ? 1 : 0;
  for (let i=0;i<Math.max(a.prerelease.length,b.prerelease.length);i++) {
    const x=a.prerelease[i], y=b.prerelease[i];
    if (x===y) continue;
    if (x===undefined || y===undefined) return x===undefined ? -1 : 1;
    const xn=/^\d+$/.test(x), yn=/^\d+$/.test(y);
    if (xn!==yn) return xn ? -1 : 1;
    return (xn ? BigInt(x)>BigInt(y) : x>y) ? 1 : -1;
  }
  return 0;
}
export function requiredDistTags(releaseVersion) {
  return compareTagVersions(releaseVersion, '1.0.0') < 0 ? ['beta','latest'] : ['latest'];
}
export function planTagUpdates(releaseVersion, tags) {
  if (!tags || typeof tags !== 'object' || Array.isArray(tags)) throw Error('Invalid npm dist-tags response');
  const required = requiredDistTags(releaseVersion);
  for (const tag of required) {
    if (tags[tag] !== undefined && compareTagVersions(tags[tag], releaseVersion) > 0) throw Error(`Refusing to move npm ${tag} backwards`);
  }
  return required.filter(tag => tags[tag] !== releaseVersion);
}
