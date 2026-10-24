# dnd-kit React migration: impact and compatibility assessment

Current status: full public cutover implemented and verified. The investigation and
proposed checklists below are historical; they are not a certification that every
proposed experiment was executed. Current consumer instructions live in the
[unreleased migration guide](../../development/dnd-kit-migration.md). Commit, push
and PR creation were subsequently authorized; package publication is not authorized.

Follow-up: the [authorized behavior spike](2026-10-23-dnd-kit-spike-results.md) now supplies runtime evidence for the requested Kanban/table risks. Investigation-only statements below describe the earlier assessment; full component/API integration gates remain open.

Status: original assessment retained for history; the full cutover was subsequently implemented and locally verified.
Date: 2026-10-23 (Asia/Tokyo).
Baseline: `origin/main` at `9eb2b623ed35b2a78201a2abc9d64deac04f9159`.
Branch: `chore/dnd-kit-react-migration`.
Scope: the independent public Appkit repository; no private consumer sources were inspected.

## Recommendation

Treat adoption as a coordinated migration with an explicit breaking change to low-level drag APIs. Preserve the high-level DataTable, FileBrowser, KanbanBoard and compound Kanban props and business callbacks. Do not describe this as a dependency-only upgrade or promise complete source compatibility.

The existing release line can remain on legacy dnd-kit until the candidate passes the gates below. Use one candidate branch, with small reviewable implementation stages, and merge the complete migration only after its gates pass. No runtime feature flag or dual backend is proposed. Implementation, release version, commits and publication have not been authorized by this assessment.

The candidate is `@dnd-kit/react@0.5.1`. Its npm version endpoint was checked on the assessment date, alongside `dom`, `collision`, `helpers` and `abstract` at `0.5.1`. This establishes availability of that candidate, not that it will remain the latest version. React's declared peer range includes React 19; Appkit must retain its own `react`/`react-dom` floor of `^19.2.3` and Node `>=24.0.0`. [Upstream package manifest](https://raw.githubusercontent.com/clauderic/dnd-kit/main/packages/react/package.json), [published version metadata](https://registry.npmjs.org/@dnd-kit%2freact/0.5.1).

## Evidence and limits

This is a static source, export-chain, generated API-index, lockfile, test-runner and official-documentation investigation. No new dependencies were installed, no declarations were rebuilt, and no runtime drag behavior or bundle size was measured. Generated API signatures help confirm export exposure but sometimes contain erased `{}`/`any` types; source signatures remain authoritative until packed declaration probes are run.

The shared documentation/development policy and skill URLs in `AGENTS.md` returned HTTP 403. Repository-local `AGENTS.md`, `CONTRIBUTING.md`, `RELEASING.md` and executable verification rules were used. Recheck the shared policies before implementation. This report and its companion plan are engineering working documents, outside `docs.manifest.json` and package files; they are not portal guides or shipped API promises.

## Current dependency and file inventory

`packages/appkit-react/package.json` declares `@dnd-kit/core: ^6.3.1`, `@dnd-kit/sortable: ^10.0.0` and `@dnd-kit/utilities: ^3.2.2`; `bun.lock` resolves exactly those versions. They are normal dependencies, not optional peers. Core also brings `@dnd-kit/accessibility@3.1.1`. No `@dnd-kit/*` imports were found in Appkit Core.

All paths in the following table are relative to `packages/appkit-react/`.

| Area | Direct source files | Migration work and risk |
| --- | --- | --- |
| Shared wrappers | `src/tools/components/ui/dnd/{DnDProvider,Draggable,Droppable}.tsx`, `index.ts` | Provider lifecycle, old event types, render props, transforms, refs, keyboard semantics and collision policy. Very high public API risk. |
| DataTable | `src/tools/components/data-table/data-table.tsx` | Horizontal header sorting, separate handle, 8px pointer threshold, keyboard coordinates, ordering state and persisted settings. High behavior risk. |
| Kanban | `src/tools/components/kanban/{KanbanColumn.tsx,kanban-compound.tsx,kanban-primitives.tsx,kanban-drag.ts,use-kanban-drag.ts,use-kanban-sensors.ts}` | Preset/compound share lifecycle; sortable cards and empty-column droppables; custom keyboard column traversal; overlay; publicly exported helpers. Highest interaction risk. |
| FileBrowser | `src/tools/components/file-browser/FileBrowser.tsx` | `active.data.current`/`over.data.current` to file-provider move; canceled/outside drops must never write. |
| Indirect file views | `src/tools/components/file-browser/{FileListView,FileGridView}.tsx` | List uses a separate button handle on a table row; grid spreads old handlers on the whole wrapper. Must migrate with wrappers. |
| Indirect table consumers | `src/tools/components/data-table/data-table-view.tsx` and feature consumers | Preserve forwarding of `storageKey`, sorting, selection and `enableColumnOrdering`; select importing stories transitively. |
| Indirect Kanban consumers | `src/tools/components/kanban/{KanbanBoard,KanbanCard}.tsx`, `types.ts` | State ownership, renderer contracts, read-only and public callbacks must stay intact. |
| Compatibility declarations | `src/types/dnd-react19.ts`, `src/tools/types/dnd-react19.ts` | Duplicate global JSX augmentation. Provider imports the tools copy. Remove only after no legacy declaration edges remain and strict consumers pass. |
| Metadata/build boundary | `package.json`, `bun.lock`, `vite.config.ts`, `scripts/prepare-package.mjs`, `consumer-ai/*`, `docs/exports.md`, notices | Vite externalizes bare imports and emits ESM/CJS and declarations. Every directly imported new package must be declared; regenerate metadata and licenses through owning generators. |

