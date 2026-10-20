---
title: "Store files behind explicit adapters"
description: "Web-standard signing, hashing, ZIP and object-storage adapters"
sidebar:
  order: 6
archetype: how-to
project: appkit
tags: ["appkit", "storage"]
---

# Store files behind explicit adapters

## Prerequisites

Install the package; feature subpaths are import targets.

```bash
bun add @alneas/appkit-core
```

## Public import

`@alneas/appkit-core/storage`

`@alneas/appkit-core/storage/portable` is a compatibility alias for this same entry. Prefer `@alneas/appkit-core/storage` for new imports. The alias remains available for existing consumers; server-specific helpers use `@alneas/appkit-core/storage/server`.

## Step-by-Step Implementation

```typescript
import {sha256Hex} from '@alneas/appkit-core/storage';
console.log(sha256Hex('hello'));
```

## Verification

Type-check this example in your application. See [the export reference](exports.md) for narrower entry points and exact optional peers. Package import/type checks do not certify hosted providers.

## Troubleshooting / Common Pitfalls

Web-standard signing, hashing, ZIP and object-storage adapters. Applications configure endpoints and credential flows. The storage implementation uses no native crypto dependency; the complete npm package has other dependencies.
