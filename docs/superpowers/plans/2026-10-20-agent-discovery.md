# Appkit Agent Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship direct agent instructions, authoritative catalogs, a cross-package discovery index, and a read-only Core-owned API search executable.

**Architecture:** Repository-owned `.mjs` helpers generate catalogs from declaration exports and provide the dependency-free loader/search used by the Core CLI. Copy only the CLI runtime helper closure into Core `dist`; React supplies its own generated JSON catalog. Keep package generation independent and aggregate repository output only in full generation.

**Tech Stack:** Node built-ins, TypeScript 6.0.3 compiler API as a dev dependency, Node test runner, existing Vite/declaration preparation and Turbo.

**Spec:** [Approved design](../specs/2026-10-20-agent-consumer-design.md); [coordination plan](2026-10-20-agent-consumer.md).

## Global Constraints

All coordination-plan constraints apply: keep both manifest versions/internal pins at their current `0.1.0` values, preserve existing work, and do not commit or publish. Runtime CLI code must use only Node built-ins. Preserve existing metadata exports and all JS/type/CSS exports. Maximum catalog size is 16 MiB; query maximum is 500 characters; limit is 1..100 with default 20. Exit codes are 0/2/3 for success/usage/catalog failure. English remains canonical.

## Review Focus

- Legacy installed package versus newer bundled executable: report unavailable catalog, never substitute its API surface (A3).
- Temporary generation, missing declarations, and package-only cache restore must not repair/write normal or sibling outputs (A2/A4).
- Alias exports and type-only/re-exported/overloaded symbols must retain their actual public imports (A1).
- Malformed/oversized catalogs, package-escaping paths and terminal control characters are untrusted input (A3/A4).
- Core-only installation must search without React, optional SDKs, runtime TypeScript, or network (A4).

## File ownership and data contracts

Create `agent-policy.json` for package/feature guidance. Create repository modules `scripts/agent/catalog-contract.mjs`, `generate-catalog.mjs`, `search.mjs`, `load-catalogs.mjs`, and `cli.mjs`, with matching `.test.mjs` files. Shared format/search modules live here so React generation never imports Core source. Create `scripts/build-agent-cli.mjs` to copy the runtime closure into Core, not the generator or TypeScript.

Modify `scripts/generate-docs.mjs`, its existing output/integration tests, `generated-policy.json`, `turbo.json`, package manifests/READMEs/consumer skills, `scripts/check-consumer.mjs`, `scripts/release.test.mjs`, root `package.json` and quality CI only as needed by the tasks below. Generated artifacts are `llms.txt`, package root context/catalog, existing `dist/consumer-ai` copies, and existing documentation/AI aggregates. Do not hand-edit generated artifacts.

Use these exact contract names in JSDoc typedefs exported by `catalog-contract.mjs`:

```ts
type Requirements = {requirementsStatus: 'documented'|'consult-guide'; guide: string;
  requiredPeers: Record<string,string>; providers: string[]; styles: string[]};
type CatalogEntry = {importPath: string; kind: 'module'|'stylesheet'|'metadata';
  targets: {esm?: string; commonjs?: string; esmTypes?: string; commonjsTypes?: string}; requirements: Requirements};
type ApiSymbol = {importPath: string; name: string; kind: 'value'|'type'|'both';
  signatures: string[]; summary: string; tags: {name:string;text:string}[]; guide: string};
type Catalog = {schemaVersion:1; packageName:string; packageVersion:string; inputDigest:string;
  entries: CatalogEntry[]; symbols: ApiSymbol[]};
type LoadedCatalog = {catalog:Catalog; source:'installed'|'bundled'};
type UnavailablePackage = {packageName:string; code:'not-installed'|'catalog-unavailable'|'invalid-catalog'};
type SearchResult = {packageName:string; packageVersion:string; inputDigest:string;
  importPath:string; symbol?:string; signatures:string[]; summary:string; requirements:Requirements};
```

