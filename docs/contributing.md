---
title: "Contributing"
description: "Appkit contributing requirements and verification commands."
sidebar:
  order: 20
archetype: reference
project: appkit
tags: ["appkit", "maintenance"]
---

# Contributing

Install Node 24+ and Bun 1.4.0, then run `bun install --frozen-lockfile --ignore-scripts`. For one package use `bun run turbo run build typecheck --filter=@alneas/appkit-core` (or appkit-react). Do not rerun unrelated integration tests for unchanged implementations.

1. Change the owning source and API JSDoc.
2. Update its English feature guide, including the exact public import subpath. Install commands use package names, not subpaths.
3. Run affected tests and packaging/type checks. Record commands and identify reused evidence in the PR.
4. Open a PR explaining the problem and resulting behavior. Version 0.1.0 is already published; review later version changes together with internal pins. Working-tree changes are candidates for a future release, not updates to the existing npm version.

`bun run check:release` checks public entry loading, root APIs and packaged files. `bun run check:docs` checks selected sources, subpaths and relative links. Builds generate the export reference and AI indexes; do not hand-edit generated files.

Routine CI uses Turbo caching for builds, types and unit tests. Browser/database checks are selected when their integration boundaries change or a finalized release needs fresh evidence. Cache hits are prior passing results for matching source, helpers, dependencies and Node/Bun/platform runtime.

Keep temporary fixtures in .verification/tmp and logs in .verification/logs. Packed consumers use a disposable system-temp directory so undeclared imports cannot resolve through checkout node_modules. Both are excluded from Git and public manifests. Public and private remain independent repositories with separate lockfiles; private uses exact published public versions. Only explicitly selected disposable consumer fixtures replace registry versions with reviewed tarballs.

Ignored files are not automatically safe to share. Verification receipts, including `archives.json`, can contain absolute archive paths and environment details. Keep original receipts local so their hashes remain usable; inspect and redact a separate copy before sharing it. Do not upload raw `.verification/` files as CI artifacts or force-add them to Git. Check logs for credentials without printing matching values; revoke an exposed credential if one is confirmed.

Before committing, check `git var GIT_AUTHOR_IDENT` and `git var GIT_COMMITTER_IDENT`. Use your GitHub-provided noreply address in repository-local Git configuration if you do not want a personal email in future public commits. Changing configuration does not remove an address from existing history; coordinate any history rewrite separately.

The portal owns translation, ingestion and deployment. Follow https://tech-docs.alneas.com/policies/documentation-policy.md and https://tech-docs.alneas.com/skills/document-authoring/SKILL.md. The root GitHub README is plain Markdown; portal landing pages carry their own frontmatter.

## Local quality checks

After `bun install --frozen-lockfile --ignore-scripts`, run `bun run secrets:setup`
and `bun run hooks:install` once in each clone. The installer downloads the pinned
Gitleaks release and verifies its SHA-256; macOS and Linux on arm64/x64 are supported.
Other platforms can supply the same Gitleaks version on PATH or through
`APPKIT_GITLEAKS_BINARY`. No provider credentials are needed.

Husky runs `bun run secrets:staged` and `bun run lint:staged` before each commit.
A missing scanner or failed check blocks the commit. Gitleaks scans the staged Git
patch with redacted output; lint-staged runs read-only Biome lint checks on staged
JavaScript, TypeScript and JSON files. Neither command automatically formats files.
Unstaged changes stay untouched. For partially staged files, lint checks the working
copy; separate unfinished edits before committing.

Before a push, Husky runs `bun run verify:push`: history secret scanning, source lint,
quality-hook tests, the existing build/type/unit/release/docs checks through
`bun run verify`, agent-tooling and React/Core compatibility checks, then the
Storybook browser suite. Turbo reuses matching cached build/type/unit results;
this command does not run live-model evaluation or publish packages. Git hooks can
be bypassed, so the Node 24 CI job runs the same gate after installing Gitleaks.
The Action runs only when main changes or is dispatched manually; feature-branch
pushes and PR events do not trigger it. This makes the CI confirmation post-merge.
The Node 26 job keeps the additional runtime compatibility checks. The workflow has
no publication job.

Package-specific stable GitHub Releases use the separate `publish.yml` workflow.
Publishing an `appkit-core-vX.Y.Z` or `appkit-react-vX.Y.Z` Release starts verification
and then publishes only that package. See [Releasing](releasing.md) before publishing
a Release; tag pushes alone do not publish npm packages.

