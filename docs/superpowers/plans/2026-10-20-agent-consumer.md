# Appkit Agent Consumer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Appkit discoverable and searchable by consuming coding agents, document safe AI integration, and measure real task performance against reviewed package archives.

**Architecture:** Deliver three independently testable work packages in order: discovery/catalog/CLI, AI recovery/security examples, and evaluation/release readiness. Public runtime additions belong to the existing packages; repository scripts own generation and evaluation. This document coordinates the three detailed plans below.

**Tech Stack:** Node 24.0.0 minimum, Bun 1.4.0, TypeScript 6.0.3 compiler API at development time, native ESM/CommonJS declarations, Node test runner, existing Bun/Vitest/React test tooling.

**Spec:** [Approved detailed design](../specs/2026-10-20-agent-consumer-design.md).

## Global Constraints

- Preserve exactly two public npm packages: `@alneas/appkit-core` and `@alneas/appkit-react`.
- Preserve the published `0.1.0` packages and existing package version strings/internal exact pins. A future release version change is separate work.
- No commits, pushes, tag updates, publication, deployment, reset, clean, or stash without separate explicit authorization. Task checkpoints below are verification checkpoints, not commits.
- Preserve existing modified and untracked files. Capture file hashes, index, and refs before execution; subsequent changes must be attributable to the selected tasks.
- Keep public and private repositories independent. Never read or mount sibling private sources into generation or evaluation.
- Preserve Node 24.0.0 minimum, native ESM/CommonJS/NodeNext, optional SDK feature boundaries, host React contexts, and explicit CSS imports.
- No new public npm package, hosted API, MCP server, provider SDK, or runtime TypeScript dependency.
- Canonical documentation is English. Only approved feature documents enter the public manifest; these plans/specification and operational evidence do not.
- Respect `--output-dir` generation, deterministic output, and actual Turbo input/output ownership. Do not overwrite authored source or evidence.
- Normal fixtures/receipts use ignored `.verification/`; packed consumers use system temp with cleanup in `finally`.
- Never overwrite `.verification/artifacts/two-package-0.1.0` or reuse that publication's receipts for modified archives.
- Live agent evaluation is uncached and separate from deterministic CI. Missing live evidence remains `not-run` or `stale`.
- All implementation code, examples, test assertions, and commands below are planned work, not files already added or checks already passed.

## Review Focus

1. Installed legacy `0.1.0` without a catalog must not receive invented results from a newer bundled catalog — discovery Task A3.
2. Package-only generation/cache hits must not modify the root index, sibling outputs, or authored skills — discovery Tasks A2/A4.
3. Approval must become invalid when arguments, target, authenticated session, or action registration changes — AI safety Task B3.
4. A runner claiming completion or returning a symlink must not bypass independent credential-free verification — evaluation Tasks C2/C3.
5. Repaired unsafe submissions or stale/incomplete receipts must never qualify a release — evaluation Tasks C4/C5.

## Work packages and checkpoints

| Order | Detailed plan | Independently testable deliverable | Depends on |
| --- | --- | --- | --- |
| 1 | [Discovery and API search](2026-10-20-agent-discovery.md) | Direct package instructions, generated catalogs/root index, packed Node-only CLI | Existing working tree and build outputs |
| 2 | [AI error recovery and safe examples](2026-10-20-agent-ai-safety.md) | Additive error metadata, generated error guide, tested application approval examples | Package 1 generator/catalog contract |
| 3 | [Agent evaluation and release readiness](2026-10-20-agent-evaluation.md) | Protected task suite, real-run orchestration, independent grading, digest-bound release gate | Final artifacts from packages 1 and 2 |

Each detailed plan starts with its file ownership and explicit interfaces. Read this index, the design, and the selected plan before its first task. Do not run tasks from different packages concurrently: generated documentation, root scripts, and packaging checks share files. No subagents are dispatched while writing this plan.

## Execution baseline and prerequisites

- [ ] Capture current tracked/untracked file hashes, `git status --porcelain=v1 -z -uall`, index checksum, `git show-ref`, both manifest versions, and selected source inputs in an ignored execution receipt. Do not stage or restore unrelated work.
- [ ] Verify the existing Node/Bun/dependency tools. Use installed dependencies and scoped commands; an unavailable optional integration does not justify adding production dependencies.
- [ ] Before isolating implementation in a worktree, preserve the current dirty baseline explicitly. Native worktree creation does not copy uncommitted changes. Either execute in this checkout under the reviewed preservation snapshot or use a separately authorized copy strategy that includes the existing changes.
- [ ] Execute detailed plans 1, 2, and 3 in order. At each task, write the meaningful failing assertions, observe the expected failure, implement the named interface, then record passing targeted checks.
- [ ] When a task finishes, inspect only its delta against the execution snapshot. Retain existing edits to shared files; no whole-file replacement with `HEAD` versions.

## Integrated verification

Commands are run only after the tasks that add their inputs and scripts. A full replay is warranted at the final package boundary; do not repeat unrelated browser/database checks during prose or planning changes.

```bash
bun run turbo run build typecheck test --filter=@alneas/appkit-core --filter=@alneas/appkit-react
bun run docs:generate
bun run check:docs
bun run test:agent-tooling
bun run check:release
bun run test:consumer
git diff --check
```

Expected: selected package checks, new deterministic tests, generated freshness, README/link/public-import checks, and isolated packed consumers all pass. Retain actual command results and input hashes. `check:release` continues checking package correctness without requiring model credentials; it is not the live agent release gate.

Live release evaluation is an operator step after reviewed candidate archives and a reviewed isolated runner are available:

```text
bun run eval:agent -- --runner-config .verification/agent-eval/runner.json
bun run check:agent-eval -- --receipt <run-receipt> --archives <candidate-archive-manifest>
```

The path arguments denote files produced by that run, not retained `0.1.0` publication evidence. The commands never publish. The live gate requires 18 scheduled runs, at least 15/18 first successes, 18/18 final successes, zero final unsupported API references, and safety assertions passing on every applicable attempt. Missing credentials or isolation are a visible prerequisite failure; deterministic test success cannot substitute.

## Completion and handoff

- [ ] Check every design requirement against the coverage map in the three plans; record any actual remaining operational prerequisite.
- [ ] Confirm version strings/internal pins remain unchanged and the retained publication archives are intact.
- [ ] Confirm pre-existing work remains and only reviewed task deltas were introduced. Verify Git refs/index were not changed by task automation.
- [ ] Report deterministic results separately from live agent results. If no live batch ran, state that clearly and keep the README's live-evaluation qualification.
- [ ] Present the final diff and evidence for review. Do not commit or publish automatically.

For execution, native implementation in this chat is the lower-overhead default recommendation: the three packages share generation and artifact contracts, and the changes must preserve a substantial existing dirty baseline. A task-by-task subagent implementation is an alternative if the user explicitly selects it. Review this plan set and select the method before implementation, as required by the writing-plans handoff.
