# Appkit agent discovery and evaluation design

Date: 2026-10-20

Status: Detailed design for review; implementation has not started.

Appkit will help a consuming coding agent find the correct package, inspect actual public APIs, recover from documented AI integration errors, and demonstrate its integration through independently checked sample tasks. The approved approach is direct package instructions, a repository discovery index, a local API search CLI, release evaluation, and documented AI trust boundaries.

This design preserves the two existing npm packages and their ownership boundaries. It does not change the published `0.1.0` packages, select the next release version, commit existing work, or authorize publication. Existing working-tree changes remain the implementation baseline. The design itself stays uncommitted and outside the public documentation manifest.

## Outcomes and current behavior

| Requested improvement | Current behavior | Designed outcome |
| --- | --- | --- |
| Discover agent instructions | Both packages export `./ai-instructions` and `./package-context.json`, targeting `dist/consumer-ai`; root-level instructions are absent from the package allowlist | Explicit package metadata and directly packed `consumer-ai` files, retaining the existing exports |
| Choose Core or React | Each package has its own generated `llms.txt` and `llms-full.txt` | A generated repository `llms.txt` explains package selection and links both packages |
| Search actual APIs | Generated export references list import paths, without symbol search | A Core-owned, read-only CLI searches versioned catalogs from the packages available to the consumer |
| Evaluate coding agents | Consumer checks exercise developer-authored examples; the README correctly calls agent task evaluation unverified | A release evaluation runs real coding-agent submissions against packed packages and records measured outcomes |
| Keep an English source | English documentation is canonical; the portal owns Japanese delivery | Preserve that policy |
| Recover from integration errors | AI tool results have discriminated codes; chat adapter failures are mostly plain `Error` values | Safe error documentation and recovery hints, preserving existing code and message contracts |
| Explain prompt injection boundaries | Core and React AI guides describe proposals but lack a complete trust and approval flow | Guides and tested examples separate transport, validation, approval, authorization, execution, and disclosure |

## Architecture and package boundaries

Core owns the CLI and its dependency-free catalog search module. React owns its own catalog and consumer guidance. Build-time catalog generation and release evaluation live in repository scripts and use existing development tooling. Neither package imports the other package's source to generate its catalog. No third npm package, runtime TypeScript dependency, MCP service, hosted API, or new provider SDK is introduced.

The data flow is:

1. Package exports, emitted public declarations and JSDoc, feature policy, and English guides produce each package's discovery artifacts.
2. Packing includes those artifacts and the Core CLI. Packed-consumer checks verify that every advertised path exists in the actual archives.
3. The CLI reads local JSON catalogs without executing package modules or loading optional SDKs.
4. A coding agent uses the same packed instructions, catalogs, and guides inside a disposable consumer. An evaluator checks its submitted code independently.
5. Evaluation receipts remain ignored local evidence. Only a deliberately reviewed summary may later be published.

An MCP server is deferred. A future MCP implementation can wrap the catalog loader and search operations; this release does not add a network listener or tool execution service.

## Package instructions and metadata

Both package manifests gain an Appkit-specific discovery field. It is a documented local convention, not a claim that npm or all coding agents automatically recognize the field:

```json
{
  "appkit": {
    "agent": {
      "schemaVersion": 1,
      "instructions": "./consumer-ai/SKILL.md",
      "context": "./consumer-ai/package-context.json",
      "catalog": "./consumer-ai/api-index.json",
      "index": "./llms.txt",
      "fullDocumentation": "./llms-full.txt"
    }
  }
}
```

The `files` allowlist names the three `consumer-ai` files explicitly. It does not include the directory wholesale. `consumer-ai/SKILL.md` remains authored source; context and catalog are generated. Existing `./ai-instructions` and `./package-context.json` exports retain their targets under `dist/consumer-ai`. Copy all three artifacts, including the catalog, into that compatibility directory and require byte equality with their root counterparts. Add `./api-index.json` as a metadata export targeting the root catalog. Preserve every existing JavaScript, declaration, CSS, and metadata export.

The two skills describe package selection, exact imports, optional peers, providers, CSS, API search, verification commands, and application-owned authorization. They point to sibling `package-context.json` and `api-index.json`, so the same instructions work from both supported locations. Only selected public documentation and static metadata are packed; evaluation fixtures, transcripts, runner configuration, and design documents are excluded.

