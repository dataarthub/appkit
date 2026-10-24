# dnd-kit 0.5.1 behavior spike results

Date: 2026-10-23 (Asia/Tokyo).
Baseline: `9eb2b623ed35b2a78201a2abc9d64deac04f9159`.
Branch: `chore/dnd-kit-react-migration`.
Scope: an explicitly disposable prototype for the three requested behavior risks.

## Decision

The investigated drag behaviors are technically feasible on `@dnd-kit/react@0.5.1`. The prototype preserves Kanban empty-column movement, visual-column keyboard navigation and status-only movement, and table keyboard/pointer column reordering with handle focus and order persistence. No package patch or private API access was needed.

This changes the uncertainty from “can these behaviors be implemented?” to “can they be integrated without breaking the existing public contracts and feature integrations?” It supports entering a scoped migration implementation when there is a reason to prioritize it. It does not make immediate adoption necessary or establish release readiness.

Keep the earlier recommendation: preserve high-level APIs and explicitly review low-level breaking changes if proceeding. React 19 support by itself still does not justify a rushed migration.

## Reproducible source and isolation

Source: [disposable experiment](../../../experiments/dnd-kit-react-spike/README.md).

```sh
node experiments/dnd-kit-react-spike/run.mjs
```

The runner copies the experiment into ignored `.verification/tmp/dnd-kit-migration`, runs `npm ci --ignore-scripts --no-audit --no-fund`, checks both TypeScript configurations, builds with Vite, and runs Chromium through the existing repository process guard. The guard contains the local Vite server and browser descendants, limits combined memory to 2 GiB and time to four minutes, and shuts down its owned processes.

The fixture pins React/React DOM 19.2.3, dnd-kit React/dom/collision 0.5.1, legacy core 6.3.1/sortable 10.0.0/utilities 3.2.2, Vite 8.0.3, TypeScript 6.0.3 and Playwright 1.62.1. This investigation ran on Node 26.5.0 with Chromium 151.0.7922.34.

Four exact baseline source snapshots are recorded and hash-checked by the runner: Kanban keyboard sensors, drop resolver, task/column types and the old JSX shim. The candidate resolver keeps the same function body with local structural argument types. Production source files, production dependency manifests and root `bun.lock` were not changed.

## What was tested

| Area | Concrete assertions |
| --- | --- |
| Kanban keyboard | Space/Enter pickup and drop; one Right into an empty column; two Rights into an occupied column; Left at first column does not wrap; Escape makes no status callback; same-column drop does not reorder or call back. |
| Empty compound column | The resolver identifies a column by target metadata when no explicit columns array is supplied. This is the compound-specific boundary reproduced by the fixture. |
| Pointer | Empty-column and occupied-card-area drops update only the dragged task and call back once; movement below the 10px activation threshold does not move a task. |
| Input lifecycle | Keyboard move followed by pointer move in the same provider verifies collision observation is re-enabled. One custom overlay is visible during drag and removed after cleanup. |
| Read-only and a11y attributes | Read-only prevents keyboard pickup/movement; the card's described-by element contains the existing Japanese Left/Right instructions. This is not a screen-reader or axe audit. |
| Table keyboard | Status moves after email; DOM header order matches state; focus returns to the original drag handle; Escape restores original order. |
| Table pointer | Dragging the separate status handle onto email updates order. Clicking the sort button does not reorder. |
| Table state | Sort state and `aria-sort` survive reordering; `th` remains a header without a role/tabindex override; cell order follows header order; order survives a localStorage/reload round trip. |
| Native touch | CDP touch events in a touch-enabled Chromium context: a 320ms hold followed by movement drops into the empty column; movement before the 250ms hold expires makes no status change/callback. Small viewport size alone is not used as evidence of touch support. |
| New API semantics | Recorded end event has `source: status`, `target: status`, `initialIndex: 1`, `index: 2`. This demonstrates why comparing source/target IDs cannot detect the reorder. |
| Types/build | General comparison config passes with the legacy shim; candidate-only config passes with `skipLibCheck: false`, excludes the shim and all legacy imports; Vite production fixture build passes. |

