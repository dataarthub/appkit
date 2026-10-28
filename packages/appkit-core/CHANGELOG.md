# Changelog

Consumer-facing changes for `@alneas/appkit-core`, newest first. A versioned entry
may be prepared before publication; confirm availability on the
[npm package page](https://www.npmjs.com/package/@alneas/appkit-core). Publication
dates are recorded only when confirmed.

## [0.2.2]

### Fixed

- Combine createAjvValidator documentation into one remarks block, preserving its
  validation defaults and host/runtime requirements. Strict TypeDoc consumers can
  process the published declarations without duplicate-tag warnings. Callable
  types, runtime statements, exports and production dependencies are unchanged.

### Upgrade from 0.2.1

- This is an independently prepared documentation patch; confirm npm publication
  before adopting it. Existing 0.2.1 archives and tags remain immutable.
- Publish Core 0.2.2 first. Only after publication may the prepared React 0.3.1
  dependency change from published Core 0.2.1 to exact 0.2.2; refresh and verify its
  lockfile and consumers before React publication. Source preparation is not
  publication evidence and does not authorize registry writes.

## [0.2.1]

### Changed

- Simplify the npm README to a concise English description, usage example and
  documentation/history links. Regenerate the bundled landing page, full
  documentation and consumer catalog metadata from that source.
- Refresh maintainer type-check/test tooling and compatibility coverage. Public
  APIs, runtime requirements, production dependencies and application behavior
  are unchanged; no runtime fix requires React to adopt this patch.

### Upgrade from 0.2.0

- This patch delivers documentation improvements to npm consumers. Confirm npm
  availability before updating; a prepared changelog is not publication proof.
- No application migration is required. React 0.3.0 continues to depend exactly
  on published Core 0.2.0 and remains independently releasable. Publishing Core
  0.2.1 does not update that dependency or existing installations.
- Previously published 0.2.0 bytes are immutable; deliver these corrections only
  through the new 0.2.1 archive.

## [0.2.0]

### Added

- `appkit-api search` and `appkit-api show`: search installed public API catalogs
  from the command line without contacting an AI provider or executing application
  tools. Core-only installations do not need React or TypeScript to run the CLI.
- A public `@alneas/appkit-core/api-index.json` export and discoverable agent
  instructions, package context and API catalog under `consumer-ai/`. The
  `appkit.agent` manifest field identifies these entry points.
- `AIChatError` and `getAIErrorInfo` from `@alneas/appkit-core/ai`, with stable chat
  failure codes, documentation URLs and fixed recovery guidance. Action and tool
  failures can include optional `docsUrl` and `recovery` fields.
- This cumulative changelog, included in the npm archive and linked from README.

### Changed

- Appkit-owned chat configuration, HTTP and stream failures use `AIChatError`
  instead of an unclassified `Error`. They remain native `Error` instances;
  `name` is now `AIChatError`. Recovery guidance does not trigger automatic retries.
- Expand public API JSDoc, import examples, optional-peer requirements and feature
  guides so consumers can check setup, return values and failure behavior.

### Security guidance

- Document prompt-injection trust boundaries and an application-owned approval
  example that binds calls to immutable arguments, sessions and registrations.
  Schema validation and browser approval do not replace server authorization or
  durable idempotency. Existing adapters do not execute or approve tools.

### Upgrade from 0.1.0

- Keep Node.js 24 or newer. After this version is published, install
  `@alneas/appkit-core@0.2.0`; use the CLI with
  `npx --package=@alneas/appkit-core@0.2.0 appkit-api search ActionRegistry --json`.
  The published 0.1.0 package does not contain this CLI or the new error APIs.
- Prefer error codes and recovery metadata over matching error text or requiring
  `error.name === 'Error'`. Unknown catalog codes return no recovery metadata;
  inspect failures before retrying operations with side effects.
- Retain explicit application approval and server checks for writes. The new
  examples and metadata do not authorize execution.
- React remains independently versioned. Publishing Core does not update an
  existing React installation's exact Core dependency; React 0.2.0 adoption is a
  separate preparation after Core 0.2.0 is available in npm.

## [0.1.0]

- Initial public release of the framework-independent storage, data/schema, graph,
  AI and regional business APIs, with ESM, CommonJS and TypeScript declarations.

[0.2.1]: https://github.com/dataarthub/appkit/compare/appkit-core-v0.2.0...appkit-core-v0.2.1
[0.2.0]: https://github.com/dataarthub/appkit/compare/v0.1.0...appkit-core-v0.2.0
[0.1.0]: https://github.com/dataarthub/appkit/releases/tag/v0.1.0
