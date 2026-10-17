---
title: "Calculate dependency plans"
description: "Framework-free dependency graphs, critical paths and planning helpers"
archetype: how-to
project: tools
---

# Calculate dependency plans

## Prerequisites

Install the package; feature subpaths are import targets.

```bash
bun add @alneas/appkit-core
```

## Public import

`@alneas/appkit-core/graph`

## Step-by-Step Implementation

```typescript
import * as graph from '@alneas/appkit-core/graph';
console.log(Object.keys(graph).length > 0);
```

## Verification

Type-check this example in your application. See [the export reference](exports.md) for narrower entry points and exact optional peers. Package import/type checks do not certify hosted providers.

## Troubleshooting / Common Pitfalls

Framework-free dependency graphs, critical paths and planning helpers. Calculations do not persist schedules or authorize changes. Supply application-specific calendars and resource policies.
