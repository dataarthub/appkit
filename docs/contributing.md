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
4. Open a PR explaining the problem and resulting behavior. Keep both packages at 0.1.0 until the initial publication; review later version changes together with internal pins.

`bun run check:release` checks public entry loading, root APIs and packaged files. `bun run check:docs` checks selected sources, subpaths and relative links. Builds generate the export reference and AI indexes; do not hand-edit generated files.

Routine CI uses Turbo caching for builds, types and unit tests. Browser/database checks are selected when their integration boundaries change or a finalized release needs fresh evidence. Cache hits are prior passing results for matching source, helpers, dependencies and Node/Bun/platform runtime.

Keep temporary fixtures in .verification/tmp and logs in .verification/logs. Packed consumers use a disposable system-temp directory so undeclared imports cannot resolve through checkout node_modules. Both are excluded from Git and public manifests. Public and private remain independent repositories with separate lockfiles; private uses exact published public versions. Only explicitly selected disposable consumer fixtures replace registry versions with reviewed tarballs.

The portal owns translation, ingestion and deployment. Follow https://docs-d1x.pages.dev/policies/documentation-policy.md and https://docs-d1x.pages.dev/skills/document-authoring/SKILL.md. The root GitHub README is plain Markdown; portal landing pages carry their own frontmatter.

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
`bun run verify`, then agent-tooling tests against the fresh build. Turbo reuses matching cached build/type/unit results;
this command does not run live-model evaluation or publish packages. Git hooks can
be bypassed, so the Node 24 CI job runs the same gate after installing Gitleaks.
The Action runs only when main changes or is dispatched manually; feature-branch
pushes and PR events do not trigger it. This makes the CI confirmation post-merge.
The Node 26 job keeps the additional runtime compatibility checks. The workflow has
no publication job.

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
