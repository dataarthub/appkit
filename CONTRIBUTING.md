# Contributing

Install Node 24+ and Bun 1.4.0, then run `bun install --frozen-lockfile --ignore-scripts`. For one package use `bun run turbo run build typecheck --filter=@alneas/appkit-core` (or appkit-react). Do not rerun unrelated integration tests for unchanged implementations.

1. Change the owning source and API JSDoc.
2. Update its English feature guide, including the exact public import subpath. Install commands use package names, not subpaths.
3. Run affected tests and packaging/type checks. Record commands and identify reused evidence in the PR.
4. Open a PR explaining the problem and resulting behavior. Keep both packages at 0.1.0 until the initial publication; review later version changes together with internal pins.

`bun run check:release` checks public entry loading, root APIs and packaged files. `bun run check:docs` checks selected sources, subpaths and relative links. Builds generate the export reference and AI indexes; do not hand-edit generated files.

Routine CI uses Turbo caching for builds, types and unit tests. Browser/database checks are selected when their integration boundaries change or a finalized release needs fresh evidence. Cache hits are prior passing results for matching source, helpers, dependencies and Node/Bun/platform runtime.

Keep temporary fixtures in .verification/tmp and logs in .verification/logs. Packed consumers use a disposable system-temp directory so undeclared imports cannot resolve through checkout node_modules. Both are excluded from Git and public manifests. Public and private remain independent repositories with separate lockfiles; private uses exact published public versions. Only explicitly selected disposable consumer fixtures replace registry versions with reviewed tarballs.

The portal owns translation, ingestion and deployment. Follow https://docs-d1x.pages.dev/policies/documentation-policy.md and https://docs-d1x.pages.dev/skills/document-authoring/SKILL.md. The root GitHub README is plain Markdown; portal landing pages carry their own frontmatter.