There are 11 production source files with direct legacy package imports: three wrappers, six Kanban files, DataTable and FileBrowser. Counting only those misses view, barrel, declaration, story and package-boundary work.

## Public API compatibility

### Export reachability

The generic wrappers and their props are public through all four paths:

- `@alneas/appkit-react`: `src/index.ts` → `./tools`.
- `@alneas/appkit-react/tools`: `src/tools/index.ts` → `./core`.
- `@alneas/appkit-react/tools/core`: `src/tools/core.ts` → `./components/ui`.
- `@alneas/appkit-react/tools/ui`: `src/tools/ui.ts` → `./components/ui`.

`src/tools/components/ui/index.ts` exports `./dnd`. The generated `consumer-ai/api-index.json` corroborates these four paths. The separate `@alneas/appkit-react/ui` entry is not this tools UI barrel; do not assume every UI entry exports these wrappers.

Kanban's `src/tools/kanban.ts` re-exports `components/kanban/index.ts`, which wildcard-exports helpers and primitives. Therefore comments calling them “internal” do not make them private. Their public path is `@alneas/appkit-react/tools/kanban`. Kanban is not re-exported by the broad tools barrel in this baseline.

DataTable is public through root, tools and `@alneas/appkit-react/tools/data-table`. FileBrowser and its views/providers are public through `@alneas/appkit-react/tools/file-browser`.

### Compatibility matrix

| Public API | Current contract | Candidate compatibility decision |
| --- | --- | --- |
| `DnDProviderProps` | `onDragStart(DragStartEvent)`, `onDragEnd(DragEndEvent)`, `onDragCancel(DragCancelEvent)` from legacy core | Breaking if event types change. Propose native new-provider start/end callback types and remove `onDragCancel`; consumers check `event.canceled` in end. Document all four import paths. |
| `DraggableProps.children` | `{attributes: any, listeners: any, setNodeRef, isDragging, style}`; string ID and optional data | Breaking render-prop change. Propose `{ref, handleRef, isDragging}`; preserve `id`, `data` and children composition. DOM motion belongs to the new engine; consumers style explicitly. Keeping empty old handler bags would silently lose handle/focus semantics. |
| `DroppableProps.children` | `{setNodeRef, isOver}` plus string ID/data/disabled | Propose `{ref, isDropTarget}`; explicit rename migration, not silent structural compatibility. Preserve input props. |
| `KanbanBoardProps`, `KanbanRootProps` | Task/status callbacks, status field, renderer contracts, read-only, preset optimistic option | Preserve names, parameter types and business semantics. No new caller provider required. Compound remains controlled; preset remains optimistic unless disabled. |
| `KanbanColumn`, `KanbanCard`, compound slots/context | Task/column props, div attributes, forwarded refs, `disableDrag` | Preserve public shapes and slots; custom card wrappers must use the migrated registration in the same provider. Ref cleanup must remain correct under React 19. |
| `resolveKanbanMove` | `{active: Pick<DragEndEvent['active'], 'id'>, over: Pick<NonNullable<DragEndEvent['over']>, 'id' | 'data'> | null}`, tasks, status field, optional columns → `{taskId, status} | null` | Preserve this small structural input shape using Appkit-owned types; remove the legacy import without requiring a full legacy event. Existing old-event-shaped calls still fit structurally. Normalize new engine input internally. Do not invent full legacy event objects. |
| `useKanbanDrag` | Inferred return includes `activeTask` and `contextProps` with old sensor/event types and `onDragCancel` | Explicitly breaking low-level return. Keep entry/name/options and `activeTask`; proposed `contextProps` becomes native new-provider props. Snapshot the resulting explicit declaration, document handler changes and test callers using the hook with `KanbanDragSurface`. |
| `useKanbanSensors` | Returns legacy sensor descriptors, consumes status field to traverse columns geometrically | Explicitly breaking return descriptor system. Retain name/parameter initially; implementation must port the column navigation policy to new DOM sensors. Do not cast new descriptors to old types. |
| `KanbanDragSurface` | `controller: ReturnType<typeof useKanbanDrag>` | Follows controller change; consumers supplying their own legacy-shaped controller need a migration. Keep the other props. |
| `kanbanAccessibility` | `{screenReaderInstructions: {draggable: string}}` | Keep the exported data shape; map text to the new accessibility implementation internally, rather than spreading it blindly on the new provider. |
| `KanbanDraggableCard`, `KanbanColumnFrame` | Div attributes + task/column props; no public index/group parameter | Preserve shapes. If sortable registration needs index/group, derive from internal context rather than adding required public props. Prefer plain draggable/droppable cards for status-only movement. |
| `DataTableProps`, `DataTableViewProps` | No external drag event props; column order kept internally and in existing settings | Preserve shapes and stored column-ID schema. No migration of stored settings should be required. |
| `FileBrowserProps`, `FileGridViewProps`, `FileListViewProps`, `FileProvider` | Drag events do not escape their props; file operations via `moveNode(id, targetPath)` | Preserve shapes and exactly-once provider write behavior. Views used independently still require an appropriate provider boundary. |

