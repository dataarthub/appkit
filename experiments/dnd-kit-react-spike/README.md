# Disposable dnd-kit migration spike

This experiment compares legacy dnd-kit with React 0.5.1 using reduced Kanban and table fixtures. It is not a migrated Appkit component or a release gate. The new-engine Kanban uses plain draggable cards, column droppables and a custom keyboard sensor. The table uses indexed sortables with native handles.

Run from the repository root:

```sh
node experiments/dnd-kit-react-spike/run.mjs
```

This copies the source to ignored `.verification/tmp/dnd-kit-migration`, installs that fixture's private dependencies with npm ci, checks both TypeScript configurations, builds and runs real Chromium input tests under the repository process guard (2 GiB, four minutes). It starts a local server on port 5198 and terminates it after testing. Network/package installation, a compatible Playwright Chromium binary and permission to launch browsers/listen locally are required. If the binary is absent, install the Chromium version required by the fixture's pinned Playwright before running. Reports and diagnostic screenshots stay under ignored `.verification/logs/dnd-kit-spike/`.

`SPIKE_QUICK=1` selects light desktop plus actual touch checks. `SPIKE_ENGINE=candidate` limits the comparison to the candidate. The default covers both engines in light/dark × desktop/mobile widths plus touch-enabled Chromium with native CDP touch events. Viewport sizing alone is not called touch coverage.

The baseline keyboard sensor, drop resolver, types and JSX shim are exact source snapshots, checked against their recorded SHA-256 hashes and the historical baseline commit. Current production changes do not invalidate the historical comparison. Other UI/state code is deliberately reduced. The table does not import TanStack Table or Appkit's Zustand store; it checks the drag boundary, header/cell order, sort-state retention and a localStorage round trip, not those integrations. Both Kanban modes use synchronous fixture updates; the compound switch specifically exercises empty-column metadata resolution without an explicit columns array. It does not instantiate Appkit's compound components or prove all controlled/optimistic behavior.

`tsconfig.candidate.json` excludes legacy code and the global JSX shim, and checks dependency declarations with `skipLibCheck: false`. The general config includes the legacy shim to run the old comparison. Running this experiment does not modify production package sources or the root lockfile. Its legacy dependencies exist only in the disposable comparison fixture.

Do not add this experiment to package exports, the npm package files or the portal manifest. Keeping its source permits reproducing the investigation; promoting any spike implementation to the library requires the migration review and full planned verification.

The recorded baseline commit must be available locally (use a full clone or fetch
that history before running a shallow checkout). The isolated fixture deliberately
retains legacy engine snapshots for comparison; they are not production imports,
npm payloads or portal documentation.