The package READMEs and package-level `llms.txt` link these instructions explicitly. Consumers can discover them by reading a package manifest, README, discovery index, or the existing metadata exports.

## Repository discovery index

The root `llms.txt` is generated by the full documentation generation command. It is a short decision guide rather than a concatenation of package documentation:

- Choose Core for framework-independent schemas, storage, data, graphs, regional contracts, AI validation, and action/proposal contracts.
- Choose React for UI, forms, tables, providers, React proposal review, and chat bindings. Explain its Core dependency and host React requirements.
- Link package READMEs, package indexes, full documentation, and consumer instructions using repository-relative paths.
- Link the AI security guidance and evaluation procedure without advertising an unmeasured success rate.

Root generation runs after package artifacts are generated. A package-only build updates only its own files and never rewrites the repository index or the other package. English remains canonical. Design specifications and ignored verification receipts are never added to `docs.manifest.json` or the generated full documentation.

## API catalog generation

Each catalog is generated from that package's manifest export conditions and the `.d.ts` files produced by its build. Use the existing TypeScript development dependency and compiler API to resolve re-exports, aliases, type-only symbols, overloads, and documentation comments. Do not import the runtime entry to enumerate names: optional peers and browser-only code must not run during generation or search.

Each catalog has `schemaVersion`, `packageName`, `packageVersion`, a deterministic `inputDigest`, `entries`, and `symbols`. An entry records the exact public import, ESM/CommonJS/declaration targets, kind (`module`, `stylesheet`, or `metadata`), and feature guidance. A symbol records its exported name, public import, value/type classification, declaration signatures, normalized JSDoc summary and tags, and a guide reference. Alias imports remain separate valid entries even when they share a declaration target.

`inputDigest` hashes canonical package inputs: manifest export/dependency/peer fields, authored consumer instructions, feature policy, finalized selected guides, and the relevant emitted declarations. Generated discovery metadata, catalogs, and `llms` artifacts are excluded to avoid recursive hashes. Hash inputs use package-relative paths and file bytes, never absolute paths or timestamps. A missing export target, unsupported catalog schema, or unresolvable public export fails generation rather than producing an incomplete successful catalog. Missing optional dependency declarations must be distinguished from a missing public symbol; unresolved external type references remain named references and must not become invented signatures.

Add a repository-owned `agent-policy.json` mapping each package and its feature imports to guides and known peer/provider/style requirements. Validate every referenced import and peer against its manifest. Prefix rules use longest-prefix matching, with explicit exceptions for narrower optional entries. Require coverage for the main feature imports and SDK-specific entries; other entries may explicitly report `requirementsStatus: "consult-guide"`. Do not present all package peers as required for every import or infer a host provider from a symbol name.

Generation is deterministic: stable keys, public-import/name ordering, normalized line endings, and no environment information. Signatures retain overloads and named type references; documentation comments are plain text and never executed. Normalize compiler-generated import type paths to contained package-relative or public module names and reject remaining host paths. Source locations, where included, are package-relative. Catalog checks compare both ESM and CommonJS export conditions so a runtime-only condition difference cannot silently be presented as a shared API.

Integrate catalog production into each package build after declaration preparation. Within package generation, produce the error guide and other guide/landing outputs first, then context/catalog and compatibility copies, then the `llms` aggregates. The full generation command produces the root index after both packages. Extend `scripts/generate-docs.mjs` and helpers so `--output-dir` writes every generated discovery artifact exclusively under the requested destination while reading declarations from the selected build. Freshness checking must fail clearly if required build outputs are absent. Update generator fixtures to provide small real declaration/re-export inputs and the new helpers rather than relying on the previous documentation-only fixture layout.

Extend `generated-policy.json` with root `llms.txt`, each generated root context and catalog, and the retained `dist/consumer-ai` copies. Do not designate authored skills as generated output. Update Turbo inputs and outputs to include the feature policy and catalog-generation helpers, exclude generated root context/catalog from source inputs, and restore them on cache hits. Repository-index generation remains a separate full generation step after both package builds; concurrent package builds must not share output paths.

## Local API search CLI

