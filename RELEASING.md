# Releasing

The initial release published only `@alneas/appkit-core@0.1.0` and `@alneas/appkit-react@0.1.0`. Features are import subpaths, not separate npm packages. Internal production dependencies use exact registry versions. Published versions are immutable; working-tree documentation and tooling changes belong to a later release.

## Source and archive identity

Before a future release, commit the reviewed changes and select that exact commit for verification and publication. Record the source selection and archive integrity, and compare `npm view <package>@<version> dist.integrity` with the reviewed archive after publication. An existing tag identifies its original source snapshot; do not move it to include subsequent changes. Do not infer archive identity from a matching version number or tag alone.

Select finalized sources, then build, type-check and run `bun run check:release` and `bun run check:docs`. Pack both packages, inspect exports, README, MIT license and peers, and install those exact archives into a disposable consumer. Check native ESM, CommonJS, NodeNext declarations, React SSR, CSS and the documented form. Run affected browser/adapter checks when their behavior changes; reuse unchanged evidence for unrelated integrations.

Historical separate-package archives do not verify the new boundaries. Keep source hashes, archive digests and command results in ignored verification receipts. A retained artifact is eligible for reuse only when the relevant source and archive hashes still match. Do not publish unbuilt source or change artifacts after verification.

## Publication security

For future releases, migrate from local CLI publication to [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/) in GitHub Actions. Configure each package's npm settings with GitHub owner `dataarthub`, repository `appkit`, the exact publishing workflow filename and, if used, its protected environment name. Require 2FA for maintainers and enable the package setting to [require 2FA and disallow tokens](https://docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification/); trusted publishers can still publish under that policy. These are account/package settings and are not enabled by a repository edit.

Use a manually dispatched workflow on a GitHub-hosted runner with Node 24+, npm 11.5.1+ and `id-token: write` permission for the publishing job. Build and verify the selected commit, then publish the exact reviewed core archive before the React archive. Authenticate through OIDC without an npm write token. Trusted Publishing generates [provenance](https://docs.npmjs.com/generating-provenance-statements/) automatically for public packages from public repositories; `npm publish --provenance --access public <archive>` can also explicitly require it. Review and authorize the workflow before enabling publication, including the publisher's allowed publish action. The current quality workflow only verifies; no publishing workflow is configured here yet.

The existing 0.1.0 release has no provenance attestation. A later workflow does not retroactively attest it; use a new version for future provenance-backed releases. GitHub tags/Releases and npm publication are separate. Never dispatch npm publication from branch/tag pushes or overwrite an existing version; verify its registry integrity before resuming a partial publish.

## Public package contents

Both packages deliberately include sourcemaps with `sourcesContent` for debugging their MIT-licensed public sources. Inspect the packed `.map` files for private source content and local absolute paths, and review compressed archive size before release. Public sourcemaps are not a place for credentials or private sources. Any future change to this policy must be checked against the actual packed artifacts.

The npm scope `@alneas` and GitHub owner `dataarthub` are separate namespaces. Keep `repository.url` pointing at the actual source repository, including for provenance verification. Existing explicit subpath exports are compatibility contracts; package.json length alone is not a reason to remove them. Review additions rather than replacing the list with a wildcard that exposes internal files.

After publication install exact registry versions in a fresh consumer without local aliases or archive overrides. Portal ingestion and Japanese delivery are separate tasks. Do not publish credentials, private sources or operational receipts.

## Coding-agent evaluation gate

Run the [isolated agent evaluation procedure](docs/agent-evaluation.md) against the exact finalized candidate archives after deterministic package checks. `bun run check:release` verifies package correctness; release readiness additionally requires `bun run check:agent-eval` with that run's receipt and archive manifest. Missing or stale live evidence fails the gate. Harness self-tests are not live task results. Keep raw receipts/transcripts ignored, and publish only after separate explicit authorization.