The full gate also runs `bun run check:react-core`: React types, unit tests and
packed-consumer SSR/load checks against both its exact registry Core dependency and
the new Core archive in separate temporary installations. Network access is required.
For Core fixes that must reach React users, add an ID, the first required Core
version, a reason and the planned React adoption version to `react-core-policy.json`.
Core preparation can retain the published React dependency until that adoption
version; the gate reports the requirement as pending. An outdated dependency blocks
CI at the deadline, and `bun run check:react-core --release` blocks every React
publication until all required fixes are adopted, even if compatibility tests pass. See [the release procedure](releasing.md#react-compatibility-with-independently-versioned-core).

Biome starts with four blocking rules: unreachable code, unsafe finally blocks,
debugger statements and duplicate parameter names. Broader style rules can be added
in separately reviewed changes. Use `bun run format -- path/to/file.ts` when explicitly
formatting selected files. Generated outputs, build artifacts and local verification
files are outside the Biome source scope; do not exempt application tests or examples
from secret scanning merely because a credential is labeled a dummy.

Two narrow source comments suppress Biome compatibility diagnostics: TypeScript's
`resolution-mode` type import in the AI SDK transport, and a reachable block after
a labeled resource-search loop. These suppressions do not change emitted runtime
behavior or exclude either whole file from linting. Tailwind directives are enabled
in the CSS parser. Review these exceptions when upgrading Biome.

## Storybook development

Run `bun run storybook` from the repository root, then open
http://localhost:6006. The command builds public Core and generates React's
translations before starting the isolated Vite workspace.
`bun run check:storybook` checks story types and public import boundaries;
`bun run build-storybook` creates the static preview in
`packages/appkit-react/storybook-static/`.

Stories and their in-memory providers live in `packages/appkit-react/stories/`,
outside the library build and npm payload. Keep both individual stories and
composed examples limited to components and dependencies owned by this public
repository. Enterprise-only screens stay in their owning private repository.

The preview supplies Appkit CSS, theme state and a separate QueryClient for each
selected story. Authentication and form stories add their own mock authentication
and in-memory data providers. These fixtures demonstrate isolated UI states;
they do not verify hosted authentication, durable persistence or backend access
controls. Component descriptions identify their exact public import and required
setup. Keep technical descriptions in English and preserve localized UI fixtures.

After changing this guide, run `bun run docs:generate` and `bun run check:docs`
to update and validate the generated portal copy. Documentation generation needs
both package builds: run `bun run build` first in a clean checkout.

### Browser verification

Install the pinned Chromium once with `bunx --no-install playwright install chromium`
(on Linux CI, add `--with-deps`). Run `bun run test:storybook` for the full suite.
The same suite is part of `verify:push` and the Node 24 quality job; the existing
main-push/manual workflow triggers remain unchanged.

Every CSF3 story runs with fatal axe checks in Chromium at 1280×900 and 390×844,
in both light and dark mode. The preview and browser runner compile the real
Appkit CSS with Tailwind. Palette stories cover default, blue, green, rose, orange
and future in both modes, assert the active classes and check semantic text-token
contrast (including alpha compositing). Open modal/select/popover stories audit
their real portals. Arbitrary host custom colors require host validation.

The HTTP lifecycle stories use browser MSW with unhandled requests rejected,
Fetch-based host adapters, shared Zod response schemas and the real public auth,
profile, data and file components. Auth/profile, table, form and file-browser
compositions cover loading, success, empty, error, signed-out, restricted and
privileged states. Native file previews cover loading, text, zero-byte data,
network rejection and non-2xx HTTP responses. Interaction stories use real clicks,
keyboard navigation and focus return; layout checks measure containment, overflow,
tap targets, clipping and overlap. These are isolated component/host-contract tests,
not hosted identity, database authorization or seeded-backend E2E evidence.

The runner executes three story files at a time with one worker, sequentially across
the four mode/viewport combinations. Each batch gets a fresh Vite/Chromium process
tree. Aggregate RSS is capped at the smaller of 3 GiB and one-third of physical
memory, the Node heap at 1.5 GiB, and a batch at ten minutes. A resource limit or
failed process inspection fails the run; no stories are skipped. The guard kills
only its invocation's process groups, including detached browser descendants,
on completion, failure or interruption. Do not start another browser suite in a
parallel agent. Reduce batch size/concurrency after a limit failure; do not raise
the limit or weaken assertions to obtain a pass. The runner prints measured peaks.
`node --test scripts/guarded-process.test.mjs` checks guard failure and cleanup.
The guard and its regression tests are imported github-docs templates;
`scripts/lib/README.md` records their canonical repository, pinned revision, file
mappings and update procedure. Maintain shared behavior in github-docs and keep
Appkit-specific budgets and batching in this repository’s runner.

Axe cannot replace assistive-technology or design review. No screenshot baselines
are generated by this suite; intended visual changes still need human approval.
