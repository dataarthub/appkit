# Releasing

The initial release published only `@alneas/appkit-core@0.1.0` and `@alneas/appkit-react@0.1.0`. Features are import subpaths, not separate npm packages. Internal production dependencies use exact registry versions. Published versions are immutable; working-tree documentation and tooling changes belong to a later release.

Run source verification with the latest Node 24 patch (development range `^24.15.0 || >=26.0.0`) and Bun 1.4.0. Published packages retain `engines.node: >=24.0.0`; the isolated packed-consumer gate must continue exercising Node 24.0.0 independently of the development runtime.

## Source and archive identity

Before a future release, commit the reviewed changes and select that exact commit for verification and publication. Record the source selection and archive integrity, and compare `npm view <package>@<version> dist.integrity` with the reviewed archive after publication. An existing tag identifies its original source snapshot; do not move it to include subsequent changes. Do not infer archive identity from a matching version number or tag alone.

Select finalized sources, then build, type-check and run `bun run check:release` and `bun run check:docs`. Pack both packages, inspect exports, README, MIT license and peers, and install those exact archives into a disposable consumer. Check native ESM, CommonJS, NodeNext declarations, React SSR, CSS and the documented form. Run affected browser/adapter checks when their behavior changes; reuse unchanged evidence for unrelated integrations.

Historical separate-package archives do not verify the new boundaries. Keep source hashes, archive digests and command results in ignored verification receipts. A retained artifact is eligible for reuse only when the relevant source and archive hashes still match. Do not publish unbuilt source or change artifacts after verification.

## First publication of a new npm package

