# Imported browser verification guard

The generic guard and its regression tests are imported from the **github-docs**
testing templates. github-docs owns their shared behavior and maintenance. Appkit
owns only the Storybook invocation, file batches, worker count and budgets in
`scripts/test-storybook.mjs`.

- Canonical repository: https://github.com/dataarthub/docs
- Imported source revision: `eed88f1b11ae5526483affb9daa0256d10166109`
- Canonical directory: `public/templates/testing/`

| Appkit file | Canonical template |
| --- | --- |
| `scripts/lib/guarded-process.mjs` | `public/templates/testing/guarded-process.mjs` |
| `scripts/lib/browser-containment.cjs` | `public/templates/testing/browser-containment.cjs` |
| `scripts/guarded-process.test.mjs` | `public/templates/testing/guarded-process.test.mjs` |

The two implementation files are byte-identical to that source snapshot. The
regression test changes only its guard import from `./guarded-process.mjs` to
`./lib/guarded-process.mjs`, matching this repository's script layout. Keep the
containment preload beside the guard; they form one template revision.

## Updating the imported templates

1. Change shared behavior in github-docs first, then run its template regression
   tests and `bun run standards:check`. Commit the canonical source changes.
2. Copy all three files from the selected source revision. Preserve the two
   implementation files unchanged and adapt only the regression test import.
   Compare the copies with the selected source files before committing.
3. Update the imported source revision above. Run
   `node --test scripts/guarded-process.test.mjs` and `bun run check:storybook`.
   Run the browser matrix when guard or runner behavior changes; reuse matching
   verification evidence when only provenance documentation changes.

Do not maintain an independent generic guard here or replace a pinned import
with whatever happens to be latest. Project-specific limits and batch selection
belong in the Appkit runner, not in the imported implementation.
