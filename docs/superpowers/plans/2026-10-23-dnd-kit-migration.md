# dnd-kit Migration and Verification Plan

Current status: full public cutover implemented and verified. The investigation and
proposed checklists below are historical; they are not a certification that every
proposed experiment was executed. Current consumer instructions live in the
[unreleased migration guide](../../development/dnd-kit-migration.md). Commit, push
and PR creation were subsequently authorized; package publication is not authorized.

Follow-up: the [authorized behavior spike](../specs/2026-10-23-dnd-kit-spike-results.md) now supplies runtime evidence for the requested Kanban/table risks. Investigation-only statements below describe the earlier assessment; full component/API integration gates remain open.

> **For agentic workers:** Use superpowers:executing-plans after the migration approach is approved. This is a proposed sequence and verification plan, not authorization to implement or commit.

**Goal:** Evaluate and then migrate the public React package to the reviewed dnd-kit React candidate while preserving high-level behavior and documenting deliberate low-level breaks.

**Architecture:** Use one engine after cutover. Keep domain state in each feature, normalize only the small event data actually needed, preserve the structural `resolveKanbanMove` input, and expose native new-engine refs/events at the generic boundary.

**Tech Stack:** React `^19.2.3`, Node `>=24.0.0`, Bun `1.4.0`, TypeScript `6.0.3`, dnd-kit candidate `0.5.1`, Storybook/Vitest/Playwright, Vite ESM/CJS/declarations.

**Spec:** [Impact and compatibility assessment](../specs/2026-10-23-dnd-kit-migration-design.md).

## Global constraints

- Retain Node `>=24.0.0`, React/React DOM `^19.2.3`, native ESM, CJS and NodeNext declarations.
- Keep independent public/private repositories and production dependencies free of workspace/file/link aliases.
- Preserve high-level props/callback payloads, CSS entry, host-owned contexts and the exact published Core dependency.
- Kanban changes status only; WIP limits stay presentational and `onOrderChange` stays inactive.
- No implementation/dependency install until the approach is approved; no commits, pushes or release writes without separate authorization.
- All commands below run from this worktree's root unless explicitly scoped.

## Review focus

- Source/target removed or read-only changed during drag: no stale status callback or file write (Stages 3–4).
- Hidden/persisted/grouped table columns: committed order uses stable IDs, remains complete and unique, and does not disturb sorting (Stage 5).
- React 19 ref cleanup, custom renderers and body-portal feedback: no duplicate registration, stale refs or duplicate overlay (Stage 3).
- Separate mouse/touch/keyboard activation and nested interactive controls: scroll, selection, focus and cancel still work (Stages 2–5).
- External legacy context composition and declaration reachability: explicitly documented breaks, no silent old/new context mix or hidden type dependency (Stages 1 and 6).

## Stage 1: Freeze the baseline and compatibility fixtures

**Files to inspect/extend:** `scripts/check-consumer.mjs`, `scripts/release.test.mjs`, `packages/appkit-react/consumer-ai/api-index.json`, public barrels identified in the assessment. Put new packed fixture source under the consumer harness's system-temp fixture, never a production alias.

- [ ] Confirm HEAD and capture the old exported symbol/signature inventory before installing the candidate. Build old `.d.ts`/`.d.cts` to establish authoritative declarations; do not rely on API-index `{}` signatures.
- [ ] Prepare baseline compile fixtures importing generic wrappers/props from root, tools, tools/core and tools/ui; import Kanban helpers from tools/kanban; DataTable from its feature/root paths; FileBrowser/views/providers from tools/file-browser.
- [ ] Assert baseline high-level examples compile unchanged, including custom Kanban rendering, compound controlled state and independent FileListView/FileGridView under a provider.
- [ ] Capture known low-level usages: `onDragCancel`, `active/over.data.current`, render props, `useKanbanSensors`, `useKanbanDrag.contextProps`, custom `KanbanDragSurface` controller, and external legacy hooks under Appkit providers. Mark which must migrate and which structural calls remain compatible.
- [ ] Run baseline package and targeted interaction checks; record actual failures without attributing them to migration. Baseline Kanban/FileBrowser stories currently have no play assertions, so their render success is not movement evidence.