This repository's `publish.yml` is for subsequent versions of **existing npm
packages**. It does not bootstrap a package name that has never been published.
The [documented npm Trusted Publisher setup](https://docs.npmjs.com/trusted-publishers/)
is configured in that package's npm settings. Establish the package first through
an explicitly authorized, interactive maintainer publication, then configure OIDC.
Do not try a GitHub Release to bootstrap an absent package through this workflow.
GitHub Actions can run other authentication designs; this repository provides no
token-based or manual-dispatch publication fallback.

For a genuinely new package:

1. Review and verify its exact initial archive and version before authorization to
   publish. Publish an initial Core package before a new React package that depends
   on it. Verification requiring an existing registry version applies after bootstrap;
   it must not be represented as passed before that version exists.
2. A maintainer signs in with `npm login` and completes the authorized interactive
   publication of that reviewed archive with 2FA, public access and lifecycle scripts
   disabled. Below `1.0.0`, publish on `beta`, add `latest` to the same version and
   read back both mappings; at or above `1.0.0`, require `latest`. Verify registry
   archive integrity against the reviewed archive. This step writes to npm and is
   never an automatic part of preparing or merging a PR.
3. Configure Trusted Publishing for the now-existing package: `dataarthub/appkit`,
   `publish.yml`, the matching optional environment, staging enabled, **Allow npm publish disabled** and
   **Allow npm dist-tag enabled**. Follow npm's current setup instructions, including any
   configuration-expiry requirements, before the first OIDC publication.
4. Publish later versions through the package-specific Release procedure below.
   Do not republish the bootstrap version just to exercise the Action or add provenance.

Both Appkit packages already exist at `0.1.0`; this bootstrap is complete. Their
first publication **using Actions** can be the next version after configuration and
workflow review. Leave the existing `0.1.0` archives and npm tags unchanged.

## Publication security

Use [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/) in GitHub Actions. Configure each package's npm settings with GitHub owner `dataarthub`, repository `appkit`, workflow filename `publish.yml` and, if specified, environment `npm-core` or `npm-react` respectively. Keep **Allow npm publish disabled** and **Allow npm dist-tag enabled**. Staging through OIDC remains enabled; approval requires the maintainer's npm session and 2FA. These permissions are independent. OIDC dist-tag operations require npm 11.21.0+, which the workflow pins. Require 2FA for maintainers and enable the package setting to [require 2FA and disallow tokens](https://docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification/); trusted publishers can still publish under that policy. These are account/package settings and are not enabled by a repository edit.

The `publish.yml` workflow has two entry points: publishing a stable package-specific GitHub Release verifies and **stages** its archive; a `workflow_dispatch` on main completes an already approved staged release. The approval observer requests this dispatch automatically, and manual dispatch remains a recovery path. Its GitHub-hosted registry jobs use Node 24, pinned npm 11.21.0 and `id-token: write`, without an npm write token. The staging command explicitly requests [provenance](https://docs.npmjs.com/generating-provenance-statements/) and disables lifecycle scripts. Verification and resume resolution have no OIDC permission; registry jobs install no package development dependencies. The main-update quality workflow remains verification-only.

After this change is merged, check **both packages'** npm Trusted Publisher settings: repository `dataarthub/appkit`, workflow `publish.yml`, optional matching environment, direct publish disabled and dist-tag allowed. Previously enabling direct publish does not automatically revert when this workflow changes. Repository edits do not change npm settings. The environment names stay `npm-core` and `npm-react`; staging and completion use `deployment: false` so pending approval cannot appear as a successful public Deployment. Environments with custom deployment protection rules are incompatible with that GitHub setting and must be reviewed before adoption.

The existing 0.1.0 release has no provenance attestation. A later workflow does not retroactively attest it; use a new version for future provenance-backed releases. GitHub tags/Releases and npm publication are separate. Never dispatch npm publication from branch/tag pushes or overwrite an existing version; verify its registry integrity before resuming a partial publish.

## Publish a package-specific Release

Versions, tags and GitHub Releases are independent for the two packages:

| GitHub tag | Only package published | Deployment environment |
| --- | --- | --- |
| `appkit-core-vX.Y.Z` | `@alneas/appkit-core` | `npm-core` |
| `appkit-react-vX.Y.Z` | `@alneas/appkit-react` | `npm-react` |

Choose the release scope before changing versions:

| Scope | Version/dependency changes | GitHub Releases |
| --- | --- | --- |
| Core only | Bump Core; keep React and its exact Core dependency unchanged | One Core Release |
| React only | Bump React; keep its Core pin unless adopting an already published Core | One React Release |
| Both; React adopts the new Core | First bump Core and publish it; then bump React and update its Core pin in a follow-up PR | Core Release, then React Release |
| Both; React keeps its already published Core pin | Bump each package as needed; run the compatibility gate | Two Releases, one for each package |

The original `v0.1.0` remains the initial shared release tag. It does not trigger
the new publisher. Draft Releases, prereleases, unrelated tags, tag pushes and
manual workflow dispatches never stage a new package through this workflow.
Dispatch is reserved for completing an original successful staging run; it does not stage another archive.

1. Update only the intended package version and relevant lockfile/generated
   metadata. If React adopts a new Core, first publish that Core successfully,
   then update React's exact dependency and its own version in a follow-up PR.
   Commit and merge the reviewed changes into main.
2. Wait for **Source quality** to finish successfully for that exact main commit.
   Do not tag a later, unverified commit or use a feature/manual run as a substitute.
   Create the package-specific tag on that exact reviewed commit. The version in
   the tag must match the selected package's `package.json`; the other package's
   version can differ. The workflow rejects commits outside main and moved tags.
3. Prepare a draft GitHub Release for that tag. Publishing the Release authorizes
   automatic staging; public npm availability still requires the separate npm 2FA approval below.
4. Inspect the **Publish npm packages** workflow. Before preparing any archive,
   it requires a completed successful main-push run of `.github/workflows/ci.yml`
   (`Source quality`) for the release's exact SHA in this repository. Missing,
   queued, running, failed, cancelled or skipped evidence blocks publication.
   A newer unsuccessful run cannot fall back to an older successful run for the
   same SHA. Finish/rerun main quality, then retry the release workflow; it does
   not wait indefinitely or start publication optimistically.
   The workflow reuses that exact-commit source-quality evidence, restores matching
   Turbo build caches, and checks secrets, lint, tooling, builds and release/docs
   contracts. It does not repeat source unit/type/agent suites already covered by
   Source quality. It packs both candidates and tests those exact archives in
   isolated consumers, then selects and stages only the tagged package's tested archive.
5. React releases additionally require the two-Core compatibility matrix and the
   mandatory-fix dependency policy. Core releases do not wait for React to adopt
   an unpublished dependency: for coordinated updates, publish Core's Release,
   wait for its successful npm publication, then publish React's Release.

Storybook runs only through affected main quality verification (or an explicit
full/manual check), not again during publication. Quality selection accumulates
changes since a successful ancestor, so a documentation-only target may legitimately
skip unchanged UI tests. The publication job depends on successful release
verification and rechecks exact-SHA quality evidence immediately before the npm
step; an unavailable evidence API also blocks publication. Only the staging and completion
registry jobs have OIDC permission. This orders source verification, archive verification,
and registry writes without duplicating browser work. GitHub Release publication
starts this process; the Release page alone does not mean npm publication succeeded.

The verified archive is handed to staging through an immutable artifact ID, its SHA-512 digest and a sanitized source/package identity manifest. Only the archive and sanitized manifest are uploaded; raw receipts and logs remain excluded. Staging rechecks the source, contents and digest before submitting that archive. **A successful initial workflow means staged, not publicly published.**

### Approve and complete a staged release

1. Open the package's **Staged Packages** on npm. Check its name, version, source/provenance, initial inspection-only tag (`staged`) and the archive against the workflow summary's SHA-512 digest. An authenticated maintainer may use `npm stage list <package>`, `npm stage view <stage-id>` and `npm stage download <stage-id>` to inspect it; those operations cannot use the Actions OIDC session. Do not approve an unexpected stage solely because its version looks right.
2. Approve the stage in npm with 2FA, or use `npm stage approve <stage-id>` in the maintainer's interactive session. Actions never approves stages. Rejection also requires the maintainer's 2FA. See [npm staged publishing](https://docs.npmjs.com/staged-publishing/).
3. After a successful staging run, **Complete approved npm release** starts automatically and observes the public npm version for up to **30 minutes**, every 30 seconds. It validates the original run/attempt and immutable archive, verifies package/version/integrity after approval becomes visible, and requests `publish.yml` completion on main with that original `staged_run` ID. The observer has no npm token or OIDC permission, never approves a stage and does not hold the npm publication lock while waiting. It executes trusted main code and treats the original artifact as data. Its `actions: write` permission is only for dispatching completion; npm still needs staging and dist-tag permissions, with direct publish disabled.

   If the window ends, its summary reports **approval-pending**, not release success. After approving later, select **Publish npm packages → Run workflow → main** and set `staged_run` to the numeric run ID of the original **successful staging run** (not the observer, stage UUID or completion run ID). API errors, changed run attempts or expired/deleted artifacts block automatic dispatch; inspect the failure and use the same validated recovery path. A dispatch response lost in transit must be checked in Actions before retrying. The resolver requires a successful release-event run of `publish.yml`, its successful staging job, and the exact current-attempt immutable archive. Old direct-publish runs, forks, failed runs and expired archives cannot be used.
4. Completion checks the original Release/tag, main ancestry and exact-SHA Source quality again, downloads that original archive, and verifies the public npm version's integrity against it. It repairs missing required tags without republishing. After confirming those tags, it re-reads `staged` and removes it only if it still points to this release version; an absent tag or one pointing to any other version is preserved. Cleanup errors or unconfirmed removal block completion and can be retried with the same staging run ID. It then records `npm-core` or `npm-react` Deployment success against the **original source SHA**, with the npm page URL. It does not rebuild or rerun tests. A green completion workflow, confirmed registry bytes/tags and the successful Deployment mean the release is complete.

After approval, registry visibility and dist-tags can take time to propagate. The observer's 30-minute budget includes its registry reads; the containing job has a 35-minute ceiling for checkout/download and final dispatch. Waiting consumes Actions runner time. An observer success means completion was requested, not that registry tags or Deployment already succeeded: check the separate completion run. Completion waits up to five minutes per visibility/tag confirmation phase; missing approval, a network error or an unconfirmed tag is an incomplete release. Retry completion using the **same original staging run ID**. A different archive integrity or a newer required tag fails closed; do not overwrite or roll back either.

If staging returns an error or times out after submitting bytes, inspect npm Staged Packages before retrying: the version may already be reserved. Do not blindly rerun all jobs to upload it again. OIDC cannot list, inspect, approve or reject stages. If the original staging run failed, an authorized maintainer must resolve/reject any pending stage with 2FA before retrying staging. Rejection is not automatic permission to republish different bytes. The workflow never treats an ambiguous upload as successful.

Artifacts are retained for seven days. Approve and complete within that window. If they expire, stop and review recovery with the maintainer: recover/reverify the original bytes and stage identity rather than moving a tag or claiming a newly built archive is the old one. A whole-workflow rerun can create different bytes and is not a general repair procedure. Already published versions and successful deployments remain intact.

Concurrent staging/completion workflows are serialized and are not cancelled mid-write. Complete coordinated Core and React releases in dependency order. npm approval makes the version public under `staged`, an inspection-only tag. It does **not** move `beta` or `latest`; only completion moves those channels after checking version ordering. Approving an older stage later therefore cannot roll back normal consumer channels. Do not recommend `staged` to consumers; it may identify an approved version whose completion is still pending or blocked. Until completion confirms both required tags, a pre-1.0 release is incomplete.

### Publish both packages when React adopts the new Core

For example, to move both packages from `0.1.0` to `0.1.1`:

1. **Core preparation PR:** set Core to `0.1.1`, retain React `0.1.0` with its exact
   Core `0.1.0` dependency, and update lockfile/generated metadata. If the fix must
   reach React, add a requirement with `coreVersion: "0.1.1"` and
   `reactVersion: "0.1.1"` as shown below. The gate reports that adoption as pending
   and still requires both compatibility lanes to pass. Merge the verified PR.
2. On that reviewed main commit, create `appkit-core-v0.1.1` and publish its GitHub
   Release. Approve the npm stage with 2FA and let the observer request completion
   (or use the original staging run ID for manual recovery after its window). Wait
   for completion, including npm integrity, required dist-tags
   and the `npm-core` deployment. A published GitHub
   Release alone does not mean npm publication succeeded.
3. **React adoption PR:** after Core `0.1.1` exists on npm, set React to `0.1.1` and
   its exact Core dependency to `"0.1.1"`; update the lockfile/generated metadata.
   Keep the requirement entry. The React-version deadline now makes an old Core
   pin fail CI. Run `bun run check:react-core --release` after building both packages
   and merge the verified PR.
4. Tag that later main commit `appkit-react-v0.1.1`, publish its GitHub Release and
   approve the npm stage with 2FA, then confirm automatic completion (or manually
   recover after its window) and verify registry
   integrity, required tags and the `npm-react` Deployment.

These are two Releases and normally two different source commits, not one Release
that publishes both packages. Do not move the earlier Core tag to the React commit.
Both tags may identify the same main commit when React keeps an already-published
Core pin and both packages' versions were finalized together. Always use separate
Releases and wait for the first release's **completion** to succeed before starting the second.

### npm tags before 1.0.0

Every published version below `1.0.0` must have **both `beta` and `latest` pointing
to that exact version**. These are npm distribution tags; package version strings
and Git tags keep the existing format. This does not enable prerelease GitHub
Releases in the current workflow.

For a new pre-1.0 version, the Action stages the verified archive once with
`--tag staged`. After npm 2FA approval, completion verifies registry integrity
and adds `beta` and `latest` to the same version
using `npm dist-tag add`. Both tag mappings are read back before success. A tag
permission failure or unconfirmed mapping leaves the Action failed; rerun manual completion with the original staging run ID to
repair missing tags without re-staging or republishing. Enable **Allow npm dist-tag** for each
package's Trusted Publisher; the Action does not use a write-token fallback.

At `1.0.0` and above, staging still uses `staged` and completion requires only `latest`. The existing `beta` channel is not
advanced or deleted by this rule. Before publishing or repairing tags, the Action
checks every required channel and refuses to overwrite a newer version, including
when rerunning an old already-published version. Concurrent writers outside this
workflow must follow the same serialization and channel-ordering policy.

The same rule applies to a new package's authorized manual first publication.
Changing tags on an older published version is a separate registry write; this
implementation does not alter the tags or contents of the existing `0.1.0` release.

## GitHub deployment records for npm

Use two GitHub environments: `npm-core` links to
https://www.npmjs.com/package/@alneas/appkit-core and `npm-react` links to
https://www.npmjs.com/package/@alneas/appkit-react. The `publish.yml` completion step creates or resumes an explicit Deployment only after registry integrity and required tags match. Its environment and URL come from the validated package tag. Staging uses the same environment for OIDC identity with `deployment: false`; no public-success record is created while awaiting approval. Completion also disables automatic job deployments and uses the API to target the original source commit, rather than the newer main commit that dispatched completion. Matching records are resumed on retry; conflicting records fail.

For versions already published, including 0.1.0, use the separate **Record existing
npm publications** manual Action (`record-npm-deployments.yml`) after it is merged.
Enter the existing tag, for example `v0.1.0`. The same operation can run locally with
GitHub CLI authentication and repository Deployments write permission:

```sh
node scripts/record-npm-deployments.mjs --tag v0.1.0
node scripts/record-npm-deployments.mjs --tag v0.1.0 --apply
```

The first command previews without writing. The second verifies both exact npm
versions, resolves the remote tag to its commit, and creates or resumes one
`record:npm` deployment per package with a successful status and npm page URL.
Retries reuse matching records; conflicting registry integrity metadata requires
manual investigation. Partial failures return an error and can be retried. The
Action serializes its runs; avoid running the local command concurrently with it.
It records registry integrity as metadata, disables automatic merges and leaves
other deployment statuses active. It never invokes `npm publish`, changes a tag,
or runs model evaluation. The manual workflow uses the API to target the selected
tag rather than attaching an environment to the workflow's own commit.

These are retrospective publication records. Their creation time is the recording
time, and their payload explicitly marks them retrospective. They do not provide
provenance, prove that a tarball was built from the tagged source, or certify newer
working-tree changes. See the [Deployment API](https://docs.github.com/en/rest/deployments/deployments#create-a-deployment)
and [status API](https://docs.github.com/en/rest/deployments/statuses#create-a-deployment-status).

## React compatibility with independently versioned Core

Keep React's Core dependency at an exact version. A newer Core release does not
automatically update an already published React package. Run `bun run check:react-core`
after building both packages; `bun run verify:push` and the Node 24 main-update CI
job already include it. No additional PR or branch-push Action trigger is added.

The gate always tests the same React sources and packed React archive in two
separate system-temp consumers:

- **current** installs the exact Core version declared by React from the public npm
  registry, never from the workspace.
- **candidate** installs the locally built Core archive and intentionally overrides
  React's Core dependency for compatibility testing only. Package manifests in the
  repository and the React archive are not rewritten.

Each consumer checks source types, React unit tests, published ESM and CommonJS
declaration types under NodeNext with `skipLibCheck: false`, native ESM/CommonJS loading, and the
documented request-form SSR. It verifies that React resolves the selected Core,
that its version and archive integrity match, and that no checkout symlink supplies
the dependency. Both combinations must pass; a failed current lane with a passing
candidate lane identifies a possible dependency update requirement. A failed
candidate lane blocks adopting that Core. Installation or network errors also fail
the gate and are reported separately in the local command logs.

When a Core fix must reach React users even if both lanes pass, the Core change's
author adds a permanent entry to `react-core-policy.json` in the same PR. For example:

```json
{
  "schemaVersion": 1,
  "requirements": [
    {
      "id": "approval-safety-fix",
      "coreVersion": "0.1.1",
      "reactVersion": "0.1.1",
      "reason": "React users must receive the approval safety fix."
    }
  ]
}
```

This example is illustrative; the initial requirements list is empty. `coreVersion`
names the first Core release containing the required fix. The Core candidate must
always have reached that version. Optional `reactVersion` names the first React
version whose dependency must adopt the fix. Before that React version, ordinary
pre-push/main CI reports an old dependency as `pendingRequirements` while testing
both Core combinations; it does not claim that React users have received the fix.
At or after the React-version deadline, an old dependency fails before installation.
Requirements without `reactVersion` retain immediate enforcement.

Every React publication runs `bun run check:react-core --release`, which enforces
**all** recorded Core requirements regardless of their React-version deadlines.
An earlier-than-planned React release cannot bypass a pending fix. This strict gate
runs before the publisher receives OIDC permissions. Updating React's dependency
and release version together remains mandatory when adopting a fix.

Keep prior entries and their deadlines; do not postpone or remove a requirement
merely to make CI pass. Maintainers must choose and review the adoption deadline
when adding the Core fix. The marker records that impact decision; tests do not
infer business/security impact or automatically schedule the React release.

Because the current lane uses the registry, an unpublished new dependency fails
until that Core version exists on npm. Keep React's old published pin during Core
preparation; setting a future adoption deadline never changes either matrix lane. For a coordinated release, publish Core
first, then run this gate with React's updated dependency before publishing React.
The gate itself never publishes, changes versions or tags, runs live-model
evaluation, or treats its logs as agent-evaluation evidence.

This gate requires network access and adds two npm installations to pre-push/CI.
Receipts and command logs are retained under ignored `.verification/react-core/`;
the disposable consumers are removed on completion or failure. Run
`bun run test:react-core-tooling` for the deterministic policy/isolation tests.

## Public package contents

Both packages deliberately include sourcemaps with `sourcesContent` for debugging their MIT-licensed public sources. Inspect the packed `.map` files for private source content and local absolute paths, and review compressed archive size before release. Public sourcemaps are not a place for credentials or private sources. Any future change to this policy must be checked against the actual packed artifacts.

The npm scope `@alneas` and GitHub owner `dataarthub` are separate namespaces. Keep `repository.url` pointing at the actual source repository, including for provenance verification. Existing explicit subpath exports are compatibility contracts; package.json length alone is not a reason to remove them. Review additions rather than replacing the list with a wildcard that exposes internal files.

After publication install exact registry versions in a fresh consumer without local aliases or archive overrides. Portal ingestion and Japanese delivery are separate tasks. Do not publish credentials, private sources or operational receipts.

## Optional coding-agent evaluation

The [isolated agent evaluation procedure](docs/agent-evaluation.md) is a manual,
optional regression evaluation for changes to agent-facing APIs, instructions and
discovery metadata. It is not a prerequisite for every npm release, and the publish
workflow neither runs live models nor consumes local agent receipts. This limited
six-task, three-repetition benchmark is not general package certification.

When reporting a live evaluation, continue to run `bun run check:agent-eval` against
that run's exact receipts and archives; missing, stale or changed evidence still
cannot qualify. Making evaluation optional does not relax its grading or allow
harness self-tests to be reported as real task successes. Keep raw evidence ignored.
