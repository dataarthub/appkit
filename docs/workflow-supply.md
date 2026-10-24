---
title: "Workflow supply and local quality"
description: "Maintain generated Actions and run project-owned verification with explicit evidence boundaries."
sidebar:
  order: 20
archetype: how-to
project: "appkit"
tags: [development, ci, verification]
---

# Maintain workflow supply and local quality

## Prerequisites

Use the Node runtimes and pinned Bun declared in `.github/workflow-adapter.json`, the committed lockfile and the project's existing secret-scanner setup. No private checkout or private package credentials are needed. The installed supply is a reviewed local bundle, including uncommitted upstream changes; it has not been published by this adoption.

## Step-by-Step Implementation

Run `bun run quality:commit` against staged changes. It scans staged secrets and lints index bytes without changing files or staging. Run `bun run quality:push` before pushing. Existing hooks are preserved; this adoption does not install or enable hooks. Inspect `git config --get core.hooksPath` and the repository's hook files when checking local activation. CI independently enforces the verification contract.

Edit `.github/workflow-adapter.json` or `scripts/workflow-project/roles.json`, then run `bun run workflow:generate` explicitly. Never hand-edit generated workflows or the installed shared bundle. Update the supply only from reviewed source with its recorded base revision and exact local bundle digest. `workflow:check` detects drift without fixing it.

### Shared workflow contract

| Role | Adoption and owner |
| --- | --- |
| Source quality | Required: main push, PR and manual; `ci.yml` calls reusable quality. |
| Shared package quality | Required: callable only, preserving the declared runtime matrix. |
| Publish npm packages | Required: stable published Release stages verified archives; manual dispatch completes an original staging run. |
| Complete approved npm release | Required for subsequent staged releases: observe approval using default-branch code and request completion. |
| Documentation freshness | Verification is owned by source quality; no second full source gate. |
| UI browser tests | Existing relevant project checks remain owned by source quality; no duplicate standalone workflow. |
| Auth integration tests | No independent auth workflow adopted; existing applicable integration checks remain in the project gate. |
| Record npm deployments | Manual recovery role retained. |

Common code owns naming, standard triggers, scoped credentials, main-only successful task-cache writes, evidence and deterministic generation. Project fragments own commands, service/browser prerequisites, target/tag rules, supported runtime coverage, archive contents and size budgets. Steps are labeled `Shared:` or `Project:`. The public extension is additive beside the existing private supply; the private implementation is unchanged.

### Project-specific verification

The project impact selector still selects packages, related Storybook stories and compatibility checks. It receives only a shared verified main ancestor; absent compatible evidence selects the full existing gate. Turbo reports actual cache hits.

The mandatory secret-history check still runs. Selection requires a latest successful main run/attempt, successful jobs for every declared Node runtime and an unexpired immutable receipt with compatible execution identity. Failed intervening changes stay in scope. Missing/incompatible evidence, history or API access select full verification. Executed checks, exact-input local reuse and out-of-scope omissions are different outcomes. Local/PR success cannot satisfy a Release's official source-evidence requirement.

Release verification requires Source quality success for the exact selected commit and keeps existing current-archive and registry checks. Release preparation reuses deterministic source suites only after validating the exact official main proof; it retains the real build and current archive/registry checks. Staging and completion retain the existing npm implementation, original run/attempt/artifact binding and manual bootstrap. No build or direct npm publish runs in registry-writing jobs. Human npm approval is separate; pending staging is not release success.

## Verification

Run `bun run conformance:check` for project wiring and `bun run conformance:verify` for the shared regressions plus this project's maintained gate/publication/cache probes. `workflow:check` remains the read-only generated-output checker. Expected: generated output is unchanged and supplier regression tests pass. Project source and release tooling checks remain mandatory where applicable. A changed or deleted generated workflow must make `workflow:check` fail without repair; regenerate only after reviewing the source change.

Local fixture coverage and generated YAML do not prove execution on GitHub. Before an authorized rollout, review required-check names and npm Trusted Publisher/environment bindings for workflow renames. Preserve any pending original staging runs and their recovery contract. This work does not authorize a push, publication or deployment.

## Troubleshooting / Common Pitfalls

If no trusted baseline is available, full verification is expected. If Release source evidence is absent or incompatible, run the exact commit through main Source quality before staging; never substitute a PR run or local log. If generated output drifts, inspect canonical adapter/fragments and explicitly regenerate. If npm approval finishes after the observer deadline, complete with the original staging run; never rebuild or restage to finish approval.

Release impact: no package version bump; this change owns maintainer workflow tooling and verification only.

Conformance has three independent levels: shared implementation regressions, installed project wiring, and local behavioral probes. GitHub event execution remains unverified until an authorized remote run. Mandatory outcomes are catalogued centrally in the supplied `requirements.json`; hook-manager choice is a recommendation. The central supply owns adoption status and exception review; local guides describe only this project's implementation.

Conformance probes are selected from changed governance inputs, not run in full for every change. Use `bun run conformance:verify --base <reviewed-ref>` for an explicit committed range. The report distinguishes executed probes, exact-input reused probes and out-of-scope probes. Existing Turbo tasks keep their own actual success cache; this adoption adds no new task orchestrator.

## Development policy inventory

