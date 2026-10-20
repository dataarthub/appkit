# Appkit AI Recovery and Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give agents safe AI error recovery information and a tested example that keeps transport, validation, approval, authorization, execution, and disclosure separate.

**Architecture:** A static Core error catalog supplies runtime descriptors and a generated guide. Existing action/tool failure results gain optional fields; Appkit-created chat errors gain a typed `Error` subclass. Application approval remains an example owned by the host application, not an implicit permission feature added to transport adapters.

**Tech Stack:** Existing TypeScript/Bun/Core tests, Node generator tests, React 19/Vitest/jsdom examples, strict packed NodeNext consumers.

**Spec:** [Approved design](../specs/2026-10-20-agent-consumer-design.md); [coordination plan](2026-10-20-agent-consumer.md).

## Global Constraints

Inherit all coordination constraints. Complete discovery first. Preserve current versions and exact internal pins; React production code must not start requiring new unpublished Core symbols. Retain existing codes/messages, `Error` inheritance, cancellation and application-local causes. No automatic execution, retry, credential exposure, source alias, or new approval framework. Public guidance remains English; examples import published feature paths.

## Review Focus

- Identical short error codes from different domains need domain-specific anchors and recovery hints (B1).
- Caller-owned exceptions and `AbortError` must keep their identity instead of being wrapped as protocol errors (B2).
- Invalid arguments, registration changes, session changes, and rejected approval must have no write effects (B3).
- A tool-output protocol event is data and must never be accepted as proof of server authorization/execution (B3).
- Legacy result object construction and exact-message consumers must still compile and behave (B4).

## File ownership and interfaces

Create Core `src/ai/errors/catalog.ts`, `index.ts`, and `errors.test.ts`; create `scripts/agent/generate-error-guide.mjs` and its `.test.mjs`. Modify Core `src/ai/index.ts`, action `types.ts`, `tool-types.ts`, `registry.ts`, `tool-bridge.ts` and chat `stream.ts`, `conversation.ts`, `session.ts`, `ai-sdk.ts`, `openai-compatible.ts` at existing Appkit-created throw/failure sites only. Update their existing tests.

Create Core `examples/approved-tool-call.ts`, React `examples/approved-tool-review.tsx`, Core `src/ai/action/approval-example.test.ts`, and React `src/ai/approval-example.test.tsx`. These are application examples; they add no public approval API. Modify both `docs/ai.md` guides, relevant JSDoc and consumer instructions, root/package READMEs only where new links are needed, generator policy/pipeline, and packed release tests.

```ts
type AIErrorDomain = 'action'|'tool'|'chat';
type AIChatErrorCode = 'AI_INVALID_CONFIGURATION'|'AI_HTTP_FAILURE'|'AI_INVALID_STREAM'
  |'AI_INCOMPLETE_STREAM'|'AI_INVALID_TOOL_CALL'|'AI_RESPONSE_LIMIT'|'AI_FILE_UPLOAD_FAILURE';
type AIErrorInfo = {readonly docsUrl:string; readonly guide:string; readonly recovery:string};
// Export these types, getAIErrorInfo, and AIChatError through the existing /ai entry.
function getAIErrorInfo(domain:AIErrorDomain,code:string): AIErrorInfo|undefined;
class AIChatError extends Error {
  readonly code:AIChatErrorCode; readonly docsUrl:string; readonly recovery:string;
  constructor(code:AIChatErrorCode,message:string);
}
```

Use `docs/ai-errors.md#<domain>-<lowercase-code-with-hyphens>` as the offline guide reference. Absolute URLs point to `https://github.com/dataarthub/appkit/blob/main/packages/appkit-core/` plus that guide reference. The catalog contains only static messages, recovery text and anchors, not exception payloads. Use literal object data in `catalog.ts`; the guide generator parses permitted string/object/array literals through the existing TypeScript compiler API, never evaluates source/configuration.

### Task B1: Establish one error catalog and generated guide

**Files:** Create the error catalog/class/lookup and guide generator files above; modify Core `/ai` index, `scripts/generate-docs.mjs`, `generated-policy.json`, and feature policy.

**Interfaces:** Consume discovery generation output handling. Produce `getAIErrorInfo`, `AIChatError`, `readErrorCatalog(source:string): ErrorDescriptor[]`, and `renderErrorGuide(descriptors:ErrorDescriptor[]): string` where `ErrorDescriptor` has `domain`, `code`, `anchor`, and `recovery`. Generate Core `docs/ai-errors.md` before its catalog and full docs.

- [ ] Write `every_existing_failure_code_has_one_domain_anchor`, `chat_error_keeps_message_and_instanceof`, `unknown_lookup_is_undefined`, and `guide_rejects_nonliteral_source`. Include all ten existing tool error codes, the four `ActionResult` codes, and exactly the seven chat codes above.

