---
title: "Migrate from app-core and react-tools"
description: "Choose between the restricted package rename and the public Appkit 0.1.0 subset, then update dependencies, imports, providers and behavior checks."
sidebar:
  order: 20
archetype: how-to
project: appkit
tags: ["migration", "core", "react"]
---

# Migrate from app-core and react-tools

## Prerequisites

This guide starts with applications using `@dataarthub/app-core` and
`@dataarthub/react-tools`. The public destination is `@alneas/appkit-core@0.1.0`
and `@alneas/appkit-react@0.1.0`. A public version number is independent of the
legacy private package versions; `0.1.0` is not an in-place downgrade.

Use Node.js 24.0.0 or later. Public React requires React and React DOM matching
`^19.2.3`. Keep the application's existing lockfile and a working revision before
changing dependencies. Inventory feature imports and runtime behavior first.

## Public import

Install the two package names. Import framework-free APIs from
`@alneas/appkit-core/data`, `/storage`, `/japan`, `/graph` or `/ai`, and React
features from `@alneas/appkit-react/ui`, `/tools` or `/ai`. Full import targets
appear in the tables below and the [Core export reference](../../appkit-core/docs/exports.md)
and [React export reference](exports.md).

## Step-by-Step Implementation

### 1. Choose the migration route

| Route | Destination | What to change |
| --- | --- | --- |
| Keep the restricted product and its extensions | `@dataarthub/appkit-core` and `@dataarthub/appkit-react` on GitHub Packages | Rename the package prefix; check each used subpath and named export against that private release. |
| Adopt the independently usable public subset | `@alneas/appkit-core` and `@alneas/appkit-react` on npm | Move each API to its feature subpath, review behavior differences and replace any feature outside the public exports. |

These are different distributions. Replacing `@dataarthub` with `@alneas` does
not preserve the full legacy product. If an API is absent from the public export
references, retain its restricted implementation or choose an application-owned
replacement before removing the old dependency.

For the restricted rename, the intended prefix changes are:

| Old | New restricted package |
| --- | --- |
| `@dataarthub/app-core` | `@dataarthub/appkit-core` |
| `@dataarthub/react-tools` | `@dataarthub/appkit-react` |

For example, `/schema/core` remains a Core subpath and `/form` remains a React
subpath on that route. Select versions actually available to your GitHub Packages
account; a version in a source manifest does not establish that it is published.
The public install commands and compatibility claims below apply to the public
route only. This guide does not certify a private release or its consumers.

### 2. Install the public packages and keep registry scopes separate

For a React application using the form recipe:

```bash
bun add --exact @alneas/appkit-core@0.1.0 @alneas/appkit-react@0.1.0 react@19.2.3 react-dom@19.2.3 @tanstack/react-query@5.104.4
```

A server-only application needs only `@alneas/appkit-core@0.1.0` plus its selected
adapter's dependencies. Install feature-specific peers from the export references;
root installation does not configure a database, storage endpoint or AI provider.

If both distributions remain in the application, retain scoped registry routing:

```ini
@alneas:registry=https://registry.npmjs.org
@dataarthub:registry=https://npm.pkg.github.com
```

Keep GitHub Packages authentication in the application's existing secret-managed
configuration. An entirely public consumer does not need GitHub Packages credentials.
Do not change the default registry to GitHub Packages for the public packages.
Do not replace registry dependencies with sibling source aliases or tarball overrides.

### 3. Move React imports to feature subpaths

The following are destination entry points to inspect, not a claim that every
symbol in an old barrel is available at the new entry.

| Legacy import | Public destination |
| --- | --- |
| `@dataarthub/react-tools/ui` | `@alneas/appkit-react/ui` |
| `@dataarthub/react-tools/core` | `@alneas/appkit-react/tools/core` |
| `@dataarthub/react-tools/form` | `@alneas/appkit-react/tools/form` |
| `@dataarthub/react-tools/data-table` | `@alneas/appkit-react/tools/data-table` |
| `@dataarthub/react-tools/data-access/react` | `@alneas/appkit-react/tools/data-access/react` |
| `@dataarthub/react-tools/filter` | `@alneas/appkit-react/tools/filter` |
| `@dataarthub/react-tools/pane` | `@alneas/appkit-react/tools/pane` |
| `@dataarthub/react-tools/workflow` | `@alneas/appkit-react/tools/workflow` |
| `@dataarthub/react-tools/calendar` | `@alneas/appkit-react/tools/calendar` |
| `@dataarthub/react-tools/kanban` | `@alneas/appkit-react/tools/kanban` |
| `@dataarthub/react-tools/gantt` | `@alneas/appkit-react/tools/gantt` |
| `@dataarthub/react-tools/chart` | `@alneas/appkit-react/tools/chart` |
| `@dataarthub/react-tools/barcode` | `@alneas/appkit-react/tools/barcode` |
| `@dataarthub/react-tools/file-browser` | `@alneas/appkit-react/tools/file-browser` |
| `@dataarthub/react-tools/error` | `@alneas/appkit-react/tools/error` |
| `@dataarthub/react-tools/i18n` | `@alneas/appkit-react/tools/i18n` |
| `@dataarthub/react-tools/proposal` | `@alneas/appkit-react/ai/proposal` |
| `@dataarthub/react-tools/action` | `@alneas/appkit-react/ai/action` |
| `@dataarthub/react-tools/generative-ui` | `@alneas/appkit-react/ai/generative-ui` |
| `@dataarthub/react-tools/styles` | `@alneas/appkit-react/styles` |

