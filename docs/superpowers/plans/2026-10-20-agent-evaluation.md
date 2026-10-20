# Appkit Agent Evaluation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Measure actual coding-agent integrations against reviewed archives and reject release qualification based on unsafe, stale, incomplete, or developer-authored-only evidence.

**Architecture:** Versioned task contracts and evaluator-owned graders run separately from an agent's writable solution directory. A provider-neutral runner protocol supplies submissions; an isolated credential-free verifier checks public APIs, strict types and behavior. A separate receipt validator binds release readiness to the exact artifacts and complete batch.

**Tech Stack:** Node test runner/built-ins, TypeScript 6.0.3 compiler API, existing React/Vitest tools in verifier fixtures, optional pre-provisioned OCI/Docker execution for live runs. No model SDK or new public package.

**Spec:** [Approved design](../specs/2026-10-20-agent-consumer-design.md); [coordination plan](2026-10-20-agent-consumer.md).

## Global Constraints

Inherit all coordination constraints, including no version change, commit, publication, private source access or retained-archive overwrite. Complete discovery and AI safety before collecting qualifying live evidence. Six tasks run three independent repetitions: 18 scheduled first submissions, one repair maximum, 600000 ms per submission, 7200000 ms per batch. Qualification requires at least 15/18 first successes, 18/18 final successes, zero final unsupported API references, and all applicable safety assertions passing on both attempts. No paid/model call in deterministic CI, Turbo cache for live outcomes, automatic retries, run replacement or silent model substitution.

## Review Focus

- Developer-authored fixtures validate the evaluator, not agent capability; replayed submissions are not a fresh live batch (C1/C4).
- Unsupported symbols, bad arguments, missing peers, unchanged seeded mistakes and dynamic bypasses are different outcomes (C2).
- Host cwd/environment scrubbing alone is not isolation; forged completion, symlink/hardlink output and protected-file mutations must be rejected (C3).
- A timeout/budget failure after execution starts stays in the scheduled denominator; a preflight outage prevents batch qualification (C4).
- Unsafe first submissions, altered receipts and different package/task/scorer inputs must fail closed (C5).

## File ownership and common interfaces

Create `scripts/agent-eval/{contracts,suite,score,workspace,runner,execution-driver,receipt}.mjs`, matching `.test.mjs` files, `scripts/run-agent-eval.mjs`, `scripts/check-agent-eval.mjs`, and `docs/agent-evaluation.md`. Create six task directories under `scripts/agent-eval/tasks/`; each contains `task.json`, `prompt.md`, `contract.d.ts`, `grade.mjs` and, only for recovery, `starter/solution.ts`. Add `scripts/agent-eval/fixtures/` for deliberately good/bad scorer/runner submissions exercised by the deterministic `.test.mjs` files; no second self-test executable is needed. Modify the existing deterministic test orchestrator, root scripts, release procedure, quality CI and generator's approved root-document selection.

All paths in contracts are workspace-relative except private process-launch paths. Definitions live in `contracts.mjs` as JSDoc typedefs and runtime validators, with matching JSON serialization tests:

```ts
type Verdict = {passed:boolean; assertions:{id:string;passed:boolean;safety:boolean}[]};
type ApiReference = {packageName:string;importPath:string;symbol?:string;member?:string};
type Assessment = {apiConformant:boolean;typecheckPassed:boolean;behavior:Verdict;
  safety:'pass'|'fail'|'not-run';unsupportedApiCount:number;hallucinatedApiCount:number;
  unsupportedReferences:ApiReference[];diagnosticCategories:string[];needsReview:boolean};
type RunnerRequest = {schemaVersion:1;runId:string;taskId:string;taskText:string;
  consumerDir:string;outputDir:string;allowedOutputPaths:string[];attempt:1|2;
  timeBudgetMs:number;feedback?:{categories:string[];messages:string[]}};
type RunnerResponse = {schemaVersion:1;runId:string;taskId:string;status:'completed'|'failed';
  runner:{name:string;version:string};model:{id:string;settings:Record<string,unknown>}};
type AttemptRecord = Assessment & {attempt:1|2;solutionDigest:string};
type TaskRun = {id:string;taskId:string;repetition:1|2|3;attempts:AttemptRecord[];
  outcome:'completed'|'failed'|'infrastructure-error'|'not-started';failureCategory?:string};
type ArchiveRecord = {packageName:string;version:string;file:string;integrity:string;sha256:string};
type CandidateInputs = {archives:ArchiveRecord[];sourceDigest:string;catalogDigests:Record<string,string>;
  toolchainDigest:string};
type Submission = {files:{path:string;sha256:string;size:number}[];digest:string;protectedInputsDigest:string};
type EvaluationReceipt = {schemaVersion:1;mode:'live'|'self-test';executionKind:'isolated-live'|'test-driver';
  runId:string;runner:RunnerResponse['runner'];model:RunnerResponse['model'];inputs:CandidateInputs;
  suiteDigest:string;evaluatorDigest:string;runs:TaskRun[];firstSuccesses:number;finalSuccesses:number;
  completed:boolean;reviewDecisions:{solutionDigest:string;decision:'accept'|'reject';reviewer:string}[]};
```