The compiler and runtime validators must agree on these fields. Extra metadata cannot change ranking or package identity. Limit entries to 4096, symbols to 100000, signatures per symbol to 64, and any documentation/signature string to 65536 characters, within the 16 MiB file cap. Limit package/import/name identifiers to 512 characters. Reject duplicate entry imports and duplicate `(importPath,name)` symbol keys.

### Task A1: Generate catalogs from real public declarations

**Files:** Create `scripts/agent/catalog-contract.mjs`, `generate-catalog.mjs`, `catalog-contract.test.mjs`, `generate-catalog.test.mjs`, and `agent-policy.json`.

**Interfaces:** Consume package manifests, prepared `.d.ts`/`.d.cts`, guides, and feature policy. Produce `validateCatalog(value:unknown): Catalog`, `generateCatalog({packageDir,policy}): Catalog`, and `canonicalDigest(inputs: {path:string;bytes:Uint8Array}[]): string`. Validation throws a fixed catalog error category; no host paths enter public output.

- [ ] Write tests `resolves_alias_types_overloads_and_reexports`, `compares_esm_commonjs_surfaces`, `keeps_optional_external_type_names`, and `fails_missing_public_target`. Use temporary declaration fixtures: one renamed re-export, one type-only export, two overload signatures, one alias entry sharing a target, and an absent external peer type. Assert actual names/signatures, both alias imports, no fabricated optional type, and explicit failure on missing public declaration.

```js
assert.equal(catalog.schemaVersion, 1);
assert.deepEqual(catalog.symbols.filter(s => s.name === 'renamed').map(s => s.importPath), [mainImport, aliasImport]);
assert.equal(catalog.symbols.find(s => s.name === 'overloaded').signatures.length, 2);
assert.equal(JSON.stringify(catalog).includes(fixtureAbsolutePath), false);
```

- [ ] Run `node --test scripts/agent/catalog-contract.test.mjs scripts/agent/generate-catalog.test.mjs`. Observe missing-module/interface failures before implementation.
- [ ] Implement the contract validators and `generateCatalog` using the TypeScript checker, not regex name extraction or runtime imports. Preserve exported spelling, explicit `default` exports, type/value classification, and comments; normalize import-type paths and reject unresolved local aliases. Emit shared symbols only when both module conditions support them; fail on an unrepresentable condition difference instead of silently claiming parity.
- [ ] Implement feature-policy validation with longest import-prefix matching and explicit exceptions. Cover six Core families, React UI/tools/AI/styles, and narrower SDK entries; validate peers against manifests. An uncovered narrow import reports `consult-guide` and never guesses providers. Hash sorted package-relative input bytes; exclude generated discovery outputs.
- [ ] Add `rejects_limits_duplicates_and_host_paths`, `stable_digest_and_order`, and `validates_feature_policy` assertions, including exact size/array boundaries, JSDoc control text, condition-specific types, and unknown policy peers/imports. Rerun the Task A1 command; expected all tests pass. Inspect the task delta without committing.

### Task A2: Pack discoverable instructions and generate the root index

**Files:** Modify both package manifests, READMEs, `consumer-ai/SKILL.md`, `scripts/generate-docs.mjs`, `scripts/generate-docs-output.test.mjs`, `generated-policy.json`, and the archive metadata checks in `scripts/check-consumer.mjs`; create `scripts/agent/discovery.test.mjs`. Generate package/root indexes and root/compatibility metadata through the generator.

**Interfaces:** Consume A1 catalog functions. Produce package `appkit.agent` exactly as specified in the design, `./api-index.json`, the three exact root files, byte-equal compatibility copies, and full-generation-only repository `llms.txt`. Keep `./ai-instructions` and `./package-context.json` targets unchanged. Package-only generation must not write root/sibling artifacts.

