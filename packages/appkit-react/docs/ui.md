---
title: "Compose React UI and shared providers"
description: "React 19 primitives, theme providers and hooks"
sidebar:
  order: 5
archetype: how-to
project: appkit
tags: ["appkit", "ui"]
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

DOM-ref wrappers receive `ref` as a regular React 19 prop. Existing calls such as
`<Input ref={inputRef} />` retain their public props and ref targets, including
callback-ref cleanup and supported Base UI `render` composition. Custom wrappers
can pass `ref` along with the other props:

```tsx
import type {ComponentProps} from 'react';
import {Input} from '@alneas/appkit-react/ui';

export function NameInput(props: ComponentProps<typeof Input>) {
  return <Input {...props} />;
}
```

Use `ComponentProps<typeof Input>` and `ComponentRef<typeof Input>` for consumer
types. Regular function components do not retain the `ForwardRefExoticComponent`
wrapper type or its internal `.render`/`$$typeof` properties.

Register window keyboard shortcuts with `@alneas/appkit-react/ui/hooks`:

```tsx
import {useKeyboardShortcuts} from '@alneas/appkit-react/ui/hooks';

export function SaveShortcut({save}: {save: () => void}) {
  useKeyboardShortcuts([{key: 's', ctrlKey: true, handler: save}]);
  return null;
}
```

Definitions and handlers use the latest committed values without re-registering
the listener. Pass `false` as the second argument to disable shortcuts. Matching
is case-insensitive, `ctrlKey: true` accepts Ctrl or Meta, and only the first
match runs. Matches prevent the default action unless `preventDefault: false`.
Input, composition and repeat events are not filtered. This hook needs no
provider or stylesheet.

## Verification

Type-check this example in your application. See [the export reference](exports.md) for narrower entry points and exact optional peers. Package import/type checks do not certify hosted providers.

## Troubleshooting / Common Pitfalls

React 19 primitives, theme providers and hooks. Import CSS explicitly and share host providers. Check accessibility in the consuming application.