```ts
const error = new AIChatError('AI_INCOMPLETE_STREAM', 'AI stream ended before finish');
assert(error instanceof Error);
assert.equal(error.message, 'AI stream ended before finish');
assert.equal(getAIErrorInfo('tool', 'DUPLICATE_CALL')!.recovery.includes('new call ID'), false);
```

- [ ] Run `bun test ./packages/appkit-core/src/ai/errors/errors.test.ts` and `node --test scripts/agent/generate-error-guide.test.mjs`; observe missing APIs/generator fail.
- [ ] Implement immutable descriptors and the error class. Recovery for uncertain effects requests reconciliation; duplicate-call guidance never bypasses deduplication. Render valid portal frontmatter, `Public import`, stable anchors, safe recovery tables and offline guidance from the same data. Reject arbitrary executable expressions while extracting literal catalog data.
- [ ] Register the generated guide as output and `catalog.ts` as a generator/Turbo input, never generated source. Include the guide through the normal approved-doc aggregation and update feature guide mapping. Preserve temporary destination routing and package-only ownership; regenerate catalogs after this new public API exists.
- [ ] Rerun B1 commands and `bun run docs:generate`/`bun run check:docs` after Core build. Expected complete domain/code coverage, identical repeated output and every URL fragment backed by a generated heading. Review delta without committing.

### Task B2: Add safe error metadata without changing execution behavior

**Files:** Modify action result types/registry/bridge and chat files listed above, existing AI tests, and create `src/ai/ai-chat/error-contract.test.ts` plus `scripts/agent/error-coverage.test.mjs`.

**Interfaces:** Consume B1 descriptors. Add `readonly docsUrl?:string` and `readonly recovery?:string` only to `ActionResult`/`ActionToolResult` failure branches. Appkit-owned chat throws use the B1 class. Successful results, history and transport event schemas do not gain metadata.

- [ ] Write `bridge_failure_has_safe_recovery`, `legacy_result_literal_still_assigns`, `abort_and_user_fetch_errors_keep_identity`, `protocol_failure_keeps_message`, and `no_cause_or_secret_in_tool_output`. For each original throw site, pin the original message and expected chat code in a table fixture.

```ts
const legacy: ActionToolResult = {callId:'c',name:'x',ok:false,code:'INVALID_INPUT',error:'Invalid'};
assert.equal(legacy.ok, false);
assert.deepEqual(successResult, {callId:'c',name:'x',ok:true,data:{updated:true}});
await assert.rejects(collect(userFailingAdapter), error => error === userError);
```

- [ ] Run `bun test ./packages/appkit-core/src/ai/errors ./packages/appkit-core/src/ai/action ./packages/appkit-core/src/ai/ai-chat` and `node --test scripts/agent/error-coverage.test.mjs`; observe missing metadata/mapping assertions fail.
- [ ] Populate optional fields from fixed domain descriptors at library-created failure sites. Preserve `ActionResult.cause` for the initiating application; the bridge continues returning only safe fixed failure data. Keep existing validator, cancellation, call-limit, duplicate-call, output projection and reader cleanup behavior.
- [ ] Replace only Appkit-created chat exceptions with these mappings: trusted config/limits -> `AI_INVALID_CONFIGURATION`; HTTP status/body failure -> `AI_HTTP_FAILURE`; malformed event/history/order -> `AI_INVALID_STREAM`; missing finish -> `AI_INCOMPLETE_STREAM`; tool identity/correlation/JSON -> `AI_INVALID_TOOL_CALL`; exceeded response cap -> `AI_RESPONSE_LIMIT`; upload parsing/status/result-ID -> `AI_FILE_UPLOAD_FAILURE`. Preserve status text and original messages. Do not broadly catch and wrap caller `fetch`, `uploadFile`, getters or handler exceptions; abort identity remains unchanged.
- [ ] Make error-coverage tests parse the selected chat files and check a reviewed throw-site/message map so new raw Appkit failure paths require classification. Include malformed stream fragments, invalid JSON, max-limit boundaries, abort/early return and callback failure cases. Rerun B2 commands; all original protocol and resource-lifecycle tests must still pass. Review exact-object assertion updates and task delta without committing.

### Task B3: Document and test an application-owned approval boundary

**Files:** Create the two examples and their tests above; modify Core/React AI guides, relevant adapter/tool JSDoc, and consumer instructions. Use existing package entry APIs; no approval logic is added to public adapters.