The proposed breaking signatures are design choices for review, not APIs implemented by this branch. Infer exact native ref/event types from the pinned package declarations during implementation. Preserve the generic wrappers' string-only ID contract even though upstream also accepts numbers; widening is unnecessary scope.

Downstream composition with legacy `useDraggable`, `useSortable` or `DndContext` is a runtime compatibility break even if a consumer never annotates event types. Old and new contexts/registrations are distinct systems. An old draggable inside the new wrapper is not guaranteed to participate. Cover this in migration examples and negative compatibility probes.

## Behaviors that migration must preserve

### Shared wrappers and FileBrowser

The generic provider uses `closestCenter`, pointer activation at 5px and sortable keyboard coordinates. It supplies no custom overlay. FileBrowser's list attaches listeners/attributes to an icon button while applying ref/style to `TableRow`; the grid makes the whole file wrapper draggable. A new `handleRef` must be attached to the list button. Preserve click selection, Ctrl/Cmd multi-selection, double-click open, context menus and scroll gestures.

FileBrowser only moves a file onto a folder. Destination IDs gain a trailing slash; a source already under that prefix is ignored. Successful `provider.moveNode` is followed by refresh; failures surface an error. Existing code assumes valid node data. Candidate handlers should safely ignore missing source/target/data and canceled drops, and must not write before a successful drop. This guards a new lifecycle boundary without changing storage-provider APIs. Multiple selection currently does not mean batch movement.

### Kanban

Drag changes status only. `resolveKanbanMove` ignores same-status drops and never changes order within a column. `onOrderChange` exists in `KanbanBoardProps` and Storybook argTypes but is not consumed by `KanbanBoard`; implementing it now would add functionality. WIP `limit` is presentational, not a drop prohibition. Preserve both facts and identify them as existing limitations.

Mouse activates at 10px. Touch uses a 250ms hold with 5px tolerance. Space/Enter starts or confirms, Left/Right traverses columns in visual left-to-right order (including empty columns), and Escape cancels. The keyboard getter uses column rects and `statusField`, not generic sortable item navigation. New sensor defaults are insufficient evidence of parity. Preserve the Japanese screen-reader instructions and verify focus/announcements.

Preset state updates optimistically and resets when the parent supplies a different tasks array; disabling optimism leaves updates to the caller. Compound always leaves state updates to the parent. The current async callback is not awaited and rejection does not roll state back; adding rollback is separate work. Removed source tasks/columns and read-only changes during drag require no callback/write after invalidation. Compound has no explicit columns array and identifies empty columns via registration data.

One overlay is portaled to `document.body` with a static `KanbanCardView`; it does not register a duplicate draggable. Preserve SSR safety, custom children, overlay styling, drag opacity, ref forwarding/cleanup, and a single feedback representation.

### DataTable

