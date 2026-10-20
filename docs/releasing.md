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

The initial release publishes only `@alneas/appkit-core@0.1.0` and `@alneas/appkit-react@0.1.0`. Features are import subpaths, not separate npm packages. Internal production dependencies use exact registry versions.

Select finalized sources, then build, type-check and run `bun run check:release` and `bun run check:docs`. Pack both packages, inspect exports, README, MIT license and peers, and install those exact archives into a disposable consumer. Check native ESM, CommonJS, NodeNext declarations, React SSR, CSS and the documented form. Run affected browser/adapter checks when their behavior changes; reuse unchanged evidence for unrelated integrations.

Historical separate-package archives do not verify the new boundaries. Keep source hashes, archive digests and command results in ignored verification receipts. A retained artifact is eligible for reuse only when the relevant source and archive hashes still match. Do not publish unbuilt source or change artifacts after verification.

Publish the reviewed core archive before the React archive using the logged-in npm CLI, only after explicit authorization and any requested 2FA. GitHub tags/Releases and npm publication are separate. Never dispatch npm publication from branch/tag pushes or overwrite an existing version; verify its registry integrity before resuming a partial publish.

After publication install exact registry versions in a fresh consumer without local aliases or archive overrides. Portal ingestion and Japanese delivery are separate tasks. Do not publish credentials, private sources or operational receipts.

## Coding-agent evaluation gate

Run the [isolated agent evaluation procedure](agent-evaluation.md) against the exact finalized candidate archives after deterministic package checks. `bun run check:release` verifies package correctness; release readiness additionally requires `bun run check:agent-eval` with that run's receipt and archive manifest. Missing or stale live evidence fails the gate. Harness self-tests are not live task results. Keep raw receipts/transcripts ignored, and publish only after separate explicit authorization.
