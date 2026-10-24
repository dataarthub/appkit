---
title: "Evaluate consuming coding agents"
description: "Assign task ownership, edit an evaluation task, run an isolated batch and find its grading evidence."
sidebar:
  order: 21
archetype: how-to
project: appkit
tags: ["appkit", "ai", "maintenance"]
---

# Evaluate consuming coding agents

Use this procedure to maintain Appkit's coding-agent tasks and evaluate a reviewed runner against exact candidate archives. Follow the steps in order: assign owners, edit a task, verify it, configure the runner, run the batch, then inspect and qualify the saved results. If the existing tasks are unchanged, start at [prepare the candidate packages](#4-prepare-the-candidate-packages).

Deterministic tooling tests, authored examples and fake-runner results do not establish real agent success. Live task capability remains unverified until a qualifying real-agent batch exists for the selected archives.

This is an optional manual regression evaluation for agent-facing API, instruction
and discovery changes. It is not a mandatory npm publication gate. The Release
publisher requires deterministic package checks instead and does not run models
or consume local receipts. Existing qualification thresholds still apply whenever
a live evaluation is claimed; the fixed six-task benchmark is not general package
certification. See the [release procedure](releasing.md).

## Prerequisites

Work from the public Appkit repository root with the latest Node 24 patch, Bun 1.4.0 and the repository's installed development dependencies. Development and verifier runtimes must satisfy `^24.15.0 || >=26.0.0`, including jsdom 30's requirements; this does not change the published packages' Node 24.0.0 minimum. For a live batch, provision Docker, a reviewed coding-agent runner image and a verifier image supplying a supported development Node version. Both images must already be available locally and pinned by digest. The runner supplies its own model connection; no particular provider SDK or agent vendor is required by Appkit.

The published `0.1.0` archives stay unchanged. Development candidates can have the same version string and are identified by integrity/digest. This procedure does not authorize commits, publication or deployment. Keep local runner configuration and execution evidence under ignored `.verification/`.

## Step-by-Step Implementation

### 1. Assign the author, reviewer and operator

Assign these responsibilities before changing a task. One maintainer can perform multiple roles; these are workflow responsibilities, not roles enforced by the harness.

| Role | Edits or supplies | Responsibility |
| --- | --- | --- |
| Task author: Appkit maintainer or trusted authoring assistant | Task files under `scripts/agent-eval/tasks/`, shared graders and regression fixtures | Define the requested behavior, public APIs and pass/fail cases. Keep prompt, contract and grader consistent. |
| Task reviewer: maintainer reviewing the change | Review feedback and, when needed, receipt `reviewDecisions` | Check that correct solutions pass, unsafe/incorrect solutions fail, and the agent cannot award itself a grade. |
| Evaluation operator: person running the batch | Ignored runner configuration, reviewed images and model settings | Prepare packages, execute the batch, inspect evidence and run qualification. |
| Agent being evaluated | Only the solution files listed in `allowedOutputPaths` | Solve the supplied task. It cannot edit task definitions, dependencies, compiler settings, graders or its recorded scores. |

A trusted assistant helping maintain the repository is the **task author**. The isolated agent solving a task is the **evaluation subject**. Give only the former permission to edit evaluation definitions.

### 2. Edit one existing task

