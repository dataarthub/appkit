# Appkit React

React 19 components, schema-driven forms and record views for business applications.

[npm](https://www.npmjs.com/package/@alneas/appkit-react) · [Documentation](https://tech-docs.alneas.com/appkit/appkit-react/) · [GitHub](https://github.com/dataarthub/appkit) · [Change history](https://github.com/dataarthub/appkit/blob/main/packages/appkit-react/CHANGELOG.md)

## Elevator Pitch

Turn a JSON Schema into a form with validation and connect saves to your own backend. Combine forms with record tables, shared UI primitives and AI proposal review interfaces.

## Why & Value

Use React when your application needs the presentation layer for Appkit's schema and record contracts. You provide the authenticated data adapter and server rules; the form uses that adapter and reports the save result to your UI.

React depends on [Appkit Core](https://www.npmjs.com/package/@alneas/appkit-core). Install Core directly as well when your own code imports its types or functions, as the example below does. For backend-only validation, storage or graph calculations, use Core alone.

## Key Highlights

- **Schema forms and record tables:** build input, filtering and CRUD views around shared record contracts. [Tools guide](docs/tools.md)
- **React UI primitives:** compose buttons, dialogs, shared providers and hooks. [UI guide](docs/ui.md)
- **AI interfaces:** connect chat and proposal review to explicit application approval and execution boundaries. [AI guide](docs/ai.md)
- **Explicit integration:** import styles and supply host providers and data adapters. [Complete form recipe](docs/request-form.md)

## Quickstart

### Requirements and installation

Use an existing React application. The package declares Node.js **24 or later** and requires React and React DOM **`^19.2.3`**. It provides ESM, CommonJS and TypeScript declarations.

```bash
npm install @alneas/appkit-react @alneas/appkit-core react@^19.2.3 react-dom@^19.2.3 @tanstack/react-query@5.104.4
# Or use bun add with the same package names and versions.
```

The example directly imports TanStack Query, so it is listed explicitly. Import Appkit CSS once at your application's stylesheet entry point. `FormView` also requires `QueryClientProvider` and `DataAccessProvider`; a standalone `Button` does not require those data providers. Install optional chart, barcode, QR or AI peers only for their corresponding features; see [the export reference](docs/exports.md).

### Render and save a request form

This component accepts your application's `DataAccessAdapter`. Implement that adapter for your backend and pass it as the `adapter` prop; no demo backend or credentials are included.

```tsx
import { useState, type ComponentProps } from 'react';
import type { DataAccessAdapter } from '@alneas/appkit-core/data';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  createQueryClient,
  DataAccessProvider,
} from '@alneas/appkit-react/tools/data-access/react';
import { FormView } from '@alneas/appkit-react/tools/form';
import '@alneas/appkit-react/styles';

const schema: ComponentProps<typeof FormView>['schema'] = {
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Name', minLength: 2 },
    reason: { type: 'string', title: 'Reason', 'x-ui': { widget: 'textarea' } },
  },
  required: ['name'],
};

export function RequestForm({ adapter }: { adapter: DataAccessAdapter }) {
  const [client] = useState(createQueryClient);
  const [saved, setSaved] = useState('');

  return (
    <QueryClientProvider client={client}>
      <DataAccessProvider adapter={adapter}>
        <FormView
          testId="persistence"
          collection="records"
          mode="create"
          schema={schema}
          validation={{
            emptyStrings: 'preserve',
            locale: 'en',
            cast: { numericMode: 'strict' },
          }}
          onSuccess={record => setSaved(JSON.stringify(record))}
        />
        <output aria-label="Persisted">{saved}</output>
      </DataAccessProvider>
    </QueryClientProvider>
  );
}
```

The form renders Name and Reason fields. A name shorter than two characters should fail validation. A successful save displays the record returned by your adapter. Your backend must enforce authorization, business rules and concurrency; browser validation is only the UI boundary. If your application already has a shared Query client, reuse its provider instead of adding another one. See the [complete recipe](docs/request-form.md) for failure and retry checks.

## Next Steps

- [Schema forms and record tables](docs/tools.md): the business UI entry points.
- [UI primitives and providers](docs/ui.md): components and shared host setup.
- [Public exports and optional peers](docs/exports.md): exact feature paths and additional dependencies.
- [AI integration and security](docs/ai.md): proposal review and execution boundaries.
- [Migration guide](docs/migration.md): moving from the earlier separate packages.

### For coding agents

Start with the [agent instructions](https://github.com/dataarthub/appkit/blob/main/packages/appkit-react/consumer-ai/SKILL.md), then use the [API catalog](https://github.com/dataarthub/appkit/blob/main/packages/appkit-react/consumer-ai/api-index.json) and [full documentation](https://github.com/dataarthub/appkit/blob/main/packages/appkit-react/llms-full.txt). Installed packages include these files under `consumer-ai/` and `llms-full.txt`; their locations are also listed in the `appkit.agent` manifest field.

### Contributing and license

[Contributing](https://github.com/dataarthub/appkit/blob/main/CONTRIBUTING.md) · [Releasing](https://github.com/dataarthub/appkit/blob/main/RELEASING.md) · [MIT license](https://github.com/dataarthub/appkit/blob/main/packages/appkit-react/LICENSE)

Third-party license texts retained from the compiled CSS are included in [THIRD_PARTY_NOTICES.md](https://github.com/dataarthub/appkit/blob/main/packages/appkit-react/THIRD_PARTY_NOTICES.md), also shipped in the package root.
