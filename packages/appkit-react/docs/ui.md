---
title: "Compose React UI and shared providers"
description: "React 19 primitives, theme providers and hooks"
archetype: how-to
project: tools
---

# Compose React UI and shared providers

## Prerequisites

Install the package; feature subpaths are import targets.

```bash
bun add @alneas/appkit-react
```

Use React and React DOM 19 matching the package peer ranges.

## Public import

`@alneas/appkit-react/ui`

## Step-by-Step Implementation

```tsx
import {Button} from '@alneas/appkit-react/ui';
import '@alneas/appkit-react/styles';
export function SaveButton() {return <Button>Save</Button>;}
```

## Verification

Type-check this example in your application. See [the export reference](exports.md) for narrower entry points and exact optional peers. Package import/type checks do not certify hosted providers.

## Troubleshooting / Common Pitfalls

React 19 primitives, theme providers and hooks. Import CSS explicitly and share host providers. Check accessibility in the consuming application.
