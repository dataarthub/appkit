# TypeScript 6/7 coexistence

Keep generation, declaration emit and Compiler API analysis on TypeScript 6.0.3.
Add stable TypeScript 7.0.2 for no-emit checks using Microsoft's official aliases.
Only switch normal checks after both compilers pass, including independent installs.
No public API, runtime engine, source behavior or production dependency changes.

1. Snapshot current dist and inputs. Add routing/fixture regression tests first.
2. Install `typescript: npm:@typescript/typescript6@6.0.2` (delegates to 6.0.3)
   and `@typescript/native: npm:typescript@7.0.2` in all development manifests.
   Temporarily retain normal checks on tsc6; add explicit 6/7 comparison commands.
   Fix legacy direct compiler paths to the compatibility wrapper's lib/tsc.js.
3. Check both compilers for Core, React, Storybook, and ref contract fixtures.
   Build with the legacy API; compare public declarations and emitted JavaScript.
   Extend isolated packed and current/candidate Core consumers to both compilers.
4. After passing comparisons, switch normal no-emit checks to tsc (7).
   Keep an explicit TypeScript 6 compatibility command; document routing.
5. Verify unit, tooling, documentation, strict consumer declarations and SSR,
   including the existing Node 24.0.0 runtime lane. Request a fresh final review.

Use the existing worktree and preserve earlier changes. No commit or external write.
Evaluation analysis and trusted grading use the legacy Compiler API and stay on 6.
Browser evidence is reusable if the emitted runtime payload remains unchanged.

## Execution record

- Routing tests first failed on the missing native checker and original manifest.
  After alias installation, all routing/fixture tests passed. Native `bin/tsc`
  is not an exported module subpath; check its installed `.bin/tsc` entry instead.
- Both compilers passed Core, React, Storybook and all three ref contract fixtures.
- Legacy declaration generation completed; 1,724 declarations have identical ASTs
  and 1,735 JavaScript/CSS runtime payloads are byte-identical to the baseline.
- Unit suite: 367 Bun + 46 Core Vitest + 126 React tests passed. Agent tooling:
  52 passed, one existing opt-in Docker test skipped. Documentation/lint passed.
- Independent current/candidate Core matrix passed both compilers, all 126 React
  tests per lane, strict ESM/CJS declarations and SSR. Normal checks switched to 7
  only after these comparisons passed.
- The evaluation verifier keeps its pinned 6.0.3 API compiler and grading/emit.
  Browser evidence is reused because runtime payloads are identical.
- No commits: explicit repository/user authorization is required for Git writes.
