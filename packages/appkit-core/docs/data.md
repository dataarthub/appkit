---
title: "Align schemas and record operations"
description: "Generic schema validation and CRUD contracts"
sidebar:
  order: 3
archetype: how-to
project: appkit
tags: ["appkit", "data"]
---

# Align schemas and record operations

## Prerequisites

Install the package; feature subpaths are import targets.

```bash
bun add @alneas/appkit-core
```

## Public import

`@alneas/appkit-core/data`

## Step-by-Step Implementation

```typescript
import type {DataAccessAdapter} from '@alneas/appkit-core/data';
export function records(adapter: DataAccessAdapter) {
  return adapter.find('records', {});
}
```

## Verification

Type-check this example in your application. See [the export reference](exports.md) for narrower entry points and exact optional peers. Package import/type checks do not certify hosted providers.

## Troubleshooting / Common Pitfalls

Generic schema validation and CRUD contracts. The application owns authorization, migrations, transactions, final writes and durable idempotency. Use explicit feature subpaths for optional database SDK adapters.

## Provider-specific imports

| Feature import | Additional peer |
| --- | --- |
| `@alneas/appkit-core/data/supabase` | `@supabase/supabase-js` |
| `@alneas/appkit-core/data/neon` | `@neondatabase/serverless` |
| `@alneas/appkit-core/data/excel/excelize` | `excelize-wasm`; configure its WASM runtime explicitly |
| `@alneas/appkit-core/data/schema/introspection` | `pg` |

Install the additional peer separately from the Appkit package. These adapters do not supply credentials, migrations or backend authorization. Local provider scenarios were exercised in the earlier package layout; the consolidated distribution has separate import/type/consumer checks. Hosted-provider compatibility requires provider-specific evidence.
