---
title: "Recover from AI integration errors"
description: "Stable AI error codes, safe recovery hints and application-owned retry decisions."
sidebar:
  order: 3
archetype: reference
project: appkit
tags: ["appkit", "ai", "errors"]
---

# Recover from AI integration errors

Generated from the Core error catalog. Applications own authorization, effect reconciliation and durable idempotency. Recovery hints do not authorize retries.

## Public import

`@alneas/appkit-core/ai`

```typescript
import {getAIErrorInfo} from '@alneas/appkit-core/ai';
const hint = getAIErrorInfo('tool', 'INVALID_INPUT');
console.log(hint?.recovery);
```

## action-not-found

`action / NOT_FOUND`

Check the registered action and its current lifetime before creating a new proposal.

## action-invalid-input

`action / INVALID_INPUT`

Correct the input against the action validator and validate again before requesting approval.

## action-execution-failed

`action / EXECUTION_FAILED`

Reconcile whether the operation already changed state before considering another attempt.

## action-cancelled

`action / CANCELLED`

Check completed effects; cancellation does not roll back writes.

## tool-invalid-call

`tool / INVALID_CALL`

Provide a complete call ID, exposed tool name and JSON object arguments.

## tool-not-exposed

`tool / NOT_EXPOSED`

Use only the tools explicitly exposed by this session; request application authorization for additional tools.

## tool-not-available

`tool / NOT_AVAILABLE`

Inspect the current action registration; obtain a new proposal and approval if the target changed.

## tool-invalid-input

`tool / INVALID_INPUT`

Correct arguments against the advertised schema and typed parser, then obtain approval for the corrected call.

## tool-cancelled

`tool / CANCELLED`

Reconcile completed effects; cancellation does not imply rollback.

## tool-execution-failed

`tool / EXECUTION_FAILED`

Ask the application to reconcile the operation and permissions before retrying.

## tool-invalid-output

`tool / INVALID_OUTPUT`

Check the application output projection; never disclose raw handler output as a fallback.

## tool-duplicate-call

`tool / DUPLICATE_CALL`

Reconcile the original call outcome with the application; do not bypass duplicate protection.

## tool-call-limit

`tool / CALL_LIMIT`

Stop this session and let the application review its call budget.

## tool-closed

`tool / CLOSED`

Stop using this session; a new session requires application-owned authorization.

## chat-ai-invalid-configuration

`chat / AI_INVALID_CONFIGURATION`

Correct the trusted application endpoint, model or response limits.

## chat-ai-http-failure

`chat / AI_HTTP_FAILURE`

Inspect application-side service availability and authorization; reconcile uncertain effects before retrying.

## chat-ai-invalid-stream

`chat / AI_INVALID_STREAM`

Compare the endpoint protocol and conversation history with the selected adapter contract.

## chat-ai-incomplete-stream

`chat / AI_INCOMPLETE_STREAM`

Treat completion as unknown and reconcile pending calls before retrying.

## chat-ai-invalid-tool-call

`chat / AI_INVALID_TOOL_CALL`

Reject the incomplete or invalid call and inspect its original envelope and advertised schema.

## chat-ai-response-limit

`chat / AI_RESPONSE_LIMIT`

Reduce response size or deliberately revise the application-owned limit.

## chat-ai-file-upload-failure

`chat / AI_FILE_UPLOAD_FAILURE`

Inspect the explicit upload handler, accepted file input and disclosure policy.

Never expose application-local causes, provider response bodies, credentials or private schema details. Preserve AbortError cancellation and inspect uncertain writes before any retry. Read the [AI trust boundary guide](ai.md).
