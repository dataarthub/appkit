# Changelog

Consumer-facing changes for `@alneas/appkit-react`, newest first. A versioned entry
may be prepared before publication; confirm availability on the
[npm package page](https://www.npmjs.com/package/@alneas/appkit-react). Publication
dates are recorded only when confirmed.

## Unreleased

### React 19 and dependency maintenance

- Simplify DOM-ref wrappers to React 19 ref props while preserving JSX props, DOM
  targets, Base UI composition and callback cleanup. Their exported types are now
  ordinary function components; `ForwardRefExoticComponent` internals are removed.
  Use `ComponentProps` / `ComponentRef` rather than `.render` or `$$typeof`.
- Keep filter and keyboard callbacks current through committed Effect Events;
  unchanged filters remain deduplicated and listener ownership stays stable.
- Update the reviewed Query pair, Zustand, panels, icons, form resolvers and
  localization dependencies. Host applications sharing these dependencies should
  verify their own provider/cache and localization integration when adopting.
- See the [unreleased React 19 guide](https://github.com/dataarthub/appkit/blob/main/docs/development/react19-toolchain.md).

### Breaking changes

- Move Kanban, DataTable, FileBrowser and the shared DnD wrappers to native
  dnd-kit React 0.5.1. Generic provider callbacks use nullable
  `event.operation.source` / `target`, direct entity `data`, and `event.canceled`
  in `onDragEnd`; the separate `onDragCancel` prop is removed.
- Draggable render props use `ref` / `handleRef` instead of `attributes`,
  `listeners` and `setNodeRef`; droppable props use `ref` / `isDropTarget`.
  Native feedback owns movement; render-prop `style` is presentation only.
- Exported Kanban sensors, controller context props and custom surfaces now use
  native engine types. Generic wrapper names/import paths, high-level component
  props and FileProvider operations remain. `resolveKanbanMove` keeps its
  structural legacy-shaped input.
- Remove legacy core/sortable/utilities dependencies and the global React-19 JSX
  compatibility shim. Hosts must migrate their own old-engine usage before
  removing their direct dependencies.

### Changed

- Use a 250ms touch hold with 5px tolerance in the generic provider, retaining
  its 5px mouse/pen threshold. Native icon handles preserve file selection/open
  interactions and permit early touch scrolling.
- Preserve hidden/grouped/persisted table order and reject stale drag positions.
  File moves validate the current listing; successful overlapping moves refresh
  the current relevant view, while navigation prevents refreshing departed views.

### Upgrade

- Follow the [unreleased native drag migration guide](https://github.com/dataarthub/appkit/blob/main/docs/development/dnd-kit-migration.md).
  Release-version selection and publication are separate from this source change.
- After a containing release is published, downstream consumers update exact
  pins, low-level call sites, old dependencies, browser test settings and generated
  API/notices. This entry does not change any already published archive.

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