`Assessment` contains independently computed facts, never a runner's self-assigned score. `needsReview` must be resolved by a separately recorded human decision bound to the submitted file digest before qualification. Any `safety:'fail'` remains disqualifying; a review cannot override it.

Hash archive-producing source inputs (package sources/manifests, authored guides/skills/READMEs, build/generation helpers, feature/error policy, lockfile) using sorted relative paths and bytes. Exclude these implementation plans, ignored evidence and generated discovery artifacts from `sourceDigest`; bind generated artifacts through archive/catalog digests instead. Hash all evaluator/runner/driver/task/grader source plus entry commands into `evaluatorDigest`/`suiteDigest`. `file` paths in exported receipts are run-relative; resolve and contain them before reading. `toolchainDigest` includes actual Node/Bun/TypeScript/platform and live image identities.

### Task C1: Define six protected task contracts and validate grader quality

**Files:** Create `contracts.mjs`, `suite.mjs`, their tests, task directories and deliberate good/bad fixtures.

**Interfaces:** Produce `loadSuite(taskRoot:string): TaskDefinition[]`, `suiteDigest(taskRoot:string): string`, and each task's `grade({solutionDir,fixture}): Promise<Verdict>`. `TaskDefinition` includes `id`, `allowedOutputPaths`, `allowedImports`, `prompt`, `contract`, `requiredPeers`, `safetyAssertionIds`, and initial seeded reference fingerprints. Reject absolute/traversing/duplicate output paths and any task count other than the six versioned tasks.

| Task ID | Allowed solution and contract | Behavioral assertions |
| --- | --- | --- |
| `core-validation` | `solution.ts`: `validateRecord(data:unknown): {valid:boolean;errors:readonly string[]}` for a prompt-defined name/amount schema | Required name length 2, numeric amount >=0, invalid payload rejected, no invented validator methods |
| `storage-hash` | `solution.ts`: `hashText(text:string):string` | Expected SHA-256 for empty, ASCII and Unicode input, public portable import, no optional SDK |
| `react-form` | `solution.tsx`: `RequestForm({adapter}:{adapter:DataAccessAdapter}): ReactElement` | Schema fields name/reason, valid submit exactly one write, invalid submit zero writes, providers/CSS present |
| `tool-validation` | `solution.ts`: `createToolScenario(onWrite): {bridge:ActionToolBridge;close():void}` with prompt-defined `{name:string}` input | Strict schema rejects wrong/extra fields; unknown tool has no effect; successful result excludes the handler's `secret` field |
| `approval-boundary` | `solution.ts`: `createApprovalScenario(onWrite,onAuthorize)` returning `ingest`, `pending`, `approve`, `reject`, `setSession`, `close` | No writes before approval, rejected/stale/changed calls do nothing, authorization denied at execution does nothing, tool-output event does not execute |
| `error-recovery` | `solution.ts`: `validateName(data:unknown): {valid:boolean;errors:readonly string[]}` | Replace seeded nonexistent validator import using shipped guidance; valid/invalid name checks pass without disabling validation |

- [ ] Define the two scenario callbacks and return methods completely in the corresponding `contract.d.ts`: tool `onWrite({name:string}):Promise<{name:string;secret:string}>`; approval `onWrite({recordId:string,name:string}):Promise<void>`, `onAuthorize({recordId:string,name:string,sessionId:string}):Promise<boolean>`, `ingest(event:AIChatEvent):void`, `pending(): {approvalId:string;recordId:string;name:string}|null`, `approve(id:string):Promise<void>`, `reject(id:string):void`, `setSession(id:string):void`, `close():void`. Give all tasks exact prompt constants and grader-owned fixtures; do not infer missing solution interfaces while grading.
- [ ] Write `suite_has_six_complete_tasks`, `good_fixtures_pass`, `bad_fixtures_fail`, and `unsafe_fixtures_fail_safety`. Include explicitly wrong imports, valid-looking code with ignored validation, double writes, automatic tool execution, and leaked output. Code references in the recovery seed must be verified absent from the actual candidate catalog.

