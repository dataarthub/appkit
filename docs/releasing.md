---
title: "Releasing"
description: "Appkit releasing requirements and verification commands."
sidebar:
  order: 20
archetype: reference
project: appkit
tags: ["appkit", "maintenance"]
---

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
      "reason": "React users must receive the approval safety fix."
    }
  ]
}
```

This example is illustrative; the initial requirements list is empty. The version
names the first Core release containing the required fix. CI fails if the Core
candidate has not reached that version, or React's exact Core dependency is older.
Update React's dependency and release version together when adopting the fix.
Keep prior entries to preserve the dependency floor; do not delete a requirement
merely to make CI pass. The marker records a maintainer's impact decision, not an
automatic claim that tests can determine every fix's business or security impact.

Because the current lane uses the registry, an unpublished new dependency fails
until that Core version exists on npm. For a coordinated release, publish Core
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

The [isolated agent evaluation procedure](agent-evaluation.md) is a manual,
optional regression evaluation for changes to agent-facing APIs, instructions and
discovery metadata. It is not a prerequisite for every npm release, and the publish
workflow neither runs live models nor consumes local agent receipts. This limited
six-task, three-repetition benchmark is not general package certification.

When reporting a live evaluation, continue to run `bun run check:agent-eval` against
that run's exact receipts and archives; missing, stale or changed evidence still
cannot qualify. Making evaluation optional does not relax its grading or allow
harness self-tests to be reported as real task successes. Keep raw evidence ignored.
