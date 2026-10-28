---
title: "Upgrade Appkit React to 0.3.0"
description: "Migrate native drag registrations, React 19 component types and shared Query dependencies, preserving the older package-split route."
sidebar:
  order: 20
archetype: how-to
project: appkit
tags: ["migration", "core", "react"]
---

# Upgrade Appkit React to 0.3.0

This guide targets **React 0.3.0 with Core 0.2.0**, upgrading from React 0.2.0.
It may be prepared before npm publication. Confirm availability on npm before
installing; source versions and a merged PR do not prove delivery. The default
portal must retain the last delivered revision until publication is confirmed;
then ingest the reviewed 0.3.0 source and API catalog together.

## React 0.3.1 dependency alignment (release preparation)

React 0.3.1 is prepared with Core `^0.2.1`, starting at the already published
0.2.1 release. Applications keep an exact selected version in their lockfile. It adds no API migration beyond 0.3.0. Published React 0.3.0 retains its
exact Core 0.2.0 dependency; the 0.3.0 commands below remain its historical route.

After confirming React 0.3.1 is available, hosts with a direct Core dependency
should install matching exact versions and refresh their lockfile:

```bash
npm view @alneas/appkit-react@0.3.1 version
npm install --save-exact @alneas/appkit-react@0.3.1 @alneas/appkit-core@0.2.1 @tanstack/react-query@5.104.5 @tanstack/query-core@5.104.5
npm ls @alneas/appkit-core
```

Confirm React and the host resolve the same Core 0.2.1 installation. Before npm
publication, use verified candidate archives only for isolated checks; keep the
portal and production consumers on their confirmed delivered versions. The
remaining API migration sections apply to the 0.3 series.

## Prerequisites

Use Node.js 24 or newer and React/React DOM matching `^19.2.3`. Confirm that
React 0.3.0 is published before installing it; a source manifest version or merged
PR does not establish npm availability.
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

Confirm availability first, then install exact package versions. Before publication,
use only the maintainer-verified candidate archives for isolated testing.

```bash
npm view @alneas/appkit-react@0.3.0 version
npm install --save-exact @alneas/appkit-react@0.3.0 @alneas/appkit-core@0.2.0 @tanstack/react-query@5.104.5 @tanstack/query-core@5.104.5
```

For the original React 0.3.0 release, Core remains exactly 0.2.0. Core 0.2.1
contains documentation improvements with no runtime/API migration. React 0.3.1
adopts that published patch as described above; confirm each version's npm
delivery independently.
Core does not advance to 0.3.0 in this release. Align both direct Query packages
at **5.104.5**. Mixed 5.104.4 / 5.104.5 installations can make QueryClient and Query
nominal types incompatible. Refresh the host lockfile and inspect `npm ls
@tanstack/react-query @tanstack/query-core`; do not hide conflicts with type casts
or skipLibCheck. The library's Node >=24.0.0 and React/React DOM ^19.2.3 requirements
remain; repository development tools have a separate Node requirement.

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

#### Kanban and DataTable

React 0.3.0 uses dnd-kit React 0.5.1 for all Appkit drag surfaces.
Previously published 0.2.0 archive bytes remain unchanged. These components
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

#### Low-level Kanban compatibility

The following exported helpers from `@alneas/appkit-react/tools/kanban` expose
an intentional source/runtime compatibility change in React 0.3.0:

| API | React 0.3.0 contract |
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

#### Generic wrappers and FileBrowser

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

After React 0.3.0 is confirmed published, update the application's exact public
package pin, migrate low-level call sites, remove obsolete old-engine direct
dependencies, and regenerate its declarations, API reports and notices through
its own tooling. Update browser dependency optimization settings and installation
guides that still name the old engine. Replace artificial legacy MouseSensor or
TouchSensor test injections with trusted pointer/touch input. Keep restricted
implementation details and raw verification receipts in their owning repository.

### React 19 refs, component types and callbacks

DOM-ref wrappers receive `ref` as a regular React 19 prop. Existing calls such as
`<Input ref={inputRef} />` retain their public props and ref targets, including
callback-ref cleanup and supported Base UI `render` composition. Custom wrappers
can pass `ref` along with the other props:

```tsx
import type {ComponentProps} from 'react';
import {Input} from '@alneas/appkit-react/ui';

export function NameInput(props: ComponentProps<typeof Input>) {
  return <Input {...props} />;
}
```

