---
title: "Validate AI proposals before applying changes"
description: "Structured-output validation and proposal review contracts"
archetype: how-to
project: tools
---

# Validate AI proposals before applying changes

## Prerequisites

Install the package; feature subpaths are import targets.

```bash
bun add @alneas/appkit-core
```

## Public import

`@alneas/appkit-core/ai`

## Step-by-Step Implementation

```typescript
import {createAjvValidator} from '@alneas/appkit-core/ai';
const validator = createAjvValidator({locale:'en'});
console.log(typeof validator);
```

## Verification

Type-check this example in your application. See [the export reference](exports.md) for narrower entry points and exact optional peers. Package import/type checks do not certify hosted providers.

## Troubleshooting / Common Pitfalls

Structured-output validation and proposal review contracts. Metadata checks do not prove that an AI coding agent can choose correct APIs from arbitrary requests. End-to-end coding-agent task evaluation remains unverified. Applications authorize and execute final writes.
