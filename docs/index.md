---
title: "Appkit"
description: "Schema-driven TypeScript and React forms, validation and record operations."
archetype: explanation
project: tools
---

# Appkit

TypeScript and React libraries for aligning business forms, validation and record operations around a schema.

Define request fields once, validate input before saving, and connect the result to an application-owned data adapter. Explicit database and storage boundaries keep provider decisions visible. AI contracts let the application review proposals before applying changes.

- Schema forms and record tables with explicit persistence boundaries.
- Framework-free storage, data, graph, AI and regional helpers.
- Two npm packages with feature subpaths; React stays in the React package.

## Quickstart

Use an existing React 19 application:

```bash
bun add @alneas/appkit-core @alneas/appkit-react react@^19.2.3 react-dom@^19.2.3
```

Supply an adapter for your authenticated backend:

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

## Packages and next steps

| Package | Feature imports | Documentation |
| --- | --- | --- |
| `@alneas/appkit-core` | `/storage`, `/data`, `/japan`, `/graph`, `/ai`, `/us` | [Core guide](../packages/appkit-core/README.md) |
| `@alneas/appkit-react` | `/ui`, `/tools`, `/ai`, `/styles` | [React guide](../packages/appkit-react/README.md) |

[Complete form recipe](../packages/appkit-react/docs/request-form.md) · [Contributing](../CONTRIBUTING.md) · [Releasing](../RELEASING.md)

AI checks cover API metadata and developer-authored integrations. End-to-end coding-agent task evaluation remains unverified. Optional peers and public imports are listed in each package export reference.

Canonical documentation is English. The documentation portal owns ingestion, Japanese translation and delivery.
