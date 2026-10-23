# Contributing

Install Node 24+ and Bun 1.4.0, then run `bun install --frozen-lockfile --ignore-scripts`. For one package use `bun run turbo run build typecheck --filter=@alneas/appkit-core` (or appkit-react). Do not rerun unrelated integration tests for unchanged implementations.

1. Change the owning source and API JSDoc.
2. Update its English feature guide, including the exact public import subpath. Install commands use package names, not subpaths.
3. Run affected tests and packaging/type checks. Record commands and identify reused evidence in the PR.
4. Open a PR explaining the problem and resulting behavior. Version 0.1.0 is already published; review later version changes together with internal pins. Working-tree changes are candidates for a future release, not updates to the existing npm version.

`bun run check:release` checks public entry loading, root APIs and packaged files. `bun run check:docs` checks selected sources, subpaths and relative links. Builds generate the export reference and AI indexes; do not hand-edit generated files.

Routine CI uses Turbo caching for builds, types and unit tests. Browser/database checks are selected when their integration boundaries change. Releases reuse the exact source commit's successful main quality run for browser evidence. Cache hits are prior passing results for matching source, helpers, dependencies and Node/Bun/platform runtime.

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

Husky runs `bun run quality:commit` before each commit. A missing scanner or failed
check blocks the commit. The maintained gate scans the indexed Git patch with
redacted Gitleaks diagnostics and runs Biome on isolated copies of indexed
JavaScript, TypeScript and JSON files. It does not format files or change staging.
Unstaged changes stay untouched, including partially staged files. The hook
regression fixture installs this same command only in its disposable Git repository
and verifies both lint rejection and a clean indexed commit.

Before a push, Husky runs `bun run verify:push`. This always scans history for
secrets and runs source lint, then selects package, documentation, tooling,
React/Core compatibility and browser checks from changed inputs. Turbo reuses
matching build/type/unit results. This command does not run live-model evaluation
or publish packages. Git hooks can be bypassed, so the Node 24 CI job uses the same
selector and runner after installing Gitleaks. Node 26 checks affected package
builds, types and unit tests. CI still runs only on main updates or manual dispatch.

### Selecting verification by impact

Local selection compares the merge base of HEAD and `origin/main` with the working
copy, including staged, unstaged and untracked files. Fetch main before starting
work. CI compares its exact commit with the latest successful **main-push** Public
quality run that is an ancestor. Failed, cancelled and superseded runs do not
advance that baseline: the next run includes all outstanding changes. If history
or API evidence cannot establish a baseline, run the full gate. Manual dispatch
also runs the full gate; it cannot substitute for main-push release evidence.

| Changed inputs | Selected checks |
| --- | --- |
| Prose or source comments/JSDoc with unchanged parsed code | Documentation checks and their build prerequisites; no browser or package unit tests |
| Story or its local helper | Importing stories, plus Storybook contract/type checks |
| React implementation | Package contracts, builds/types/unit tests, docs, Core compatibility and transitively importing stories |
| Core implementation | Package contracts, builds/types/unit tests, docs, Core compatibility and transitively importing stories; no browser test when no Story/preview imports the changed Core module |
| Package unit tests only | Package builds/types/unit tests |
| Publish/Deployment helpers or their workflows | Their tooling tests; no browser suite |
| Known verification orchestration | Verification tooling tests; no browser suite |
| Quality workflow/runtime configuration | Full gate, because Node/Bun/runner/install changes can affect execution |
| Package version-only change, or lockfile workspace versions with identical resolved dependencies | Release/docs checks and build prerequisites; no browser or unit suite |
| Actual dependency/lock resolution changes | Full gate; not treated as release metadata |
| Global CSS/assets, dependencies, shared configuration, deleted UI modules or unknown inputs | Full gate |

Story selection follows relative imports/re-exports, literal dynamic imports and
React and Core public subpath exports, including NodeNext `.js` specifiers that
resolve to TypeScript sources. Explicit `import type`/`export type` declarations
are erased at runtime and covered by package typechecks. Preview decorators/loaders/setup are shared by
all stories. Generated Paraglide modules are opaque dependencies; changing their
locale/configuration inputs selects the full gate. JSX/TypeScript/Vite compiler
directives are code inputs even when written in comments.
Unresolved imports, computed dynamic imports, glob imports and unsupported mappings
fall back to all stories. Cyclic imports are traversed safely. Every selected story
still runs in all four browser conditions with the same memory guards and fatal
accessibility checks. The selector does not use test-name guesses or silently drop
unknown files. Each CI job summarizes its baseline and selection; the local plan
is recorded in ignored `.verification/quality-plan.json`.

Selected Storybook suites run as the React `test:browser` Turbo task. Its key
includes the canonical sorted Story selection, React/Core sources and built
entries, Storybook/Vitest configuration, translations/assets, memory-guard helpers,
lockfile, Node/Bun/platform/architecture, CI image and relevant environment. A partial
suite cannot satisfy another selection or the full suite; only successful task
execution is cached. Cache hits suppress old browser output so replayed logs do
not look like a fresh browser run. A cache miss runs the unchanged four browser conditions with
six-file batches, executing one viewport/theme condition per guarded invocation.
Each viewport project retains one worker and sequential files. Core-only changes still run relevant unit/types
and the two-Core matrix; import analysis determines whether UI tests are needed.
Unknown inputs, unreadable metadata and changed resolved dependencies remain
conservative. Version-only detection compares file contents, not commit messages
or filenames. Source quality from a successful ancestor remains usable only when
all accumulated changes are covered by the selector.

