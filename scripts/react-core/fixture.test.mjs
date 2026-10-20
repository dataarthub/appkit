import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtureManifest} from './fixture.mjs';
test('isolated tests declare their DOM test peer and use only the selected Core archive', () => {
  const react = {dependencies: {'@alneas/appkit-core': '0.1.0'}, devDependencies: {vitest: '4.1.12'}};
  const before = structuredClone(react);
  const manifest = fixtureManifest({react, plugin: '6.1.1', coreArchive: '/tmp/new-core.tgz', reactArchive: '/tmp/react.tgz'});
  assert.equal(manifest.dependencies['@testing-library/dom'], '10.4.2');
  assert.equal(manifest.dependencies['@alneas/appkit-core'], 'file:/tmp/new-core.tgz');
  assert.equal(manifest.overrides['@alneas/appkit-core'], '$@alneas/appkit-core');
  assert.deepEqual(react, before);
});
