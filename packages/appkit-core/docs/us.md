---
title: "Format US business data"
description: "USD formatting, federal holiday policy and English document presets"
sidebar:
  order: 7
archetype: how-to
project: appkit
tags: ["appkit", "us"]
---

# Format US business data

## Prerequisites

Install the package; feature subpaths are import targets.

```bash
bun add @alneas/appkit-core
```

## Public import

`@alneas/appkit-core/us`

## Step-by-Step Implementation

```typescript
import {formatUSD} from '@alneas/appkit-core/us';
console.log(formatUSD(1234.5));
```

## Verification

Type-check this example in your application. See [the export reference](exports.md) for narrower entry points and exact optional peers. Package import/type checks do not certify hosted providers.

## Troubleshooting / Common Pitfalls

USD formatting, federal holiday policy and English document presets. Select time zones and observed-holiday policy explicitly; formatting is not a tax determination.
