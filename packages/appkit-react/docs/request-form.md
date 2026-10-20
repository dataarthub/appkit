---
title: "Save a schema-driven request form"
description: "Wire a schema to an application-owned adapter with retained input on failure."
sidebar:
  order: 3
archetype: how-to
project: appkit
tags: ["appkit", "request-form"]
---

# Save a schema-driven request form

## Prerequisites

Install both Appkit packages and React/React DOM 19. Supply a DataAccessAdapter for your authenticated backend.

## Public import

- Form: `@alneas/appkit-react/tools/form`
- Providers: `@alneas/appkit-react/tools/data-access/react`
- Contract: `@alneas/appkit-core/data`
- CSS: `@alneas/appkit-react/styles`

## Step-by-Step Implementation

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

## Verification

Invalid names must not save; rejected saves must retain input for retry. Confirm onSuccess receives the server-confirmed result. The earlier separate-package recipe was exercised in Chromium; the consolidated packaging is checked separately. A fake adapter does not certify database persistence.

## Troubleshooting / Common Pitfalls

Keep QueryClientProvider and DataAccessProvider, including when using onSave. Authorization, migrations, version checks and durable idempotency belong on the server. Check backend semantics before retrying an operation that may already have committed.
