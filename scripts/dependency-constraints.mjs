/** Manifest compatibility is separate from exact lock/archive identity. */
import {createRequire} from 'node:module';
const semver = () => createRequire(new URL('../packages/appkit-core/package.json', import.meta.url))('semver');

/** The coordinated lanes support explicit exact, caret and tilde registry constraints. */
export function dependencyMinimum(constraint) {
  if (typeof constraint !== 'string' || !/^[~^]?[0-9]/.test(constraint) || /\s/.test(constraint)) throw Error('Expected an explicit registry constraint');
  const minimum = constraint.replace(/^[~^]/, '');
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.exec(minimum);
  if (!match || match.slice(1, 4).some(n => !Number.isSafeInteger(Number(n))) || match[4]?.split('.').some(n => /^\d+$/.test(n) && n.length > 1 && n[0] === '0')) throw Error('Expected an explicit registry constraint');
  return minimum;
}
export function dependencyAccepts(constraint, version) {
  dependencyMinimum(constraint);
  return Boolean(semver().valid(version) && semver().satisfies(version, constraint));
}
