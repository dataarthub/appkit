# Remaining minor and patch dependency updates

> Execute inline with superpowers:executing-plans; user authorized updates and verification.

**Goal:** Update compatible direct dependencies without changing public Appkit types or behavior.
**Architecture:** Update tooling and runtime packages, then evaluate localization generation separately. Preserve public entry contracts and the existing React 19 work.
**Tech stack:** Node 24+, Bun 1.4.0, React 19, TypeScript 6.
**Spec:** User request in this conversation, 2026-10-23.

## Constraints
- Hold TypeScript 6.0.3, jsdom 26.1.0, dnd-kit core 6.3.1/sortable 10.0.0/utilities 3.2.2.
- Keep Core production pin 0.1.0, Node 24.0.0 minimum, and the deliberate BigNumber 9 test fixture.
- No commits, pushes, publications, product feature changes, or unrelated source edits.
- Retain Node 24 types; skip AI SDK 7.0.150 because 7.0.149 explicitly changes public finish-reason types and interrupted-stream semantics.

## Review focus
- Query cache and Zustand subscription behavior; panel and icon component props/ref compatibility.
- All locales, message interpolation, locale switching, and generated public i18n types.
- Build/minimum Node support and unchanged public ESM/CommonJS declaration shapes.
- Browser runner and lint config compatibility without disabling checks.

## Tasks
- [x] Capture fresh npm metadata, manifests, lockfile, declarations and generated localization baseline.
- [x] Update Query pair, Zustand, panels, Lucide, Vite, Playwright, Biome, Turbo, bun-types and fast-uri; update Biome schema without changing rules.
- [x] Upgrade the localization compiler/plugin only if public types and translation results remain compatible; retain old versions if migration changes required behavior.
- [x] Build sequentially, check public declarations, production/story types, unit tests, lint/docs/tooling, all four browser configurations and isolated packed consumers. Review changes and held versions.

## Ledger
- Baseline: .verification/tmp/dependency-minors-baseline. Existing detached worktree reused.
- AI deferral evidence: https://raw.githubusercontent.com/vercel/ai/main/packages/ai/CHANGELOG.md (7.0.149 compatibility notice).

- Updated 13 direct packages to audited stable versions. Node 24 type major, BigNumber 9 alias, AI SDK and explicitly held packages remain fixed.
- Biome 2.6 resolves an old noUnreachable false positive; removed its now-unused suppression comment only. No executable production source changed.
- Localization: all 185 messages in en/ja/zh match source catalogs for numeric and text interpolation; controlled locale callbacks pass before/after compiler update. Public locale function/type declarations remain identical. Two private generated runtime declarations only add opt-in cookie exports and widen URL-like input support; no public paraglide subpath exists.
- Query cache isolation/invalidation ordering and Zustand React subscription/persistence tests pass. Added a real browser keyboard-resize contract story; arrows/Home/End pass in all four configurations.
- Sequential build, production/story typechecks, new test typechecks, 367 Bun Core +46 Vitest Core +126 React tests, lint, docs and release entry checks pass.
- Updated/new transitive package engine audit: 33 packages, all accept Node 24.0.0. Independent review found no important issues.
- Quality-tooling initially failed because this worktree lacked the existing pinned Gitleaks binary, not from a dependency regression. Official checksum-verified setup restored it; all six tool/hook tests pass.

- Final: original full Storybook suite 1,408 cases across four configurations, plus four additional resize interaction cases, all pass (1,412 total). Packed consumers pass strict NodeNext types, native ESM/CommonJS/Bun, Node 24.0.0 minimum and documented form SSR. Review of the added resize story also found no important issues. No commits or publication.