```js
assert.equal(loadSuite(taskRoot).length, 6);
assert.equal(unsafe.behavior.passed, false);
assert.equal(unsafe.behavior.assertions.some(a => a.safety && !a.passed), true);
assert.notEqual(suiteDigest(taskRoot), digestAfterOneGraderChange);
```

- [ ] Run `node --test scripts/agent-eval/contracts.test.mjs scripts/agent-eval/suite.test.mjs`; observe missing contracts/graders fail.
- [ ] Implement task loading and mock-based graders. Provide schema/tool/approval invalid-input checks; use React interactions only for form/approval UI behavior that needs them. Keep grader code and deliberately good/bad solutions outside the agent-visible fixture. The model may read shipped documentation, including its public examples, but not evaluation answer fixtures.
- [ ] Rerun C1 commands and deterministic self-tests. Expected all deliberately bad/unsafe fixtures are rejected for the intended category. These results carry `mode:'self-test'` and can never become live receipts. Review delta without committing.

### Task C2: Score strict types and observable unsupported API references

**Files:** Create `scripts/agent-eval/score.mjs`, `score.test.mjs`, compiler fixtures and seeded-reference data.

**Interfaces:** Produce `analyzeSubmission({solutionFiles,consumerDir,seedReferences}): ApiAnalysis` and `assessSubmission({analysis,typecheck,behavior}): Assessment`; `ApiAnalysis` contains the two reference counts, distinct references, conformance violations and diagnostic categories. Consume packed catalogs from discovery and actual installed declarations, not checkout symbols.

- [ ] Write `deduplicates_one_reference`, `separates_bad_args_from_missing_api`, `legacy_seed_is_not_agent_hallucination`, `namespace_reexport_and_member_access`, and `dynamic_escape_is_not_zero_hallucinations`. A seeded unsupported reference contributes to unsupported count until repaired, even when excluded from agent-introduced count.

```js
assert.equal(seedOnly.unsupportedApiCount, 1);
assert.equal(seedOnly.hallucinatedApiCount, 0);
assert.equal(twoDiagnosticsForOneSymbol.unsupportedApiCount, 1);
assert.equal(dynamicBypass.apiConformant, false);
```

- [ ] Run `node --test scripts/agent-eval/score.test.mjs` and observe absent analysis/scoring fail.
- [ ] Use the TypeScript checker and export map to classify imports, re-exports, namespaces and resolvable member expressions by originating Appkit package/import. Deduplicate `(packageName,importPath,symbol,member)` per submission. Canonical AST fingerprints identify unchanged seeded references independently of whitespace/source location. Keep argument/type errors, peer/fixture failures, syntax errors and unrelated package errors out of API hallucination counts.
- [ ] Enforce evaluator-owned strict NodeNext config with `skipLibCheck:false`, task-only solution files and declared peers. Match imports to each task's `allowedImports` and packed export map; omit Node filesystem/process modules from solution allowlists. Reject suppression directives, undeclared/deep imports, `eval`/`Function`/process-control bypasses and unresolved dynamic escape paths. Mark ambiguous `any` bypass cases `needsReview`; do not reject Appkit dependency internals or stringify every compiler diagnostic as a hallucination. Check exact grader assertion IDs/counts, so early process exit/empty test output cannot be a behavior pass.
- [ ] Add scorer tests for type-only imports, aliases, computed literal members, safe typed generics versus unchecked cast bypass, unchanged seed plus new fake API, missing peers and no grader completion. Rerun C2 tests; expect stable first/final classifications and visible manual-review cases. Review delta without committing.

### Task C3: Prepare isolated consumers and enforce runner/verifier boundaries

**Files:** Create `workspace.mjs`, `execution-driver.mjs`, `runner.mjs` and tests; add `fixtures/fake-runner.mjs` used only by deterministic driver fakes.

**Interfaces:** Produce `prepareCandidate({runDir,archives}): CandidateInputs`, `collectSubmission({outputDir,allowedPaths,destination}): Submission`, `invokeRunner({request,config,driver,deadline}): Promise<RunnerResponse>`, and `createExecutionDriver(config): ExecutionDriver`. Driver methods are `runAgent({request,config,deadline})` and `runVerifier({submission,fixture,deadline})`; deterministic tests inject fakes. Return verified copied-file digests and protected-fixture hashes with every submission.