Commands once implementation is approved:

```sh
bun install --frozen-lockfile --ignore-scripts
bun run turbo run build typecheck test --filter=@alneas/appkit-react
bun run storybook:prepare
bun run check:storybook
bun run test:consumer
```

The consumer command packs both packages, so build Core first if it lacks artifacts (`bun run build`). These commands require network access for fresh dependencies/fixtures. Log baseline commands/results under ignored `.verification/logs/`; preserve no fabricated passes.

**Exit:** actual old declarations and fixtures establish the compatibility boundary; no unresolved baseline failure is called a new regression.

## Stage 2: Resolve the new-engine behavior risks

**Disposable spike locations:** ignored `.verification/tmp/dnd-kit-migration/`, with its own fixture manifest if needed; do not modify the production dependency graph during the spike.

- [ ] Verify candidate metadata and inspect installed pinned declarations for exact provider callbacks, nullable source/target, refs, keyboard extension, accessibility, feedback and collision exports. Record the resolved versions.
- [ ] Prove the three activation policies: generic pointer 5px, table pointer 8px, Kanban mouse 10px and touch hold 250ms/tolerance 5px. Pointer-move below threshold must not initiate; moving touch before the hold must permit scroll/cancel.
- [ ] Demonstrate Kanban Left/Right traversal across empty/nonempty columns and Escape cancellation using real geometry. Preserve Space/Enter start/end and Japanese instructions. Identify the exact 0.5.1 customization API in the spike notes before implementing it in production.
- [ ] Demonstrate plain draggable/droppable Kanban card-over-card status resolution with no intra-column reordering; only fall back to sortables with optimistic sorting disabled if this fails.
- [ ] Demonstrate a table-header sortable with a separate handle, unchanged sorting button, valid table layout and restored focus. Exercise initial/current indices rather than the legacy different-ID guard.
- [ ] Demonstrate one body-portal overlay with React 19 mounting/unmounting and no duplicate feedback.

**Exit:** all risk cases have runnable evidence. A failed keyboard/table requirement pauses engine selection; it is not waived by package typechecking. Throwaway spike code is not promoted without review.

## Stage 3: Migrate shared wrappers and Kanban together

**Modify:** wrappers in `src/tools/components/ui/dnd/`; Kanban's six direct-import files plus `KanbanBoard.tsx`, `KanbanCard.tsx`, `types.ts` and `index.ts` as needed. Paths are under `packages/appkit-react/`.

**Create:** small internal normalizer and focused `.test.ts` beside Kanban drop resolution if extraction is needed. Extend `stories/components/kanban/KanbanBoard.stories.tsx`; add wrapper interaction stories under `stories/components/ui/`.

**Interfaces:** generic wrappers use native `{ref, handleRef, isDragging}` / `{ref, isDropTarget}` render props and new provider events as proposed. Keep `resolveKanbanMove`'s `{active, over}` structural arguments and `{taskId, status} | null` result with local types. `useKanbanDrag` keeps options/activeTask and returns explicitly typed new-provider context props. Internal context supplies registration metadata without adding required props to existing public cards/columns.

- [ ] Add failing unit cases for null target, unknown task, same status, card target, empty-column metadata, custom status field and removed column. Expect exactly the current `{taskId, status}` or `null` results.
- [ ] Add browser play assertions for preset/compound status movement, empty-column movement, one callback, no within-column order change, no `onOrderChange`, read-only, cancel, drop outside, source/column removal and read-only toggled during a drag.
- [ ] Add assertions for optimistic preset vs disabled optimism vs controlled compound; preserve the existing async callback behavior without introducing rollback.
- [ ] Add custom-card, forwarded-ref cleanup, nested button, focus and overlay count assertions. For wrappers check event lifecycle/data, string IDs, disabled droppable and independent context isolation.
- [ ] Run new tests against baseline and confirm failures represent the intended new boundary; implement migration, then rerun those tests through repository runners.