Choose an existing directory under [`scripts/agent-eval/tasks/`](https://github.com/dataarthub/appkit/tree/main/scripts/agent-eval/tasks/). For example, [core-validation](https://github.com/dataarthub/appkit/tree/main/scripts/agent-eval/tasks/core-validation/) contains:

```text
scripts/agent-eval/tasks/core-validation/
  task.json       # Identity, allowed outputs/imports and required assertions/APIs
  prompt.md       # Instructions sent to the agent
  contract.d.ts   # Required solution exports and types
  grade.mjs       # Thin entry delegating to the shared task grader
```

A task may also have `starter/` containing initial files, as in [error-recovery](https://github.com/dataarthub/appkit/tree/main/scripts/agent-eval/tasks/error-recovery/). Starter files use the same relative paths as `allowedOutputPaths`; that task starts with `starter/solution.ts` containing a deliberately invalid import.

Edit the files in this order:

1. **Write the request in `prompt.md`.** State what to build, required Appkit integration, invalid inputs, side effects and safety boundaries. Include the same exported contract as `contract.d.ts`; the embedded prompt contract is not synchronized automatically.
2. **Define the solution interface in `contract.d.ts`.** The harness places this at `/consumer/task-contract.d.ts` for the agent and independently checks submitted exports against it. Do not put grading answers here.
3. **Update `task.json`.** Keep the directory name and `id` equal, and use the following fields consistently.
4. **Update the shared behavioral grader and its tests.** Do not stop at editing the task-local wrapper.

| `task.json` field | What the task author specifies |
| --- | --- |
| `id` | Existing task identifier, matching its directory |
| `allowedOutputPaths` | Exact relative TypeScript/TSX solution files, such as `["solution.ts"]` |
| `allowedImports` | Allowed package imports; `/*` permits that package's subpaths |
| `requiredPeers` | Task peer requirements; coordinate any actual fixture-install changes in `workspace.mjs` |
| `assertionIds` | Complete list of behavioral checks the shared grader must produce |
| `safetyAssertionIds` | Subset that must pass on every applicable submitted attempt, including the first |
| `seedReferences` | Deliberately invalid Appkit references supplied in starter code; use `[]` when absent |
| `requiredIntegration` | Required Appkit symbols used as values, such as `[{"symbols":["createAjvValidator"]}]` |

The complete definition in [core-validation/task.json](https://github.com/dataarthub/appkit/blob/main/scripts/agent-eval/tasks/core-validation/task.json) is a concrete example. `requiredPeers` is task metadata: adding a name there does not install it. The prepared consumer's explicit dependency list lives in [`workspace.mjs`](https://github.com/dataarthub/appkit/blob/main/scripts/agent-eval/workspace.mjs).

Live behavioral checks are implemented in [`graders.mjs`](https://github.com/dataarthub/appkit/blob/main/scripts/agent-eval/graders.mjs), selected by task ID. Each task's `grade.mjs` delegates to this shared implementation; the live batch invokes the shared grader directly. **Changing only `grade.mjs` does not change live grading.** Update the matching branch in `graders.mjs` and keep its assertion IDs aligned with `task.json`. Static API and integration checks are in [`score.mjs`](https://github.com/dataarthub/appkit/blob/main/scripts/agent-eval/score.mjs).

Keep developer-authored solutions in [`scripts/agent-eval/fixtures/`](https://github.com/dataarthub/appkit/tree/main/scripts/agent-eval/fixtures/) and negative cases in the relevant tests. These are evaluator inputs, not files exposed to the evaluated agent. Do not put expected answers in the prompt, contract or starter directory.

The current suite has exactly six fixed tasks: `core-validation`, `storage-hash`, `react-form`, `tool-validation`, `approval-boundary` and `error-recovery`. Creating a seventh directory is not a supported way to extend it: task IDs, suite validation, the 18-run schedule and qualification expectations/tests must change together. The current live CLI runs the whole suite; it has no single-task selection flag.

### 3. Verify the edited task before using a model

Add or update regression cases proving that a correct implementation passes and incorrect/unsafe implementations fail. Cover every declared validation and safety rule, not only the happy path. Check that unused/type-only Appkit imports cannot satisfy required integration and that the expected assertion IDs match the grader.

```bash
bun run test:agent-tooling
```

Expected: deterministic tests pass. The optional real-Docker integration test reports skipped unless its fixture environment is configured; that skip is not a live evaluation result. The [evaluator boundary checks](#evaluator-boundary-checks) below describe that separate test.

Have the task reviewer inspect the prompt, contract, metadata, shared grader and regression cases together. Editing any task file changes the suite digest; a changed task or evaluator requires a new live batch rather than reusing earlier scores.

### 4. Prepare the candidate packages

Build, type-check and verify both packages before the live CLI packs them:

```bash
bun run turbo run build typecheck test --filter=@alneas/appkit-core --filter=@alneas/appkit-react
bun run docs:generate
bun run check:docs
bun run test:agent-tooling
bun run check:release
bun run test:consumer
```

Expected: all applicable checks pass. These checks establish package/tooling correctness; they do not produce a qualifying live-agent receipt. Candidate archives are separate from the retained `two-package-0.1.0` publication archives.

### 5. Configure the reviewed runner

The evaluation operator saves configuration under ignored `.verification/agent-eval/runner.json`. Supply the actual reviewed executable, model settings and locally provisioned image digests. Keep literal credential values out of this file.

| Field | Required value |
| --- | --- |
| `executable`, `args` | Executable and argument array inside the runner image; no shell expression |
| `envAllowlist` | Explicit necessary model credential names only; npm/GitHub/cloud/database credentials are refused |
| `expectedRunner` | Object with exact runner `name` and `version` |
| `expectedModel` | Object with exact model `id` and `settings`; no silent fallback |
| `submissionTimeoutMs` | Positive integer, at most 600000 |
| `batchTimeoutMs` | Positive integer, at most 7200000 |
| `runtimePath` | Reviewed local Docker CLI executable |
| `runnerImage`, `verifierImage` | Pre-provisioned image names containing an actual `@sha256:` digest |

The executable must implement the [runner protocol](#runner-protocol-and-isolation), start a fresh model context per scheduled run, and keep its control-process credentials out of tool subprocesses and output. The operator is responsible for the reviewed runner/model implementation; matching response fields alone does not establish provider authenticity.

### 6. Run the live batch and keep its printed receipt path

```bash
bun run eval:agent -- --runner-config .verification/agent-eval/runner.json
```

The CLI packs candidates, installs the exact reviewed archives in a disposable consumer and writes results under a new `.verification/agent-eval/<timestamp>-<uuid>/` directory. It cleans disposable consumers afterward. Use the `receipt` path printed by this invocation; do not guess the directory from the receipt's separate `runId` field.

The following illustrates the output shape only; it is not a recorded live result:

```json
{"status":"completed","receipt":".verification/agent-eval/<timestamp>-<uuid>/receipt.json","firstSuccesses":15,"finalSuccesses":18}
```

Each of the six tasks runs three times in fresh contexts: **18 scheduled first submissions**. A failed submitted implementation may receive one repair attempt with compiler/behavior feedback. A timeout, refusal, invalid response or budget exhaustion after execution starts remains a failed scheduled run; no automatic replacement run is created.

`completed` means the scheduled batch finished, not that it qualified. Missing configuration, isolation or images produce `not-run`; in an early setup failure, only a minimal `receipt.json` may exist.

## Verification

### Find the saved grades and submitted code

Open the printed `receipt.json` first. It is the authoritative saved assessment for the batch and each attempt. The relevant files in a run directory are:

```text
.verification/agent-eval/<timestamp>-<uuid>/
  receipt.json
  archives.json
  consumer-lock.json
  archives/
    appkit-core.tgz
    appkit-react.tgz
  runs/
    core-validation-1/
      attempt-1/
        solution/
          solution.ts
        analysis.json
      attempt-2/             # Present only when a repair was attempted
        solution/
          solution.ts
        analysis.json
```

Other scheduled run directories use `<task-id>-<repetition>`, for example `react-form-3`. This tree shows selected evidence files; original pack output files can also be present at the run root.

| File or receipt field | What it contains and how to use it |
| --- | --- |
| `receipt.json` → `firstSuccesses`, `finalSuccesses`, `completed` | Batch totals and completion state; retain the denominator of 18 |
| `receipt.json` → `runs[]` → `attempts[]` | Saved API/type assessment, `behavior.assertions`, `safety`, `needsReview`, unsupported/hallucinated API counts, diagnostics, repair feedback and source/protected-input digests |
| `runs/<task-id>-<repetition>/attempt-<n>/solution/` | Exact collected solution files for that attempt |
| `runs/<task-id>-<repetition>/attempt-<n>/analysis.json` | Static compiler/API analysis; not the final contract/behavior verdict. Read the receipt for final results |
| `archives.json` | Candidate archive hashes and reviewed source, catalog, toolchain, image and runner/model identities |
| `archives/*.tgz` | Exact reviewed candidate package bytes used for the run |
| `consumer-lock.json` | Prepared consumer's dependency lock used to bind toolchain identity |
| `qualification.json` | Created only if the operator redirects the qualification command as shown below; not written automatically by the harness |

A failed attempt can lack a solution directory or `analysis.json` if failure occurred before collection or assessment finished. Inspect `failureCategory`, `diagnosticCategories`, `observed` and infrastructure status in the receipt instead of treating absent files as a pass. The harness does not automatically retain full model transcripts or raw runner stdout/stderr as per-attempt log files.

### Review ambiguous code and qualify the batch

`unsupportedApiCount` counts distinct unsupported Appkit imports, symbols and resolvable members. `hallucinatedApiCount` excludes unchanged deliberately seeded invalid references. Canonical import/usage statements must remain unchanged for the seed exclusion; edited aliases or new uses count as new references. Wrong arguments, missing dependencies and syntax errors remain separate diagnostic categories.

Required Appkit symbols must have value uses (calls, construction, JSX or callback arguments), rather than only unused/type-only imports. Static value-use checks cannot prove every runtime path uses that API. When an attempt has `needsReview: true`, the task reviewer inspects its exact saved source and records an acceptance in the receipt's `reviewDecisions` array with `solutionDigest`, `decision: "accept"` and a nonempty `reviewer` identifier. Use the attempt's actual digest. Preserve the other receipt fields; never change grades, assertions or hashes to make a run pass. A review decision cannot override a safety failure.

Use the parent directory of the printed receipt as `eval_run_dir`. Replace the placeholder below with that actual directory. This command saves the qualification decision to a separate local file:

```bash
eval_run_dir='.verification/agent-eval/<timestamp>-<uuid>'
bun run check:agent-eval -- --receipt "$eval_run_dir/receipt.json" --archives "$eval_run_dir/archives.json" > "$eval_run_dir/qualification.json"
```

Expected: exit code 0 and `{"qualified":true,"reasons":[]}` in `qualification.json`. A rejected batch exits 1 and records `qualified: false` plus reasons. Without the redirection, the command prints that JSON to stdout and does not save a decision file.

Qualification requires **at least 15/18 first-submission successes**, **18/18 final successes**, **zero final unsupported Appkit references**, and every applicable validation/approval safety assertion passing on every submitted attempt, including a failed first attempt. An unsafe first submission cannot be repaired into qualification. Missing, incomplete, self-test, stale or changed evidence fails closed. The check compares the actual archives and saved solutions with their recorded digests and binds the reviewed runner/model identity.

Treat this fixed suite as a regression measure for its declared runner, model and inputs, not general coding-agent certification. Receipts are local operational evidence, not cryptographic provenance attestations. Changes to model, suite, evaluator, package inputs or environment require a new baseline. Report counts and denominators rather than a percentage without context.

Keep receipts and any separately captured transcripts ignored. Do not upload raw logs or include them in packages, AI indexes or the public documentation manifest. Share a separately reviewed, redacted summary when needed. Publication remains a separate authorized step in the [release procedure](releasing.md).

## Troubleshooting / Common Pitfalls

| Symptom | What to check or do |
| --- | --- |
| Live command reports `not-run` | Read its printed receipt. Verify the ignored runner configuration, local Docker service, pre-provisioned images and candidate preparation. There may be no archive or per-attempt files yet |
| `completed` is true but qualification fails | Read `qualification.json` or the gate's stdout reasons. Completion does not imply the required success counts or safety results |
| A submitted solution exists but no `analysis.json` | Read `runs[].failureCategory` and the attempt's diagnostics in the receipt; collection can finish before a later verifier failure |
| Editing a task's `grade.mjs` has no live effect | Update the matching branch in shared `graders.mjs`, assertion metadata and regression tests together |
| A new task directory is rejected | The suite accepts exactly six fixed IDs. Adding a task requires coordinated suite/schedule/qualification changes |
| Deterministic tests pass but live capability is still unverified | Run the real configured batch. Fake drivers and authored Docker fixtures cannot produce qualifying live evidence |
| An attempt has `needsReview: true` | Review the exact saved solution and record a digest-bound decision; safety failures cannot be waived |
| Source, suite or digest checks reject an old receipt | Finalize the inputs and run a new batch. Do not update old recorded hashes to match new code |

## Runner protocol and isolation

The runner receives `schemaVersion: 1`, `runId`, `taskId`, `taskText`, `consumerDir`, `outputDir`, `allowedOutputPaths`, `attempt`, `timeBudgetMs` and optional bounded repair `feedback`. Container paths are `/consumer` and `/solution`. Its stdout must contain exactly one JSON object with matching IDs, `schemaVersion: 1`, `status` (`completed` or `failed`), `runner`, and `model`. Stderr is diagnostic output. A runner-supplied score is ignored.

The evaluated agent sees shipped guides, skills, API catalogs, the prompt and solution contract. Graders and answer fixtures are absent from its consumer. Package manifests, dependencies, compiler configuration and grader inputs are outside its write boundary. Only regular, bounded allowlisted solution files are collected into a fresh verifier workspace. Protected fixture files are hashed before and after the agent runs.

The trusted grader owns expected values, assertions, authorization decisions and effect counters. Submitted code runs in a separate UID/GID 65534 subprocess over a bounded RPC pipe separate from stdout/stderr; submitted JSON and stdout are never accepted as grades. DOM observations and adapter calls cross that untrusted interface. Effect callbacks are revoked before a scenario is closed.

The trusted container parent uses UID 0 with only SETUID, SETGID, DAC_OVERRIDE and KILL capabilities to start/stop the distinct user and read protected inputs. The submitted child loses those capabilities and cannot read private grader inputs, signal the parent or access its output descriptors. The verifier has a read-only root, no network, no-new-privileges and resource limits; grader code is mode 0700 and its input is 0600. These boundaries are required even when static analysis accepts the solution.

Do not mount host home, Docker socket, repository, private sibling repository or credentials into submitted-code verification. A temporary directory alone is not a sandbox. Normal CI uses fake launches and does not need Docker or model credentials.

### Evaluator boundary checks

The normal tooling suite tests forged stdout, early exit and JSON-global tampering with authored examples. An optional real-Docker integration test runs all six positive implementations against an independently prepared consumer and checks UID separation, protected inputs, cross-UID editing and forged grades:

```bash
APPKIT_TEST_CONSUMER=/absolute/path/to/prepared-consumer \
APPKIT_TEST_VERIFIER_IMAGE=reviewed-image@sha256:reviewed-digest \
node --test scripts/agent-eval/isolated-verifier.test.mjs
```

The operator must prepare that consumer through `prepareCandidate` with the two exact candidate archives. It explicitly installs `@testing-library/dom` as well as React Testing Library, so checkout dependencies cannot hide missing peers. These optional test variables select fixture infrastructure only; the test reports skipped when they are absent and never produces a qualifying live receipt.
