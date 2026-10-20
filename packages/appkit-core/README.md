# Appkit Core

Framework-independent TypeScript building blocks for business applications.

[npm](https://www.npmjs.com/package/@alneas/appkit-core) · [Documentation](https://tech-docs.alneas.com/appkit/appkit-core/) · [GitHub](https://github.com/dataarthub/appkit)

## Elevator Pitch

Validate business records with JSON Schema, connect record and file operations to explicit adapters, and review AI-proposed changes before applying them. Core provides the contracts and helpers; your application controls persistence and permissions.

## Why & Value

Use Core when a backend, script or frontend needs shared validation and record contracts without a React dependency. Feature subpaths let you select storage, schema, graph or AI APIs and make provider-specific SDK requirements explicit.

| Your application needs | Choose |
| --- | --- |
| Validation, storage, record adapters, dependency planning or regional helpers | Core alone |
| React components, schema forms, record tables or chat UI | [Appkit React](https://www.npmjs.com/package/@alneas/appkit-react), which depends on Core |

Core is a library, not a hosted backend. Authentication, authorization, migrations, transactions and final writes belong to your application.

## Key Highlights

- **Schemas and records:** JSON Schema validation, schema conversion and data-access contracts. [Data guide](docs/data.md)
- **File storage:** hashing, signing, ZIP helpers and explicit object-storage adapters. [Storage guide](docs/storage.md)
- **Business calculations:** dependency graphs and planning, plus Japanese and US regional helpers. [Graph](docs/graph.md) · [Japan](docs/japan.md) · [US](docs/us.md)
- **AI proposal review:** structured-input validation, action contracts and proposal review before application-owned execution. [AI guide](docs/ai.md)

## Quickstart

### Requirements and installation

Node.js **24 or later** is the supported Node runtime. Core does not require React. The package provides ESM, CommonJS and TypeScript declarations; runtime requirements also depend on the selected feature. For example, JSON Schema validation compiles functions at runtime and requires a host that permits this.

```bash
npm install @alneas/appkit-core
# Or: bun add @alneas/appkit-core
```

Install the package name; use feature subpaths in imports. The validation example below needs no optional provider SDK. Database and AI SDK integrations can require additional peers; see [public imports and peer requirements](docs/exports.md).

### Validate a request before saving

```typescript
import { createAjvValidator } from '@alneas/appkit-core/data/schema';

const schema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 2 },
    reason: { type: 'string' },
  },
  required: ['name'],
  additionalProperties: false,
};

const validate = createAjvValidator({ locale: 'en' });
const input: unknown = { name: 'A' };
const result = validate(schema, input);

console.log(result.valid); // false: the name is too short
console.log(result.errors); // field paths and validation messages
console.log(validate(schema, { name: 'Ada', reason: 'Equipment request' }).valid);
// true
```

With these default validator options, input is not coerced, defaults are not inserted and extra keys are not removed. Invalid input returns errors; invalid schemas or validator configuration can throw. A successful result validates the data but does not narrow its TypeScript type or authorize a write. After validation, pass accepted records to your application's persistence layer. See the [data guide](docs/data.md) for the `DataAccessAdapter` contract and provider-specific entry points.

## Next Steps

- [Change history](https://github.com/dataarthub/appkit/blob/main/packages/appkit-core/CHANGELOG.md): additions, fixes and upgrade notes by version.

- [Data and schema guide](docs/data.md): record contracts and database adapters.
- [Public exports and optional peers](docs/exports.md): exact import paths and SDK requirements.
- [AI security and approval boundaries](docs/ai.md): validation, permissions and tool execution.
- [AI error codes and recovery](docs/ai-errors.md): inspect failures before retrying.

### For coding agents

Start with the [agent instructions](https://github.com/dataarthub/appkit/blob/main/packages/appkit-core/consumer-ai/SKILL.md), then use the [API catalog](https://github.com/dataarthub/appkit/blob/main/packages/appkit-core/consumer-ai/api-index.json) and [full documentation](https://github.com/dataarthub/appkit/blob/main/packages/appkit-core/llms-full.txt). Installed packages include these files under `consumer-ai/` and `llms-full.txt`; their locations are also listed in the `appkit.agent` manifest field.

### Contributing and license

[Contributing](https://github.com/dataarthub/appkit/blob/main/CONTRIBUTING.md) · [Releasing](https://github.com/dataarthub/appkit/blob/main/RELEASING.md) · [MIT license](https://github.com/dataarthub/appkit/blob/main/packages/appkit-core/LICENSE)
