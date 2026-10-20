export function fixtureManifest({react, plugin, coreArchive, reactArchive}) {
  return {name: 'appkit-react-compatibility-fixture', private: true, type: 'module',
    dependencies: {...react.dependencies, ...react.devDependencies,
      '@vitejs/plugin-react': plugin,
      // npm --legacy-peer-deps does not install Testing Library's DOM peer.
      '@testing-library/dom': '10.4.2',
      '@alneas/appkit-core': 'file:' + coreArchive,
      '@alneas/appkit-react': 'file:' + reactArchive},
    overrides: {'@alneas/appkit-core': '$@alneas/appkit-core'}};
}
