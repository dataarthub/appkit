---
title: "Apply Japanese regional defaults"
description: "Japanese calendar, formatting and business-document presets"
sidebar:
  order: 5
archetype: how-to
project: appkit
tags: ["appkit", "japan"]
---

# Apply Japanese regional defaults

## Prerequisites

Install the package; feature subpaths are import targets.

```bash
bun add @alneas/appkit-core
```

## Public import

`@alneas/appkit-core/japan`

## Step-by-Step Implementation

```typescript
import {japaneseHolidayCalendar} from '@alneas/appkit-core/japan';
console.log(japaneseHolidayCalendar({year:2026, month:1, day:1}));
```

## Verification

Type-check this example in your application. See [the export reference](exports.md) for narrower entry points and exact optional peers. Package import/type checks do not certify hosted providers.

## Troubleshooting / Common Pitfalls

Japanese calendar, formatting and business-document presets. Tests do not certify legal or tax compliance; review the applicable rules and date range.
