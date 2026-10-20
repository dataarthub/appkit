# Appkit public repository

This is the independent public repository dataarthub/appkit. It owns exactly two
npm packages: @alneas/appkit-core and @alneas/appkit-react, both initially 0.1.0.
Keep package.json, bun.lock, turbo.json and CI local to this repository. Never
create a workspace, production source alias or file/link dependency to the sibling
appkit-private repository. Production internal dependencies use exact npm versions.
Private consumers use published versions; only selected disposable verification
fixtures replace them with reviewed archives. Never copy Private sources or
operational evidence into public packages or the approved documentation manifest.

Core owns framework-free storage, data, schema, graph, AI and regional contracts.
React owns UI, forms, tables, providers and React AI bindings. Keep optional SDKs
behind explicit feature entries, host React contexts external, and CSS explicit.
Preserve native ESM, CommonJS, NodeNext declarations and the minimum Node 24.0.0.

Run only checks matching changed inputs. Reuse recorded passes for unchanged
implementations. Turbo caches deterministic build/type/unit tasks; do not fabricate
cache results from logs. Run packed consumers for changed exports, dependencies or
package boundaries. Select browser/DB checks when those integrations change; do
not rerun them for prose edits. No commits, pushes, publication or deployment
without explicit authorization.

Canonical documentation is English; portal translation and deployment belong to
github-docs. Each feature guide must show its exact published import subpath and
required peers/providers/styles. Install package names, not subpaths. Keep JSDoc,
examples and consumer instructions aligned. Read CONTRIBUTING.md and RELEASING.md.

## Shared standards

### Documentation
- Policy: https://tech-docs.alneas.com/policies/documentation-policy.md
- Skill: https://tech-docs.alneas.com/skills/document-authoring/SKILL.md

### Development and release
For implementation and verification selection, read:
- Policy: https://tech-docs.alneas.com/policies/development-policy.md
- Skill: https://tech-docs.alneas.com/skills/developing-projects/SKILL.md

For release preparation, publication or partial-release recovery, read:
- Policy: https://tech-docs.alneas.com/policies/release-policy.md
- Skill: https://tech-docs.alneas.com/skills/preparing-releases/SKILL.md

Keep local commands, architecture and release conditions in this repository's
CONTRIBUTING.md, RELEASING.md and executable configuration. Preserve stronger
local gates. Follow existing user authorization for Git and external writes.

Generated exports references, AI metadata and indexes come from
scripts/generate-docs.mjs. Edit their source manifests, guides and consumer skill,
then regenerate. The GitHub README is plain Markdown; portal landing pages carry
frontmatter. docs.manifest.json selects approved Public documents only.
Use .verification/tmp for normal fixtures and .verification/logs for receipts.
Packed consumers use system temp to avoid ancestor node_modules resolution and
must clean up in finally. Keep verification evidence ignored and out of manifests.

### Project README verification

- README target list: `readme-policy.json`
- README validation: `bun run docs:readmes`
- Portal README metadata is generated from its owning source; update and verify it through the project documentation commands.

- Generated README/documentation freshness: `bun run docs:generated` (temporary regeneration; does not repair normal output).

- Generated output configuration: `generated-policy.json`.
