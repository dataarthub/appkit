# Appkit Core

## Elevator Pitch

Framework-free schemas, record contracts, storage and reviewed AI proposals for business applications.

## Why & Value

Feature subpaths keep provider decisions visible while installation uses just two npm packages. Align schemas with validation and record operations; retain application control over data writes.

## Key Highlights

- Storage and record contracts: [storage](docs/storage.md), [data](docs/data.md).
- Regional formats: [Japan](docs/japan.md), [US](docs/us.md).
- Reviewed proposals and planning: [AI](docs/ai.md), [graph](docs/graph.md).

## Quickstart

```bash
bun add @alneas/appkit-core
```

```typescript
import {sha256Hex} from '@alneas/appkit-core/storage';
console.log(sha256Hex('hello'));
```

## Next Steps

[Public exports and optional peers](docs/exports.md) · [Contributing](https://github.com/dataarthub/appkit/blob/main/CONTRIBUTING.md) · [Releasing](https://github.com/dataarthub/appkit/blob/main/RELEASING.md)

Agent discovery: [instructions](https://github.com/dataarthub/appkit/blob/main/packages/appkit-core/consumer-ai/SKILL.md), [API catalog](https://github.com/dataarthub/appkit/blob/main/packages/appkit-core/consumer-ai/api-index.json), and [full documentation](https://github.com/dataarthub/appkit/blob/main/packages/appkit-core/llms-full.txt). The `appkit.agent` manifest field lists these Appkit-specific paths. Existing `ai-instructions` and `package-context.json` exports remain available.
