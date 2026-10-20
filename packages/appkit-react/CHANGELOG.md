# Changelog

Consumer-facing changes for `@alneas/appkit-react`, newest first. A versioned entry
may be prepared before publication; confirm availability on the
[npm package page](https://www.npmjs.com/package/@alneas/appkit-react). Publication
dates are recorded only when confirmed.

## [0.2.0]

### Added

- Discoverable agent instructions, package context and API catalog in
  `consumer-ai/`, identified by the `appkit.agent` manifest field, and the public
  `@alneas/appkit-react/api-index.json` export. Core's `appkit-api` CLI can inspect
  the React catalog when this package is installed.
- This cumulative changelog, included in the npm archive and linked from README.

### Fixed

- Make Ajv resolver field-error entries writable so React Hook Form can update
  and clear them without property-assignment errors.
- Improve accessible names, live error announcements, semantic table markup,
  keyboard/drag interactions and theme behavior in the reviewed DataTable,
  editable table, file preview, calendar, Gantt, Kanban, workflow and theme controls.
  These changes do not certify every component or arbitrary host color palette.

### Changed

- Pin the runtime Core dependency to `0.2.0`, adopting its AI error codes,
  documentation URLs and recovery metadata. Publishing Core independently does
  not update older React installations' exact dependency.
- Expand public component/hook JSDoc and canonical import/setup examples.

### Upgrade from 0.1.0

- After this version is published, install `@alneas/appkit-react@0.2.0`. Applications
  importing Core directly should install `@alneas/appkit-core@0.2.0` as well so
  their direct dependency agrees with React's exact Core dependency.
- Keep Node.js 24 or newer and React/React DOM `^19.2.3`, the documented providers
  and the explicit stylesheet import. Review peers for each optional feature.
- Applications still own AI tool approval, server authorization and durable
  idempotency. Core recovery metadata does not authorize retries or execution.
- The public Storybook catalog and its automated state/accessibility tests are
  repository development tools, not a new npm runtime dependency or proof of
  hosted-provider behavior.

## [0.1.0]

- Initial public release of React UI, forms, tables, providers and AI bindings,
  with ESM, CommonJS, TypeScript declarations and explicit styles.

[0.2.0]: https://github.com/dataarthub/appkit/compare/v0.1.0...appkit-react-v0.2.0
[0.1.0]: https://github.com/dataarthub/appkit/releases/tag/v0.1.0
