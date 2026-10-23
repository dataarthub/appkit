# Selected dependency upgrades implementation plan

> Execute inline using superpowers:executing-plans. User authorized sequential implementation and verification.

**Goal:** Upgrade resolvers, Storybook/Vitest, MSW, and the BigNumber development fixture without changing Appkit's public types or behavior.
**Architecture:** Keep production APIs unchanged; change manifests and lockfile in four stages. Run focused checks after each stage and packed-consumer checks at the end.
**Tech stack:** Bun 1.4.0, Node 24+, React 19, TypeScript 6.
**Spec:** User request in this conversation, 2026-10-23.

## Global constraints
- Preserve installed TypeScript 6.0.3, jsdom 26.1.0, and all existing dnd-kit versions.
- Preserve existing uncommitted React 19 work. No commits, pushes, or publication.
- Keep Core production pin exactly 0.1.0; no sibling workspace aliases.
- Keep public ESM/CommonJS declarations and runtime contracts unchanged.

## Review focus
- Zod validation input/output inference and coercion, invalid values, and field errors.
- Vitest mock cleanup and Storybook light/dark desktop/mobile execution.
- MSW loading/error/retry handlers and matching worker script.
- BigNumber 9 and 11 precision, rounding, invalid input, and strict:false behavior.
- Unchanged public declaration output and isolated packed consumers.

## Tasks
- [x] 1. Capture baseline manifests, lockfile, declaration output; add/run resolver contract checks, upgrade resolvers to 6.0.0, repeat checks and React typecheck.
- [x] 2. Upgrade Storybook packages to 10.6.3 and Vitest/browser-playwright to 5.0.5. Run unit suites, Storybook setup checks and representative browser stories before proceeding.
- [x] 3. Upgrade MSW to 3.0.3, regenerate its service worker, run HTTP-handler checks and loading/error/retry stories.
- [x] 4. Upgrade bignumber.js development fixture to 11.1.5; retain a 9.3.1 test alias. Run the same exact-decimal contract cases against both versions.
- [x] 5. Regenerate metadata, build/typecheck, compare declarations against baseline, run packed consumers and the full Storybook matrix. Review the dependency diff and explicitly verify held versions.

## Ledger
- Baseline captured from existing detached worktree. User instruction to execute overrides skill's optional plan approval handoff. Existing workspace reused; no commits per repository policy.

- Resolvers: three RHF/Zod integration cases pass before and after upgrade; strict TypeScript fixture confirms converted and raw resolver types.
- Storybook/Vitest: 117 React tests and 403 initial Core tests pass; 43 representative light-desktop browser cases pass before MSW upgrade.
- MSW: matching generated worker, Storybook typecheck, five handler/setup checks, and 38 HTTP lifecycle/file-preview browser cases pass.
- BigNumber: 12 cases pass after review. Ruling: retain the original production adapter unchanged; the documented contract propagates constructor errors. Compare 9 default with an isolated 11 STRICT:false clone; separately verify default 11 and arbitrary constructor failures propagate for both adapter strict settings without writes. A transient catch-all implementation was rejected by regression tests and removed.
- Ruling: build and root typecheck must run sequentially because root typecheck also builds. Two concurrent invocations briefly corrupted a generated declaration; a forced sequential build repaired it. No source workaround was introduced.
- Public declaration AST comparison: 492 Core + 1,232 React ESM/CommonJS declarations match baseline, excluding earlier authorized JSDoc additions. Held lock entries match exactly.
- Final review found no remaining important issues after restoring the adapter.

- Final verification: Core 367 Bun + 46 Vitest tests; React 117 Vitest tests; full browser matrix 1408 cases across 292 story-file executions. Build, production/story types, resolver/BigNumber type fixtures, lint, release entry checks, docs checks, and isolated packed consumers (Node 24.0.0, native ESM/CommonJS, Bun, strict NodeNext declarations, form SSR) all pass.
