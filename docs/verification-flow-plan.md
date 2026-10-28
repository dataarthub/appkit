# Verification flow maintenance

This implements the reviewed shared development policy (2026-10-24). It changes
maintainer verification only; package versions, test assertions, runtime/browser
coverage, isolation and memory/process limits remain unchanged. No release needed.

## Implementation

- [x] Make push hooks run secret/history and workflow consistency checks only;
  keep staged commit checks read-only. Ready PR CI remains the required source gate.
- [x] Reuse successful independent checks against exact source, dependency,
  configuration, runner and execution inputs. Joint-process tests retain their
  group boundary. Unknown imports/setup/assets broaden the selected scope.
- [x] Evaluate PR merge candidates, skip Draft heavy jobs, support merge queues,
  and check current base/head before accepting candidate receipts.
- [x] Preserve immutable run/attempt-bound JSON receipts. Authenticate producing
  repository, unchanged trusted workflow controls, latest attempt, required jobs,
  artifact digest and execution identity before reuse. Writable caches alone do
  not authorize main/release acceptance. Compare actual Git trees after merge.
- [x] Keep fallback conservative when evidence is unavailable or incompatible;
  distinguish execution, reuse and omission. Preserve independent successes when
  a later check fails; do not mark the failed job/workflow as successful.
- [x] Test affected tooling with disposable repositories and API/artifact fixtures;
  do not repeatedly run unrelated product suites for workflow-only changes.

## Verification and delivery

Tests cover unchanged input hits, changed source/config/runtime misses, failed,
interrupted or empty tasks, stale base/head, unequal trees, forks, replaced attempts,
missing jobs, expired/corrupt artifacts and safe download destinations. Existing
public and restricted coordination boundaries remain separate. Existing records
without enough identity data remain historical records, never invented receipts.
Local preflight does not claim remote CI or committed-candidate proof. Commit/push,
merge and publication require their existing authorization.

Remote execution and committed-candidate proof remain pending authorized delivery.

### Policy source and integration scope

Policy review uses github-docs `f5ecca0dc9e1da333c7653cbf42220d4e37348b6`.
The workflow supply stays based on `612b785efe4a5e571d59ae0a138a1cbe0060d0d0`
so its reviewed reuse callbacks, Draft selection and merge-group support are
preserved. The private registry-constraint conformance files are the unchanged
policy-only imports from f5ecca0, recorded by exact file and bundle hashes. This
is a reviewed composite, not a claim that the complete latest supplier was
adopted. Tests, memory limits and human requirements remain unchanged.

Author self-review of this adoption is not independent review. Independent PR
review, current remote checks and any required human decision remain pending.
No protected AI controller/provider integration is deployed by these changes.
