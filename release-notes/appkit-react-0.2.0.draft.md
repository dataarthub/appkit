# Appkit React 0.2.0 — unreleased draft

This is a preparation record, not a published changelog entry. React's manifest
version and exact Core dependency remain `0.1.0` during Core preparation.

Before preparing React's release PR:

1. Confirm Core 0.2.0 was published successfully, including its archive integrity,
   provenance and `beta`/`latest` mappings.
2. Update React's version to 0.2.0 and its exact Core dependency to 0.2.0. Update the
   lockfile and generated metadata. Do not use a workspace/file/link dependency.
3. Move the reviewed notes below into `packages/appkit-react/CHANGELOG.md`, above
   the initial 0.1.0 entry. Include that file in React's npm `files`, add the
   package-specific HTTPS history link to README and remove this consumed draft.
4. Run both declared/candidate Core compatibility lanes, the strict
   `check:react-core --release` gate, affected source checks and exact packed
   consumers. Require successful main Public quality for the final release SHA.
5. Derive the GitHub Release body from that same reviewed version entry. A tag,
   GitHub Release and npm publication each require their own authorization.

## Proposed 0.2.0 entry

### Added

- Discoverable agent instructions, package context and API catalog in
  `consumer-ai/`, with the `appkit.agent` manifest field and public
  `@alneas/appkit-react/api-index.json` export. Core's `appkit-api` CLI can inspect
  the React catalog when this package is installed.

### Fixed

- Make Ajv resolver field-error entries writable so React Hook Form can update
  and clear them without property-assignment errors.
- Improve accessible names, live error announcements, semantic table markup,
  keyboard/drag interactions and theme behavior across the affected UI components.
  Include the reviewed DataTable, editable table, file preview, calendar, Gantt,
  Kanban, workflow and theme-control changes; do not claim every component or
  arbitrary host color palette has been audited.

### Changed

- Adopt Core 0.2.0's AI error codes, documentation URLs and recovery metadata.
  This is pending the dependency update above; an independently published Core
  does not change existing React installations.
- Expand public component/hook JSDoc and canonical import/setup examples.
- Add a cumulative, packaged change history and a visible README history link
  when this draft is consumed into the release PR.

### Upgrade notes

- Keep React 19 and Node.js 24 or newer, the documented providers and explicit
  stylesheet import. Review peer requirements for each optional feature.
- Applications still own AI tool approval, server authorization and durable
  idempotency. Core recovery metadata does not authorize retries or execution.
- The public Storybook catalog and its automated state/accessibility tests are
  repository development tools. They are not a new npm runtime dependency or
  proof of hosted-provider behavior.

## Initial history to retain

### 0.1.0

Initial public release of React UI, forms, tables, providers and AI bindings.

## Review sources

Compare React's shipped files with `v0.1.0`, especially PR #2 (form errors), #4
(agent discovery), #8 (UI fixes/Storybook) and #9 (public API documentation).
Reconcile this draft against changes merged after the current preparation before
assigning its final version/date.
