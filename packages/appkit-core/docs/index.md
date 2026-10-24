---
title: "Appkit Core"
description: "Unified business logic backbone: schema validation, persistence adapters, dependency graphs, and Japanese/regional commercial presets"
sidebar:
  order: 1
archetype: explanation
project: appkit
tags: ["appkit", "overview"]
---

# Appkit Core

Framework-independent TypeScript building blocks for business applications:
JSON Schema validation, record and storage adapters, graph calculations and AI
proposal contracts. Your application owns persistence and authorization.

## Usage

Requires Node.js 24 or later. Core does not require React.

```typescript
import { createAjvValidator } from '@alneas/appkit-core/data/schema';

const validate = createAjvValidator({ locale: 'en' });
const schema = { type: 'string', minLength: 2 };
console.log(validate(schema, 'Ada').valid); // true
```

## Documentation

[Guides and API](https://tech-docs.alneas.com/appkit/appkit-core/) ·
[Public imports and optional peers](exports.md) ·
[Change history](https://github.com/dataarthub/appkit/blob/main/packages/appkit-core/CHANGELOG.md) ·
[GitHub Issues](https://github.com/dataarthub/appkit/issues)