Only the dedicated “Reorder column …” button should initiate header drag. Sorting stays on its separate button; `th` retains `aria-sort` and no interactive role/tab stop. Pointer activation is 8px. Keep keyboard movement and focus restoration, column visibility, row selection, multi-sort, persistence and SSR hydration.

Order includes logical column IDs, including selection/row-number columns. Visible header indices can differ from stored order indices. Grouped headers/placeholders can repeat column registration; inspect these cases rather than carrying duplicate IDs into a stricter engine. Initial stale/unknown source or target IDs must be ignored instead of using an index of -1. Reconcile registered visible order with full persisted order before committing a move.

## Upstream differences and proposed architecture

The provider changes to `DragDropProvider`; events expose operation source/target and cancellation on end. Collision configuration moves to individual droppable/sortable registrations. The legacy helper names and contexts are not compatible drop-ins. [Official migration guide](https://dndkit.com/react/guides/migration/).

New hooks bind DOM refs and optional handle refs instead of React listener/attribute spreads; droppable hover becomes `isDropTarget`. The proposed wrapper render props follow these native concepts. [Draggable hook](https://dndkit.com/react/hooks/use-draggable/), [droppable hook](https://dndkit.com/react/hooks/use-droppable/).

New sortable registration requires an index; explicit group/type/accept policies prevent unrelated drop targets from mixing. DataTable can use new sortables, with indices derived from registered header order. [Sortable hook](https://dndkit.com/react/hooks/use-sortable/).

New sortable optimistic DOM movement is enabled by default; source and target can become the same item. Therefore porting the old `active.id !== over.id` guard is wrong. For DataTable, use sortable initial/current indices (or a verified helper) and reconcile IDs with React state. Prefer plain draggable/droppable task and column registrations for Kanban to preserve status-only semantics. Spike card-over-card and empty-column hit resolution with explicit collision policy before committing that choice. If sortables prove necessary, disable optimistic reordering for Kanban and prove the original order remains intact. [Sortable state management](https://dndkit.com/react/guides/sortable-state-management/).

Sensors come from `@dnd-kit/dom`. Configure per-pointer activation explicitly; preserve keyboard and screen-reader behavior with a custom new-API policy as needed. Do not import the legacy coordinate getter. [Sensor configuration](https://dndkit.com/react/guides/sensors/).

Feedback now manages DOM motion/animation. Preserve default accessibility and scrolling plugins while configuring feedback. Custom Kanban overlays must avoid double promotion/animation; tables need special checks for valid layout while a `th`/`tr` is moving. [Feedback guide](https://dndkit.com/react/guides/feedback/).

Add a small non-exported event-normalization module for cancellation, nullable entities, direct data and legacy-shaped Kanban move inputs. Keep state and provider writes in their owning components. Avoid a public universal drag abstraction or fake legacy refs/rects/activator events. Name/type this module only after the behavior spike establishes the required native types.

## Approaches and tradeoffs

| Approach | Benefit | Cost / reason not to prefer |
| --- | --- | --- |
| Keep legacy engine now, migrate features behind separate boundaries incrementally | Existing low-level users keep functioning while experiments proceed | Two independent contexts/dependency families, duplicate keyboard/a11y behavior, shims remain, and public helpers still need an eventual breaking migration. Useful if compatibility is mandatory. |
| Emulate all legacy events/render props over the new engine | Superficially smaller caller diff | Full event refs, rects, collisions, listeners, sensors and external legacy hook composition cannot be promised from a subset adapter. High maintenance and misleading compatibility. Not recommended. |
| Coordinated cutover with preserved high-level contracts and explicit low-level changes | One engine and bounded compatibility surface; no fabricated legacy semantics | Requires consumer migration, release review and broader validation. Recommended by this assessment, pending owner decision. |

A requirement for zero low-level changes selects the first approach or defers adoption; it does not justify calling the third compatible. Before implementation, confirm this tradeoff and inspect known downstream usage with separate authorization/access. No absence-of-use claim is made for private or external consumers.

## Dependencies, release and rollback

Proposed direct dependencies are `@dnd-kit/react`, `@dnd-kit/dom` and `@dnd-kit/collision` at the reviewed candidate versions if their APIs are imported. Add `@dnd-kit/helpers` only if the final ordering implementation uses it; add `@dnd-kit/abstract` directly only if a direct API/type import requires it. Existing transitive presence is not a dependency declaration. Retain React contexts as host peers. Freeze the candidate family for investigation and review the resolved transitive graph; no install has been performed here.

Remove legacy core/sortable/utilities and JSX shims only after all runtime imports, exported type references, examples and independent packed consumers no longer need them. Regenerate the lockfile, API index, package-context metadata, notices and documentation using repository commands. Do not edit generated indexes by hand. Core source/API/version changes are not expected.

Current React package is `0.2.0`. A breaking pre-1.0 candidate would normally target the next minor (for example `0.3.0`), subject to maintainer/release-policy decision; no version bump is made here. Preserve the exact published Core dependency unless another reviewed release requires adoption. Consumers receive migration examples for each renamed render prop, event access, cancellation and low-level Kanban controller/sensor composition.

Rollback before release is to keep/revert the entire candidate dependency and source change together. After release, keep the previously published version available for exact-pinned consumers and ship a reviewed corrective version if needed. Do not overwrite tags, move distribution channels backwards or mutate published archives as a rollback mechanism.

## Verification strategy and acceptance

The companion [migration and verification plan](../plans/2026-10-23-dnd-kit-migration.md) specifies stages and commands. Success requires all of the following:

1. Existing high-level props and task/file callback payloads still typecheck from packed public imports; every intentional low-level change has a migration example and an explicit declaration review.
2. Real pointer, touch and keyboard interaction tests assert final application state and callback/write counts. Mocked end events alone do not prove activation, hit testing, focus or cancel behavior.
3. Kanban preserves status-only semantics, empty-column navigation, read-only and controlled/optimistic modes; no `onOrderChange` calls are introduced.
4. Table order persists without corrupting hidden/logical IDs or changing sorting; FileBrowser writes only on valid file-to-folder drop and refreshes after success.
5. Native ESM, CJS, Node 24.0.0 and NodeNext declarations with `skipLibCheck: false` work in independent packed consumers, with no JSX-global shim and no undeclared dependency resolution.
6. Full repository gates pass for the dependency change, including all selected stories in light/dark × desktop/mobile, fatal accessibility checks, package contracts, Core compatibility, docs and release checks. No real storage/DB service is needed for this interaction migration.

## Open decisions and measured risks

- Owner decision: approve explicit low-level breaking changes, or require legacy retention. This plan makes no assumption of approval.
- Spike gate: confirm pinned 0.5.1 can preserve Kanban's custom keyboard column navigation, screen-reader instructions, table handle focus and table layout. A failure returns to the approach decision rather than silently changing behavior.
- Public contracts gate: inspect fresh generated `.d.ts`/`.d.cts` and freeze precise new handler/ref signatures. The current generated API index is not a declaration compiler.
- Consumer gate: external usage of low-level helpers/hooks remains unknown. The public export inventory demonstrates exposure, not adoption counts.
- Measurements: installation footprint, cold bundle delta and browser performance have not been measured; capture them on comparable builds before release. React 19 support alone does not establish a performance or compatibility improvement.

## Full cutover authorized on 2026-10-23

The maintainer subsequently authorized migrating the remaining generic wrappers and FileBrowser and removing the legacy dependencies. This extends the already implemented Kanban/DataTable candidate to the original single-engine design.

The chosen boundary is native provider events and native registration refs, with an explicit low-level breaking change. A legacy-shaped adapter would retain two event models and conceal the migration; retaining both engines would contradict the requested removal. Generic wrapper names/import paths remain; provider props match the native provider, draggable children use `ref`/`handleRef`/`isDragging` and presentational `style`, and droppable children use `ref`/`isDropTarget`. Cancellation is native `onDragEnd` with `event.canceled`, with no `onDragCancel` prop. Direct old-engine hook composition is unsupported after removal.

FileBrowser keeps its high-level public props and FileProvider API. Its native move boundary validates live source/target registrations and current listed nodes, rejects canceled/missing/stale/navigated operations, moves one file into a normalized folder path, refreshes only after successful resolution, and reports move errors. List rows keep table semantics and a separate native handle; grid items expose a focusable native handle without changing selection/open/context-menu behavior. Tests use in-memory providers only.

Public and private sources remain separate. Actual private forwarding entries and usage are inspected; candidate archives may be substituted only in disposable fixtures outside Public. Private dependency adoption/report regeneration remains pending publication. The later user request authorizes commit, push and PR creation; package publication remains separate.

Full cutover touch policy: keep generic mouse/pen activation at 5px. Trusted
touch input showed that applying that distance threshold to touch prevents an
early file-handle swipe from scrolling. Generic touch therefore uses the already
validated 250ms hold/5px tolerance policy, without blanket touch-action:none.
This is an explicit input-policy change at the new native wrapper boundary.