The default browser matrix is light/dark × desktop 1280×900/mobile 390×844 for both engines, followed by two touch cases per engine. The real table markup, nested card buttons, body-portal overlay and React StrictMode are exercised.

## Findings that affected the prototype

### 1. Kanban needs a custom keyboard policy

The new default keyboard sensor moves by a pixel offset. It does not implement Appkit's “one key selects the next visual status column,” especially for empty columns. A small subclass of the exported `KeyboardSensor` implements that policy through its declared protected extension points.

The custom sensor selects enabled registered column droppables, orders them by DOM left position, uses source/target status metadata, scrolls the selected column into view, moves the feedback position and explicitly sets the drop target. The final sensor is 31 source lines in this fixture. This is an actual replacement for the legacy coordinate-getter policy, not a type cast.

An initial desktop-only version failed after horizontal scrolling at mobile width: geometric collision observation changed the explicitly selected `done` target back to `empty`. The diagnostic trace captured both targets. During keyboard operation, the final subclass disables automatic collision observation and restores it in cleanup. Pointer detection remains enabled for subsequent operations; the same-provider keyboard→pointer case verifies this. Upstream's installed `SortableKeyboardPlugin` uses the same observer-control concept.

### 2. Plain draggable cards fit status-only Kanban

The candidate uses `useDraggable` for cards and `useDroppable` for whole columns. It does not invoke sortable DOM reordering inside Kanban. Consequently, no new index/group props are required on public Kanban cards/columns for the investigated behavior. A drop over a card still resolves to its containing column. Empty columns remain real droppable regions.

The original resolver body is reused; only its type-only dependency on legacy event types is replaced with structural Appkit-owned argument types. No intra-column reorder or new `onOrderChange` implementation was added.

### 3. The React overlay still needs the Feedback plugin

The first candidate explicitly configured `Feedback` with `feedback: 'none'` while also rendering React `DragOverlay`. Pointer/touch pickup occurred, but no target was found. Inspection of the installed 0.5.1 code showed that this setting returns before creating/updating the drag shape. The React overlay itself binds to the Feedback plugin.

Removing the explicit `none` setting and retaining the native plugin made pointer and touch drops work with the single custom overlay. Do not carry a general “turn feedback off to avoid double overlay” assumption into this package version. The prototype requires no source transform/CSS utility shim.

### 4. Table order uses indices and a real handle ref

New `useSortable` receives stable ID, rendered index, group/type/accept and collision policy. Its returned `ref` attaches to `th`, and `handleRef` attaches to the separate reorder button. End processing checks cancellation and sortable identity, then moves order using `initialIndex` and `index`.

The observed end event's source and target IDs are identical after optimistic sorting; the old `active.id !== over.id` condition would miss a successful reorder. `moveOrder` also guards missing/out-of-range indices in the reduced fixture.

### 5. Null animation and zero-duration animation differ for focus

With `Feedback.configure({feedback: 'clone', dropAnimation: null})`, column order updated but the keyboard handle lost focus. The installed plugin's null-animation path skips the focus-restoration behavior associated with animation cleanup. Configuring `dropAnimation: {duration: 0}` preserved the immediate presentation and restored focus. No manual focus workaround remained in the final candidate.

The old-engine overlay has a default 250ms drop animation. Two initial comparison checks attempted the next action or asserted zero overlays while it was still running. The final runner waits for overlay removal, rather than interpreting this normal cleanup interval as a migration regression. Diagnostic failed runs were retained locally; successful results below refer to the final unchanged fixture.

## Change size and integration work

The normalized reduced prototype comparison contains **68 added and 67 removed lines** across the UI, keyboard sensor and resolver pairs. Both sides were passed through the same TypeScript printer before counting. Raw fixture formatting compresses some JSX, so this is a measured prototype diff, not a production line-count estimate or an effort quote.