**Exit:** status-only behavior, exported helper contract and deliberate new low-level signatures are demonstrated together; old/new providers are never composed inside one feature.

## Stage 4: Migrate FileBrowser views and provider writes

**Modify:** `src/tools/components/file-browser/{FileBrowser,FileListView,FileGridView}.tsx`. Extend `stories/components/file-browser/FileBrowser.stories.tsx` with an in-memory FileProvider that records move/refresh calls and updates listed nodes.

- [ ] Add failing list/grid drag assertions: file→folder calls `moveNode(file.id, normalizedFolderPath)` once; refresh follows resolution; rejected moves surface the error without success refresh.
- [ ] Assert zero writes for folder source, file target, same-prefix destination, outside drop, missing source/target/data, cancel and navigation/removal during drag.
- [ ] Assert Ctrl/Cmd selection, ordinary click, double-click open, context menu, touch scrolling and keyboard handle focus. Multi-selection must still perform only the dragged file's move.
- [ ] Attach native handleRef to the list's icon button and ref to its row; preserve table semantics. Migrate grid wrapper registration, then run the assertions with real input.

**Exit:** unchanged FileProvider API and write timing/counts; no live cloud credentials or storage mutation.

## Stage 5: Migrate DataTable ordering

**Modify:** `src/tools/components/data-table/data-table.tsx`; change `data-table-view.tsx` only if needed for preserved props. Extend `stories/components/data-table/data-table.stories.tsx`. Add focused ordering tests beside implementation if ID reconciliation is extracted.

- [ ] Preserve the existing Default story's keyboard reorder assertions (status moves after email, sort direction/data remain unchanged).
- [ ] Add failing cases for pointer and keyboard reorder, Escape/outside/no-op, disabled ordering, hidden columns, changed columns during drag, stale IDs, restored persisted order, selection/row-number columns and grouped/placeholder headers. Expect each logical ID exactly once and correct visible cell/header order.
- [ ] Specify an unambiguous registered-header identity policy for grouped headers before implementing; do not reuse one sortable ID across multiple DOM nodes.
- [ ] Implement index-based new-sortable registration and end-state reconciliation; keep sorting buttons separate from drag handles and preserve `storageKey` format.
- [ ] Verify all layout variants, hydration/SSR, handle focus, aria-sort and no extra header tab stop.

**Exit:** column persistence and sorting survive a full drag lifecycle; an unknown index never reaches array movement.

## Stage 6: Remove legacy dependencies and verify packaged boundaries

**Modify:** React `package.json`, root `bun.lock`, both JSX shim files and all stale imports; consumer harness fixtures; `packages/appkit-react/docs/{tools,migration}.md` and relevant API JSDoc/stories. Regenerate generated exports/indexes/notices using existing generators.

- [ ] Declare every directly imported candidate package; use helpers only if needed. Preserve Core's exact published dependency. Remove core/sortable/utilities once their source/type consumers are gone.
- [ ] Delete the tools JSX augmentation import and both duplicate shim modules only when strict packed fixtures pass without them. Verify no emitted global `JSX` workaround survives.
- [ ] Add positive packed fixtures for every retained high-level API and structural resolver input, and new low-level composition. Verify old callback/render-prop examples fail for the documented breaking reason rather than an unrelated missing module.
- [ ] Probe feature subpaths explicitly in ESM and CJS; the current general consumer entry list does not exercise Kanban or FileBrowser directly. Cover `.d.ts` and `.d.cts` with NodeNext and `skipLibCheck: false`; inspect declarations for stale core/sortable imports.
- [ ] Add minimal renderToString/hydration checks for each migrated high-level feature, using in-memory/no-write providers. Test host React identity and omitted optional peers in an isolated system-temp fixture with NODE_PATH removed, then clean it in finally.
- [ ] Write migration examples for all four generic wrapper import paths, cancel/end changes, refs/handles, and public Kanban helpers. Regenerate API metadata and THIRD_PARTY_NOTICES; inspect diffs for intended changes only.
- [ ] Measure comparable production bundle/install deltas; record results without setting an invented numeric performance budget. Review any regression before shipping.

