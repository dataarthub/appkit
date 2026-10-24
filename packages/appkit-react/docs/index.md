---
title: "Appkit React"
description: "Unified React 19 business UI toolkit: accessible primitives, schema-driven forms, data tables, and AI chat interfaces"
sidebar:
  order: 1
archetype: explanation
project: appkit
tags: ["appkit", "overview"]
---

# Appkit React

React 19 components, schema-driven forms, record tables and AI interfaces for
business applications. Your application supplies data adapters and server rules.

## Usage

Requires Node.js 24 or later and React / React DOM `^19.2.3`. Import styles once
at your application's entry point.

```tsx
import { Button } from '@alneas/appkit-react/ui';
import '@alneas/appkit-react/styles';

export function SaveButton({ save }: { save: () => void }) {
  return <Button onClick={save}>Save</Button>;
}
```

For schema forms and record views, follow the [complete form recipe](request-form.md)
for the data adapter, Query provider and peer setup. Optional integrations have
[additional peer requirements](exports.md).

## Documentation

[Guides and API](https://tech-docs.alneas.com/appkit/appkit-react/) ·
[Change history](https://github.com/dataarthub/appkit/blob/main/packages/appkit-react/CHANGELOG.md) ·
[GitHub Issues](https://github.com/dataarthub/appkit/issues)

Upgrading to 0.3.0 introduces breaking drag-event and component-type changes.
Read the [migration guide](https://github.com/dataarthub/appkit/blob/main/packages/appkit-react/docs/migration.md)
before upgrading. A prepared source version does not establish npm availability.
