---
title: "Appkit"
description: "Schema-driven TypeScript and React forms, validation and record operations."
sidebar:
  order: 1
archetype: explanation
project: appkit
tags: ["appkit", "overview"]
---

# Appkit

[Core on npm](https://www.npmjs.com/package/@alneas/appkit-core) · [React on npm](https://www.npmjs.com/package/@alneas/appkit-react) · [Documentation](https://tech-docs.alneas.com/appkit/)

## Elevator Pitch

TypeScript and React libraries for aligning business forms, validation and record operations around a schema.

## Why & Value

Define request fields once, validate input before saving, and connect the result to an application-owned data adapter. Explicit database and storage boundaries keep provider decisions visible. AI contracts let the application review proposals before applying changes.

| Start with | When you need |
| --- | --- |
| [Appkit Core](../packages/appkit-core/docs/index.md) | Framework-independent validation, storage, record adapters, graphs or regional helpers |
| [Appkit React](../packages/appkit-react/docs/index.md) | React UI, schema forms, record tables or AI review interfaces; depends on Core |

Core can be used without React. Neither package supplies a hosted backend; your application owns authentication, authorization and durable writes.

## Key Highlights

- Schema forms and record tables with explicit persistence boundaries.
- Framework-free storage, data, graph, AI and regional helpers.
- Two npm packages with feature subpaths; React stays in the React package.

## Quickstart

For the form example, use Node.js 24+ and an existing React application with React and React DOM matching `^19.2.3`. Core-only applications can start with the [Core validation example](../packages/appkit-core/README.md#quickstart).

```bash
npm install @alneas/appkit-core @alneas/appkit-react react@^19.2.3 react-dom@^19.2.3 @tanstack/react-query@5.104.4
# Or use bun add with the same package names and versions.
```

The example imports TanStack Query directly, so it is included explicitly above. Supply a `DataAccessAdapter` for your authenticated backend and pass it to `RequestForm`. Keep both data providers and import Appkit CSS once at your application's stylesheet entry point:

```tsx
import { useState, type ComponentProps } from 'react';
import type { DataAccessAdapter } from '@alneas/appkit-core/data';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient, DataAccessProvider } from '@alneas/appkit-react/tools/data-access/react';
import { FormView } from '@alneas/appkit-react/tools/form';
import '@alneas/appkit-react/styles';

const schema: ComponentProps<typeof FormView>['schema'] = {
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Name', minLength: 2 },
    reason: { type: 'string', title: 'Reason', 'x-ui': { widget: 'textarea' } },
  },
  required: ['name'],
};
export function RequestForm({ adapter }: { adapter: DataAccessAdapter }) {
  const [client] = useState(createQueryClient);
  const [saved, setSaved] = useState('');
  return <QueryClientProvider client={client}><DataAccessProvider adapter={adapter}>
    <FormView testId="persistence" collection="records" mode="create" schema={schema}
      validation={{ emptyStrings: 'preserve', locale: 'en', cast: { numericMode: 'strict' } }}
      onSuccess={record => setSaved(JSON.stringify(record))} />
    <output aria-label="Persisted">{saved}</output>
  </DataAccessProvider></QueryClientProvider>;
}
```

The adapter controls persistence. Your application owns authorization, migrations, concurrency checks and final writes.

The form renders Name and Reason fields, rejects names shorter than two characters and displays the adapter's save result. See the [complete form recipe](../packages/appkit-react/docs/request-form.md) for failure and retry checks. See each package's export reference for optional feature peers; installing a package does not require configuring every provider.

## Next Steps

| Package | Feature imports | Documentation |
| --- | --- | --- |
| `@alneas/appkit-core` | `/storage`, `/data`, `/japan`, `/graph`, `/ai`, `/us` | [Core guide](../packages/appkit-core/docs/index.md) |
| `@alneas/appkit-react` | `/ui`, `/tools`, `/ai`, `/styles` | [React guide](../packages/appkit-react/docs/index.md) |

[Migration from app-core/react-tools](../packages/appkit-react/docs/migration.md) · [Complete form recipe](../packages/appkit-react/docs/request-form.md) · [Contributing](contributing.md) · [Releasing](releasing.md)

AI checks cover API metadata and developer-authored integrations. End-to-end coding-agent task evaluation remains unverified. See the [cross-package agent index](https://github.com/dataarthub/appkit/blob/main/llms.txt). Optional peers and public imports are listed in each package export reference.

Canonical documentation is English. The documentation portal owns ingestion, Japanese translation and delivery.