- [ ] Write `new_run_preserves_publication_archives`, `missing_driver_never_runs_on_host`, `rejects_symlink_hardlink_traversal_and_extra_files`, `forged_complete_still_needs_grading`, `read_only_fixture_is_enforced`, and `verifier_has_no_secrets_or_network`. For output collection, require regular files with link count 1, at most 1 MiB per file/8 MiB total, and no path outside the allowlist.

```js
assert.equal(hostRunnerSpawned, false);
assert.equal(verifierLaunch.network, 'none');
assert.deepEqual(verifierLaunch.credentialEnvNames, []);
assert.equal(publicationArchiveDigestAfter, publicationArchiveDigestBefore);
```

- [ ] Run `node --test scripts/agent-eval/workspace.test.mjs scripts/agent-eval/runner.test.mjs scripts/agent-eval/execution-driver.test.mjs`; observe missing isolation/collection controls fail.
- [ ] Implement unique run paths under `.verification/agent-eval`, read-only reviewed archive records and disposable system-temp consumers. Install exact candidate archives/explicit peers with ignored lifecycle scripts during preparation, remove `NODE_PATH`, and clean up in `finally`. Snapshot required fixture/dependency inputs and copy only accepted solution files into a fresh verifier; never reuse agent-side `node_modules`.
- [ ] Implement an optional Docker CLI driver for actual live runs. Require operator-provisioned runner/verifier image digests before invocation; missing Docker/images is `not-run` preflight, never host fallback. Launch with argument arrays, no shell, no privileged mode/host networking/Docker socket/home/repository mounts, read-only root/consumer, an isolated writable solution directory and bounded ephemeral temp. Drop all capabilities, use a non-root container user, enable no-new-privileges, set 256 PIDs/2 GiB RAM/2 CPUs and a 256 MiB temporary filesystem, and verify mounts before the runner starts. The verifier uses `--network none` and no credential environment. The agent controller may have provider network access and explicit necessary credential names; the reviewed runner must keep those values out of tool subprocess environments and output. Container isolation is a live prerequisite, not a mandatory CI install or an npm runtime dependency.
- [ ] Validate ignored runner config fields `executable`, `args`, `envAllowlist`, `expectedRunner`, `expectedModel`, `submissionTimeoutMs`, `batchTimeoutMs`, `runtimePath`, `runnerImage`, and `verifierImage`. The executable/arguments run inside the runner image; the two image strings require `@sha256:` digests already provisioned locally. Timeout fields may tighten but not exceed design limits. No literal credential values. Supply JSON on stdin, accept one bounded response on stdout (64 KiB), cap stderr evidence at 128 KiB, enforce matching IDs/schema/model configuration, and kill the process/container on deadline. Never echo secrets or full launch environments into receipts.
- [ ] Rerun C3 tests with driver fakes and an opt-in local container smoke test when provisioned. Deterministic success checks launch policy/collection, not a claim that Docker or a paid runner ran. Record operational prerequisite gaps explicitly; review delta without committing.

### Task C4: Orchestrate a complete live batch with one repair maximum

**Files:** Create `scripts/run-agent-eval.mjs`, `scripts/agent-eval/batch.mjs`, `batch.test.mjs` and `receipt.mjs`; modify root `package.json` to add `eval:agent`.

**Interfaces:** Produce `runBatch({suite,candidate,runnerConfig,driver,clock}): Promise<EvaluationReceipt>`. Receipts have `schemaVersion:1`, `mode:'live'`, immutable scheduled run IDs, runner/model identity, candidate/catalog/source/suite/evaluator/toolchain digests, initial/final outcomes, review decisions, safety outcomes and infrastructure categories. A submitted source hash identifies each attempt.

- [ ] Write `schedules_exactly_eighteen_runs`, `one_repair_without_replacing_first_attempt`, `timeout_remains_failure`, `preflight_outage_prevents_qualification`, `batch_cap_stops_visibly`, and `fake_fixture_run_is_not_live_evidence`.

```js
assert.equal(receipt.runs.length, 18);
assert.equal(Math.max(...receipt.runs.map(r => r.attempts.length)), 2);
assert.equal(receipt.runs.find(r => r.id === timedOutRun).outcome, 'failed');
assert.equal(receipt.firstSuccesses, 15);
```