**Exit:** one engine family, truthful migration documentation and clean independent package resolution.

## Verification commands and evidence

For focused unit behavior, add tests discoverable by `scripts/test-unit.mjs` and run:

```sh
bun run turbo run build typecheck test --filter=@alneas/appkit-react
bun run check:storybook
```

For the final real dependency change, repository policy selects the full gate:

```sh
node scripts/verification/run.mjs --full --dry-run
bun run quality:push
bun run test:consumer
node scripts/verification/run.mjs --full --node-compat
```

Inspect the dry-run and selection receipts. `quality:push` includes secret scanning and lint via the source adapter and invokes the selected package/docs/release/Core compatibility/browser tasks. Do not treat a dry-run as execution evidence. The final Node compatibility run must use the supported CI runtime lane (Node 26) when validating that lane; a host-only run does not establish a different Node version passed. The packed consumer separately exercises minimum Node 24.0.0.

Browser configuration covers Chromium light/dark × desktop 1280×900/mobile 390×844. All four conditions and fatal a11y checks must pass. Add real touch input coverage with a touch-enabled browser context; a small viewport is not proof of touch semantics. Do not bypass guarded browser runners for final evidence. Extra Firefox/WebKit checks are optional follow-up, not claimed coverage.

Record command, exact source/dependency versions, runtime versions, result and log location. Reuse identical-input Turbo evidence only where the repo permits it. Do not claim pre-migration dependency tests validate the candidate.

## Investigation-only verification performed now

- Source/export/API-index/test-runner inspection and published candidate metadata checks completed.
- No dependency install, runtime suite, production change or performance measurement was performed for this plan.
- `node scripts/check-docs.mjs`: PASS (21 approved public documents). These working documents remain outside the portal manifest, so their local links and whitespace were checked separately: PASS for both documents.
- `node --test scripts/check-docs.test.mjs`: PASS (2 tests, 0 failures).
- `git diff --check`: PASS; a separate check covered the new untracked documents, which Git diff does not include.
- HEAD remained at the recorded baseline; Git status showed only the two new working documents under `docs/superpowers/`.
- Independent read-only builder review: no material questions or factual inaccuracies found after source/export/verification-command spot-checks.
- These documentation checks do not establish runtime migration readiness.

## Decision to enter implementation

Approve or revise the coordinated breaking-change approach and its explicit low-level API changes; alternatively retain the legacy engine for compatibility. Resolve the behavior spike before freezing exact new types. Release version and downstream rollout remain separate maintainer decisions. Nothing in this document authorizes committing, merging or publishing.

## Authorized remaining cutover checklist (2026-10-23)

The latest user instruction authorizes execution of the remaining original Stages 3, 4 and 6. Prior Kanban/DataTable changes stay in this worktree.

- [ ] Add native-wrapper lifecycle/ref/disabled/cancel interaction contracts and failing FileBrowser move-resolution tests.
- [ ] Replace the three generic wrappers with native provider/registration refs. Preserve import names and mouse/pen threshold (5 px); use touch hold 250 ms/tolerance 5 px to permit pre-activation scrolling, use native keyboard/default feedback/accessibility, document the native event/render-prop breaks.
- [ ] Migrate FileBrowser/list/grid; validate current nodes/path/provider and live registrations before writing; test one-file writes, deferred refresh, failures, cancel/outside/stale moves, selection/open/context-menu and focus.
- [ ] Remove legacy dependencies and both React-19 global JSX shims. Update packed positive/native and negative/legacy fixtures, assert no legacy dependency or declaration reference, regenerate package metadata/docs/notices.
- [ ] Verify actual public components with trusted mouse/touch and keyboard input; verify real private forwarding contracts against reviewed archives only. Keep private evidence outside Public.
- [ ] Run focused tests, full dependency quality gate, Node compatibility and strict packed ESM/CJS/SSR checks, obtain one independent whole-diff review, and fix actionable findings with red/green tests.
- [ ] Record results and limitations, retaining branch/worktree without commits, pushes or publication.