- [ ] Write `packs_direct_and_compatibility_instructions`, `temporary_generation_stays_in_destination`, `package_only_leaves_root_and_sibling_untouched`, and `root_index_selects_core_or_react`. Extend existing fixtures with actual tiny declarations and required helper files; resolve the existing TypeScript dev tool only for generator tests, with no production source alias.

```js
assert.equal(pkg.appkit.agent.instructions, './consumer-ai/SKILL.md');
assert.equal(pkg.exports['./ai-instructions'], './dist/consumer-ai/SKILL.md');
assert.deepEqual(rootInstructionBytes, compatibilityInstructionBytes);
assert.equal(rootIndexAfterPackageOnly, rootIndexBefore);
```

- [ ] Run `node --test scripts/agent/discovery.test.mjs scripts/generate-docs-output.test.mjs`; observe the absent metadata/output assertions fail.
- [ ] Add exact `files` entries for `consumer-ai/SKILL.md`, `consumer-ai/package-context.json`, and `consumer-ai/api-index.json`, plus the Appkit-specific metadata and catalog export. Update authored instructions/READMEs to explain this convention and version-specific search; install package names, never subpaths. Extend the archive whitelist only for these exact root paths.
- [ ] Integrate the generator in this order: finalized guide/landing outputs, context/catalog, compatibility copies, package `llms` aggregates, then full-generation root index. Until evaluation Task C5 adds its dedicated procedure, link the existing release guide for evaluation status rather than creating a broken forward link. Preserve `--output-dir` read/write separation; missing declarations fail with a clear build prerequisite. Register only generated root context/catalog and root index in `generated-policy.json`; authored skills stay inputs.
- [ ] Rerun Task A2 tests and `bun run docs:generate` followed by `bun run check:docs` after package builds. Expect fresh outputs, valid links/imports, byte-equal copies and no design/plan/evidence paths in the public manifest. Inspect generated additions and the existing delta without committing.

### Task A3: Resolve local catalogs and perform deterministic search

**Files:** Create `scripts/agent/load-catalogs.mjs`, `search.mjs`, `load-catalogs.test.mjs`, and `search.test.mjs`.

**Interfaces:** Produce `loadCatalogs({root:string,scope:'core'|'react'|'all',bundledCoreDir:string}): {loaded:LoadedCatalog[];unavailable:UnavailablePackage[]}`, `searchCatalogs(loaded:LoadedCatalog[],query:string,limit:number): SearchResult[]`, and `showCatalogEntry(loaded:LoadedCatalog[],importPath:string,symbol?:string): SearchResult[]`. These functions do not print, write, install, or import package code.

- [ ] Write `legacy_installed_core_never_uses_new_bundle`, `core_only_search_reports_missing_react`, `package_scope_is_explicit`, `rejects_escaped_and_oversized_catalog`, and `exact_match_then_stable_literal_ranking` with isolated fake installed packages.

```js
assert.equal(legacy.loaded.some(c => c.source === 'bundled'), false);
assert.equal(legacy.unavailable[0].code, 'catalog-unavailable');
assert.deepEqual(searchCatalogs(loaded, 'no-match', 20), []);
assert.equal(searchCatalogs(loaded, exactSymbol, 20)[0].symbol, exactSymbol);
```

- [ ] Run `node --test scripts/agent/load-catalogs.test.mjs scripts/agent/search.test.mjs`; observe missing implementations fail.
- [ ] Resolve only the two known packages through `createRequire` based at `--root`. Resolve the new catalog export first; use the old context/root entry's resolvable path and containing named manifest to distinguish an installed legacy package from absence. Read package files without executing them. Follow normal package-manager links to the package root, then enforce realpath containment for catalog metadata. Require catalog package/version to match that resolved package.
- [ ] Permit bundled Core only if no Core is installed. Explicit unavailable/invalid requested scopes fail; default `all` searches available catalogs and reports unavailable ones, failing if none are usable. Treat corrupt installed data as invalid rather than falling back. Enforce schema/file bounds before search.
- [ ] Implement case folding with `toLowerCase`, whitespace tokenization, literal matches and the design ranking tiers. Tie-break with deterministic string comparison, not locale-dependent sorting. Add boundary tests for 500/501 characters, 1/100 limits, no-match, control characters, Unicode, and query strings resembling regex. Rerun Task A3 tests; verify fixture hashes unchanged and no network/process calls occur.