Apply the same `/tools/` destination pattern for the public `sidebar`, `header`,
`splash`, `priority-queue` and `editable-table` entries. Private authentication
composition is not replaced by the public `/tools/auth` helper entry.

Before:

```diff
-import { FormView } from '@dataarthub/react-tools/form';
-import '@dataarthub/react-tools/styles';
+import { FormView } from '@alneas/appkit-react/tools/form';
+import '@alneas/appkit-react/styles';
```

Import the public stylesheet once at the application boundary. There is no public
`/dist/react-tools.css`, `/theme.css`, `/base.css` or `/globals.css` compatibility
export. Review your own CSS overrides against the resulting UI; an import change
does not prove visual equivalence.

### 4. Separate framework-free Core imports from React bindings

| Legacy Core import | Public destination / decision |
| --- | --- |
| `@dataarthub/app-core/schema` | `@alneas/appkit-core/data/schema` |
| `@dataarthub/app-core/schema/core` | `@alneas/appkit-core/data/schema/core` |
| `@dataarthub/app-core/schema/compiler` | `@alneas/appkit-core/data/schema/compiler` |
| `@dataarthub/app-core/schema/server` | `@alneas/appkit-core/data/schema/server` (server only) |
| `@dataarthub/app-core/data-access` | `@alneas/appkit-core/data` (common contracts/services) |
| `@dataarthub/app-core/data-access/types` | `@alneas/appkit-core/data/types` |
| `@dataarthub/app-core/data-access/sqlite` | `@alneas/appkit-core/data/sqlite` |
| `@dataarthub/app-core/data-access/d1` | `@alneas/appkit-core/data/d1` |
| `@dataarthub/app-core/storage` | `@alneas/appkit-core/storage`; review adapter configuration |
| `@dataarthub/app-core/storage/local-adapter` | `@alneas/appkit-core/storage/server`; review constructor options |
| `@dataarthub/app-core/storage/types` | Type imports from `@alneas/appkit-core/storage` |
| `@dataarthub/app-core/proposal` | `@alneas/appkit-core/ai/proposal` |
| `@dataarthub/app-core/action` | `@alneas/appkit-core/ai/action` |
| `@dataarthub/app-core/generative-ui` | `@alneas/appkit-core/ai/generative-ui` |
| `@dataarthub/app-core/ai` | `@alneas/appkit-core/ai/ai-chat` for conversation/chat APIs; check each symbol |
| `@dataarthub/app-core/agent-output` | `@alneas/appkit-core/ai/agent-output` |
| `@dataarthub/app-core/encoding` | `@alneas/appkit-core/data/encoding` |
| `@dataarthub/app-core/content` | `@alneas/appkit-core/data/content`; Git Markdown uses `@alneas/appkit-core/data/content/git-markdown` |
| `@dataarthub/app-core/editor` | `@alneas/appkit-core/data/editor` (JSON/upload helpers, not editor UI) |
| `@dataarthub/app-core/excel` | Generic adapters: `@alneas/appkit-core/data/excel`; Japanese templates: `@alneas/appkit-core/japan/excel` |
| `@dataarthub/app-core/csv` | Choose generic `@alneas/appkit-core/data/csv` or Japanese defaults in `@alneas/appkit-core/japan/csv` |
| `@dataarthub/app-core/finance` | Generic calculations: `@alneas/appkit-core/data/finance`; Japanese invoice rules: `@alneas/appkit-core/japan/finance` |
| `@dataarthub/app-core/edi` | Generic contracts: `@alneas/appkit-core/data/edi`; Japanese document conversion: `@alneas/appkit-core/japan/edi` |
| `@dataarthub/app-core/pdf` | Generic data: `@alneas/appkit-core/data/pdf`; Japanese presets: `@alneas/appkit-core/japan/pdf`; neither replaces React PDF rendering |
| `@dataarthub/app-core/legal-document` | `@alneas/appkit-core/japan/legal-document` |
| `@dataarthub/app-core/notifications` | Choose `@alneas/appkit-core/data/notifications` or `@alneas/appkit-core/japan/notifications` |
| `@dataarthub/app-core/google-calendar` | `@alneas/appkit-core/data/google-calendar` |

Framework-free imports formerly reached through `@dataarthub/react-tools` should
also move to Core, not to an assumed matching React export. Provider-specific
record adapters have explicit entries such as `@alneas/appkit-core/data/supabase`
and `@alneas/appkit-core/data/neon`; install their peers separately. Keep backend
SDKs, filesystem access and credentials out of browser entry modules.

