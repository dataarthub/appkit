---
title: "Appkit React"
description: "Unified React 19 business UI toolkit: accessible primitives, schema-driven forms, data tables, and AI chat interfaces"
archetype: explanation
project: tools
---

# Appkit React

React 19 forms, validation and record views connected to application-owned adapters.

## Why

Feature subpaths keep provider decisions visible while installation uses just two npm packages. Align schemas with validation and record operations; retain application control over data writes.

## Highlights

- `@alneas/appkit-react/ui`: [Compose React UI and shared providers](ui.md).
- `@alneas/appkit-react/tools`: [Build schema forms and record tables](tools.md).
- `@alneas/appkit-react/ai`: [Review AI proposals in React](ai.md).

## Quickstart

Use an existing React 19 application with React DOM 19.

```bash
bun add @alneas/appkit-react
```

```tsx
import {Button} from '@alneas/appkit-react/ui';
import '@alneas/appkit-react/styles';
export function SaveButton() {return <Button>Save</Button>;}
```

## Next steps

[Public exports and optional peers](exports.md) · [Contributing](../../../CONTRIBUTING.md) · [Releasing](../../../RELEASING.md)

[Complete request form](request-form.md). FormView requires collection, QueryClientProvider and DataAccessProvider.

Compiled CSS license texts are retained in `THIRD_PARTY_NOTICES.md`.