**Interfaces:** Core example produces `createRenameApprovalExample({registry,bridge,sessionId,authorizeServer})`, with `queue(call): PendingApproval|null`, `reject(approvalId): void`, `approve(approvalId): Promise<ActionToolResult|null>`, `setSession(sessionId): void`, and `close(): void`. `PendingApproval` is a bounded immutable snapshot containing `approvalId`, `callId`, tool name, `{recordId:string,name:string}`, session ID and displayed effect. `authorizeServer` is an application-provided async decision for that exact snapshot; production server authorization must still occur in the handler. React example exports `RenameToolReview({example,pending,onSettled})` rendering explicit approve/reject buttons and the snapshot.

- [ ] Write `no_write_before_approval`, `reject_and_bad_schema_do_not_execute`, `changed_call_or_session_requires_new_approval`, `registration_change_during_authorization_rejects`, and `provider_tool_output_is_not_approval`. Include unregistration/re-registration under the same ID, original argument mutation after snapshot, async authorization failure and unmount/close cleanup.

```ts
const pending = example.queue(validCall)!;
assert.equal(writeCalls, 0);
example.reject(pending.approvalId);
assert.equal(await example.approve(pending.approvalId), null);
assert.equal(writeCalls, 0);
```

- [ ] Run `bun test ./packages/appkit-core/src/ai/action/approval-example.test.ts` and, from `packages/appkit-react`, `bun x --no-install vitest run --config ../../scripts/vitest.config.ts src/ai/approval-example.test.tsx`; observe missing examples/assertions fail.
- [ ] Implement one fixed rename-tool example using strict synchronous schema/parsing and bounded JSON snapshots before preview. Queueing a replacement invalidates prior approval IDs; validate authenticated session and current registered action identity both before and after awaited authorization. Execute only the approved immutable call through the bridge, with server checks and durable-idempotency responsibilities stated at the application handler. Never retry automatically. Render only the projected result; React controls do not grant server authority.
- [ ] Update guides with the design's seven-stage flow and adapter protocol distinctions. Show exact import subpaths and peers/providers/styles. Label retrieved files/content, assistant/tool output and schema-valid arguments as untrusted. Explicitly cover server-owned credentials/endpoint/upload disclosure and cancellation without rollback. Use the example's actual code rather than inventing convenience APIs in prose.
- [ ] Rerun B3 tests, selected React interaction tests, example compilation in the packed consumer and `bun run check:docs`. Expected no effect before approved server-authorized execution, one effect after approval, stale/rejected approvals fail, and adapter tool events alone do nothing. Review delta without committing.

### Task B4: Verify new errors and examples across package boundaries

**Files:** Modify `scripts/release.test.mjs`, `scripts/check-consumer.mjs`, `scripts/agent/discovery.test.mjs` and existing public API export tests where needed. Regenerate the owning guides, catalogs and AI aggregates; preserve production pins.

**Interfaces:** Consume A4 packed CLI/metadata checks, B1 error exports, B2 failure results, and B3 application examples. Produce fresh candidate verification receipts in new ignored paths; none replace publication receipts.

- [ ] Add `packed_ai_errors_load_in_esm_and_commonjs`, `legacy_and_new_failure_types_compile`, and `all_error_guides_have_real_anchors`. Compile both old literal failure shapes and the new class/lookup imports with NodeNext and `skipLibCheck:false`; prove that adding recovery fields does not make React depend on unpublished Core implementation aliases.

```js
assert.equal(esm.AIChatError.prototype instanceof Error, true);
assert.equal(typeof cjs.getAIErrorInfo, 'function');
assert.equal(metadataInsideSuccessfulPayload, false);
```

- [ ] Run affected release/consumer tests to capture the actual packed baseline. New assertions may already pass when prior tasks fully supplied their inputs; do not manufacture a failing check or repeat source changes merely to force a red phase in this integration-verification task.
- [ ] Extend actual archive checks and isolated probes, retaining mandatory explicit CSS and peer/provider setup. Install reviewed archives only into disposable fixtures; do not change React's production `@alneas/appkit-core` pin. Avoid a second unrelated packaging test framework.
- [ ] Run filtered Core build/type/unit checks, affected React tests, `bun run docs:generate`, `bun run check:docs`, `bun run test:agent-tooling`, `bun run check:release` and `bun run test:consumer`. Expect both runtime formats, strict declarations, relevant interactions and packed metadata to pass; compare against preserved baseline and retained archive digests. No commit or version bump.

## Handoff to evaluation

The evaluator's approval task grades equivalent application-owned behavior, not an added library authorization feature. The recovery task can use the shipped CLI and generated descriptors, but its seeded bad API reference must not be counted as a new hallucination unless the agent adds/changes it. Live evaluation begins only after the final candidate archives for this work are frozen.