The public Core root exports namespaces (`data`, `storage`, `japan`, `graph`, `ai`,
`us`). It does not reproduce the old flat Core barrel. Prefer named feature imports:

```typescript
import { createAjvValidator } from '@alneas/appkit-core/data/schema/core';
import { CSVGenerator } from '@alneas/appkit-core/japan/csv';
import type { DataAccessAdapter } from '@alneas/appkit-core/data/types';

export const validate = createAjvValidator({ locale: 'ja' });
export const csv = new CSVGenerator();
export function loadRecords(adapter: DataAccessAdapter) {
  return adapter.find('records', {});
}
```

### 5. Reconnect providers and review behavior

Use the [complete request-form recipe](request-form.md) for a working form with
`QueryClientProvider`, `DataAccessProvider`, a stable query client, `collection`,
`schema`, `mode` and the explicit validation policy. `onSave` does not remove these
provider requirements. A private `AppProvider` is not exported by public Appkit;
compose the needed public providers in the host application instead.

Import related hooks and providers from the same distribution, keep one compatible
React runtime and query context, and declare dependencies you import directly.
An application can pass its own compatible adapter to public UI without moving
its database or replacing its backend implementation.

Review these contracts before switching traffic:

- **Validation:** explicitly choose locale, empty-string handling, numeric casting
  and JSON Schema draft. Verify invalid input and omitted/default values, rather
  than assuming legacy localized defaults survive a generic import.
- **Regional formatting:** generic helpers and Japanese presets have different
  responsibilities. Preserve CSV date formatting, invoice rounding, tax and
  document output with representative fixtures when changing the chosen entry.
- **Storage:** check constructor options, object keys, URL generation and failure
  behavior against your configured adapter. The public storage layer uses
  Web-standard signing/runtime APIs; do not assume an old SDK client constructor
  or compliance wrapper is interchangeable.
- **Persistence:** changing imports does not move records, run migrations or change
  authorization. Keep connection configuration and existing data in place; verify
  read/create/update/delete and failure handling against your application's adapter.
- **AI:** use Core for proposal validation/contracts and React for review UI.
  Structured API checks and this migration example do not establish that an AI
  coding agent can migrate an arbitrary application correctly.

### 6. Remove legacy dependencies after the cutover

For an application that has migrated every legacy import to the public subset:

```bash
bun remove @dataarthub/react-tools @dataarthub/app-core
```

Keep restricted dependencies still used by private features. Update TypeScript,
bundler and test aliases, mocks, CSS imports and AI instruction references along
with application imports. Remove obsolete source/tarball overrides and regenerate
the application's own lockfile with its package manager.

Public AI entry points are `@alneas/appkit-core/ai-instructions` and
`@alneas/appkit-react/ai-instructions`, with machine context at each package's
`/package-context.json`. The legacy `dist/ai/setup.mjs` is not a public setup CLI.
The private `compliance/prepare.mjs` is also not shipped by the public packages.
Review the public packages' `LICENSE` files and React's `THIRD_PARTY_NOTICES.md`;
keep notices for any retained private or application dependencies in scope.

## Verification

In the consuming application:

1. Search source, tests and configuration for `@dataarthub/app-core` and
   `@dataarthub/react-tools`. Each remaining use must be intentional.
2. Run the application's TypeScript check with its normal module resolution.
   Confirm each moved symbol exists, not just the destination subpath.
3. Run the production build and open the migrated screens. Verify providers,
   styles, validation, locale and optional integration loading.
4. Exercise only the changed feature boundaries: real form persistence, adapter
   failures and relevant document/CSV output. Reuse unchanged integration evidence
   where its inputs still match; avoid production-data writes as a migration probe.
5. Review the dependency tree for legacy leftovers or duplicate React/query
   contexts, then keep the migration diff and application checks together.

Expected result: the application resolves the selected published packages without
source aliases, type-checks, and retains its tested behavior through explicit
adapters/providers. Appkit's `0.1.0` release checks covered isolated public package
consumers, declarations and the request-form recipe; they do not certify your
application, private extensions or every hosted provider. This guide's import
example is checked separately; no complete legacy application migration is claimed.

## Troubleshooting / Common Pitfalls

| Symptom | What to check |
| --- | --- |
| Package installation returns 401/404 | Public packages use npm; retained restricted packages need the correct GitHub scope and credentials. |
| `Package subpath is not defined by exports` | Use the complete new feature path; there is no blanket compatibility alias for old subpaths or `dist/*`. |
| A named export disappeared | Root barrels differ. Locate the actual symbol in the export reference; some features remain restricted. |
| Missing query/data-access context | Use the paired public providers in the complete form recipe and check for duplicate dependency instances. |
| UI renders without styling | Import `@alneas/appkit-react/styles` at the application boundary. |
| Dates, validation or documents changed | Choose explicit locale/validation settings and the appropriate generic or Japanese preset entry. |
| A browser build pulls in backend code | Move filesystem/SDK/credential imports to server modules and use explicit feature entries. |
| A legacy provider/editor/PDF component has no public equivalent | Retain the restricted distribution or replace that feature explicitly; a namespace rename is insufficient. |
