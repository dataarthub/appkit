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

## Elevator Pitch

React 19 forms, validation and record views connected to application-owned adapters.

## Why & Value

Feature subpaths keep provider decisions visible while installation uses just two npm packages. Align schemas with validation and record operations; retain application control over data writes.

## Key Highlights

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

## Next Steps

[Migration from app-core/react-tools](migration.md) · [Public exports and optional peers](exports.md) · [Contributing](https://github.com/dataarthub/appkit/blob/main/CONTRIBUTING.md) · [Releasing](https://github.com/dataarthub/appkit/blob/main/RELEASING.md)

[Complete request form](request-form.md). FormView requires collection, QueryClientProvider and DataAccessProvider.

Compiled CSS license texts are retained in `THIRD_PARTY_NOTICES.md`.

Agent discovery: [instructions](https://github.com/dataarthub/appkit/blob/main/packages/appkit-react/consumer-ai/SKILL.md), [API catalog](https://github.com/dataarthub/appkit/blob/main/packages/appkit-react/consumer-ai/api-index.json), and [full documentation](https://github.com/dataarthub/appkit/blob/main/packages/appkit-react/llms-full.txt). The `appkit.agent` manifest field lists these Appkit-specific paths. Existing `ai-instructions` and `package-context.json` exports remain available.