Use `ComponentProps<typeof Input>` and `ComponentRef<typeof Input>` for consumer
types. Regular function components do not retain the `ForwardRefExoticComponent`
wrapper type or its internal `.render`/`$$typeof` properties.

Register window keyboard shortcuts with `@alneas/appkit-react/ui/hooks`:

```tsx
import {useKeyboardShortcuts} from '@alneas/appkit-react/ui/hooks';

export function SaveShortcut({save}: {save: () => void}) {
  useKeyboardShortcuts([{key: 's', ctrlKey: true, handler: save}]);
  return null;
}
```

Definitions and handlers use the latest committed values without re-registering
the listener. Pass `false` as the second argument to disable shortcuts. Matching
is case-insensitive, `ctrlKey: true` accepts Ctrl or Meta, and only the first
match runs. Matches prevent the default action unless `preventDefault: false`.
Input, composition and repeat events are not filtered. This hook needs no
provider or stylesheet.

For a headless filter, import `useFilter` from
`@alneas/appkit-react/tools/filter`. It needs no provider or stylesheet:

```tsx
import {useFilter} from '@alneas/appkit-react/tools/filter';

export function StatusFilter({onChange}: {onChange: (filter: Record<string, unknown>) => void}) {
  const {values, setField} = useFilter({
    fields: [{field: 'status', operator: 'eq'}],
    onChange,
  });
  return <input value={String(values.status ?? '')}
    onChange={event => setField('status', event.target.value)} />;
}
```

Changed queries call the latest committed `onChange`. Replacing only the callback
does not replay the existing filter, and equal query contents do not notify again.


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

