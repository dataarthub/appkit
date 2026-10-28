import {dependencyMinimum} from '../dependency-constraints.mjs';
function version(value) {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.exec(value ?? '');
  if (!match || match.slice(1, 4).some(n => !Number.isSafeInteger(Number(n))) ||
      match[4]?.split('.').some(n => /^\d+$/.test(n) && (n.length > 1 && n[0] === '0'))) throw Error('Expected an exact semantic version: ' + value);
  return {numbers: match.slice(1, 4).map(Number), prerelease: match[4]?.split('.')};
}
function compare(a, b) {
  a = version(a); b = version(b);
  for (let i = 0; i < 3; i++) if (a.numbers[i] !== b.numbers[i]) return a.numbers[i] > b.numbers[i] ? 1 : -1;
  if (!a.prerelease || !b.prerelease) return a.prerelease ? -1 : b.prerelease ? 1 : 0;
  for (let i = 0; i < Math.max(a.prerelease.length, b.prerelease.length); i++) {
    const x = a.prerelease[i], y = b.prerelease[i];
    if (x === y) continue;
    if (x === undefined || y === undefined) return x === undefined ? -1 : 1;
    const xn = /^\d+$/.test(x), yn = /^\d+$/.test(y);
    if (xn !== yn) return xn ? -1 : 1;
    if (xn && x.length !== y.length) return x.length > y.length ? 1 : -1;
    return x > y ? 1 : -1;
  }
  return 0;
}
export function checkPolicy({core, react, policy, release = false}) {
  version(core.version); version(react.version);
  const coreConstraint = react.dependencies?.['@alneas/appkit-core'];
  const requiredCore = dependencyMinimum(coreConstraint);
  version(requiredCore);
  if (policy?.schemaVersion !== 1 || !Array.isArray(policy.requirements)) throw Error('Invalid react-core-policy.json');
  const ids = new Set();
  const pendingRequirements = [];
  for (const entry of policy.requirements) {
    if (!entry || typeof entry.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id) || ids.has(entry.id) ||
        typeof entry.reason !== 'string' || !entry.reason.trim()) throw Error('Invalid or duplicate React impact requirement');
    ids.add(entry.id);
    version(entry.coreVersion);
    if (entry.reactVersion !== undefined) version(entry.reactVersion);
    if (compare(core.version, entry.coreVersion) < 0) throw Error(`${entry.id}: Core version must first reach ${entry.coreVersion}`);
    if (compare(requiredCore, entry.coreVersion) < 0) {
      if (!release && entry.reactVersion !== undefined && compare(react.version, entry.reactVersion) < 0) {
        pendingRequirements.push(entry.id);
      } else throw Error(`${entry.id}: React dependency must use Core ${entry.coreVersion} or newer. ${entry.reason}`);
    }
  }
  return {requiredCore, coreConstraint, candidateCore: core.version, pendingRequirements};
}
export function matrixVerdict({current, candidate}) {
  if (current === true && candidate === true) return {passed: true, reason: 'Both Core combinations passed.'};
  if (current !== true && candidate === true) return {passed: false, reason: 'Current Core failed; review the React dependency update or fix compatibility.'};
  if (current === true && candidate !== true) return {passed: false, reason: 'The Core candidate breaks React compatibility; do not adopt it.'};
  return {passed: false, reason: 'Both Core combinations failed or were not verified.'};
}