Use `bun run verify:full` to request every normal check, or
`bun run verify:push --dry-run` to inspect the local selection and commands.
`bun run test:consumer` remains an explicit packed-consumer check and a mandatory
publication check. Source quality success proves the selected changes were checked;
it does not claim that every story was rerun for every prose change.

Package-specific stable GitHub Releases use the separate `publish.yml` workflow.
Publishing an `appkit-core-vX.Y.Z` or `appkit-react-vX.Y.Z` Release starts verification
and stages only that package for npm maintainer approval with 2FA. A manual
completion dispatch confirms approved bytes/tags and records the Deployment. See [Releasing](RELEASING.md) before publishing
a Release; tag pushes alone do not publish npm packages.

The full gate also runs `bun run check:react-core`: React types, unit tests and
packed-consumer SSR/load checks against both its exact registry Core dependency and
the new Core archive in separate temporary installations. Network access is required.
For Core fixes that must reach React users, add an ID, the first required Core
version, a reason and the planned React adoption version to `react-core-policy.json`.
Core preparation can retain the published React dependency until that adoption
version; the gate reports the requirement as pending. An outdated dependency blocks
CI at the deadline, and `bun run check:react-core --release` blocks every React
publication until all required fixes are adopted, even if compatibility tests pass. See [the release procedure](RELEASING.md#react-compatibility-with-independently-versioned-core).

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
The affected subset is selected by `verify:push` and the Node 24 quality job.
Use `bun run verify:full` or a manual quality dispatch for full coverage.
Publication requires the target commit's successful main-push Source quality run
and does not rerun this browser suite.

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

The runner executes up to six story files at a time in one viewport/theme
condition. Each project uses one worker with file parallelism disabled; all four
conditions and successive file batches run sequentially. A full 73-file run starts
52 guarded invocations rather than 76. Using one viewport at a time avoids
concurrent browser memory peaks while sharing startup across more files. The first
batch in each condition contains only two files to leave room for initial
dependency optimization; later batches contain up to six.
Turbo streams fresh
browser output immediately, including batch start/completion, duration and RSS;
cache hits still suppress replayed test logs. Each batch gets a fresh process
tree. Aggregate RSS is capped at the smaller of 3 GiB and one-third of physical
memory, the Node heap at 1 GiB (tightened from 1.5 GiB), and a batch at ten minutes. A resource limit or
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

## Generated workflow maintenance

See [workflow supply and local quality](docs/workflow-supply.md) for `quality:commit`, `quality:push`, generated workflow checks and the actual selection/reuse limits.

## Contract evidence and host responsibilities

Use the owning [development policy](https://tech-docs.alneas.com/policies/development-policy.md#security-operations-and-lifecycle-contracts)
for coding and lifecycle review. Inspect existing Core abstractions before adding a
provider connection; keep provider SDKs behind optional entries. Core's adapter
and action tests exercise malformed input, explicit failures, cancellation and
cleanup. Packed consumers verify the distributed import boundary separately.
`conformance:check` inspects public manifest/import/alias/symlink boundaries; its
pinned clause catalog predates newer policy clauses and is not current whole-policy
certification. Computed import findings require review.

`test:verification-tooling` exercises the unit runner with real passing, failing,
empty and skipped fixtures. Package unit tasks require fresh nonempty JUnit output
without failures or skips, and remove their temporary reports on exit. Runner edits
select package checks and verification tooling through the maintained push/CI
selector; the Turbo test key includes the runner and test configuration. A process
exit alone does not prove a suite ran.

The approval example's tests cover changed arguments/registration/session, rejection,
revocation while authorization is pending, concurrent approval and replay. Tool
bridges enforce explicit exposure, output projection and per-session call limits;
execution sessions retain cancellation ownership until work settles. These are
in-memory application contracts. Trusted server authorization, expiring approval
credentials, durable replay protection and authorization across MCP/plugin hosts
remain the consuming service's responsibility. Injected instructions are data, not
host authorization; no live-model safety evaluation is implied by these tests.

Applications also own outbound AI destination/data-class approval, retention and
delete propagation, equivalent fallback policy and a budget shared across retries
and delegation. A bridge call limit is not a token/cost budget, and cancellation
does not prove remote billing or effects stopped. Tenant isolation in file/search
indexes, exports, queues, signed links and offboarding requires service-specific
tests; generic adapter fixtures do not verify those delivery surfaces.

Security reporting/triage, advisory monitoring, supported-version security fixes and
expiring exceptions require maintainer ownership; this gate does not establish a
response SLA. Supported runtime/package declarations and compatibility consumers
are checked, while deprecation decisions and consequential API/security/data/CI
review still require human review. No reviewer approval is inferred from a green
suite. Recovery targets, isolated restores, persisted-schema migrations, durable-job
deduplication/quarantine/replay and plugin suspension are host capabilities, not
provided by the in-memory execution history. Verify them in the owning service.
Public documentation/asset/search/AI withdrawal and cache invalidation belong to
the publishing service and portal; local builds do not establish deployed removal.

Reviewed no-release rationale for the contract-verification update: changes affect
maintainer tests, verification orchestration and contributor guidance only. Package
exports and runtime behavior are unchanged; no package version bump or consumer
upgrade is required.
