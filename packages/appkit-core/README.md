# Appkit Core

Framework-free schemas, record contracts, storage and reviewed AI proposals for business applications.

## Why

Feature subpaths keep provider decisions visible while installation uses just two npm packages. Align schemas with validation and record operations; retain application control over data writes.

## Highlights

- `@alneas/appkit-core/storage`: [Store files behind explicit adapters](docs/storage.md).
- `@alneas/appkit-core/data`: [Align schemas and record operations](docs/data.md).
- `@alneas/appkit-core/japan`: [Apply Japanese regional defaults](docs/japan.md).
- `@alneas/appkit-core/graph`: [Calculate dependency plans](docs/graph.md).
- `@alneas/appkit-core/ai`: [Validate AI proposals before applying changes](docs/ai.md).
- `@alneas/appkit-core/us`: [Format US business data](docs/us.md).

## Quickstart

```bash
bun add @alneas/appkit-core
```

```typescript
import {sha256Hex} from '@alneas/appkit-core/storage';
console.log(sha256Hex('hello'));
```

## Next steps

[Public exports and optional peers](docs/exports.md) · [Contributing](../../CONTRIBUTING.md) · [Releasing](../../RELEASING.md)