The pinned `development-requirements.json` maps every clause of the reviewed shared development policy. It is descriptive evidence mapping, not a project policy profile or permission to omit a mandatory gate. `conformance:check` inspects active dependency groups, literal imports, TypeScript aliases, ignored evidence paths and declared documentation/artifact inputs. Computed module resolution and untested UI, database, authorization and human-review contracts remain explicitly unverified.

Run `bun run conformance:audit` for the complete clause inventory, existing test candidates, current source/environment identity and read-only hook status. Add `--probe-commit` to exercise the actual commit command in disposable repositories: clean and invalid index contents, a synthetic secret, missing scanner configuration and missing scanner binary. The probe preserves working files and index bytes and does not activate hooks. Existing secret/history scans remain fresh outside deterministic task caches.

The shared commit gate scans staged bytes and lints an isolated index snapshot. Hook files call the maintained commands; having hook files does not establish local activation. Inspect the audit result before claiming hooks run automatically. The source workflow performs dependency-free supply preflight, then critical inspection through its maintained selector after dependency restoration. Required failures stop the gate; inventory entries without behavioral proof are never reported as a full policy pass.

Conformance verification selects bounded tooling/commit probes for relevant verifier, hook or configuration changes. Ordinary prose and unrelated package changes do not select browser or database suites. Actual archive inspection is available with `node scripts/workflow-supply/public/policy-critical.mjs --archive <archive.tgz>`; it checks member paths/types and identity, and does not replace the existing isolated consumers, license/notices, scanner or fresh registry checks.

### Bounded GitHub policy diagnostics

Manually dispatch `ci.yml` on the reviewed branch with `verification_mode=conformance` to exercise shared/owning selector regressions and the actual commit gate on Node 24 and 26. An identical second deterministic task must reuse success; ordinary prose selects no extra probes. Use `verification_mode=negative` separately to run a clean control and then stage a synthetic secret in disposable repositories. The required step must fail with `indexed-secret-blocked`, and the downstream success sentinel must be skipped. Diagnostic concurrency is isolated from normal source verification.

The default `full` mode and normal PR/main gates retain existing checks. Diagnostics do not run product/browser/DB suites, save remote task caches or issue authoritative source evidence. Their artifacts record scoped results, not full policy compliance. Before merging, satisfy the normal required PR checks independently.

## Independent public side evidence

The project-owned source role runs `scripts/paired-public.mjs` in the required
Node 24 verification job after its ordinary source gate and optional packed
consumer check. It then uploads `appkit-public-side-<full-sha>-<run-id>-<attempt>`.
Either side verification or artifact upload failure fails that existing job.
Node 26 retains its compatibility checks. No additional source workflow or private
access is needed.

The public side plan selects bounded workflow conformance and source/side
integration contract tests, each with a 60-second deadline. These checks supplement
the preceding mandatory source checks; they do not replace product builds, types,
unit tests, documentation, compatibility or selected browser coverage. The shared
checker's CLI/failure tests run through `test:verification-tooling`, outside the
side runner, because their own process-group fixtures must not nest inside its
process-group cleanup boundary. They are tooling tests, not consumer adoption
or publication evidence.

The unchanged shared checker and adjacent test are attributed and content-pinned
in `scripts/paired-maintenance-source.json`. Review upstream changes explicitly;
normal source runs never download executable policy code. This integrates the
[coordinated maintenance contract](https://tech-docs.alneas.com/policies/development-policy.md#coordinated-publicprivate-project-maintenance)
and [shared kit](https://tech-docs.alneas.com/templates/paired-maintenance/README.md).

The artifact contains only `public-plan.json`, `public-receipt.json` and
`producer.json`, created under `$RUNNER_TEMP/appkit-public-side`, outside the
checkout. The fixed task ID is `appkit-release-compatibility-v1`. The producer
records repository, full source/workflow SHAs, workflow reference, run ID, attempt,
event, ref, event head SHA and SHA-256 hashes of the plan and receipt. For pull
requests the tested source is GitHub's merge SHA; `headShaFromEvent` separately
records the PR branch head returned by the run API. The coordinator must validate
both identities and fetch the selected merge revision rather than substituting
the branch head. Plans and receipts contain
public facts only; raw logs and `.verification/` are never uploaded. The source
must be clean at the selected full SHA before and after the side checks. A rerun
invalidates old files before attempting verification.

Producer metadata and `reviewedBy` are declarations, not authenticated approval.
A restricted coordinator must select the reviewed current public SHA, authenticate
GitHub's `Source quality` run in `dataarthub/appkit` from `.github/workflows/ci.yml`,
require its successful primary and compatibility jobs and latest run attempt,
verify the exact immutable artifact identity/digest and plan/receipt hashes, and
reject newer failures, superseded attempts and missing/expired artifacts. A
candidate-uploaded JSON file alone cannot establish successful source verification.
When provenance or supersession cannot be established, the protected coordinator
must rerun the maintained side selection against the clean selected public SHA;
it must use reviewed trusted checker/selection bytes and separately authenticate
source quality. It must not execute a candidate's replacement verifier as its
trust authority. Hosting required-check/review settings remain a separate owner
responsibility; this change does not alter branch protection.

The coordinator may build and verify candidate archives from that selected public
SHA using existing build and isolated consumer commands. Such archives are
verification inputs, never production dependency pins. This public workflow does
not run the restricted pair mode, receive restricted evidence, or claim whole-task
acceptance. Registry publication, exact published dependency adoption and actual
delivery remain separate release prerequisites under `RELEASING.md`.