Core gains `bin.appkit-api = "./dist/agent-cli.mjs"`. Build it as a separate Node entry with a shebang and executable archive mode, outside browser-facing public exports. It uses only Node built-ins and a small pure catalog search module. It does not import the Core root, React, TypeScript, AI SDKs, or provider libraries at runtime.

The planned command contract is:

```text
appkit-api search <query> [--package core|react|all] [--root <consumer-directory>] [--limit <1..100>] [--json]
appkit-api show <public-import> [--symbol <exported-name>] [--root <consumer-directory>] [--json]
appkit-api --help
appkit-api --version
```

`--root` defaults to the current working directory. Resolve only the two known package catalog exports from that consumer location, without executing resolved modules. Prefer installed package catalogs, and identify package name, version, and catalog digest in every response. If Core is not installed at all, the executable may use its own bundled Core catalog, explicitly identified as `source: "bundled"`. An installed legacy package lacking a catalog is reported as `catalog-unavailable`; never silently substitute a newer bundled catalog for that installed version. Missing React is not an error for default search of available catalogs; an explicit React request fails with a useful installation/version hint. Default `all` reports which scopes were searched and which were unavailable.

No registry query or install occurs inside the CLI. The npm launcher may separately download the requested package. After a future release, the version-pinned launcher follows [npm's documented explicit package syntax](https://docs.npmjs.com/cli/v11/commands/npm-exec/):

```bash
npm exec --package="@alneas/appkit-core@$APPKIT_VERSION" -- appkit-api search "proposal review" --json
```

`APPKIT_VERSION` is the selected future published version; `0.1.0` does not contain this CLI. React search requires a compatible installed React package catalog. No documentation should imply that passing a package to npm's executable search path automatically installs it into the consumer's dependency tree.

Search is a deterministic case-insensitive token match over exported names, imports, summaries, and guide titles. Rank exact symbol names first, exact imports second, then name/import token matches and documentation matches. Break ties by package, import, and symbol name. The default limit is 20. Use literal matching, not user-supplied regular expressions, generated code, or a model. Empty or over-500-character queries, invalid limits, unknown flags, and path escape attempts fail validation.

JSON output is a single envelope with `schemaVersion`, `ok`, `searchedPackages`, `unavailablePackages`, and `results`; failures add a stable `code` and safe `message`. Results include signatures, public imports, guide paths, package versions, and requirement status. No progress text is mixed into JSON stdout. Human output goes to stdout and diagnostics to stderr; strip terminal control characters from catalog text. No matches is a successful empty result. Exit codes are 0 for a valid query, 2 for usage errors, and 3 for unavailable or invalid requested catalogs.

Only read the selected catalog JSON and its package metadata. Validate schema, finite collection sizes, a maximum catalog size of 16 MiB, and metadata paths contained in the resolved package. Do not recursively scan the consumer, evaluate config files, follow catalog-provided remote URLs, write files, or spawn child commands. Catalog paths and documentation text remain data.

## Agent task evaluation

### Evidence and execution modes

The release evaluator has two distinct modes. Deterministic harness tests use deliberately authored valid and invalid submissions to test scoring, fixture isolation, timeouts, and error classification. Live evaluation invokes a configured coding-agent runner and scores the files it produces. Only the latter contributes to measured agent success rates. Replaying saved submissions can verify a scorer but is not a fresh live run.

Use a provider-neutral runner contract rather than coupling the public packages to a model vendor. Repository scripts invoke a reviewed executable and an argument array with `shell: false`. The runner receives one UTF-8 JSON request on stdin containing `schemaVersion: 1`, run/task IDs, task text, consumer directory, allowed output paths, attempt number, time budget, and previous evaluator feedback. It writes solution files only in the supplied output directory and emits one JSON response on stdout with matching IDs, `schemaVersion: 1`, `status` (`completed` or `failed`), `runner` (`name`, `version`), and `model` (`id`, `settings`). Bounded stderr is diagnostic evidence and never parsed as a successful result. Missing or ambiguous identity prevents a release-qualified result. Prompt text never becomes a shell command. Model reasoning or private chain of thought is neither required nor scored.

The runner command is explicitly selected by the release operator; it is not auto-discovered from a consumer or dependency. No provider credential, paid model invocation, or new service is required for ordinary CI. Live execution requires a separately configured runner and its credentials; without them the result is `not-run`, not a passing evaluation. Configuring a runner is an operational prerequisite, not a deferred change to the scorer contract.

Use an access-controlled disposable execution environment for live evaluation. System-temp directories prevent ancestor `node_modules` resolution but do not themselves sandbox an agent. The runner must restrict file writes and command execution to its task environment, keep the repository and private sibling repository unmounted, and expose only explicitly necessary credentials to its control process. Generated-code validation runs in a separate credential-free environment without network access. Evaluation code must not treat a working-directory setting or a scrubbed environment alone as a security boundary.

### Packed inputs and task boundary

Build and pack both candidate packages without publication. Copy the exact reviewed archives to a unique ignored evaluation run directory and record integrity, source-selection digest, task-suite digest, evaluator version, and toolchain identity. Never overwrite the retained `two-package-0.1.0` archive set. Install these exact archives and explicit task peers in a disposable consumer, using no source aliases, `file:` production dependencies, or access to checkout `node_modules`. Installation may use the network during fixture preparation; coding and behavioral validation do not require a live backend or provider. Development archives may retain the current version strings, so identify them by digest rather than confusing them with the registry's `0.1.0`. Preserve production internal pins until a separately authorized release version change; only the isolated evaluation fixture substitutes reviewed archives.

The agent receives package READMEs, instructions, catalogs, guides, fixture declarations, and a natural-language task. It does not receive solution examples from the evaluation suite or grader implementation. Package documentation remains available because learning the package from shipped guidance is the behavior being evaluated. Install dependencies and prepare an immutable fixture before invoking the agent. The agent may edit only declared solution files; package manifests, dependencies, tsconfig, tests, and grader inputs stay outside its write boundary.

After each attempt, copy only regular allowlisted solution files into a fresh verifier workspace; reject symlinks, path traversal, unexpected files, and missing outputs. Do not reuse the agent's possibly modified `node_modules`. Verify against evaluator-owned dependencies, compiler configuration, and behavioral tests. Clean up disposable workspaces in `finally`; retain only ignored, access-controlled receipts and bounded diagnostic output.

### Initial task suite

| Task | Agent deliverable | Independently verified behavior |
| --- | --- | --- |
| Core schema validation | Validate records through the published AI validation API | Valid/invalid payloads handled through actual result types; no invented methods or unchecked cast |
| Core storage hash | Hash supplied text using the correct portable public entry | Stable expected digest and correct import; no unnecessary optional SDK |
| React request form | A schema-driven form accepting the supplied data adapter | Required providers and CSS present, field rendering works, valid submit writes exactly once, invalid submit does not write |
| AI tool validation | Register a schema-validated action and expose only its intended tool | Malformed input and unexposed names cannot invoke the handler; returned data respects output projection |
| AI approval boundary | Consume mocked chat tool-call events through an application approval step | No execution before approval, rejection has no effects, changed arguments require new approval, server authorization remains checked |
| Error recovery | Repair a seeded invalid import/tool input using shipped search and error guidance | Final code uses a real public API, preserves validation, and passes the original behavior checks |

Task fixtures define exact exported solution contracts, allowed files, expected dependencies, and grading rules in versioned data. Behavioral tests use mock adapters and responses. React interaction checks are selected for the form and approval tasks; pure Core tasks do not start a browser or database. Where a task begins with a deliberately broken API reference, record that seed separately and exclude it from agent-introduced hallucination counts until the agent adds or changes that reference.

Run each task three times in a fresh context with the same declared model configuration: 18 first submissions. Permit one repair submission per run after bounded compiler/test feedback. Allow at most 10 minutes per submission and 120 minutes per complete live batch, with no automatic retry or silent model substitution. A runner may declare a tighter cost budget; budget exhaustion remains a visible incomplete or failed result. A sequential batch exceeding the total cap stops explicitly rather than running indefinitely.

### Metrics and release gate

Report first-submission success, final success after at most one repair, and per-task counts. A solution succeeds only if API conformance, strict NodeNext type-checking, and evaluator-owned behavior tests all pass. Use `skipLibCheck: false`, following the same declaration verification boundary as the existing packed consumer; [TypeScript documents that skipping library checks reduces type-system accuracy](https://www.typescriptlang.org/tsconfig/skipLibCheck.html). Reject compiler suppression directives, unchecked `any` escape paths used to bypass required contracts, dependency replacement, and changes to protected fixture inputs. Human review settles ambiguous suppression cases and is recorded as part of release qualification.

Define `unsupportedApiCount` as the number of distinct unsupported Appkit references observed in submitted code, keyed by package, public subpath, symbol, and member where applicable. `hallucinatedApiCount` is the subset introduced by the agent, excluding unchanged deliberately seeded broken references. Check imports, named re-exports, namespace access, and type-checker-resolvable member access against packed exports and declarations. Unknown import paths, missing named exports, and nonexistent members contribute; wrong argument types, missing peers, unrelated third-party diagnostics, and syntax errors are separate categories. Multiple diagnostics for the same reference count once per submission. Store both metrics for first and final submissions. The final release gate uses all unsupported references, including unresolved seeds. Do not label arbitrary prose or unobserved intermediate attempts as measured API hallucinations; unsupported dynamic access fails conformance instead of being reported as zero hallucinations.

Initial release qualification requires at least 15/18 first-submission successes, 18/18 final successes, zero final unsupported Appkit API references, and all approval/validation safety assertions passing on both attempts. An unsafe first submission cannot qualify by becoming safe on repair. Publish the numerator and denominator, not just a rounded percentage. These are a small regression suite and do not establish general coding-agent capability.

A known outage before runner execution is an infrastructure result and prevents batch qualification; it is not an agent failure. A timeout, invalid output, refusal to complete the assigned task, or budget exhaustion after execution begins remains an unsuccessful scheduled run. Do not silently discard poor runs, replace them with extra attempts, or average results across different catalog/package digests. A suite or model change creates a new baseline.

The receipt records run identity, timestamps, runner/model configuration, input digests, package integrities, per-task attempts, success metrics, observed unsupported references, conformance/behavior outcomes, and infrastructure outcomes. Use relative paths and sanitized error categories. Any raw transcript is separate ignored evidence and is never automatically uploaded or included in documentation generation. A missing live receipt or an input mismatch means `not-run` or `stale`; it cannot qualify a candidate release.

### CI and release placement

Ordinary PR CI runs generator freshness, catalog/search/CLI tests, error contract tests, evaluator self-tests, affected package checks, and packed-consumer checks when packaging or public boundaries change. It does not invoke a paid model or receive publishing credentials. Scope deterministic checks through existing Turbo tasks where appropriate.

The first live evaluation is a required release-operator step on the finalized candidate using the configured runner. Keep it outside Turbo caching. Add a receipt validation command to release readiness, checking the exact package, task, and evaluator digests plus the thresholds above. It must fail closed when evidence is absent, stale, incomplete, or below threshold. This does not add or dispatch a publishing workflow. A future manually dispatched live CI job can use the same runner contract after its credential and sandbox setup is reviewed.

The planned repository commands are `bun run test:agent-tooling` for deterministic CLI/catalog/evaluator tests, `bun run eval:agent -- --runner-config <ignored-config>` for a live batch, and `bun run check:agent-eval -- --receipt <receipt> --archives <candidate-archive-manifest>` for release qualification. The runner config contains an executable, argument array, explicit environment-variable allowlist, and identity/budget settings; it stores no literal credential values. Both runner config and receipts live under ignored `.verification/`. A manually asserted `completed` runner response never bypasses independent grading or digest checks.

README wording remains precise: deterministic metadata/harness coverage and measured live task results are separate. Until a qualifying live run exists, retain the unverified live-evaluation statement. Do not embed a hardcoded success percentage in generated package documentation. `RELEASING.md` links the versioned evaluation procedure and requires the receipt check before authorization to publish.

## Recoverable AI integration errors

Limit the first change to AI action/tool failures and chat adapter/session failures. Do not refactor every Appkit error. Keep existing discriminant codes, human messages, cancellation semantics, and `instanceof Error` behavior where applicable.

Add optional readonly string fields `docsUrl` and `recovery` to typed failure branches for `ActionResult` and `ActionToolResult`. Existing callers constructing those result types remain valid. Library-created failures populate the fields from a fixed descriptor table. The existing `error` field remains a safe message, not a serialized exception. Preserve `ActionResult.cause` as application-local information; never copy it into tool output, history, or new recovery metadata. For chat failures created by Appkit, use an `AIChatError extends Error` with readonly string fields `code`, `docsUrl`, and `recovery`, narrowing `code` to the fixed union below; preserve original messages. Do not wrap caller-owned fetch/handler exceptions indiscriminately, and preserve `AbortError` cancellation behavior.

The first chat code union is:

| Code | Appkit-owned failure category | Recovery guidance |
| --- | --- | --- |
| `AI_INVALID_CONFIGURATION` | Missing model, invalid limits, or unsupported application configuration | Correct trusted application configuration |
| `AI_HTTP_FAILURE` | Unsuccessful chat HTTP response | Inspect safe status and application-side authorization/service availability; do not blindly retry |
| `AI_INVALID_STREAM` | Malformed protocol event, event ordering, or structurally invalid message/history | Compare the endpoint's protocol and supplied history with the documented adapter contract |
| `AI_INCOMPLETE_STREAM` | EOF without explicit finish | Treat completion as unknown and reconcile before retry |
| `AI_INVALID_TOOL_CALL` | Invalid/incomplete tool identity, tool result correlation, or tool argument JSON | Reject the call; inspect the advertised schema and original call envelope |
| `AI_RESPONSE_LIMIT` | Configured response/stream limit exceeded | Reduce the response size or deliberately revise the host-owned limit |
| `AI_FILE_UPLOAD_FAILURE` | Invalid upload payload, upload response failure, or missing upload result ID | Inspect the explicit upload handler, accepted file input, and disclosure policy |

Map each Appkit-created throw site in chat stream/configuration helpers, conversation normalization, session handling, and the two adapters to one category; test the mapping table against those sites. Cancellations remain `AbortError`. Fixed hints explain inspection or correction, not automatic retries. `EXECUTION_FAILED` and uncertain network outcomes explicitly require checking whether an effect already happened. `DUPLICATE_CALL` must not instruct an agent to bypass deduplication by inventing another call ID. `INVALID_INPUT` directs the caller to its declared schema; remote failures do not expose schema validation internals, submitted values, tokens, endpoint URLs, or raw causes.

Use a new `packages/appkit-core/docs/ai-errors.md` guide with required portal frontmatter, a `Public import` section, and stable anchors for each domain/code. Derive guide tables and runtime descriptors from one reviewed static error catalog so every code has an existing explanation. Register this generated guide and its source in the generated-output policy; temporary regeneration may never overwrite its source or the checkout. Documentation URLs use the actual public GitHub repository and the guide on `main`, without promising that a future release tag already exists. Include a relative packed guide reference in the descriptor catalog for offline lookup. Never auto-fetch a URL from an error. Future tagged release documentation can strengthen immutable references as a separate release policy change.

Expose the new error class and lookup types through the existing `@alneas/appkit-core/ai` feature entry, with explicit tests of its declaration and runtime surfaces. Existing result consumers may ignore added fields. Test exact-object consumers and examples that previously assumed the old object shape; avoid adding metadata to successful results or transcript/history payloads.

## Prompt injection and application execution boundaries

Update both AI guides and their JSDoc references to state what existing code actually does. `createAISDKChatAdapter` normalizes the AI SDK UI Message Stream protocol; it is not an SDK model instance wrapper. `createOpenAICompatibleChatAdapter` assembles Chat Completions tool arguments. Neither adapter runs tools, approves actions, or grants server permission. A structurally valid tool call remains untrusted data.

Document this application-owned sequence and provide a type-checked, mocked integration example:

1. Treat retrieved content, uploaded files, assistant text, tool descriptions, and tool outputs as data with an explicit source. Do not promote their instructions into trusted system/developer messages or copy model output into provider configuration.
2. Parse a complete tool-call envelope, resolve a session allowlist, and validate arguments with the declared synchronous schema and typed parser. Use strict object schemas where extra properties are not intended.
3. Construct an approval view from a bounded immutable snapshot: tool identity, normalized arguments, affected resources, and proposed effects. Bind approval to that exact call and authenticated user/session. An argument, target, or action-registration change invalidates approval.
4. Require explicit confirmation for writes, external sends, destructive actions, or sensitive disclosure; do not infer approval from an assistant message, streamed tool result, or the existence of a React review component. Read-only actions may follow a narrowly preauthorized application policy.
5. At execution, the server checks identity, tenant/resource permissions, business rules, concurrency, and durable idempotency. A browser allowlist, JSON schema, in-memory call ID, or client approval is not server authorization.
6. Execute only a fixed registered handler, then validate/project output through `mapOutput` before disclosure. Return minimal result fields. Sanitize presentation and never evaluate model-generated code or arbitrary component names.
7. Propagate cancellation and record ambiguous outcomes. Cancellation does not roll back completed effects; retries require application-owned reconciliation.

The current bridge already enforces explicit tools, schema checks, bounded JSON snapshots, duplicate-call limits, and output projection. Preserve those checks. State that they do not detect all prompt injection or implement approval, multi-tenant server authorization, or durable retry protection. Keep provider credentials and upload endpoints server-owned; file upload remains an explicit disclosure decision. The example must not suggest that an SDK `tool-output` event proves an approved application-side execution.

## Changes by owner

| Owner | Planned changes |
| --- | --- |
| Package manifests and authored skills | Discovery metadata, exact packed files, catalog export; Core CLI bin; updated instructions |
| Generation scripts and `agent-policy.json` | Declaration catalog, feature mapping, root discovery index, deterministic generation and freshness |
| `generated-policy.json` and `turbo.json` | New output ownership and cache inputs/outputs; no shared package-build writes |
| Core CLI sources/build preparation | Node-only executable, catalog loader, pure search, stable output/errors |
| Core AI sources/tests | Additive failure metadata, fixed error descriptors, `AIChatError`, public declarations |
| Core and React guides/examples | Error guide, prompt injection boundaries, approved tool integration, English documentation |
| Packed-consumer and release checks | Exact root/compatibility metadata, executable/archive checks, strict isolated consumers, version-aware receipts |
| Evaluation scripts and fixtures | Runner protocol, protected tasks/graders, scoring and receipt validation; live evidence remains ignored |
| README and release procedure | Discovery links, honest evidence status, required live release gate |

Implementation should be delivered in three ordered work packages: discovery/catalog/CLI, AI recovery/security documentation, and live evaluation/release readiness. Evaluation task contracts can be written early, but qualifying live evidence is collected only after the other two packages and packed artifacts are finalized. The subsequent implementation plan will specify exact files and test-first steps; this design does not authorize implementation or commits.

## Acceptance and verification

| Area | Required evidence |
| --- | --- |
| Existing working tree | Existing edits and untracked files remain present; no reset, clean, stash, commit, tag move, or push is required for this design |
| Package discovery | Both archives include exact root instructions/context/catalog; metadata paths resolve; old metadata exports remain byte-identical and usable |
| API catalog | Re-export, alias, overload, type-only, missing target, optional dependency, duplicate entry, and deterministic generation fixtures pass |
| Root index | Links and package-selection guidance validate; package-only generation leaves sibling and root outputs untouched |
| CLI | Packed executable works on minimum Node 24.0.0 and routine Node matrix; no React/provider dependency needed for Core search; installed/bundled/legacy versions reported accurately |
| CLI boundaries | Invalid JSON/schema/paths, unavailable requested packages, empty results, stable ranking, Unicode/control text, and JSON stdout tested; execution performs no writes or network calls |
| AI failures | All codes link existing guide anchors; old messages/cancellation retained; safe fields only; new symbols compile in ESM/CommonJS NodeNext consumers |
| Security integration | Invalid tool input, unexposed tools, approval rejection, changed-call approval, no automatic tool execution, and output projection are independently asserted |
| Packed integrations | Updated archive allowlist, executable mode, explicit peers/providers/CSS, native ESM/CommonJS, React SSR and relevant interactions pass against the exact archives |
| Evaluator | Deliberately good/bad/unsafe submissions, seeded errors, missing runner, forged runner status, timeout, altered fixture, duplicate diagnostics, and stale receipts classified correctly |
| Live release evidence | A complete 18-run batch satisfies the declared first/final/safety thresholds for the exact candidate; self-tests cannot substitute for it |
| Documentation | Existing README policy, generated freshness, approved-manifest/link checks, and updated public-import checks pass without publishing the design or operational evidence |

These are future implementation acceptance conditions, not claims that the changes or live evaluation have already passed. For the present design-only task, verification is limited to internal consistency, referenced source paths, Markdown links, Git diff hygiene, and preservation of all pre-existing working-tree/index/ref states.