| Production area | Expected implementation changes for the requested scope |
| --- | --- |
| Kanban: six direct dnd-kit consumers | `use-kanban-sensors.ts`: replace coordinate getter with new sensor and lifecycle control. `use-kanban-drag.ts`: normalize source/target/cancel events while retaining state ownership. `kanban-primitives.tsx`: new provider, plain draggable cards, column refs and overlay. `KanbanColumn.tsx`, `kanban-compound.tsx`: remove legacy SortableContext. `kanban-drag.ts`: use local structural types. |
| DataTable: one main consumer | `data-table.tsx`: provider/sensor setup, native sortable index/handle refs, cancellation, order reconciliation and feedback configuration. Real hidden/grouped headers may justify extracting a focused helper. |
| Package integration | React `package.json` and root `bun.lock`: add directly used candidate packages. Migrating these two features alone does not remove legacy dependencies: shared wrappers and FileBrowser still use them. |
| Verification/documentation | Extend the two owning Storybook files with real interaction assertions, add focused order/normalization tests and packed low-level API fixtures, and regenerate API/docs/notices when production dependencies/types change. |
| Public API work | `useKanbanSensors`, inferred `useKanbanDrag.contextProps` and `KanbanDragSurface.controller` expose old-engine details today. The prototype does not make them source-compatible; the earlier compatibility plan still applies. High-level task/status callbacks can retain their shapes. |

Therefore the requested behavior migration concentrates in **seven existing production implementation files**, plus package metadata, tests/docs and possibly an order helper. It is a rewrite of the drag interaction boundary, not a whole Kanban/Table rewrite and not a few import substitutions. The other common wrappers/FileBrowser changes remain additional scope for a full one-engine cutover.

No precise production LOC, days or bundle-size estimate is claimed from the reduced fixture. The most difficult discovered integration choices are now concrete: keyboard collision ownership, feedback/overlay cooperation, index-based ordering and focus cleanup.

## Limits and next decision

- These are reduced standalone fixtures, not the actual Appkit KanbanBoard/compound slots/DataTable mounted in Storybook. Hash-checked resolver/sensor snapshots preserve key baseline logic, but the rest deliberately isolates the engine boundary.
- The table does not use TanStack Table, grouped/hidden headers, selection/row-number plugins, Zustand settings, SSR or hydration. A localStorage round trip demonstrates basic persistence only. Its sort assertion checks retained sort state/ARIA, not real data sorting.
- The two Kanban modes both apply fixture state synchronously. The compound-mode case proves metadata-based empty-column resolution; it does not prove full controlled vs optimistic state behavior, custom status fields, custom card integration, source removal or in-flight read-only changes.
- Touch tests establish hold/cancel input behavior for the fixture. Because its cards have `touch-action: none`, they do not establish production scroll-gesture parity. FileBrowser, real storage writes, screen readers, full a11y checks, packed ESM/CJS/NodeNext consumers and minimum Node 24 are outside this spike.
- The public low-level API changes remain the largest adoption/rollout cost. There is no evidence here that external consumers do not use those APIs.

A full migration is now technically plausible, with no blocking issue found in the requested engine behaviors. The next meaningful step is the existing plan's real-component integration and compatibility gates, not more isolated smoke tests. Production adoption and release remain separate decisions.

## Verification receipt

Final reproducible command: `node experiments/dnd-kit-react-spike/run.mjs`.

- Exit code: 0.
- General TypeScript check: PASS.
- Candidate-only TypeScript check without global JSX shim (`skipLibCheck: false`): PASS.
- Vite fixture production build: PASS.
- Browser cases: **152 passed, 0 failed**, no captured page/runtime errors.
- Legacy: 74 passed; candidate: 78 passed.
- Process guard: PASS, combined measured peak **946 MiB** against 2048 MiB limit; no deadline/memory truncation or skipped cases.
- Normalized prototype diff: 68 additions / 67 removals across three pairs.

Original logs, failed diagnostic cases, final JSON and normalized change counts remain under ignored `.verification/logs/dnd-kit-spike/`; raw evidence stays out of the public documentation manifest and package artifacts. The final fixture was not edited during this successful run. These results are the behavior-spike gate only, not the full Appkit release gate.