### Task A4: Build, expose, and verify the packed executable

**Files:** Create `scripts/agent/cli.mjs`, `cli.test.mjs`, `scripts/build-agent-cli.mjs`, `scripts/agent/packed-cli.test.mjs`, and `scripts/test-agent-tooling.mjs`; modify Core manifest/build script, `turbo.json`, root `package.json`, quality CI and `scripts/check-consumer.mjs`/`scripts/release.test.mjs`.

**Interfaces:** Produce `runCli(argv:string[],{stdout,stderr,cwd,bundledCoreDir}): number` using A3 functions. `build-agent-cli.mjs` copies only contract/load/search/CLI modules into Core `dist/agent-cli/` and writes executable `dist/agent-cli.mjs` with a Node shebang. Core `bin.appkit-api` points to that wrapper. `test:agent-tooling` runs `scripts/test-agent-tooling.mjs`, which explicitly discovers the deterministic `.test.mjs` files in `scripts/agent` and, once added, `scripts/agent-eval`; never discovers a live runner by glob.

- [ ] Write `cli_json_is_one_envelope`, `usage_and_catalog_exit_codes`, `control_text_is_not_terminal_code`, `packed_bin_runs_without_optional_peers`, and `cache_owns_generated_root_files`. Assert unknown flags/invalid limits exit 2, explicit missing catalog exits 3, empty search exits 0, and help/version work. Assert JSON has `schemaVersion`, `ok`, searched/unavailable scopes and results without progress chatter.
- [ ] Run `node --test scripts/agent/cli.test.mjs scripts/agent/packed-cli.test.mjs` and observe absent executable/contract failures.
- [ ] Implement CLI parsing/rendering, fixed safe error categories, stdout/stderr separation, and package-version reporting. Pass query/path data as values, never shell code. Preserve metadata entry search/show behavior as well as symbols. Build the wrapper after Vite clears `dist`, before package docs/packing; keep Node CLI sources outside `src` so automatic browser library entry discovery cannot include them.
- [ ] Update Turbo global helper/policy inputs and generated output ownership, including both package-specific React build configuration and generic Core build configuration. Exclude generated metadata from build/test/typecheck inputs where necessary to prevent self-invalidating cache keys; restore root generated package files on cache hits. Do not make package builds produce repository-root `llms.txt`.
- [ ] Extend isolated consumer checks to inspect bin bytes/mode and run the actual installed bin on Node 24.0.0 plus routine CI Node versions, in Core-only and Core+React installations. No optional SDK or TypeScript is loaded by the CLI. Add fresh candidate artifact directories instead of overwriting `two-package-0.1.0`; include candidate digest/version metadata while keeping published-version assertions version-aware.
- [ ] Run `bun run test:agent-tooling`, both filtered builds/types, `bun run docs:generate`, `bun run check:docs`, `bun run check:release`, and `bun run test:consumer`. Expected deterministic tests, unchanged existing exports, exact packed files/bin, fresh generated output, and NodeNext/native entry checks pass. Review task deltas; no commit, version bump, or publication.

## Handoff to AI safety

Package generation now accepts a generated Core error guide before catalog/`llms` aggregation. Task B1 extends that stage without changing catalog/search contracts. The evaluator later reuses `validateCatalog`, `generateCatalog` data shapes, exact reviewed archives, and the actual Core CLI; it must not substitute a developer checkout's catalog for a packed consumer's catalog.
