# Migrate Appkit drag surfaces to native dnd-kit React

**Status: unreleased development guide.** This describes the migration branch,
not the currently delivered npm contract. Do not ingest it into default released
portal documentation. Promote the applicable instructions to the released guides
only after a containing package version is confirmed published.

## Prerequisites

Use Node.js 24 or newer and React/React DOM matching `^19.2.3`. Review a build
containing this migration, or wait for a confirmed published release containing
it; a source manifest version or merged PR does not establish npm availability.
Keep the host lockfile and a working revision before upgrading. No new feature
peer is required for high-level components. Import Appkit CSS once at the host
boundary; provider contexts remain owned by each feature.

## Public import

| Surface | Supported import |
| --- | --- |
| Generic provider and registrations | `@alneas/appkit-react/tools/ui` (also root, `/tools` and `/tools/core`) |
| Kanban board, Compound API and low-level helpers | `@alneas/appkit-react/tools/kanban` |
| DataTable | `@alneas/appkit-react/tools/data-table` |
| FileBrowser, standalone views and FileProvider types | `@alneas/appkit-react/tools/file-browser` |
| Stylesheet | `@alneas/appkit-react/styles` |

## Step-by-Step Implementation

### 1. Select a containing release and inventory old-engine usage

After publication is confirmed, set `APPKIT_REACT_VERSION` to that exact release.
The guard below deliberately fails until the maintainer supplies that value:

```bash
: "${APPKIT_REACT_VERSION:?Set a confirmed release containing native drag APIs}"
bun add --exact "@alneas/appkit-react@${APPKIT_REACT_VERSION}" react@19.2.3 react-dom@19.2.3
```

Align any direct Core dependency with the selected React package's exact Core
pin. If the host imports native dnd-kit hooks or sensor classes directly, declare
those packages as direct host dependencies too. High-level Appkit usage does not
require installing their import subpaths as packages.

Inventory `onDragCancel`, `active`/`over.data.current`, `setNodeRef`, `attributes`,
`listeners`, `isOver`, custom Kanban controllers/sensors and external old-engine
hooks. Remove old application dependencies only when its own remaining usages
have also migrated. Do not compose old and native registrations under one
provider.

### 2. Keep high-level business props and migrate low-level composition

### Kanban and DataTable

The candidate uses dnd-kit React 0.5.1 for all Appkit drag surfaces.
It is not a change to previously published package versions. These components
create their own drag provider; hosts still import Appkit CSS once.

```tsx
import {KanbanBoard, type KanbanTask} from '@alneas/appkit-react/tools/kanban';
import '@alneas/appkit-react/styles';
const tasks: KanbanTask[] = [{id: 'one', title: 'Review', status: 'todo'}];
export function ReviewTasks() {
  return <KanbanBoard tasks={tasks} columns={[{id: 'todo', title: 'Todo'}, {id: 'done', title: 'Done'}]}
    onStatusChange={(taskId, status) => { console.log(taskId, status); }} />;
}
```

Kanban drag changes status, including movement into empty columns. It does not
persist order within a column or invoke `onOrderChange`. WIP limits remain visual
warnings. Space/Enter starts or confirms movement, Left/Right selects a column,
and Escape cancels. Read-only cards do not activate dragging. Preset optimistic
updates and controlled compound state retain their existing ownership.

DataTable keeps `DataTableProps`, `DataTableViewProps` and the existing settings
format. Use the separate reorder button to move leaf columns; sorting remains a
separate action. Hidden column slots remain in persisted order. Group headers
and placeholders do not activate dragging. A column/visibility change during a
drag invalidates its saved positions rather than applying stale indices.

### Low-level Kanban compatibility

The following exported helpers from `@alneas/appkit-react/tools/kanban` expose
an intentional source/runtime compatibility change in this candidate:

| API | Candidate contract |
| --- | --- |
| `useKanbanSensors(statusField)` | Native `@dnd-kit/dom` sensor descriptors, not legacy core descriptors. |
| `useKanbanDrag(options).contextProps` | Native `DragDropProvider` props. Events expose `operation.source`/`operation.target`; cancellation is `event.canceled` on end. There is no legacy `onDragCancel` property. |
| `KanbanDragSurface.controller` | A `KanbanDragController` returned by the migrated hook. Manually constructed legacy controllers must migrate. |

The high-level props/callbacks and helper names remain. `resolveKanbanMove` retains
its structural `{active, over}` input with `over.data.current`, so existing callers
passing that shape still work. `KanbanDraggableCard` and `KanbanColumnFrame` now
register with the native provider: pair them with the migrated surface, not a
legacy `DndContext` or legacy hooks. To compose a low-level board:

```tsx
import {KanbanDragSurface, KanbanColumn, useKanbanDrag, type KanbanTask}
  from '@alneas/appkit-react/tools/kanban';
const customTasks: KanbanTask[] = [{id: 'one', title: 'Review', status: 'todo'}];
export function CustomTaskSurface() {
  const controller = useKanbanDrag({tasks: customTasks});
  return <KanbanDragSurface controller={controller}>
    <KanbanColumn column={{id: 'todo', title: 'Todo'}} tasks={customTasks} />
    <KanbanColumn column={{id: 'done', title: 'Done'}} tasks={[]} />
  </KanbanDragSurface>;
}
```

### Generic wrappers and FileBrowser

`DnDProvider`, `Draggable`, `Droppable` and their prop types remain exported from
`@alneas/appkit-react`, `/tools`, `/tools/core` and `/tools/ui`. Their low-level
contracts now use the native engine and are a breaking change:

| Legacy contract | Native contract |
| --- | --- |
| `event.active`, `event.over.data.current` | `event.operation.source`, `event.operation.target`, with `.data` directly on each entity; either entity can be null. |
| Separate `onDragCancel` callback | `onDragEnd` also runs on cancel; check `event.canceled` before persisting. |
| `attributes`, `listeners`, `setNodeRef` | `ref` on the draggable element; optional `handleRef` on a separate activator. Accessibility and input listeners are managed natively. |
| Droppable `setNodeRef`, `isOver` | `ref`, `isDropTarget`. |
| CSS transform in render-prop `style` | Native feedback controls movement; `style` remains presentational opacity/cursor styling. |
| External legacy core hooks/context | Native `@dnd-kit/react` hooks with the native provider. |

The default provider uses a 5px mouse/pen threshold and a 250ms touch hold
with 5px tolerance so early swipes can scroll, plus native keyboard movement
(10px per arrow, Shift for larger movement), native accessibility and clone
feedback with immediate drop completion. Hosts can pass native provider props
including sensors/plugins to customize this policy. Droppables use pointer
intersection; an outside drop does not choose the nearest folder. Registration
IDs are unique within each provider. A separate handle preserves nested controls:

```tsx
import {DnDProvider, Draggable, Droppable} from '@alneas/appkit-react/tools/ui';
import '@alneas/appkit-react/styles';
export function NativeDragExample() {
  return <DnDProvider onDragEnd={event => {
    const {source, target} = event.operation;
    if (event.canceled || !source || !target) return;
    console.log(source.data, target.data);
  }}>
    <Draggable id="file" data={{name: 'Report'}}>
      {({ref, handleRef, style}) => <div ref={ref} style={style}>
        <button ref={handleRef}>Move report</button>
      </div>}
    </Draggable>
    <Droppable id="folder">{({ref, isDropTarget}) =>
      <div ref={ref} data-over={isDropTarget}>Archive</div>}
    </Droppable>
  </DnDProvider>;
}
```

`FileBrowser`, `FileListView`, `FileGridView` and `FileProvider` retain their
high-level props and storage contract. Standalone list/grid views must be inside
`DnDProvider`; their list icon buttons and grid icon buttons are the native drag
handles. Click/Meta-or-Ctrl selection, double-click open and context menus remain.
Dropping moves only the dragged file into a listed folder, even when several
files are selected. The folder path gains one trailing slash when needed.
Cancellation, outside drops, missing/removed entities and listing/navigation
changes do not write. A successful `moveNode` resolves before refresh; a rejected
move reports its error without a success refresh. Navigation during an in-flight
move prevents its completion from refreshing the old view.

The package no longer depends on legacy `@dnd-kit/core`, `@dnd-kit/sortable` or
`@dnd-kit/utilities` and no longer installs a global JSX compatibility shim.
Remove those application dependencies only after migrating any application-owned
old-engine usages. Dependency/type checks alone do not establish interaction or
accessibility parity in a host application.

A host-owned FileProvider stays an explicit input. Appkit does not configure a
live storage service or authorize access to it:

```tsx
import {FileBrowser, type FileProvider} from '@alneas/appkit-react/tools/file-browser';
import '@alneas/appkit-react/styles';
export function HostFiles({provider}: {provider: FileProvider}) {
  return <div style={{height: 500}}><FileBrowser provider={provider} initialViewMode="list" /></div>;
}
```

### 3. Roll out downstream consumers after publication

Choose the release version with the breaking-change policy before publishing;
this implementation does not itself bump versions or publish packages. For a
separately released consumer, update its exact public package pin after that
release exists, migrate low-level call sites, remove obsolete old-engine direct
dependencies, and regenerate its declarations, API reports and notices through
its own tooling. Update browser dependency optimization settings and installation
guides that still name the old engine. Replace artificial legacy MouseSensor or
TouchSensor test injections with trusted pointer/touch input. Keep restricted
implementation details and raw verification receipts in their owning repository.

## Verification

Compile against the packed package with NodeNext and `skipLibCheck: false` in
both ESM and CommonJS consumers. Old callback/render-prop examples should fail
for the documented boundary change, not for missing hidden dependencies. Check
that neither the installed graph nor emitted declarations need legacy dnd-kit or
a global JSX augmentation.

Exercise real components: empty-column Kanban movement, status-only callbacks,
read-only/cancel/focus behavior; hidden/grouped/persisted table ordering and
sorting; grid/list file moves, selection, double-click and context menus. Include
held touch movement and pre-activation scrolling. Assert one intended move,
refresh only after success, and no writes for cancel/outside/removed or stale
entities. A viewport named mobile does not establish touch support.

For maintainers, run the repository's selected checks and packed consumers:

```bash
bun run quality:push
bun run test:consumer
node scripts/verification/run.mjs --ci-plan --node-compat
```

These commands do not push, publish or deploy. Keep raw archives, logs and local
paths out of Git and portal manifests. A successful candidate check is not proof
of publication, hosted-provider authorization or whole-downstream acceptance.

## Troubleshooting / Common Pitfalls

| Symptom | Action |
| --- | --- |
| `onDragCancel` or `event.active` no longer type-checks | Use native `onDragEnd`, inspect `event.canceled`, then nullable `operation.source`/`target`. |
| Render props have no `attributes`, `listeners` or `setNodeRef` | Attach native `ref` and optional `handleRef`; use `isDropTarget` on targets. |
| External hooks do not see the board/provider | Use the native engine consistently; update custom surface/controller composition. |
| Existing synthetic mouse/touch tests never start | Use trusted pointer input; test touch hold and scroll separately. |
| A file move finishes after navigation | The provider write may already have completed; Appkit suppresses refreshing the departed view, not the remote write itself. |
| Expected low-level API is absent from the installed package | Confirm the exact containing release and installed lockfile; this guide describes an unreleased candidate until publication. |