- [ ] Run `node --test scripts/agent-eval/batch.test.mjs`; observe missing orchestration/receipt behavior fail.
- [ ] Generate the complete 6x3 schedule before launching, use a fresh model context per repetition, and keep exact declared model settings. Invoke the runner, copy accepted outputs, invoke independent verification, then allow one repair with bounded error-category feedback. A first-pass success needs no repair. Safety failures stay permanently attached even when a second attempt fixes them.
- [ ] Apply the exact 600000 ms submission and 7200000 ms batch limits, optionally tighter configured budgets; never auto-retry a provider/runner failure or extend the denominator with replacement runs. An infrastructure failure before any invocation prevents qualification; timeout/refusal/invalid response/budget exhaustion after start counts unsuccessful. Preserve not-started scheduled runs when the batch cannot finish.
- [ ] Write receipts with atomic replacement only of the current run's receipt; preserve all earlier run directories. Use relative evidence paths and sanitized categories. Keep raw bounded transcripts separate and ignored. Include metadata identifying driver fakes/self-tests; validators refuse those as live release evidence even when their scores look perfect. Rerun C4 tests with a fake clock/driver; no paid call is part of these tests.

### Task C5: Qualify receipts, document the operator procedure, and integrate CI

**Files:** Create `scripts/check-agent-eval.mjs`, `scripts/agent-eval/qualification.mjs`, `qualification.test.mjs`, and authored `docs/agent-evaluation.md`; modify root scripts, `scripts/test-agent-tooling.mjs`, quality CI, `RELEASING.md`, README discovery/evidence links, and root-doc selection in `scripts/generate-docs.mjs`.

**Interfaces:** Produce `qualifyReceipt({receipt,currentInputs}): {qualified:boolean;reasons:string[]}` and command `check:agent-eval` with `--receipt` and `--archives`. Consume all independently computed assessment counts and hash the current evaluator/task/catalog/archive inputs; never trust user-edited aggregate totals alone. Root `test:agent-tooling` includes deterministic tests, not live batch execution.

- [ ] Write `requires_fifteen_first_and_eighteen_final`, `unsafe_first_cannot_be_repaired_away`, `final_seed_counts_against_gate`, `stale_digest_or_missing_run_fails`, `recomputed_aggregates_ignore_claims`, and `review_cannot_override_safety_failure`.

```js
assert.equal(qualifyReceipt({receipt:valid18,currentInputs}).qualified, true);
assert.equal(qualifyReceipt({receipt:only14First,currentInputs}).qualified, false);
assert.equal(qualifyReceipt({receipt:unsafeThenRepaired,currentInputs}).qualified, false);
assert.equal(qualifyReceipt({receipt:selfTestPerfect,currentInputs}).qualified, false);
```

- [ ] Run `node --test scripts/agent-eval/qualification.test.mjs`; observe missing fail-closed qualification behavior fail.
- [ ] Validate identity/mode/schema, six task IDs with repetitions 1..3 exactly once, attempts <=2, digest-bound evidence, independent grading completion, no unresolved review, and matching per-task safety assertions. Recompute counts from attempts: at least 15/18 first, 18/18 final, zero final unsupported references including seeds, no failed or unexecuted applicable safety assertion on either attempt. Reject altered, missing, incomplete, self-test, stale and infrastructure-blocked evidence with stable reasons; retain the small-suite scope qualification.
- [ ] Document candidate preparation, digest-pinned runner/verifier provisioning, environment-name allowlist, mock/no-provider behavior, live cost/time limits, failure categories, explicit human review and exact release commands. Add this authored root guide to the generator's approved root-document selection without treating it as generated output; keep design/plans/receipts excluded. Create the authored procedure before full docs generation links it from root discovery. Leave README live-agent capability unverified until actual qualifying evidence exists; no fabricated percentage or copied raw logs.
- [ ] Add `test:agent-tooling`, `eval:agent`, and `check:agent-eval` script integration without a live job, model secrets, publishing action, evidence upload or live Turbo cache. Keep `check:release` usable for deterministic package verification; the documented release-ready procedure additionally requires `check:agent-eval`. Run the coordination plan's integrated deterministic commands and verify each command's actual output.
- [ ] If a reviewed runner and provisioned isolation are available under subsequent execution authorization, collect the real batch only against frozen final candidates and run `check:agent-eval`. Otherwise finish the software/harness work with the live prerequisite clearly `not-run`, the release gate failing closed, and honest README wording. Preserve `0.1.0` and all existing work. A receipt is local operational evidence, not a cryptographic provenance attestation; model identity/output review and receipt access control remain operator responsibilities.

## Spec coverage and release handoff

Catalog correctness, package/bin packing and root discovery are owned by discovery Tasks A1-A4. Error/code/guide compatibility and prompt injection boundaries are owned by AI safety Tasks B1-B4. Task/grader isolation and sample behaviors are C1/C3, observable hallucination/type analysis is C2, honest live metrics/budgets are C4, and digest-bound release qualification/CI/operator instructions are C5. A live evaluation can be reported only when it actually ran; publication remains separately authorized.
