import test from 'node:test';
import assert from 'node:assert/strict';
import {releaseTarget, validateRelease, publicationDecision} from './contract.mjs';
const sha = 'a'.repeat(40);
const manifests = {
  core: {name: '@alneas/appkit-core', version: '0.1.1', repository: {url: 'https://github.com/dataarthub/appkit.git'}, publishConfig: {access: 'public'}},
  react: {name: '@alneas/appkit-react', version: '0.2.0', repository: {url: 'https://github.com/dataarthub/appkit.git'}, publishConfig: {access: 'public'}},
};
const event = {action: 'published', repository: {full_name: 'dataarthub/appkit'}, release: {tag_name: 'appkit-core-v0.1.1', draft: false, prerelease: false}};
test('package tags choose exactly one independent version and deployment environment', () => {
  assert.deepEqual(releaseTarget('appkit-react-v0.2.0'), {key: 'react', name: '@alneas/appkit-react', version: '0.2.0', directory: 'packages/appkit-react', environment: 'npm-react', url: 'https://www.npmjs.com/package/@alneas/appkit-react'});
  assert.equal(validateRelease({event, headSha: sha, tagSha: sha, onMain: true, manifests}).key, 'core');
});
test('legacy, prerelease, injected, malformed and unrelated tags cannot publish', () => {
  for (const tag of ['v0.1.0', 'appkit-other-v0.1.1', 'appkit-core-v01.1.1', 'appkit-react-v0.1.1-beta.1', 'appkit-core-v0.1.1;echo', 'appkit-core-v0.1.1\n']) assert.throws(() => releaseTarget(tag));
});
test('release source identity and actual package version must agree', () => {
  for (const changed of [{headSha: 'b'.repeat(40)}, {tagSha: 'b'.repeat(40)}, {onMain: false}, {manifests: {...manifests, core: {...manifests.core, version: '0.1.2'}}}]) {
    assert.throws(() => validateRelease({event, headSha: sha, tagSha: sha, onMain: true, manifests, ...changed}));
  }
  for (const changed of [{draft: true}, {prerelease: true}]) assert.throws(() => validateRelease({event: {...event, release: {...event.release, ...changed}}, headSha: sha, tagSha: sha, onMain: true, manifests}));
  assert.throws(() => validateRelease({event: {...event, action: 'edited'}, headSha: sha, tagSha: sha, onMain: true, manifests}));
});
test('existing versions are reused only for an identical reviewed archive', () => {
  const target = {...releaseTarget('appkit-core-v0.1.1'), integrity: 'sha512-reviewed'};
  const existing = {name: target.name, version: target.version, dist: {integrity: target.integrity}};
  assert.equal(publicationDecision({target, existing, latest: '0.2.0'}), 'already-published');
  assert.throws(() => publicationDecision({target, existing: {...existing, dist: {integrity: 'sha512-other'}}, latest: '0.1.0'}), /integrity/);
  assert.equal(publicationDecision({target, existing: null, latest: '0.1.0'}), 'publish');
  assert.throws(() => publicationDecision({target, existing: null, latest: '0.2.0'}), /latest/);
  assert.equal(publicationDecision({target: {...target, version: '0.1.10'}, existing: null, latest: '0.1.9'}), 'publish');
});
