---
title: "Review AI proposals in React"
description: "React proposal review and generative UI bindings"
archetype: how-to
project: tools
---

# Review AI proposals in React

## Prerequisites

Install the package; feature subpaths are import targets.

```bash
bun add @alneas/appkit-react
```

Use React and React DOM 19 matching the package peer ranges.

## Public import

`@alneas/appkit-react/ai`

## Step-by-Step Implementation

```tsx
import * as ai from '@alneas/appkit-react/ai';
console.log(Object.keys(ai).length > 0);
```

## Verification

Type-check this example in your application. See [the export reference](exports.md) for narrower entry points and exact optional peers. Package import/type checks do not certify hosted providers.

## Troubleshooting / Common Pitfalls

React proposal review and generative UI bindings. The optional chat transport requires the ai SDK peer. Proposals do not authorize execution or stored-record changes.
