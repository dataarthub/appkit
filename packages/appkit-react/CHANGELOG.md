# Changelog

Consumer-facing changes for `@alneas/appkit-react`, newest first. A versioned entry
may be prepared before publication; confirm availability on the
[npm package page](https://www.npmjs.com/package/@alneas/appkit-react). Publication
dates are recorded only when confirmed.

## [0.3.1]

### Fixed

- Preserve the KanbanColumnFrame registration/ref requirements in one JSDoc remarks
  block so strict API documentation consumers retain the full guidance without
  duplicate-tag warnings. Runtime behavior and callable types are unchanged.

- Correct GenerativeUIRenderer declaration documentation to retain all rendering
  requirements and fallback notes in one remarks block. Strict TypeDoc consumers
  can generate API documentation without duplicate-tag warnings; runtime behavior,
  exports and callable types are unchanged.
- Require the published Core **^0.2.2** documentation patch. The compatible range
  admits Core 0.2.x updates while excluding older declaration documentation;
  applications retain exact resolved versions and integrity in their lockfile.
  Verify that React and any host Core dependency resolve one shared installation.
- This patch aligns the delivered Core documentation and dependency resolution;
  it adds no public API changes. The breaking migration from React 0.2.x remains
  documented under 0.3.0 and in the bundled migration guide.
- This entry describes release preparation. Confirm npm availability before
  adopting React 0.3.1; published React 0.3.0 continues to require Core 0.2.0.

- Remove deprecated `aria-grabbed` from DataTable, shared Draggable/FileBrowser activators and enabled Kanban cards while
  retaining `aria-pressed`, keyboard/pointer dragging, screen-reader instructions
  and live announcements. This correction requires a new React package release;
  published 0.3.0 archives do not contain it.

## [0.3.0]

### Breaking changes

- Move all Appkit drag surfaces to native dnd-kit React 0.5.1. Generic provider
  events use nullable `operation.source` / `target`, direct entity `data`, and
  `event.canceled` in `onDragEnd`; the separate `onDragCancel` prop is removed.
- Draggable render props use `ref` / `handleRef` instead of `attributes`,
  `listeners` and `setNodeRef`; droppable props use `ref` / `isDropTarget`.
  Native feedback owns movement; render-prop `style` is presentation only.
- Exported Kanban sensors, controller context props and custom surfaces use the
  native engine. High-level component props, business callbacks and FileProvider
  operations remain; `resolveKanbanMove` retains its structural legacy input.
- DOM-ref wrappers expose ordinary React 19 function component types. Normal JSX
  props, DOM targets, Base UI composition and callback cleanup remain supported;
  `ForwardRefExoticComponent` internals such as `.render` / `$$typeof` are removed.
  Use `ComponentProps<typeof Component>` and `ComponentRef<typeof Component>`.
- Hosts sharing Query must align `@tanstack/react-query` and
  `@tanstack/query-core` at **5.104.5**. Mixed 5.104.4 / 5.104.5 installations can
  produce nominal QueryClient/Query type conflicts.

### Changed

- Keep filter and keyboard callbacks current through committed Effect Events;
  unchanged filters remain deduplicated and listener ownership stays stable.
- Update Query to 5.104.5, Zustand to 5.0.16, panels to 4.14.8, Lucide to 1.61.0,
  form resolvers to 6.0.0, and the reviewed localization dependencies. Host
  integrations should verify their own cache/provider, forms and locale behavior.
- Use a 250ms touch hold with 5px tolerance in the generic provider, retaining its
  5px mouse/pen threshold. Native file icon handles retain selection/open behavior
  and permit early touch scrolling.
- Consolidate upgrade instructions in the packaged migration guide. Keep the npm
  README concise and English-only, with documentation, history and migration links.

### Fixed

- Preserve hidden/grouped/persisted table order and reject stale drag positions.
  File moves validate the current listing; successful overlapping moves refresh
  the relevant current view without refreshing a departed view.

### Removed

- Remove production legacy core/sortable/utilities dependencies and the global
  React-19 JSX compatibility shim. Applications must migrate their own old-engine
  usage before removing direct dependencies they still need.

### Upgrade from 0.2.0

- This pre-1.0 minor contains breaking low-level drag and component-type changes.
  Read the [0.3.0 migration guide](docs/migration.md) before upgrading and confirm
  npm availability before installing exact React 0.3.0 / Core 0.2.0 pins.
- React's Core dependency stays exactly **0.2.0**; no Core 0.3.0 is required.
  Node >=24.0.0 and React/React DOM ^19.2.3 remain the public requirements.
- Align Query, migrate low-level callbacks/registrations, update relevant native
  input tests and regenerate host-owned API/notices records. A source version or
  prepared changelog does not change an already published archive.

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

[0.3.1]: https://github.com/dataarthub/appkit/compare/appkit-react-v0.3.0...appkit-react-v0.3.1
[0.3.0]: https://github.com/dataarthub/appkit/compare/appkit-react-v0.2.0...appkit-react-v0.3.0
[0.2.0]: https://github.com/dataarthub/appkit/compare/v0.1.0...appkit-react-v0.2.0
[0.1.0]: https://github.com/dataarthub/appkit/releases/tag/v0.1.0
