---
title: "Build schema forms and record tables"
description: "Schema-driven forms, tables, filters and CRUD views"
sidebar:
  order: 4
archetype: how-to
project: appkit
tags: ["appkit", "tools"]
---

# Build schema forms and record tables

## Prerequisites

Install the package; feature subpaths are import targets.

```bash
bun add @alneas/appkit-react
```

Use React and React DOM 19 matching the package peer ranges.

## Public import

`@alneas/appkit-react/tools`

## Step-by-Step Implementation

```tsx
import {FormView, DataTable} from '@alneas/appkit-react/tools';
import '@alneas/appkit-react/styles';
export const components = {FormView, DataTable};
```

For a headless filter, import `useFilter` from
`@alneas/appkit-react/tools/filter`. It needs no provider or stylesheet:

```tsx
import {useFilter} from '@alneas/appkit-react/tools/filter';

export function StatusFilter({onChange}: {onChange: (filter: Record<string, unknown>) => void}) {
  const {values, setField} = useFilter({
    fields: [{field: 'status', operator: 'eq'}],
    onChange,
  });
  return <input value={String(values.status ?? '')}
    onChange={event => setField('status', event.target.value)} />;
}
```

Changed queries call the latest committed `onChange`. Replacing only the callback
does not replay the existing filter, and equal query contents do not notify again.

## Verification

Type-check this example in your application. See [the export reference](exports.md) for narrower entry points and exact optional peers. Package import/type checks do not certify hosted providers.

## Troubleshooting / Common Pitfalls

Schema-driven forms, tables, filters and CRUD views. FormView requires collection, schema and mode, plus QueryClientProvider and DataAccessProvider, including when using onSave. Use the complete request-form recipe.

See [save a schema-driven request form](request-form.md) for the complete providers and persistence boundary.