Run the consuming application's type and interaction checks before rollout. The
[maintainer contribution guide](https://github.com/dataarthub/appkit/blob/main/CONTRIBUTING.md)
describes Appkit's own verification commands. Passing isolated component tests
does not establish hosted-provider authorization or complete downstream acceptance.

## Troubleshooting / Common Pitfalls

| Symptom | Action |
| --- | --- |
| `onDragCancel` or `event.active` no longer type-checks | Use native `onDragEnd`, inspect `event.canceled`, then nullable `operation.source`/`target`. |
| Render props have no `attributes`, `listeners` or `setNodeRef` | Attach native `ref` and optional `handleRef`; use `isDropTarget` on targets. |
| External hooks do not see the board/provider | Use the native engine consistently; update custom surface/controller composition. |
| Existing synthetic mouse/touch tests never start | Use trusted pointer input; test touch hold and scroll separately. |
| A file move finishes after navigation | The provider write may already have completed; Appkit suppresses refreshing the departed view, not the remote write itself. |
| Expected low-level API is absent from the installed package | Confirm the exact containing release and installed lockfile; this guide targets React 0.3.0; verify registry availability. |


## Earlier separate-package migration

If you are still using the older separate packages, identify the supported public
exports using this route, then apply the 0.3.0 compatibility steps above. Confirm
the destination versions are published before running the commands.

### Prerequisites

This guide starts with applications using `@dataarthub/app-core` and
`@dataarthub/react-tools`. The public destination is `@alneas/appkit-core@0.2.0`
and `@alneas/appkit-react@0.3.0`. A public version number is independent of the
legacy private package versions; public and restricted version numbers must not be compared as an in-place upgrade or downgrade.

Use Node.js 24.0.0 or later. Public React requires React and React DOM matching
`^19.2.3`. Keep the application's existing lockfile and a working revision before
changing dependencies. Inventory feature imports and runtime behavior first.

### Public import

Install the two package names. Import framework-free APIs from
`@alneas/appkit-core/data`, `/storage`, `/japan`, `/graph` or `/ai`, and React
features from `@alneas/appkit-react/ui`, `/tools` or `/ai`. Full import targets
appear in the tables below and the [Core export reference](../../appkit-core/docs/exports.md)
and [React export reference](exports.md).

### Step-by-Step Implementation

#### 1. Choose the migration route

| Route | Destination | What to change |
| --- | --- | --- |
| Keep the restricted product and its extensions | `@dataarthub/appkit-core` and `@dataarthub/appkit-react` on GitHub Packages | Rename the package prefix; check each used subpath and named export against that private release. |
| Adopt the independently usable public subset | `@alneas/appkit-core` and `@alneas/appkit-react` on npm | Move each API to its feature subpath, review behavior differences and replace any feature outside the public exports. |

These are different distributions. Replacing `@dataarthub` with `@alneas` does
not preserve the full legacy product. If an API is absent from the public export
references, retain its restricted implementation or choose an application-owned
replacement before removing the old dependency.

For the restricted rename, the intended prefix changes are:

| Old | New restricted package |
| --- | --- |
| `@dataarthub/app-core` | `@dataarthub/appkit-core` |
| `@dataarthub/react-tools` | `@dataarthub/appkit-react` |

For example, `/schema/core` remains a Core subpath and `/form` remains a React
subpath on that route. Select versions actually available to your GitHub Packages
account; a version in a source manifest does not establish that it is published.
The public install commands and compatibility claims below apply to the public
route only. This guide does not certify a private release or its consumers.

#### 2. Install the public packages and keep registry scopes separate

For a React application using the form recipe:

```bash
bun add --exact @alneas/appkit-core@0.2.0 @alneas/appkit-react@0.3.0 react@19.2.3 react-dom@19.2.3 @tanstack/react-query@5.104.5 @tanstack/query-core@5.104.5
```

A server-only application needs only `@alneas/appkit-core@0.2.0` plus its selected
adapter's dependencies. Install feature-specific peers from the export references;
root installation does not configure a database, storage endpoint or AI provider.

If both distributions remain in the application, retain scoped registry routing:

```ini
@alneas:registry=https://registry.npmjs.org
@dataarthub:registry=https://npm.pkg.github.com
```

Keep GitHub Packages authentication in the application's existing secret-managed
configuration. An entirely public consumer does not need GitHub Packages credentials.
Do not change the default registry to GitHub Packages for the public packages.
Do not replace registry dependencies with sibling source aliases or tarball overrides.

#### 3. Move React imports to feature subpaths

The following are destination entry points to inspect, not a claim that every
symbol in an old barrel is available at the new entry.

| Legacy import | Public destination |
| --- | --- |
| `@dataarthub/react-tools/ui` | `@alneas/appkit-react/ui` |
| `@dataarthub/react-tools/core` | `@alneas/appkit-react/tools/core` |
| `@dataarthub/react-tools/form` | `@alneas/appkit-react/tools/form` |
| `@dataarthub/react-tools/data-table` | `@alneas/appkit-react/tools/data-table` |
| `@dataarthub/react-tools/data-access/react` | `@alneas/appkit-react/tools/data-access/react` |
| `@dataarthub/react-tools/filter` | `@alneas/appkit-react/tools/filter` |
| `@dataarthub/react-tools/pane` | `@alneas/appkit-react/tools/pane` |
| `@dataarthub/react-tools/workflow` | `@alneas/appkit-react/tools/workflow` |
| `@dataarthub/react-tools/calendar` | `@alneas/appkit-react/tools/calendar` |
| `@dataarthub/react-tools/kanban` | `@alneas/appkit-react/tools/kanban` |
| `@dataarthub/react-tools/gantt` | `@alneas/appkit-react/tools/gantt` |
| `@dataarthub/react-tools/chart` | `@alneas/appkit-react/tools/chart` |
| `@dataarthub/react-tools/barcode` | `@alneas/appkit-react/tools/barcode` |
| `@dataarthub/react-tools/file-browser` | `@alneas/appkit-react/tools/file-browser` |
| `@dataarthub/react-tools/error` | `@alneas/appkit-react/tools/error` |
| `@dataarthub/react-tools/i18n` | `@alneas/appkit-react/tools/i18n` |
| `@dataarthub/react-tools/proposal` | `@alneas/appkit-react/ai/proposal` |
| `@dataarthub/react-tools/action` | `@alneas/appkit-react/ai/action` |
| `@dataarthub/react-tools/generative-ui` | `@alneas/appkit-react/ai/generative-ui` |
| `@dataarthub/react-tools/styles` | `@alneas/appkit-react/styles` |

Apply the same `/tools/` destination pattern for the public `sidebar`, `header`,
`splash`, `priority-queue` and `editable-table` entries. Private authentication
composition is not replaced by the public `/tools/auth` helper entry.

Before:

```diff
-import { FormView } from '@dataarthub/react-tools/form';
-import '@dataarthub/react-tools/styles';
+import { FormView } from '@alneas/appkit-react/tools/form';
+import '@alneas/appkit-react/styles';
```

Import the public stylesheet once at the application boundary. There is no public
`/dist/react-tools.css`, `/theme.css`, `/base.css` or `/globals.css` compatibility
export. Review your own CSS overrides against the resulting UI; an import change
does not prove visual equivalence.

#### 4. Separate framework-free Core imports from React bindings

| Legacy Core import | Public destination / decision |
| --- | --- |
| `@dataarthub/app-core/schema` | `@alneas/appkit-core/data/schema` |
| `@dataarthub/app-core/schema/core` | `@alneas/appkit-core/data/schema/core` |
| `@dataarthub/app-core/schema/compiler` | `@alneas/appkit-core/data/schema/compiler` |
| `@dataarthub/app-core/schema/server` | `@alneas/appkit-core/data/schema/server` (server only) |
| `@dataarthub/app-core/data-access` | `@alneas/appkit-core/data` (common contracts/services) |
| `@dataarthub/app-core/data-access/types` | `@alneas/appkit-core/data/types` |
| `@dataarthub/app-core/data-access/sqlite` | `@alneas/appkit-core/data/sqlite` |
| `@dataarthub/app-core/data-access/d1` | `@alneas/appkit-core/data/d1` |
| `@dataarthub/app-core/storage` | `@alneas/appkit-core/storage`; review adapter configuration |
| `@dataarthub/app-core/storage/local-adapter` | `@alneas/appkit-core/storage/server`; review constructor options |
| `@dataarthub/app-core/storage/types` | Type imports from `@alneas/appkit-core/storage` |
| `@dataarthub/app-core/proposal` | `@alneas/appkit-core/ai/proposal` |
| `@dataarthub/app-core/action` | `@alneas/appkit-core/ai/action` |
| `@dataarthub/app-core/generative-ui` | `@alneas/appkit-core/ai/generative-ui` |
| `@dataarthub/app-core/ai` | `@alneas/appkit-core/ai/ai-chat` for conversation/chat APIs; check each symbol |
| `@dataarthub/app-core/agent-output` | `@alneas/appkit-core/ai/agent-output` |
| `@dataarthub/app-core/encoding` | `@alneas/appkit-core/data/encoding` |
| `@dataarthub/app-core/content` | `@alneas/appkit-core/data/content`; Git Markdown uses `@alneas/appkit-core/data/content/git-markdown` |
| `@dataarthub/app-core/editor` | `@alneas/appkit-core/data/editor` (JSON/upload helpers, not editor UI) |
| `@dataarthub/app-core/excel` | Generic adapters: `@alneas/appkit-core/data/excel`; Japanese templates: `@alneas/appkit-core/japan/excel` |
| `@dataarthub/app-core/csv` | Choose generic `@alneas/appkit-core/data/csv` or Japanese defaults in `@alneas/appkit-core/japan/csv` |
| `@dataarthub/app-core/finance` | Generic calculations: `@alneas/appkit-core/data/finance`; Japanese invoice rules: `@alneas/appkit-core/japan/finance` |
| `@dataarthub/app-core/edi` | Generic contracts: `@alneas/appkit-core/data/edi`; Japanese document conversion: `@alneas/appkit-core/japan/edi` |
| `@dataarthub/app-core/pdf` | Generic data: `@alneas/appkit-core/data/pdf`; Japanese presets: `@alneas/appkit-core/japan/pdf`; neither replaces React PDF rendering |
| `@dataarthub/app-core/legal-document` | `@alneas/appkit-core/japan/legal-document` |
| `@dataarthub/app-core/notifications` | Choose `@alneas/appkit-core/data/notifications` or `@alneas/appkit-core/japan/notifications` |
| `@dataarthub/app-core/google-calendar` | `@alneas/appkit-core/data/google-calendar` |

Framework-free imports formerly reached through `@dataarthub/react-tools` should
also move to Core, not to an assumed matching React export. Provider-specific
record adapters have explicit entries such as `@alneas/appkit-core/data/supabase`
and `@alneas/appkit-core/data/neon`; install their peers separately. Keep backend
SDKs, filesystem access and credentials out of browser entry modules.

The public Core root exports namespaces (`data`, `storage`, `japan`, `graph`, `ai`,
`us`). It does not reproduce the old flat Core barrel. Prefer named feature imports:

```typescript
import { createAjvValidator } from '@alneas/appkit-core/data/schema/core';
import { CSVGenerator } from '@alneas/appkit-core/japan/csv';
import type { DataAccessAdapter } from '@alneas/appkit-core/data/types';

export const validate = createAjvValidator({ locale: 'ja' });
export const csv = new CSVGenerator();
export function loadRecords(adapter: DataAccessAdapter) {
  return adapter.find('records', {});
}
```

#### 5. Reconnect providers and review behavior

Use the [complete request-form recipe](request-form.md) for a working form with
`QueryClientProvider`, `DataAccessProvider`, a stable query client, `collection`,
`schema`, `mode` and the explicit validation policy. `onSave` does not remove these
provider requirements. A private `AppProvider` is not exported by public Appkit;
compose the needed public providers in the host application instead.

Import related hooks and providers from the same distribution, keep one compatible
React runtime and query context, and declare dependencies you import directly.
An application can pass its own compatible adapter to public UI without moving
its database or replacing its backend implementation.

Review these contracts before switching traffic:

- **Validation:** explicitly choose locale, empty-string handling, numeric casting
  and JSON Schema draft. Verify invalid input and omitted/default values, rather
  than assuming legacy localized defaults survive a generic import.
- **Regional formatting:** generic helpers and Japanese presets have different
  responsibilities. Preserve CSV date formatting, invoice rounding, tax and
  document output with representative fixtures when changing the chosen entry.
- **Storage:** check constructor options, object keys, URL generation and failure
  behavior against your configured adapter. The public storage layer uses
  Web-standard signing/runtime APIs; do not assume an old SDK client constructor
  or compliance wrapper is interchangeable.
- **Persistence:** changing imports does not move records, run migrations or change
  authorization. Keep connection configuration and existing data in place; verify
  read/create/update/delete and failure handling against your application's adapter.
- **AI:** use Core for proposal validation/contracts and React for review UI.
  Structured API checks and this migration example do not establish that an AI
  coding agent can migrate an arbitrary application correctly.

#### 6. Remove legacy dependencies after the cutover

For an application that has migrated every legacy import to the public subset:

```bash
bun remove @dataarthub/react-tools @dataarthub/app-core
```

Keep restricted dependencies still used by private features. Update TypeScript,
bundler and test aliases, mocks, CSS imports and AI instruction references along
with application imports. Remove obsolete source/tarball overrides and regenerate
the application's own lockfile with its package manager.

Public AI entry points are `@alneas/appkit-core/ai-instructions` and
`@alneas/appkit-react/ai-instructions`, with machine context at each package's
`/package-context.json`. The legacy `dist/ai/setup.mjs` is not a public setup CLI.
The private `compliance/prepare.mjs` is also not shipped by the public packages.
Review the public packages' `LICENSE` files and React's `THIRD_PARTY_NOTICES.md`;
keep notices for any retained private or application dependencies in scope.

### Verification

In the consuming application:

1. Search source, tests and configuration for `@dataarthub/app-core` and
   `@dataarthub/react-tools`. Each remaining use must be intentional.
2. Run the application's TypeScript check with its normal module resolution.
   Confirm each moved symbol exists, not just the destination subpath.
3. Run the production build and open the migrated screens. Verify providers,
   styles, validation, locale and optional integration loading.
4. Exercise only the changed feature boundaries: real form persistence, adapter
   failures and relevant document/CSV output. Reuse unchanged integration evidence
   where its inputs still match; avoid production-data writes as a migration probe.
5. Review the dependency tree for legacy leftovers or duplicate React/query
   contexts, then keep the migration diff and application checks together.

Expected result: the application resolves the selected published packages without
source aliases, type-checks, and retains its tested behavior through explicit
adapters/providers. Appkit's `0.1.0` release checks covered isolated public package
consumers, declarations and the request-form recipe; they do not certify your
application, private extensions or every hosted provider. This guide's import
example is checked separately; no complete legacy application migration is claimed.

### Troubleshooting / Common Pitfalls

| Symptom | What to check |
| --- | --- |
| Package installation returns 401/404 | Public packages use npm; retained restricted packages need the correct GitHub scope and credentials. |
| `Package subpath is not defined by exports` | Use the complete new feature path; there is no blanket compatibility alias for old subpaths or `dist/*`. |
| A named export disappeared | Root barrels differ. Locate the actual symbol in the export reference; some features remain restricted. |
| Missing query/data-access context | Use the paired public providers in the complete form recipe and check for duplicate dependency instances. |
| UI renders without styling | Import `@alneas/appkit-react/styles` at the application boundary. |
| Dates, validation or documents changed | Choose explicit locale/validation settings and the appropriate generic or Japanese preset entry. |
| A browser build pulls in backend code | Move filesystem/SDK/credential imports to server modules and use explicit feature entries. |
| A legacy provider/editor/PDF component has no public equivalent | Retain the restricted distribution or replace that feature explicitly; a namespace rename is insufficient. |
